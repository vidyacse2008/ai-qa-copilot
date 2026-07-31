"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getProvider } from "@/lib/llm/provider";

export async function generateTests(requirementDocId: string) {
  const doc = await db.requirementDoc.findUniqueOrThrow({
    where: { id: requirementDocId },
  });

  const run = await db.testRun.create({
    data: { requirementDocId, provider: "", model: "", status: "PENDING" },
  });

  try {
    const provider = getProvider();
    const result = await provider.generateTestCases({ requirementText: doc.rawText });

    await db.testRun.update({
      where: { id: run.id },
      data: { provider: result.provider, model: result.model, status: "COMPLETE" },
    });
    await db.testCase.createMany({
      data: result.testCases.map((tc) => ({
        runId: run.id,
        category: tc.category,
        title: tc.title,
        preconditions: tc.preconditions,
        steps: JSON.stringify(tc.steps),
        expectedResult: tc.expectedResult,
        priority: tc.priority,
      })),
    });
  } catch (err) {
    await db.testRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }

  redirect(`/projects/${doc.projectId}/runs/${run.id}`);
}
