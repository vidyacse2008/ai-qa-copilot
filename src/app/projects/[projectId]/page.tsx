import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { generateTests } from "@/app/actions/generation";
import { RequirementUploadForm } from "@/components/RequirementUploadForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  COMPLETE: "default",
  FAILED: "destructive",
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      requirementDocs: {
        orderBy: { createdAt: "desc" },
        include: {
          runs: {
            orderBy: { createdAt: "desc" },
            include: { _count: { select: { testCases: true } } },
          },
        },
      },
    },
  });

  if (!project) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <div>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← All projects
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{project.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a requirement</CardTitle>
          <CardDescription>
            Paste text or upload a .txt/.md file, then generate test cases
            from it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequirementUploadForm projectId={project.id} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Requirement docs</h2>
        {project.requirementDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No requirement docs yet — add one above to get started.
          </p>
        ) : (
          project.requirementDocs.map((doc) => (
            <Card key={doc.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {doc.filename ?? "Pasted requirement"}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {doc.rawText}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <form action={generateTests.bind(null, doc.id)}>
                  <Button type="submit" size="sm">
                    Generate tests
                  </Button>
                </form>

                {doc.runs.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {doc.runs.map((run) => (
                      <li key={run.id}>
                        <Link
                          href={`/projects/${project.id}/runs/${run.id}`}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted"
                        >
                          <span className="flex items-center gap-2">
                            <Badge variant={STATUS_VARIANT[run.status] ?? "outline"}>
                              {run.status}
                            </Badge>
                            {new Date(run.createdAt).toLocaleString()}
                          </span>
                          <span className="text-muted-foreground">
                            {run._count.testCases} test case
                            {run._count.testCases === 1 ? "" : "s"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
