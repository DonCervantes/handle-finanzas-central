import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
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
import { clientsQuery } from "@/lib/data";
import { formatMXN } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — Handle" }, { name: "description", content: "CRM de clientes." }] }),
  component: Clientes,
});

function Clientes() {
  const { data: clients = [] } = useQuery(clientsQuery);
  const total = clients.reduce((a, c) => a + Number(c.balance_due), 0);
  return (
    <>
      <PageHeader title="Clientes" description={`Por cobrar: ${formatMXN(total)}`} actions={<NewClient />} />
      <Card className="shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Saldo por cobrar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 && <EmptyRow cols={5} text="Aún no hay clientes." />}
            {clients.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link to="/clientes/$id" params={{ id: c.id }} className="font-medium hover:text-primary">{c.name}</Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell className="tabular text-right font-medium">{formatMXN(c.balance_due)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

function NewClient() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (f: FormData) => {
      const { error } = await supabase.from("clients").insert({
        name: String(f.get("name")),
        email: String(f.get("email")) || null,
        phone: String(f.get("phone")) || null,
        status: String(f.get("status")),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success("Cliente agregado"); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); m.mutate(new FormData(e.currentTarget)); };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus /> Nuevo cliente</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo cliente</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Nombre o razón social" htmlFor="name"><Input id="name" name="name" required /></FormField>
          <FormField label="Correo" htmlFor="email"><Input id="email" name="email" type="email" /></FormField>
          <FormField label="Teléfono" htmlFor="phone"><Input id="phone" name="phone" /></FormField>
          <FormField label="Estado" htmlFor="status">
            <NativeSelect id="status" name="status"><option value="activo">Activo</option><option value="prospecto">Prospecto</option><option value="inactivo">Inactivo</option></NativeSelect>
          </FormField>
          <DialogFooter><Button disabled={m.isPending}>Guardar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
