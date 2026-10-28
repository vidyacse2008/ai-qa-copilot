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
  generatePlaywrightScript(
    input: GeneratePlaywrightScriptInput,
  ): Promise<GeneratePlaywrightScriptResult>;
}

export interface GeneratePlaywrightScriptInput {
  requirementText: string;
  testCases: GeneratedTestCase[];
  baseUrl: string;
  pageContext?: string;
}

export interface GeneratePlaywrightScriptResult {
  provider: string;
  model: string;
  code: string;
  assumptions: string[];
}
