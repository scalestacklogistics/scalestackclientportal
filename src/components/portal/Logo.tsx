import { Layers } from "lucide-react";

export function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Layers className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-foreground">ScaleStack</div>
        <div className="text-[11px] text-muted-foreground">{subtitle ?? "Client Portal"}</div>
      </div>
    </div>
  );
}
