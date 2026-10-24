import type { Metric } from "@/lib/metrics";

export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  if (!metrics.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="min-w-0 rounded-lg border bg-background p-3">
          <div className="truncate text-xs text-muted-foreground">{m.label}</div>
          <div className="mt-1 truncate text-lg font-semibold">{m.value}</div>
        </div>
      ))}
    </div>
  );
}
