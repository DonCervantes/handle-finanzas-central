import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="bg-brand-gradient grid size-7 place-items-center rounded-lg text-primary-foreground shadow-soft">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M7 4v16M17 4v16M7 12h10" />
        </svg>
      </span>
      <span className="text-lg">Handle</span>
    </span>
  );
}
