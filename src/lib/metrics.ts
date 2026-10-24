export type Metric = { label: string; value: string };

/** Parse "Label: value" lines into metrics. Blank or malformed lines are ignored. */
export function parseMetrics(text: string | null | undefined): Metric[] {
  return String(text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(":");
      return i > 0 ? { label: l.slice(0, i).trim().slice(0, 60), value: l.slice(i + 1).trim().slice(0, 60) } : null;
    })
    .filter((m): m is Metric => !!m && !!m.label && !!m.value)
    .slice(0, 12);
}

export function metricsToText(m: unknown): string {
  return Array.isArray(m) ? (m as Metric[]).map((x) => `${x.label}: ${x.value}`).join("\n") : "";
}
