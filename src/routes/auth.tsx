import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Iniciar sesión — Handle" },
      { name: "description", content: "Accede a tu cuenta de Handle o crea una organización nueva." },
      { property: "og:title", content: "Iniciar sesión — Handle" },
      { property: "og:description", content: "Accede a tu cuenta de Handle o crea una organización nueva." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function onLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    setLoading(false);
    if (error) {
      toast.error("Correo o contraseña incorrectos");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function onSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(f.get("email")),
      password: String(f.get("password")),
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: String(f.get("full_name")), org_name: String(f.get("org_name")) },
      },
    });
    setLoading(false);
    if (error) {
      const msg = error.message;
      toast.error(
        /weak|easy to guess|pwned|leaked/i.test(msg) || error.code === "weak_password"
          ? "Esa contraseña es muy común o apareció en filtraciones. Elige una más segura (combina letras, números y símbolos)."
          : /at least|characters/i.test(msg)
            ? "La contraseña debe tener al menos 6 caracteres."
            : /rate limit|too many/i.test(msg)
              ? "Demasiados intentos. Espera un momento e intenta de nuevo."
              : /registered|exists/i.test(msg)
                ? "Ese correo ya tiene una cuenta. Inicia sesión."
                : /not allowed|invalid/i.test(msg)
                  ? "Ese correo no es válido. Usa un correo real."
                  : "No pudimos crear tu cuenta. Intenta de nuevo.",
      );
      return;
    }
    if (data.session) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    if (loginError) {
      toast.error("Tu cuenta se creó, pero no pudimos iniciar sesión. Intenta entrar.");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="m-auto w-full max-w-sm py-12">
          {sent ? (
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Revisa tu correo</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Te enviamos un enlace para confirmar tu cuenta. Después podrás iniciar sesión.
              </p>
              <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
                Volver
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="login">
              <h1 className="text-2xl font-bold tracking-tight">Bienvenido a Handle</h1>
              <p className="mb-6 mt-1 text-sm text-muted-foreground">Administra tu PyME con claridad.</p>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={onLogin} className="mt-4 space-y-4">
                  <Field label="Correo electrónico" name="email" type="email" />
                  <Field label="Contraseña" name="password" type="password" />
                  <Button className="w-full" disabled={loading}>
                    {loading ? "Entrando…" : "Entrar"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={onSignup} className="mt-4 space-y-4">
                  <Field label="Nombre completo" name="full_name" />
                  <Field label="Nombre de tu empresa" name="org_name" />
                  <Field label="Correo electrónico" name="email" type="email" />
                  <Field label="Contraseña" name="password" type="password" minLength={6} />
                  <Button className="w-full" disabled={loading}>
                    {loading ? "Creando…" : "Crear organización"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Cargaremos datos de ejemplo para que explores Handle de inmediato.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
      <div className="bg-brand-gradient hidden items-end p-12 text-primary-foreground lg:flex">
        <blockquote className="max-w-md">
          <p className="text-2xl font-medium leading-snug">
            “Por fin vemos nuestro flujo de efectivo, clientes y equipo en un solo lugar.”
          </p>
          <footer className="mt-4 text-sm opacity-80">Equipo de una PyME en Guadalajara</footer>
        </blockquote>
      </div>
    </div>
  );
}

function Field({ label, name, type = "text", minLength }: { label: string; name: string; type?: string; minLength?: number }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required minLength={minLength} />
    </div>
  );
}
