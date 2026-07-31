import Link from "next/link";
import { db } from "@/lib/db";
import { createProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function HomePage() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { requirementDocs: true } } },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold">AI QA CoPilot</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a requirement doc and generate functional, negative, boundary,
          and edge-case tests.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New project</CardTitle>
          <CardDescription>
            Projects group requirement docs and their generated test runs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createProject} className="flex gap-2">
            <Label htmlFor="name" className="sr-only">
              Project name
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Checkout flow"
              required
              className="flex-1"
            />
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm hover:bg-muted"
                >
                  <span className="font-medium">{project.name}</span>
                  <span className="text-muted-foreground">
                    {project._count.requirementDocs} requirement doc
                    {project._count.requirementDocs === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
