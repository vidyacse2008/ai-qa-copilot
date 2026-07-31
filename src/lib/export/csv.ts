import type { ExportTestCase } from "./types";

const HEADERS = [
  "Category",
  "Title",
  "Preconditions",
  "Steps",
  "Expected Result",
  "Priority",
];

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(testCases: ExportTestCase[]): string {
  const rows = testCases.map((tc) =>
    [
      tc.category,
      tc.title,
      tc.preconditions ?? "",
      tc.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
      tc.expectedResult,
      tc.priority,
    ]
      .map(escapeCsvCell)
      .join(","),
  );
  return [HEADERS.join(","), ...rows].join("\n");
}
