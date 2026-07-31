import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/export/csv";
import { toXlsxBuffer } from "@/lib/export/xlsx";
import { toMarkdown } from "@/lib/export/markdown";
import { toJson } from "@/lib/export/json";
import type { ExportTestCase } from "@/lib/export/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string; format: string }> },
) {
  const { runId, format } = await params;

  const testCases = await db.testCase.findMany({
    where: { runId },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  if (testCases.length === 0) {
    return NextResponse.json({ error: "No test cases found for this run." }, { status: 404 });
  }

  const exportCases: ExportTestCase[] = testCases.map((tc) => ({
    category: tc.category,
    title: tc.title,
    preconditions: tc.preconditions,
    steps: JSON.parse(tc.steps) as string[],
    expectedResult: tc.expectedResult,
    priority: tc.priority,
  }));

  const filenameBase = `test-cases-${runId}`;

  switch (format) {
    case "csv":
      return new NextResponse(toCsv(exportCases), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
        },
      });
    case "xlsx":
      return new NextResponse(new Uint8Array(toXlsxBuffer(exportCases)), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
        },
      });
    case "md":
      return new NextResponse(toMarkdown(exportCases), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filenameBase}.md"`,
        },
      });
    case "json":
      return new NextResponse(toJson(exportCases), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filenameBase}.json"`,
        },
      });
    default:
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }
}
