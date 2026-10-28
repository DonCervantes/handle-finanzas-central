import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Workflow } from "lucide-react";
import { getIntegrationsStatus } from "@/lib/ai.functions";
import { ComingSoon, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import type React from "react";
import { StatusBadge } from "@/components/status-badge";
import { meQuery } from "@/lib/session";
import { roleLabels } from "@/lib/format";
import { pageMeta } from "@/lib/metadata";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => pageMeta("Configuración", "Datos de tu organización e integraciones de Handle."),
  component: Configuracion,
});

function Configuracion() {
  const { data: me } = useQuery(meQuery);
  const statusFn = useServerFn(getIntegrationsStatus);
  const { data: st } = useQuery({ queryKey: ["integrations-status"], queryFn: () => statusFn() });
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
            <div key={k} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 px-6 py-4 text-sm">
              <span className="text-muted-foreground">{k}</span>
              <span className="break-words text-right font-medium">{v ?? "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <h2 className="mb-3 mt-10 text-lg font-bold tracking-tight">Integraciones</h2>
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <IntegrationCard
          icon={<Bot className="size-5" />}
          title="Inteligencia artificial (Groq)"
          active={st?.groq.configured}
          detail={st ? `Modelo: ${st.groq.model}` : "…"}
          hint="Asistente financiero en el Dashboard y sugerencias de categorías en Finanzas."
          missing="Agrega el secreto GROQ_API_KEY para activarla."
        />
        <IntegrationCard
          icon={<Workflow className="size-5" />}
          title="Automatización (n8n)"
          active={st?.n8n.configured}
          detail={st ? `Eventos: ${st.n8n.events.join(", ")}` : "…"}
          hint="Al confirmarse un pago a proveedor se envía un aviso a tu flujo de n8n."
          missing="Agrega el secreto N8N_WEBHOOK_URL para activarla. Los pagos funcionan igual sin ella."
        />
      </div>
      <div className="mt-6 grid max-w-xl gap-4">
        <ComingSoon title="Usuarios y roles" description="Invita a tu equipo y asigna permisos." />
      </div>
    </>
  );
}

function IntegrationCard({ icon, title, active, detail, hint, missing }: { icon: React.ReactNode; title: string; active?: boolean | undefined; detail: string; hint: string; missing: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground">{icon}</span>
          <p className="min-w-0 break-words font-semibold">{title}</p>
          <span className="col-span-2">
            {active === undefined ? null : <StatusBadge status={active ? "activa" : "inactiva"} />}
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{hint}</p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">{detail}</p>
        {active === false && <p className="mt-2 text-xs text-warning">{missing}</p>}
      </CardContent>
    </Card>
  );
}
