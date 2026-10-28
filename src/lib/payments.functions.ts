import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { friendbot, getXlmBalance, isValidAddress, newKeypair, sendXlm, topUp } from "./stellar.server";
import { getQuoteProvider } from "./quote.server";
import { emitN8nEvent } from "./n8n.server";

// The demo always settles in native XLM (no trustlines needed).
const SETTLEMENT_ASSET = "XLM";
const PAYMENT_ROLES = ["owner", "admin", "finance"];

type Ctx = { supabase: any; userId: string };

async function requireOrg(ctx: Ctx, roles?: string[]) {
  const { data, error } = await ctx.supabase.from("profiles").select("org_id, role").eq("id", ctx.userId).single();
  if (error || !data) throw new Error("Perfil no encontrado");
  if (roles && !roles.includes(data.role)) throw new Error("No tienes permiso para esta acción");
  return data.org_id as string;
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function ensureWallet(orgId: string) {
  const db = await admin();
  const { data } = await db.from("org_wallets").select("public_key, secret_key").eq("org_id", orgId).maybeSingle();
  if (data) return data;
  const kp = newKeypair();
  await friendbot(kp.publicKey);
  const { data: row, error } = await db
    .from("org_wallets")
    .upsert({ org_id: orgId, public_key: kp.publicKey, secret_key: kp.secret }, { onConflict: "org_id", ignoreDuplicates: true })
    .select("public_key, secret_key")
    .maybeSingle();
  if (error) throw error;
  if (row) return row;
  const { data: again } = await db.from("org_wallets").select("public_key, secret_key").eq("org_id", orgId).single();
  return again!;
}

/** Returns only public info about the org's custody wallet, creating it on first use. */
export const getCustodyWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await requireOrg(context);
    const w = await ensureWallet(orgId);
    return { publicKey: w.public_key, balanceXlm: await getXlmBalance(w.public_key) };
  });

export const topUpCustody = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await requireOrg(context, PAYMENT_ROLES);
    const w = await ensureWallet(orgId);
    await topUp(w.public_key);
    return { publicKey: w.public_key, balanceXlm: await getXlmBalance(w.public_key) };
  });

export const generateSupplierWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ supplierId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireOrg(context, PAYMENT_ROLES);
    const kp = newKeypair();
    await friendbot(kp.publicKey);
    // Test wallet only: the supplier's secret is discarded on purpose.
    const { error } = await context.supabase
      .from("suppliers")
      .update({ stellar_address: kp.publicKey, asset_pref: SETTLEMENT_ASSET })
      .eq("id", data.supplierId);
    if (error) throw new Error("No se pudo guardar la wallet");
    return { publicKey: kp.publicKey };
  });

export const createPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ supplierId: z.string().uuid(), amountFiat: z.number().positive().max(10_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireOrg(context, PAYMENT_ROLES);
    const { data: sup } = await context.supabase.from("suppliers").select("id").eq("id", data.supplierId).single();
    if (!sup) throw new Error("Proveedor no encontrado");
    const q = await getQuoteProvider().quote({ amountFiat: data.amountFiat, currencyFiat: "MXN", assetCode: SETTLEMENT_ASSET });
    const { data: row, error } = await context.supabase
      .from("payments")
      .insert({
        supplier_id: data.supplierId,
        amount_fiat: data.amountFiat,
        currency_fiat: "MXN",
        amount_token: q.amountToken,
        asset_code: q.assetCode,
        status: "draft",
      })
      .select("id, amount_token, asset_code")
      .single();
    if (error) throw new Error("No se pudo crear el pago");
    return { ...row, rate: q.rate };
  });

export const submitPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ paymentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const orgId = await requireOrg(context, PAYMENT_ROLES);
    // Read through RLS so users can only submit their own org's payments.
    const { data: p } = await context.supabase
      .from("payments")
      .select("id, status, amount_token, asset_code, suppliers(stellar_address, name)")
      .eq("id", data.paymentId)
      .single();
    if (!p) throw new Error("Pago no encontrado");
    if (p.status !== "draft" && p.status !== "failed") throw new Error("Este pago ya fue enviado");
    if (p.asset_code !== SETTLEMENT_ASSET) throw new Error(`Por ahora solo se pueden enviar pagos en ${SETTLEMENT_ASSET}`);
    const dest = p.suppliers?.stellar_address;
    const db = await admin();
    const fail = async (msg: string) => {
      await db.from("payments").update({ status: "failed", error_message: msg }).eq("id", p.id);
      return { ok: false as const, error: msg };
    };
    if (!isValidAddress(dest)) return fail("El proveedor no tiene una dirección Stellar válida.");

    // Claim the payment atomically so it can't be sent twice.
    const { data: claimed } = await db
      .from("payments")
      .update({ status: "submitted", submitted_at: new Date().toISOString(), error_message: null })
      .eq("id", p.id)
      .in("status", ["draft", "failed"])
      .select("id");
    if (!claimed?.length) throw new Error("Este pago ya está en proceso");

    try {
      const wallet = await ensureWallet(orgId);
      const hash = await sendXlm({
        secret: wallet.secret_key,
        destination: dest,
        amount: Number(p.amount_token).toFixed(7),
        memo: `Handle ${p.id.slice(0, 8)}`,
      });
      const { error } = await db.rpc("finalize_payment", { _payment_id: p.id, _hash: hash });
      if (error) {
        console.error("finalize_payment", error);
        await db.from("payments").update({ status: "confirmed", stellar_tx_hash: hash }).eq("id", p.id);
      }
      // Fail-safe automation: never blocks or reverts the payment.
      const { data: full } = await db
        .from("payments")
        .select("org_id, amount_fiat, currency_fiat, amount_token, asset_code")
        .eq("id", p.id)
        .single();
      await emitN8nEvent("payment.confirmed", {
        payment_id: p.id,
        org_id: full?.org_id ?? orgId,
        supplier: { name: p.suppliers?.name ?? null, stellar_address: dest },
        amount_fiat: Number(full?.amount_fiat),
        currency_fiat: full?.currency_fiat,
        amount_token: Number(full?.amount_token),
        asset_code: full?.asset_code,
        stellar_tx_hash: hash,
        explorer_url: `https://stellar.expert/explorer/testnet/tx/${hash}`,
        network: "testnet",
      });
      return { ok: true as const, hash };
    } catch (e) {
      console.error("submitPayment", e);
      return fail(e instanceof Error ? e.message : "Error desconocido al enviar");
    }
  });
