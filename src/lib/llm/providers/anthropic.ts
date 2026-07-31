import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type {
  GeneratedTestCase,
  GenerateTestCasesInput,
  GenerateTestCasesResult,
  LLMProvider,
} from "../types";

const MODEL = "claude-sonnet-5";
const SUBMIT_TOOL_NAME = "submit_test_cases";

const testCaseSchema = z.object({
  category: z.enum(["FUNCTIONAL", "NEGATIVE", "BOUNDARY", "EDGE"]),
  title: z.string().min(1),
  preconditions: z.string().optional(),
  steps: z.array(z.string().min(1)).min(1),
  expectedResult: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

const outputSchema = z.object({
  testCases: z.array(testCaseSchema).min(1),
});

const submitTool: Anthropic.Tool = {
  name: SUBMIT_TOOL_NAME,
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

const SYSTEM_PROMPT = `You are a senior QA engineer reviewing a product requirement. Generate a thorough set of test cases covering four categories:
- FUNCTIONAL: core expected behavior described by the requirement.
- NEGATIVE: invalid input, misuse, and error handling.
- BOUNDARY: limits, min/max values, off-by-one conditions.
- EDGE: rare but plausible real-world scenarios not explicitly stated.

Generate at least 3 test cases per category, more if the requirement's complexity warrants it. Each test case must have concrete, actionable steps and a specific expected result grounded in the requirement — avoid vague language like "it should work correctly". Call the submit_test_cases tool exactly once with the complete set.`;

function extractToolUse(message: Anthropic.Message): Anthropic.ToolUseBlock | undefined {
  return message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
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
    const testCases = await this.callModel(input.requirementText);
    return { provider: "anthropic", model: MODEL, testCases };
  }

  private async callModel(requirementText: string): Promise<GeneratedTestCase[]> {
    const userMessage: Anthropic.MessageParam = {
      role: "user",
      content: `Requirement:\n\n${requirementText}`,
    };

    const message = await this.client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      tools: [submitTool],
      tool_choice: { type: "tool", name: SUBMIT_TOOL_NAME },
      messages: [userMessage],
    });

    const toolUse = extractToolUse(message);
    if (!toolUse) {
      throw new Error("Model did not return a tool_use block with test cases.");
    }

    const parsed = outputSchema.safeParse(toolUse.input);
    if (parsed.success) {
      return parsed.data.testCases;
    }

    const retryMessage = await this.client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      tools: [submitTool],
      tool_choice: { type: "tool", name: SUBMIT_TOOL_NAME },
      messages: [
        userMessage,
        { role: "assistant", content: message.content },
        {
          role: "user",
          content: `Your previous submit_test_cases call didn't match the required schema: ${parsed.error.message}. Call submit_test_cases again with valid input.`,
        },
      ],
    });

    const retryToolUse = extractToolUse(retryMessage);
    if (!retryToolUse) {
      throw new Error("Model did not return a tool_use block with test cases on retry.");
    }

    return outputSchema.parse(retryToolUse.input).testCases;
  }
}
