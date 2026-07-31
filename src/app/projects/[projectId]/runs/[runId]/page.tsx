import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { TestCaseTable } from "@/components/TestCaseTable";
import { ExportMenu } from "@/components/ExportMenu";

export default async function RunPage({
  params,
}: {
  params: Promise<{ projectId: string; runId: string }>;
}) {
  const { projectId, runId } = await params;

  const run = await db.testRun.findUnique({
    where: { id: runId },
    include: {
      testCases: { orderBy: [{ category: "asc" }, { createdAt: "asc" }] },
      requirementDoc: true,
    },
  });

  if (!run || run.requirementDoc.projectId !== projectId) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-12">
      <div>
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to project
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Test run</h1>
          {run.status === "COMPLETE" && <ExportMenu runId={run.id} />}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {run.provider && run.model ? `${run.provider} / ${run.model} · ` : ""}
          {new Date(run.createdAt).toLocaleString()}
        </p>
      </div>

      {run.status === "PENDING" && (
        <p className="text-sm text-muted-foreground">
          Generation is still in progress. Refresh to check again.
        </p>
      )}

      {run.status === "FAILED" && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Generation failed: {run.errorMessage}
        </div>
      )}

      {run.status === "COMPLETE" && (
        <TestCaseTable
          testCases={run.testCases.map((tc) => ({
            id: tc.id,
            category: tc.category,
            title: tc.title,
            preconditions: tc.preconditions,
            steps: JSON.parse(tc.steps) as string[],
            expectedResult: tc.expectedResult,
            priority: tc.priority,
          }))}
        />
      )}
    </main>
  );
}
