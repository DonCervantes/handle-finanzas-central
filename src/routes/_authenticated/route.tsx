import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Banknote,
  Send,
  Users,
  UserCog,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { meQuery } from "@/lib/session";
import { roleLabels } from "@/lib/format";
import { toggleTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AppShell,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/finanzas", label: "Finanzas", icon: Banknote },
  { to: "/pagos", label: "Pagos a proveedores", icon: Send },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/colaboradores", label: "Colaboradores", icon: UserCog },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const linkCls =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
  const active = { className: "bg-sidebar-accent text-sidebar-accent-foreground" };
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {nav.map((n) => (
        <Link key={n.to} to={n.to} className={linkCls} activeProps={active} onClick={onNavigate}>
          <n.icon className="size-4" />
          {n.label}
        </Link>
      ))}
      <div className="mt-auto">
        <Link to="/configuracion" className={linkCls} activeProps={active} onClick={onNavigate}>
          <Settings className="size-4" />
          Configuración
        </Link>
      </div>
    </nav>
  );
}

function AppShell() {
  const { data: me } = useQuery(meQuery);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Realtime: refresh lists when payments, transactions or balances change.
  useEffect(() => {
    const ch = supabase.channel(`org-live-${Math.random().toString(36).slice(2)}`);
    for (const table of ["payments", "transactions", "accounts"]) {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, () => qc.invalidateQueries({ queryKey: [table] }));
    }
    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = (me?.full_name ?? me?.email ?? "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-sidebar px-4 py-6 md:flex">
        <div className="mb-10 px-2 pt-1">
          <Logo className="h-8" />
        </div>
        <NavLinks />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-20 flex h-[4.5rem] items-center gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-64 flex-col bg-sidebar p-4">
              <div className="mb-6 px-2 pt-2">
                <Logo />
              </div>
              <NavLinks onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{me?.organizations?.name ?? "…"}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Cambiar tema">
              <Sun className="hidden dark:block" />
              <Moon className="dark:hidden" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="grid size-9 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground" aria-label="Cuenta">
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="truncate">{me?.full_name}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">{me?.email}</p>
                  <p className="mt-1 text-xs font-normal text-primary">{roleLabels[me?.role ?? ""]}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/configuracion" })}>
                  <Settings /> Configuración
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="mx-3 hidden h-8 w-px bg-border sm:block" aria-hidden />
            <Logo className="h-9 pl-1" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
