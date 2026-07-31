"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { RequirementSourceType } from "@/generated/prisma/client";

const ALLOWED_EXTENSIONS = [".txt", ".md"];

export async function addRequirementDoc(projectId: string, formData: FormData) {
  const pasteText = String(formData.get("pasteText") ?? "").trim();
  const file = formData.get("file");

  let rawText: string;
  let filename: string | null = null;
  let sourceType: RequirementSourceType;

  if (file instanceof File && file.size > 0) {
    const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );
    if (!hasAllowedExtension) {
      throw new Error("Only .txt or .md files are supported.");
    }
    rawText = await file.text();
    filename = file.name;
    sourceType = "UPLOAD";
  } else if (pasteText) {
    rawText = pasteText;
    sourceType = "PASTE";
  } else {
    throw new Error("Paste requirement text or upload a .txt/.md file.");
  }

  await db.requirementDoc.create({
    data: { projectId, filename, sourceType, rawText },
  });

  redirect(`/projects/${projectId}`);
}
