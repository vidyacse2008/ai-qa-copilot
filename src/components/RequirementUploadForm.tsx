import { addRequirementDoc } from "@/app/actions/requirements";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function RequirementUploadForm({ projectId }: { projectId: string }) {
  const action = addRequirementDoc.bind(null, projectId);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pasteText">Paste requirement text</Label>
        <Textarea
          id="pasteText"
          name="pasteText"
          rows={8}
          placeholder="Paste a user story, PRD excerpt, or spec here..."
        />
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="file">Upload a .txt or .md file</Label>
        <Input id="file" name="file" type="file" accept=".txt,.md" />
      </div>
      <Button type="submit" className="self-start">
        Add requirement
      </Button>
    </form>
  );
}
