const FORMATS = [
  { format: "csv", label: "CSV" },
  { format: "xlsx", label: "Excel" },
  { format: "md", label: "Markdown" },
  { format: "json", label: "JSON" },
];

export function ExportMenu({ runId }: { runId: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="mr-1 text-xs text-muted-foreground">Export:</span>
      {FORMATS.map(({ format, label }) => (
        <a
          key={format}
          href={`/api/runs/${runId}/export/${format}`}
          className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
        >
          {label}
        </a>
      ))}
    </div>
  );
}
