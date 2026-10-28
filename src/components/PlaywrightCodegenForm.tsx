import { generatePlaywrightScript } from "@/app/actions/codegen";
import { SubmitButton } from "@/components/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PlaywrightCodegenForm({ runId }: { runId: string }) {
  const action = generatePlaywrightScript.bind(null, runId);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="baseUrl">Base URL of the app under test</Label>
        <Input
          id="baseUrl"
          name="baseUrl"
          type="url"
          required
          placeholder="https://staging.example.com"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pageContext">Page details (optional)</Label>
        <Textarea
          id="pageContext"
          name="pageContext"
          rows={5}
          placeholder="Paste HTML, known selectors, routes, or a short description of the UI. Without this, selectors are best guesses."
        />
      </div>
      <SubmitButton className="self-start" pendingText="Generating code…">
        Generate Playwright code
      </SubmitButton>
    </form>
  );
}
