import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";

export default async function ScriptPage({
  params,
}: {
  params: Promise<{ projectId: string; runId: string; scriptId: string }>;
}) {
  const { projectId, runId, scriptId } = await params;

  const script = await db.generatedScript.findUnique({
    where: { id: scriptId },
    include: { run: { include: { requirementDoc: true } } },
  });

  if (
    !script ||
    script.runId !== runId ||
    script.run.requirementDoc.projectId !== projectId
  ) {
    notFound();
  }

  const assumptions = script.assumptions ? (JSON.parse(script.assumptions) as string[]) : [];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-12">
      <div>
        <Link
          href={`/projects/${projectId}/runs/${runId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to test run
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Playwright code</h1>
          {script.status === "COMPLETE" && (
            <a
              href={`/api/scripts/${script.id}/download`}
              className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
            >
              Download .spec.ts
            </a>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {script.baseUrl} ·{" "}
          {script.provider && script.model ? `${script.provider} / ${script.model} · ` : ""}
          {new Date(script.createdAt).toLocaleString()}
        </p>
      </div>

      {script.status === "PENDING" && (
        <p className="text-sm text-muted-foreground">
          Generation is still in progress. Refresh to check again.
        </p>
      )}

      {script.status === "FAILED" && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Generation failed: {script.errorMessage}
        </div>
      )}

      {script.status === "COMPLETE" && (
        <>
          {assumptions.length > 0 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
              <p className="font-medium">Verify before running</p>
              <ul className="mt-1.5 list-disc pl-5 text-muted-foreground">
                {assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Save the file under your Playwright <code>tests/</code> folder and run{" "}
            <code>npx playwright test</code>. Lines marked <code>TODO: verify</code> use guessed
            routes or selectors.
          </p>
          <pre className="overflow-x-auto rounded-md border bg-muted/50 p-4 text-xs leading-relaxed">
            <code>{script.code}</code>
          </pre>
        </>
      )}
    </main>
  );
}
