import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ComingSoon, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { meQuery } from "@/lib/session";
import { roleLabels } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({ meta: [{ title: "Configuración — Handle" }, { name: "description", content: "Ajustes de tu organización." }] }),
  component: Configuracion,
});

function Configuracion() {
  const { data: me } = useQuery(meQuery);
  const rows = [
    ["Organización", me?.organizations?.name],
    ["País", me?.organizations?.country],
    ["Moneda", me?.organizations?.currency_default],
    ["Tu rol", roleLabels[me?.role ?? ""]],
  ];
  return (
    <>
      <PageHeader title="Configuración" description="Ajustes de tu organización y equipo." />
      <Card className="max-w-xl shadow-card">
        <CardContent className="divide-y p-0">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between px-6 py-4 text-sm">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium">{v ?? "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="mt-6 grid max-w-xl gap-4">
        <ComingSoon title="Usuarios y roles" description="Invita a tu equipo y asigna permisos." />
        <ComingSoon title="Integraciones" description="Stellar, Etherfuse, facturación SAT y más." />
      </div>
    </>
  );
}
