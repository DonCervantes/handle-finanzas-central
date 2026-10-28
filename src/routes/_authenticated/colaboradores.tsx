import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ComingSoon, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { EmptyRow, FormField, NativeSelect } from "@/components/form-bits";
import { employeesQuery } from "@/lib/data";
import { formatDate, formatMXN } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/colaboradores")({
  head: () => ({ meta: [{ title: "Colaboradores — Handle" }, { name: "description", content: "Directorio de tu equipo." }] }),
  component: Colaboradores,
});

type Employee = Tables<"employees">;

function Colaboradores() {
  const { data: employees = [] } = useQuery(employeesQuery);
  const [editing, setEditing] = useState<Employee | null | "new">(null);
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Colaborador eliminado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Colaboradores"
        description={`${employees.length} personas en tu equipo`}
        actions={<Button onClick={() => setEditing("new")}><Plus /> Nuevo colaborador</Button>}
      />
      <Card className="shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead>Ingreso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Salario mensual</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 && <EmptyRow cols={6} text="Aún no hay colaboradores." />}
            {employees.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{e.position ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(e.hire_date + "T12:00:00")}</TableCell>
                <TableCell><StatusBadge status={e.status} /></TableCell>
                <TableCell className="tabular text-right">{formatMXN(e.salary)}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEditing(e)}><Pencil /></Button>
                  <Button size="icon" variant="ghost" aria-label="Eliminar" onClick={() => confirm(`¿Eliminar a ${e.full_name}?`) && del.mutate(e.id)}><Trash2 /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ComingSoon title="Nómina" description="Cálculo de nómina, ISR e IMSS con timbrado de recibos." />
        <ComingSoon title="Vacaciones" description="Solicitudes, aprobaciones y saldo de días por colaborador." />
      </div>
      {editing && <EmployeeDialog employee={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function EmployeeDialog({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (f: FormData) => {
      const row = {
        full_name: String(f.get("full_name")),
        position: String(f.get("position")) || null,
        salary: Number(f.get("salary")),
        hire_date: String(f.get("hire_date")),
        status: String(f.get("status")),
      };
      const { error } = employee
        ? await supabase.from("employees").update(row).eq("id", employee.id)
        : await supabase.from("employees").insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Colaborador guardado"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); m.mutate(new FormData(e.currentTarget)); };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{employee ? "Editar colaborador" : "Nuevo colaborador"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField label="Nombre completo" htmlFor="full_name"><Input id="full_name" name="full_name" required defaultValue={employee?.full_name} /></FormField>
          </div>
          <FormField label="Puesto" htmlFor="position"><Input id="position" name="position" defaultValue={employee?.position ?? ""} /></FormField>
          <FormField label="Salario mensual (MXN)" htmlFor="salary"><Input id="salary" name="salary" type="number" step="0.01" min="0" required defaultValue={employee?.salary ?? ""} /></FormField>
          <FormField label="Fecha de ingreso" htmlFor="hire_date"><Input id="hire_date" name="hire_date" type="date" required defaultValue={employee?.hire_date ?? new Date().toISOString().slice(0, 10)} /></FormField>
          <FormField label="Estado" htmlFor="status">
            <NativeSelect id="status" name="status" defaultValue={employee?.status ?? "activo"}>
              <option value="activo">Activo</option><option value="vacaciones">Vacaciones</option><option value="baja">Baja</option>
            </NativeSelect>
          </FormField>
          <DialogFooter className="sm:col-span-2"><Button disabled={m.isPending}>Guardar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
