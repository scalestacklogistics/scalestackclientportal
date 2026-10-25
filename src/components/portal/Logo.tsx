import logoAsset from "@/assets/scalestack-logo.png.asset.json";

export function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src={logoAsset.url} alt="ScaleStack Technologies" className="h-8 w-auto shrink-0" />
      <div className="leading-tight">
        <div className="text-sm font-semibold text-foreground">ScaleStack</div>
        <div className="text-[11px] text-muted-foreground">{subtitle ?? "Client Portal"}</div>
      </div>
    </div>
  );
}
