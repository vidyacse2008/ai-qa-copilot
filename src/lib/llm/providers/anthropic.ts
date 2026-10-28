import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type {
  GeneratedTestCase,
  GeneratePlaywrightScriptInput,
  GeneratePlaywrightScriptResult,
  GenerateTestCasesInput,
  GenerateTestCasesResult,
  LLMProvider,
} from "../types";

const MODEL = "claude-sonnet-5";
// Hard deadline per model call. Without it a stalled stream can leave a run
// PENDING for ~30 minutes (SDK default: 10 min timeout x 3 attempts).
const REQUEST_DEADLINE_MS = 5 * 60_000;

// ---------------------------------------------------------------------------
// Test case generation
// ---------------------------------------------------------------------------

const testCaseSchema = z.object({
  category: z.enum(["FUNCTIONAL", "NEGATIVE", "BOUNDARY", "EDGE"]),
  title: z.string().min(1),
  preconditions: z.string().optional(),
  steps: z.array(z.string().min(1)).min(1),
  expectedResult: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

const testCasesOutputSchema = z.object({
  testCases: z.array(testCaseSchema).min(1),
});

const submitTestCasesTool: Anthropic.Tool = {
  name: "submit_test_cases",
  description: "Submit the generated set of QA test cases.",
  input_schema: {
    type: "object",
    properties: {
      testCases: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["FUNCTIONAL", "NEGATIVE", "BOUNDARY", "EDGE"],
              description:
                "FUNCTIONAL = core expected behavior. NEGATIVE = invalid input / misuse / error handling. BOUNDARY = limits, min/max, off-by-one values. EDGE = rare but plausible real-world scenarios.",
            },
            title: { type: "string" },
            preconditions: {
              type: "string",
              description: "State the system must be in before running this test, if any.",
            },
            steps: {
              type: "array",
              items: { type: "string" },
              description: "Concrete, ordered steps to execute the test.",
            },
            expectedResult: { type: "string" },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
          },
          required: ["category", "title", "steps", "expectedResult", "priority"],
        },
      },
    },
    required: ["testCases"],
  },
};

const TEST_CASES_SYSTEM_PROMPT = `You are a senior QA engineer reviewing a product requirement. Generate a thorough set of test cases covering four categories:
- FUNCTIONAL: core expected behavior described by the requirement.
- NEGATIVE: invalid input, misuse, and error handling.
- BOUNDARY: limits, min/max values, off-by-one conditions.
- EDGE: rare but plausible real-world scenarios not explicitly stated.

Generate at least 3 test cases per category, more if the requirement's complexity warrants it. Each test case must have concrete, actionable steps and a specific expected result grounded in the requirement — avoid vague language like "it should work correctly". Call the submit_test_cases tool exactly once with the complete set.`;

// ---------------------------------------------------------------------------
// Playwright code generation
// ---------------------------------------------------------------------------

const playwrightOutputSchema = z.object({
  code: z
    .string()
    .min(1)
    .refine((code) => code.includes("@playwright/test"), {
      message: "code must import from @playwright/test",
    }),
  assumptions: z.array(z.string()),
});

const submitPlaywrightTool: Anthropic.Tool = {
  name: "submit_playwright_spec",
  description: "Submit the generated Playwright test file.",
  input_schema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description:
          "The complete contents of a single TypeScript Playwright spec file (.spec.ts).",
      },
      assumptions: {
        type: "array",
        items: { type: "string" },
        description:
          "Assumptions you made that a human must verify, e.g. guessed selectors, routes, or test data.",
      },
    },
    required: ["code", "assumptions"],
  },
};

const PLAYWRIGHT_SYSTEM_PROMPT = `You are a senior SDET who writes Playwright tests in TypeScript. You will receive a product requirement, a list of manual test cases derived from it, the base URL of the application under test, and optionally some details about its pages (HTML, selectors, or a description of the UI).

Convert the test cases into one runnable Playwright spec file:
- Import only from "@playwright/test". Set the base URL with test.use({ baseURL: ... }) and navigate with relative paths.
- Group tests with test.describe by category (Functional, Negative, Boundary, Edge Case). Write one test per test case and use the test case title as the test name.
- Follow the test case steps, and turn the expected result into concrete expect() assertions.
- Prefer user-facing locators: getByRole, getByLabel, getByPlaceholder, getByText. Use CSS selectors only when the page details give them to you.
- You cannot see the real application. Wherever you guess a route, selector, or piece of test data, add a "// TODO: verify" comment on that line, and list the guess in assumptions.
- If a test case cannot be automated reliably in the browser (for example it needs an email inbox, a second device, or waiting for days), keep it as test.fixme with a short comment explaining why.
- Put shared setup (such as logging in) in test.beforeEach or a small helper function inside the file. Do not invent page-object files or other imports.

Call the submit_playwright_spec tool exactly once with the complete file.`;

function formatTestCasesForPrompt(testCases: GeneratedTestCase[]): string {
  return testCases
    .map((tc, i) => {
      const steps = tc.steps.map((s, j) => `   ${j + 1}. ${s}`).join("\n");
      const preconditions = tc.preconditions ? `\nPreconditions: ${tc.preconditions}` : "";
      return `${i + 1}. [${tc.category}] [${tc.priority}] ${tc.title}${preconditions}\nSteps:\n${steps}\nExpected result: ${tc.expectedResult}`;
    })
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function extractToolUse(message: Anthropic.Message): Anthropic.ToolUseBlock | undefined {
  return message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
}

interface ToolCallOptions<T> {
  system: string;
  tool: Anthropic.Tool;
  schema: z.ZodType<T>;
  userContent: string;
  maxTokens: number;
}

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Add it to .env.local (see .env.local.example).",
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  async generateTestCases(
    input: GenerateTestCasesInput,
  ): Promise<GenerateTestCasesResult> {
    const { testCases } = await this.callTool({
      system: TEST_CASES_SYSTEM_PROMPT,
      tool: submitTestCasesTool,
      schema: testCasesOutputSchema,
      userContent: `Requirement:\n\n${input.requirementText}`,
      maxTokens: 16000,
    });
    return { provider: "anthropic", model: MODEL, testCases };
  }

  async generatePlaywrightScript(
    input: GeneratePlaywrightScriptInput,
  ): Promise<GeneratePlaywrightScriptResult> {
    const pageContext = input.pageContext
      ? `\n\nPage details:\n\n${input.pageContext}`
      : "\n\nPage details: none provided. Infer reasonable routes and accessible names from the requirement.";

    const { code, assumptions } = await this.callTool({
      system: PLAYWRIGHT_SYSTEM_PROMPT,
      tool: submitPlaywrightTool,
      schema: playwrightOutputSchema,
      userContent: `Base URL: ${input.baseUrl}${pageContext}\n\nRequirement:\n\n${input.requirementText}\n\nTest cases:\n\n${formatTestCasesForPrompt(input.testCases)}`,
      maxTokens: 32000,
    });
    return { provider: "anthropic", model: MODEL, code, assumptions };
  }

  // Forces a single tool call, validates its input with zod, and retries once
  // with the validation error if the model's output doesn't match the schema.
  private async callTool<T>({
    system,
    tool,
    schema,
    userContent,
    maxTokens,
  }: ToolCallOptions<T>): Promise<T> {
    const userMessage: Anthropic.MessageParam = { role: "user", content: userContent };

    const message = await this.createMessage(system, tool, maxTokens, [userMessage]);
    const toolUse = extractToolUse(message);
    if (!toolUse) {
      throw new Error(`Model did not return a ${tool.name} tool call.`);
    }

    const parsed = schema.safeParse(toolUse.input);
    if (parsed.success) {
      return parsed.data;
    }

    const retryMessage = await this.createMessage(system, tool, maxTokens, [
      userMessage,
      { role: "assistant", content: message.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: true,
            content: `Your ${tool.name} call didn't match the required schema: ${parsed.error.message}. Call ${tool.name} again with valid input.`,
          },
        ],
      },
    ]);

    const retryToolUse = extractToolUse(retryMessage);
    if (!retryToolUse) {
      throw new Error(`Model did not return a ${tool.name} tool call on retry.`);
    }

    return schema.parse(retryToolUse.input);
  }

  // Streams the request so long outputs (like a full spec file) don't hit the
  // HTTP timeout, then returns the complete message.
  private async createMessage(
    system: string,
    tool: Anthropic.Tool,
    maxTokens: number,
    messages: Anthropic.MessageParam[],
  ): Promise<Anthropic.Message> {
    const message = await this.client.messages
      .stream({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        tools: [tool],
        tool_choice: { type: "tool", name: tool.name },
        messages,
      }, { signal: AbortSignal.timeout(REQUEST_DEADLINE_MS) })
      .finalMessage()
      .catch((err) => {
        if (err instanceof Anthropic.APIUserAbortError) {
          throw new Error(
            `Model call did not finish within ${REQUEST_DEADLINE_MS / 60_000} minutes. Try again.`,
          );
        }
        throw err;
      });

    if (message.stop_reason === "max_tokens") {
      throw new Error(
        `Model output hit the ${maxTokens}-token limit before finishing. Try fewer test cases.`,
      );
    }
    if (message.stop_reason === "refusal") {
      throw new Error("Model declined to complete this request.");
    }
    return message;
  }
}
