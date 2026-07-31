import type { ExportTestCase } from "./types";

export function toJson(testCases: ExportTestCase[]): string {
  return JSON.stringify(testCases, null, 2);
}
