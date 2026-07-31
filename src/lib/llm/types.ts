export type TestCaseCategory = "FUNCTIONAL" | "NEGATIVE" | "BOUNDARY" | "EDGE";
export type TestCasePriority = "LOW" | "MEDIUM" | "HIGH";

export interface GeneratedTestCase {
  category: TestCaseCategory;
  title: string;
  preconditions?: string;
  steps: string[];
  expectedResult: string;
  priority: TestCasePriority;
}

export interface GenerateTestCasesInput {
  requirementText: string;
}

export interface GenerateTestCasesResult {
  provider: string;
  model: string;
  testCases: GeneratedTestCase[];
}

export interface LLMProvider {
  generateTestCases(
    input: GenerateTestCasesInput,
  ): Promise<GenerateTestCasesResult>;
}
