import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Copy, ExternalLink, Loader2, Pencil, Plus, RefreshCw, Send, Wallet, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { EmptyRow, FormField, NativeSelect } from "@/components/form-bits";
import { paymentsQuery, suppliersQuery } from "@/lib/data";
import { formatDate, formatMXN } from "@/lib/format";
import { createPayment, generateSupplierWallet, getCustodyWallet, submitPayment, topUpCustody } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/pagos")({
  head: () => ({ meta: [{ title: "Pagos a proveedores — Handle" }, { name: "description", content: "Pagos on-chain a proveedores en Stellar." }] }),
  component: Pagos,
});

const EXPLORER = "https://stellar.expert/explorer/testnet";
const short = (s?: string | null) => (s ? `${s.slice(0, 6)}…${s.slice(-4)}` : "—");
const fmtToken = (n: number | null, code: string | null) =>
  n == null ? "—" : `${Number(n).toLocaleString("es-MX", { maximumFractionDigits: 4 })} ${code ?? ""}`;

function Pagos() {
  const { data: suppliers = [] } = useQuery(suppliersQuery);
  const { data: payments = [] } = useQuery(paymentsQuery);
  const qc = useQueryClient();
  const submitFn = useServerFn(submitPayment);
  const [sending, setSending] = useState<string | null>(null);

  async function send(id: string) {
    setSending(id);
    try {
      const r = await submitFn({ data: { paymentId: id } });
      if (r.ok) toast.success("Pago confirmado en Stellar", { action: { label: "Ver", onClick: () => window.open(`${EXPLORER}/tx/${r.hash}`, "_blank") } });
      else toast.error(r.error);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar");
    } finally {
      setSending(null);
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["custody"] });
    }
  }

  return (
    <>
      <PageHeader
        title="Pagos a proveedores"
        description="Paga a tus proveedores on-chain en Stellar (red de pruebas)."
        actions={<><SupplierDialog /><NewPayment suppliers={suppliers} /></>}
      />
      <CustodyCard />

      <Card className="mt-6 shadow-card">
        <CardHeader><CardTitle className="text-base">Órdenes de pago</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">En token</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Transacción</TableHead>
              <TableHead className="w-44" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 && <EmptyRow cols={7} text="Aún no hay pagos." />}
            {payments.map((p) => {
              const canSend = (p.status === "draft" || p.status === "failed") && p.asset_code === "XLM";
              const busy = sending === p.id;
              return (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                  <TableCell className="font-medium">{p.suppliers?.name}</TableCell>
                  <TableCell className="tabular text-right font-medium">{formatMXN(p.amount_fiat, p.currency_fiat)}</TableCell>
                  <TableCell className="tabular text-right text-muted-foreground">{fmtToken(p.amount_token, p.asset_code)}</TableCell>
                  <TableCell>
                    <StatusBadge status={busy ? "submitted" : p.status} />
                    {p.status === "failed" && p.error_message && (
                      <p className="mt-1 max-w-56 text-xs text-destructive">{p.error_message}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.stellar_tx_hash ? (
                      <a href={`${EXPLORER}/tx/${p.stellar_tx_hash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline">
                        {short(p.stellar_tx_hash)} <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canSend && (
                      <Button size="sm" onClick={() => send(p.id)} disabled={!!sending}>
                        {busy ? <Loader2 className="animate-spin" /> : <Send />}
                        {busy ? "Enviando…" : p.status === "failed" ? "Reintentar" : "Confirmar y enviar"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <SuppliersTable suppliers={suppliers} />
    </>
  );
}

function CustodyCard() {
  const getFn = useServerFn(getCustodyWallet);
  const topFn = useServerFn(topUpCustody);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["custody"], queryFn: () => getFn(), staleTime: 15_000 });
  const top = useMutation({
    mutationFn: () => topFn(),
    onSuccess: (d) => { qc.setQueryData(["custody"], d); toast.success("Cuenta refondeada con 10,000 XLM de prueba"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const bal = q.data?.balanceXlm;
  const low = bal != null && bal < 1000;

  return (
    <Card className="flex flex-col gap-4 p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="bg-brand-gradient grid size-11 shrink-0 place-items-center rounded-xl text-primary-foreground">
          <Wallet className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Cuenta custodia de la organización</p>
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">Testnet</span>
          </div>
          {q.isLoading ? (
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Preparando cuenta…</p>
          ) : q.error ? (
            <p className="mt-1 text-sm text-destructive">No se pudo cargar la cuenta custodia.</p>
          ) : (
            <>
              <p className="tabular mt-1 text-2xl font-semibold tracking-tight">
                {bal == null ? "—" : bal.toLocaleString("es-MX", { maximumFractionDigits: 2 })} <span className="text-base font-medium text-muted-foreground">XLM</span>
              </p>
              <div className="mt-1 flex items-center gap-2">
                <a href={`${EXPLORER}/account/${q.data?.publicKey}`} target="_blank" rel="noreferrer" className="truncate font-mono text-xs text-muted-foreground hover:text-primary">
                  {short(q.data?.publicKey)}
                </a>
                <button aria-label="Copiar dirección" className="text-muted-foreground hover:text-foreground" onClick={() => { navigator.clipboard.writeText(q.data!.publicKey); toast.success("Dirección copiada"); }}>
                  <Copy className="size-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {low && <span className="text-xs text-warning">Saldo bajo</span>}
        <Button variant="outline" onClick={() => top.mutate()} disabled={top.isPending || q.isLoading}>
          {top.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refondear con Friendbot
        </Button>
      </div>
    </Card>
  );
}

function SuppliersTable({ suppliers }: { suppliers: Tables<"suppliers">[] }) {
  const genFn = useServerFn(generateSupplierWallet);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  async function gen(id: string) {
    setBusy(id);
    try {
      await genFn({ data: { supplierId: id } });
      toast.success("Wallet de prueba creada y fondeada");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar la wallet");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Card className="mt-6 shadow-card">
      <CardHeader><CardTitle className="text-base">Proveedores</CardTitle></CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Dirección Stellar</TableHead>
            <TableHead>Activo preferido</TableHead>
            <TableHead>Alta</TableHead>
            <TableHead className="w-64" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.length === 0 && <EmptyRow cols={5} text="Aún no hay proveedores." />}
          {suppliers.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>
                {s.stellar_address ? (
                  <a href={`${EXPLORER}/account/${s.stellar_address}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-muted-foreground hover:text-primary">
                    {short(s.stellar_address)}
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">Sin dirección</span>
                )}
              </TableCell>
              <TableCell>{s.asset_pref ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(s.created_at)}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => gen(s.id)} disabled={!!busy}>
                  {busy === s.id ? <Loader2 className="animate-spin" /> : <Wand2 />} Generar wallet de prueba
                </Button>
                <SupplierDialog supplier={s} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function NewPayment({ suppliers }: { suppliers: Tables<"suppliers">[] }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const createFn = useServerFn(createPayment);
  const m = useMutation({
    mutationFn: (f: FormData) =>
      createFn({ data: { supplierId: String(f.get("supplier_id")), amountFiat: Number(f.get("amount")) } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      toast.success(`Borrador creado: ${fmtToken(r.amount_token, r.asset_code)} (1 ${r.asset_code} = ${formatMXN(r.rate)})`);
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); m.mutate(new FormData(e.currentTarget)); };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus /> Nuevo pago</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo pago</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Proveedor" htmlFor="supplier_id">
            <NativeSelect id="supplier_id" name="supplier_id" required>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}{s.stellar_address ? "" : " (sin wallet)"}</option>)}
            </NativeSelect>
          </FormField>
          <FormField label="Monto (MXN)" htmlFor="amount">
            <Input id="amount" name="amount" type="number" step="0.01" min="1" required />
          </FormField>
          <p className="text-xs text-muted-foreground">
            Se calcula el monto en XLM con una tasa de prueba y queda como borrador hasta que lo confirmes.
          </p>
          <DialogFooter>
            <Button disabled={m.isPending || suppliers.length === 0}>{m.isPending && <Loader2 className="animate-spin" />} Crear borrador</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const ADDR_RE = /^G[A-Z2-7]{55}$/;

function SupplierDialog({ supplier }: { supplier?: Tables<"suppliers"> }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (f: FormData) => {
      const addr = String(f.get("stellar_address")).trim();
      if (addr && !ADDR_RE.test(addr)) throw new Error("La dirección Stellar debe empezar con G y tener 56 caracteres.");
      const row = { name: String(f.get("name")), stellar_address: addr || null, asset_pref: String(f.get("asset_pref")) };
      const { error } = supplier
        ? await supabase.from("suppliers").update(row).eq("id", supplier.id)
        : await supabase.from("suppliers").insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Proveedor guardado"); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); m.mutate(new FormData(e.currentTarget)); };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {supplier ? (
          <Button size="icon" variant="ghost" aria-label="Editar proveedor"><Pencil /></Button>
        ) : (
          <Button variant="outline">Nuevo proveedor</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{supplier ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Nombre" htmlFor="sname"><Input id="sname" name="name" required defaultValue={supplier?.name} /></FormField>
          <FormField label="Dirección pública Stellar" htmlFor="saddr">
            <Input id="saddr" name="stellar_address" placeholder="G…" className="font-mono text-xs" defaultValue={supplier?.stellar_address ?? ""} />
          </FormField>
          <FormField label="Activo preferido" htmlFor="sasset">
            <NativeSelect id="sasset" name="asset_pref" defaultValue={supplier?.asset_pref ?? "XLM"}>
              <option value="XLM">XLM</option><option value="USDC">USDC</option>
            </NativeSelect>
          </FormField>
          <p className="text-xs text-muted-foreground">Por ahora los pagos se liquidan en XLM de prueba.</p>
          <DialogFooter><Button disabled={m.isPending}>Guardar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
