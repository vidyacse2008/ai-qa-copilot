import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TestCaseRow {
  id: string;
  category: string;
  title: string;
  preconditions?: string | null;
  steps: string[];
  expectedResult: string;
  priority: string;
}

const CATEGORIES = [
  { value: "ALL", label: "All" },
  { value: "FUNCTIONAL", label: "Functional" },
  { value: "NEGATIVE", label: "Negative" },
  { value: "BOUNDARY", label: "Boundary" },
  { value: "EDGE", label: "Edge Case" },
];

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  HIGH: "default",
  MEDIUM: "secondary",
  LOW: "outline",
};

export function TestCaseTable({ testCases }: { testCases: TestCaseRow[] }) {
  return (
    <Tabs defaultValue="ALL">
      <TabsList>
        {CATEGORIES.map((c) => (
          <TabsTrigger key={c.value} value={c.value}>
            {c.label}
            {c.value !== "ALL" && (
              <span className="ml-1 text-muted-foreground">
                ({testCases.filter((tc) => tc.category === c.value).length})
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {CATEGORIES.map((c) => {
        const rows =
          c.value === "ALL"
            ? testCases
            : testCases.filter((tc) => tc.category === c.value);
        return (
          <TabsContent key={c.value} value={c.value} className="mt-3">
            {rows.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                No test cases in this category.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Preconditions</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Expected Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((tc) => (
                    <TableRow key={tc.id}>
                      <TableCell className="max-w-48 align-top font-medium whitespace-normal">
                        {tc.title}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={PRIORITY_VARIANT[tc.priority] ?? "outline"}>
                          {tc.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-48 align-top whitespace-normal text-muted-foreground">
                        {tc.preconditions ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-64 align-top whitespace-normal">
                        <ol className="list-decimal space-y-0.5 pl-4">
                          {tc.steps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </TableCell>
                      <TableCell className="max-w-64 align-top whitespace-normal">
                        {tc.expectedResult}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
