// Stellar TESTNET helpers. Never point these at mainnet.
import { Account, Asset, BASE_FEE, Keypair, Memo, Networks, Operation, StrKey, TransactionBuilder } from "@stellar/stellar-base";

export const HORIZON = "https://horizon-testnet.stellar.org";
export const NETWORK = Networks.TESTNET;

export function isValidAddress(a: string | null | undefined): a is string {
  return !!a && StrKey.isValidEd25519PublicKey(a);
}

export function newKeypair() {
  const kp = Keypair.random();
  return { publicKey: kp.publicKey(), secret: kp.secret() };
}

export async function friendbot(publicKey: string) {
  const r = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Friendbot falló (${r.status}): ${body.slice(0, 200)}`);
  }
}

export async function loadAccount(publicKey: string) {
  const r = await fetch(`${HORIZON}/accounts/${publicKey}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Horizon respondió ${r.status}`);
  return (await r.json()) as { sequence: string; balances: { asset_type: string; balance: string }[] };
}

export async function getXlmBalance(publicKey: string) {
  const acc = await loadAccount(publicKey);
  if (!acc) return null;
  return Number(acc.balances.find((b) => b.asset_type === "native")?.balance ?? 0);
}

type HorizonError = { extras?: { result_codes?: { transaction?: string; operations?: string[] } }; title?: string };

const codeMessages: Record<string, string> = {
  op_underfunded: "La cuenta custodia no tiene saldo suficiente. Refondéala e intenta de nuevo.",
  op_no_destination: "La cuenta del proveedor no existe en la red.",
  op_low_reserve: "El monto no cubre la reserva mínima para crear la cuenta del proveedor.",
  tx_bad_seq: "Secuencia inválida, intenta de nuevo.",
  tx_insufficient_balance: "Saldo insuficiente en la cuenta custodia.",
};

async function submit(xdr: string) {
  const r = await fetch(`${HORIZON}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ tx: xdr }).toString(),
  });
  const json = (await r.json()) as { hash?: string; successful?: boolean } & HorizonError;
  if (!r.ok || !json.hash) {
    const codes = json.extras?.result_codes;
    const code = codes?.operations?.find((c) => c !== "op_success") ?? codes?.transaction ?? json.title ?? "error";
    throw new Error(codeMessages[code] ?? `La red rechazó la transacción (${code}).`);
  }
  return json.hash;
}

/** Sends native XLM. Creates the destination account if it does not exist yet. */
export async function sendXlm(opts: { secret: string; destination: string; amount: string; memo: string }) {
  const kp = Keypair.fromSecret(opts.secret);
  const src = await loadAccount(kp.publicKey());
  if (!src) throw new Error("La cuenta custodia no existe en la red.");
  const destExists = (await loadAccount(opts.destination)) !== null;
  const op = destExists
    ? Operation.payment({ destination: opts.destination, asset: Asset.native(), amount: opts.amount })
    : Operation.createAccount({ destination: opts.destination, startingBalance: opts.amount });
  const tx = new TransactionBuilder(new Account(kp.publicKey(), src.sequence), { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(op)
    .addMemo(Memo.text(opts.memo.slice(0, 28)))
    .setTimeout(60)
    .build();
  tx.sign(kp);
  return submit(tx.toXDR());
}

/** Friendbot only funds new accounts: fund a temp account and merge it into the target. */
export async function topUp(targetPublicKey: string) {
  const temp = Keypair.random();
  await friendbot(temp.publicKey());
  const acc = await loadAccount(temp.publicKey());
  if (!acc) throw new Error("No se pudo crear la cuenta temporal.");
  const tx = new TransactionBuilder(new Account(temp.publicKey(), acc.sequence), { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(Operation.accountMerge({ destination: targetPublicKey }))
    .setTimeout(60)
    .build();
  tx.sign(temp);
  return submit(tx.toXDR());
}
