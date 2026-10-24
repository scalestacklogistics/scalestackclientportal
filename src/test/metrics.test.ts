import { describe, expect, it } from "vitest";
import { parseMetrics } from "@/lib/metrics";

describe("report metrics", () => {
  it("parses label: value lines", () =>
    expect(parseMetrics("ROAS: 4.2x\nClicks: 1,240")).toEqual([
      { label: "ROAS", value: "4.2x" },
      { label: "Clicks", value: "1,240" },
    ]));
  it("ignores lines without a value", () => expect(parseMetrics("Nothing here\nCTR:")).toEqual([]));
  it("keeps colons inside values", () => expect(parseMetrics("Avg time: 2:30")).toEqual([{ label: "Avg time", value: "2:30" }]));
});
