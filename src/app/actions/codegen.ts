"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getProvider } from "@/lib/llm/provider";
import type { GeneratedTestCase } from "@/lib/llm/types";

function parseBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString().replace(/\/$/, "");
    }
  } catch {}
  throw new Error("Base URL must be a full http(s) URL, e.g. https://staging.example.com");
}

export async function generatePlaywrightScript(runId: string, formData: FormData) {
  const baseUrl = parseBaseUrl(String(formData.get("baseUrl") ?? "").trim());
  const pageContext = String(formData.get("pageContext") ?? "").trim() || null;

  const run = await db.testRun.findUniqueOrThrow({
    where: { id: runId },
    include: {
      requirementDoc: true,
      testCases: { orderBy: [{ category: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (run.status !== "COMPLETE" || run.testCases.length === 0) {
    throw new Error("Playwright code can only be generated from a completed run with test cases.");
  }

  const script = await db.generatedScript.create({
    data: { runId, baseUrl, pageContext, provider: "", model: "", status: "PENDING" },
  });

  try {
    const provider = getProvider();
    const result = await provider.generatePlaywrightScript({
      requirementText: run.requirementDoc.rawText,
      baseUrl,
      pageContext: pageContext ?? undefined,
      testCases: run.testCases.map(
        (tc): GeneratedTestCase => ({
          category: tc.category,
          title: tc.title,
          preconditions: tc.preconditions ?? undefined,
          steps: JSON.parse(tc.steps) as string[],
          expectedResult: tc.expectedResult,
          priority: tc.priority,
        }),
      ),
    });

    await db.generatedScript.update({
      where: { id: script.id },
      data: {
        provider: result.provider,
        model: result.model,
        status: "COMPLETE",
        code: result.code,
        assumptions: JSON.stringify(result.assumptions),
      },
    });
  } catch (err) {
    await db.generatedScript.update({
      where: { id: script.id },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }

  redirect(`/projects/${run.requirementDoc.projectId}/runs/${runId}/scripts/${script.id}`);
}
