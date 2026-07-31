import * as XLSX from "xlsx";
import type { ExportTestCase } from "./types";

export function toXlsxBuffer(testCases: ExportTestCase[]): Buffer {
  const rows = testCases.map((tc) => ({
    Category: tc.category,
    Title: tc.title,
    Preconditions: tc.preconditions ?? "",
    Steps: tc.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    "Expected Result": tc.expectedResult,
    Priority: tc.priority,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 30 },
    { wch: 25 },
    { wch: 45 },
    { wch: 35 },
    { wch: 10 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Test Cases");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
