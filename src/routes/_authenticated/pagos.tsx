import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

export const Route = createFileRoute("/_authenticated/pagos")({
  head: () => ({ meta: [{ title: "Pagos a proveedores — Handle" }, { name: "description", content: "Proveedores y órdenes de pago." }] }),
  component: Pagos,
});

const short = (s?: string | null) => (s ? `${s.slice(0, 6)}…${s.slice(-4)}` : "—");

function Pagos() {
  const { data: suppliers = [] } = useQuery(suppliersQuery);
  const { data: payments = [] } = useQuery(paymentsQuery);

  return (
    <>
      <PageHeader
        title="Pagos a proveedores"
        description="Crea órdenes de pago. La liquidación on-chain con Stellar llegará pronto."
        actions={<><NewSupplier /><NewPayment suppliers={suppliers} /></>}
      />
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Órdenes de pago</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Hash Stellar</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 && <EmptyRow cols={6} text="Aún no hay pagos." />}
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                <TableCell className="font-medium">{p.suppliers?.name}</TableCell>
                <TableCell>{p.asset_code ?? "—"}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{short(p.stellar_tx_hash)}</TableCell>
                <TableCell className="tabular text-right font-medium">{formatMXN(p.amount_fiat, p.currency_fiat)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="mt-6 shadow-card">
        <CardHeader><CardTitle className="text-base">Proveedores</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Dirección Stellar</TableHead>
              <TableHead>Activo preferido</TableHead>
              <TableHead>Alta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 && <EmptyRow cols={4} text="Aún no hay proveedores." />}
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{short(s.stellar_address)}</TableCell>
                <TableCell>{s.asset_pref ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(s.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

function NewPayment({ suppliers }: { suppliers: { id: string; name: string; asset_pref: string | null }[] }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (f: FormData) => {
      const sup = suppliers.find((s) => s.id === f.get("supplier_id"));
      const { error } = await supabase.from("payments").insert({
        supplier_id: String(f.get("supplier_id")),
        amount_fiat: Number(f.get("amount")),
        currency_fiat: "MXN",
        asset_code: sup?.asset_pref ?? null,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payments"] }); toast.success("Pago guardado como borrador"); setOpen(false); },
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
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </NativeSelect>
          </FormField>
          <FormField label="Monto (MXN)" htmlFor="amount">
            <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
          </FormField>
          <p className="text-xs text-muted-foreground">Se guardará como borrador. Aún no se envía a la red.</p>
          <DialogFooter><Button disabled={m.isPending || suppliers.length === 0}>Guardar borrador</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewSupplier() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (f: FormData) => {
      const { error } = await supabase.from("suppliers").insert({
        name: String(f.get("name")),
        stellar_address: String(f.get("stellar_address")) || null,
        asset_pref: String(f.get("asset_pref")),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Proveedor agregado"); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); m.mutate(new FormData(e.currentTarget)); };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline">Nuevo proveedor</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo proveedor</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Nombre" htmlFor="name"><Input id="name" name="name" required /></FormField>
          <FormField label="Dirección Stellar (opcional)" htmlFor="stellar_address"><Input id="stellar_address" name="stellar_address" placeholder="G…" /></FormField>
          <FormField label="Activo preferido" htmlFor="asset_pref">
            <NativeSelect id="asset_pref" name="asset_pref"><option>USDC</option><option>CETES</option><option>XLM</option></NativeSelect>
          </FormField>
          <DialogFooter><Button disabled={m.isPending}>Guardar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
