import type { ExportTestCase } from "./types";

const CATEGORY_ORDER = ["FUNCTIONAL", "NEGATIVE", "BOUNDARY", "EDGE"];
const CATEGORY_LABELS: Record<string, string> = {
  FUNCTIONAL: "Functional",
  NEGATIVE: "Negative",
  BOUNDARY: "Boundary",
  EDGE: "Edge Case",
};

export function toMarkdown(testCases: ExportTestCase[]): string {
  const byCategory = new Map<string, ExportTestCase[]>();
  for (const tc of testCases) {
    const list = byCategory.get(tc.category) ?? [];
    list.push(tc);
    byCategory.set(tc.category, list);
  }

  const sections = CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((category) => {
    const cases = byCategory.get(category)!;
    const items = cases
      .map((tc) => {
        const steps = tc.steps.map((s, i) => `   ${i + 1}. ${s}`).join("\n");
        const preconditions = tc.preconditions
          ? `\n- **Preconditions:** ${tc.preconditions}`
          : "";
        return `### ${tc.title}\n- **Priority:** ${tc.priority}${preconditions}\n- **Steps:**\n${steps}\n- **Expected Result:** ${tc.expectedResult}`;
      })
      .join("\n\n");
    return `## ${CATEGORY_LABELS[category] ?? category}\n\n${items}`;
  });

  return sections.join("\n\n");
}
