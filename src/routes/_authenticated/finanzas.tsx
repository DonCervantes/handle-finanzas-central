import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { EmptyRow, FormField, NativeSelect } from "@/components/form-bits";
import { AiCategorize } from "@/components/ai-categorize";
import { accountsQuery, transactionsQuery } from "@/lib/data";
import { formatDate, formatMXN } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/finanzas")({
  head: () => ({ meta: [{ title: "Finanzas — Handle" }, { name: "description", content: "Ingresos, egresos y cuentas." }] }),
  component: Finanzas,
});

const CATEGORIES = ["Ventas", "Servicios", "Nómina", "Renta", "Proveedores", "Software", "Operación", "General"];

function Finanzas() {
  const { data: tx = [] } = useQuery(transactionsQuery);
  const { data: accounts = [] } = useQuery(accountsQuery);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cat, setCat] = useState("");

  const categories = useMemo(() => Array.from(new Set([...CATEGORIES, ...tx.map((t) => t.category)])), [tx]);
  const rows = tx.filter((t) => {
    const d = t.occurred_at.slice(0, 10);
    return (!from || d >= from) && (!to || d <= to) && (!cat || t.category === cat);
  });

  return (
    <>
      <PageHeader
        title="Finanzas"
        description="Registra y consulta los movimientos de tus cuentas."
        actions={<><AiCategorize /><NewTransaction accounts={accounts} categories={categories} /></>}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {accounts.map((a) => (
          <Card key={a.id} className="p-5 shadow-card">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{a.type}</p>
            <p className="mt-1 text-sm font-medium">{a.name}</p>
            <p className="tabular mt-2 text-xl font-semibold">{formatMXN(a.balance)}</p>
          </Card>
        ))}
      </div>
      <Card className="shadow-card">
        <div className="flex flex-wrap items-end gap-3 border-b p-4">
          <FormField label="Desde" htmlFor="from">
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </FormField>
          <FormField label="Hasta" htmlFor="to">
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </FormField>
          <FormField label="Categoría" htmlFor="cat">
            <NativeSelect id="cat" value={cat} onChange={(e) => setCat(e.target.value)} className="w-44">
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          </FormField>
          {(from || to || cat) && (
            <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); setCat(""); }}>
              Limpiar
            </Button>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <EmptyRow cols={6} text="No hay transacciones con estos filtros." />}
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-muted-foreground">{formatDate(t.occurred_at)}</TableCell>
                <TableCell>
                  <p className="font-medium">{t.description ?? "—"}</p>
                  {(t.clients?.name || t.suppliers?.name) && (
                    <p className="text-xs text-muted-foreground">{t.clients?.name ?? t.suppliers?.name}</p>
                  )}
                </TableCell>
                <TableCell>{t.category}</TableCell>
                <TableCell className="text-muted-foreground">{t.accounts?.name ?? "—"}</TableCell>
                <TableCell><StatusBadge status={t.type} /></TableCell>
                <TableCell className={`tabular text-right font-medium ${t.type === "income" ? "text-success" : ""}`}>
                  {t.type === "income" ? "+" : "−"}{formatMXN(t.amount, t.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

function NewTransaction({ accounts, categories }: { accounts: { id: string; name: string }[]; categories: string[] }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (f: FormData) => {
      const { error } = await supabase.from("transactions").insert({
        type: String(f.get("type")),
        amount: Number(f.get("amount")),
        category: String(f.get("category")),
        description: String(f.get("description")) || null,
        account_id: String(f.get("account_id")) || null,
        occurred_at: new Date(String(f.get("date")) + "T12:00:00").toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transacción registrada");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); m.mutate(new FormData(e.currentTarget)); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> Nueva transacción</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva transacción</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tipo" htmlFor="type">
            <NativeSelect id="type" name="type"><option value="income">Ingreso</option><option value="expense">Egreso</option></NativeSelect>
          </FormField>
          <FormField label="Monto (MXN)" htmlFor="amount">
            <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
          </FormField>
          <FormField label="Categoría" htmlFor="category">
            <NativeSelect id="category" name="category">{categories.map((c) => <option key={c}>{c}</option>)}</NativeSelect>
          </FormField>
          <FormField label="Cuenta" htmlFor="account_id">
            <NativeSelect id="account_id" name="account_id">{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</NativeSelect>
          </FormField>
          <FormField label="Fecha" htmlFor="date">
            <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </FormField>
          <FormField label="Descripción" htmlFor="description">
            <Input id="description" name="description" placeholder="Ej. Factura A-1050" />
          </FormField>
          <DialogFooter className="sm:col-span-2">
            <Button disabled={m.isPending}>{m.isPending ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
