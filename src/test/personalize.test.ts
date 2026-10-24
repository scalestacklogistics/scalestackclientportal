import { describe, expect, it } from "vitest";
import { sectionsFor } from "@/lib/personalize";

describe("dashboard personalization", () => {
  it("ads client sees performance, not project sections", () =>
    expect(sectionsFor(["ads"])).toEqual({ performance: true, projects: false, deliverables: false }));
  it("website client sees projects and deliverables, not performance", () =>
    expect(sectionsFor(["website"])).toEqual({ performance: false, projects: true, deliverables: true }));
  it("client with no services sees no specialised sections", () =>
    expect(sectionsFor([])).toEqual({ performance: false, projects: false, deliverables: false }));
});
