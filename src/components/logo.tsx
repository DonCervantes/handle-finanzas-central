import logoLight from "@/assets/handle-logo.png.asset.json";
import logoDark from "@/assets/handle-logo-dark.png.asset.json";
import { cn } from "@/lib/utils";

/** Official Handle logo. Swaps to the cream version in dark mode. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-8 items-center", className)}>
      <img src={logoLight.url} alt="Handle" className="h-full w-auto dark:hidden" />
      <img src={logoDark.url} alt="Handle" className="hidden h-full w-auto dark:block" />
    </span>
  );
}
