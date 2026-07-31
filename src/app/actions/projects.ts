"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Project name is required.");
  }

  const project = await db.project.create({ data: { name } });
  redirect(`/projects/${project.id}`);
}
