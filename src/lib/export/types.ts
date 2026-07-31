export interface ExportTestCase {
  category: string;
  title: string;
  preconditions?: string | null;
  steps: string[];
  expectedResult: string;
  priority: string;
}
