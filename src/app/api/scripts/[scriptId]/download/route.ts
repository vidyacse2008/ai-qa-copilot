import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ scriptId: string }> },
) {
  const { scriptId } = await params;

  const script = await db.generatedScript.findUnique({ where: { id: scriptId } });

  if (!script || script.status !== "COMPLETE" || !script.code) {
    return NextResponse.json({ error: "No generated code found for this script." }, { status: 404 });
  }

  return new NextResponse(script.code, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="generated-${script.runId}.spec.ts"`,
    },
  });
}
