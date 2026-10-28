import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Mail, Phone, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { FormField } from "@/components/form-bits";
import { clientQuery, transactionsQuery } from "@/lib/data";
import { formatDate, formatMXN } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  head: () => ({ meta: [{ title: "Detalle de cliente — Handle" }, { name: "description", content: "Contactos y movimientos del cliente." }] }),
  component: ClienteDetalle,
});

function ClienteDetalle() {
  const { id } = Route.useParams();
  const { data: c, isLoading } = useQuery(clientQuery(id));
  const { data: tx = [] } = useQuery(transactionsQuery);
  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (!c) return <p>Cliente no encontrado.</p>;
  const movs = tx.filter((t) => t.client_id === id);

  return (
    <>
      <Link to="/clientes" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Clientes
      </Link>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
            <StatusBadge status={c.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{c.email} · {c.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Saldo por cobrar</p>
          <p className="tabular text-2xl font-semibold">{formatMXN(c.balance_due)}</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Contactos</CardTitle>
            <NewContact clientId={id} />
          </CardHeader>
          <CardContent className="space-y-3">
            {c.client_contacts.length === 0 && <p className="text-sm text-muted-foreground">Sin contactos.</p>}
            {c.client_contacts.map((ct) => (
              <div key={ct.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{ct.name}</p>
                  {ct.role && <span className="text-xs text-muted-foreground">{ct.role}</span>}
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {ct.email && <span className="flex items-center gap-1"><Mail className="size-3.5" />{ct.email}</span>}
                  {ct.phone && <span className="flex items-center gap-1"><Phone className="size-3.5" />{ct.phone}</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Movimientos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {movs.length === 0 && <p className="text-sm text-muted-foreground">Sin movimientos.</p>}
            {movs.map((t) => (
              <div key={t.id} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(t.occurred_at)}</p>
                </div>
                <p className="tabular font-medium text-success">+{formatMXN(t.amount)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function NewContact({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (f: FormData) => {
      const { error } = await supabase.from("client_contacts").insert({
        client_id: clientId,
        name: String(f.get("name")),
        email: String(f.get("email")) || null,
        phone: String(f.get("phone")) || null,
        role: String(f.get("role")) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients", clientId] }); toast.success("Contacto agregado"); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); m.mutate(new FormData(e.currentTarget)); };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus /> Contacto</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo contacto</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Nombre" htmlFor="cname"><Input id="cname" name="name" required /></FormField>
          <FormField label="Puesto" htmlFor="crole"><Input id="crole" name="role" /></FormField>
          <FormField label="Correo" htmlFor="cemail"><Input id="cemail" name="email" type="email" /></FormField>
          <FormField label="Teléfono" htmlFor="cphone"><Input id="cphone" name="phone" /></FormField>
          <DialogFooter><Button disabled={m.isPending}>Guardar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
