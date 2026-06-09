import { LlmClient } from "./client.js";
import { MockLlmClient } from "./mock_client.js";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * A highly robust, zero-dependency API client that implements the LlmClient interface.
 * Natively supports Gemini API and OpenAI API using standard Node.js fetch
 * with structured JSON output enforcing schemas.
 */
export class ApiLlmClient implements LlmClient {
  private apiType: "gemini" | "openai" | "none" = "none";
  private apiKey: string = "";
  private model: string = "";

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.apiType = "gemini";
      this.apiKey = process.env.GEMINI_API_KEY;
      this.model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    } else if (process.env.OPENAI_API_KEY) {
      this.apiType = "openai";
      this.apiKey = process.env.OPENAI_API_KEY;
      this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    }
  }

  private recordTokenUsage(role: string, model: string, promptTokens: number, completionTokens: number) {
    try {
      const logDir = path.resolve("traces");
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logPath = path.join(logDir, "token_usage.jsonl");

      // Compute estimated cost in USD
      let inputCostPerMillion = 0.15;
      let outputCostPerMillion = 0.60;

      const lowerModel = model.toLowerCase();
      if (lowerModel.includes("gemini-1.5-flash")) {
        inputCostPerMillion = 0.075;
        outputCostPerMillion = 0.30;
      } else if (lowerModel.includes("gpt-4o-mini")) {
        inputCostPerMillion = 0.15;
        outputCostPerMillion = 0.60;
      } else if (lowerModel.includes("opus-4-8")) {
        // Claude Opus 4.8 Fast Mode pricing as of June 2026 web search
        inputCostPerMillion = 10.0;
        outputCostPerMillion = 50.0;
      } else if (lowerModel.includes("gpt-4o")) {
        inputCostPerMillion = 5.0;
        outputCostPerMillion = 15.0;
      } else if (lowerModel.includes("gemini-1.5-pro")) {
        inputCostPerMillion = 1.25;
        outputCostPerMillion = 5.00;
      }

      const costUsd = (promptTokens * inputCostPerMillion + completionTokens * outputCostPerMillion) / 1000000;

      const logLine = JSON.stringify({
        timestamp: new Date().toISOString(),
        model,
        role,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        costUsd: parseFloat(costUsd.toFixed(6)),
      }) + "\n";

      fs.appendFileSync(logPath, logLine, "utf-8");
    } catch (err) {
      console.warn("⚠️ Failed to write token usage log:", err);
    }
  }

  async completeJson<T>(request: {
    role: "writer" | "adapter" | "playtester" | "debugger" | "fixer";
    system: string;
    input: unknown;
    schema: unknown;
    seed?: number;
  }): Promise<T> {
    if (this.apiType === "none") {
      throw new Error(
        "❌ ApiLlmClient: No API key found. Please set GEMINI_API_KEY or OPENAI_API_KEY environment variables."
      );
    }

    const systemPrompt = `${request.system}\n\nYou are executing the role: ${request.role}. You MUST respond with a valid JSON object matching the requested schema.`;
    const userText = JSON.stringify(request.input);

    if (this.apiType === "gemini") {
      return this.callGemini<T>(request.role, systemPrompt, userText, request.schema, request.seed);
    } else {
      return this.callOpenAi<T>(request.role, systemPrompt, userText, request.schema, request.seed);
    }
  }

  private async callGemini<T>(role: string, system: string, input: string, schema: unknown, seed?: number): Promise<T> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: input }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
        ...(seed !== undefined ? { seed } : {}),
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API Request failed with status ${res.status}: ${errText}`);
    }

    const data: any = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini API returned an empty or invalid response structure.");
    }

    const promptTokens = data.usageMetadata?.promptTokenCount ?? 0;
    const completionTokens = data.usageMetadata?.candidatesTokenCount ?? 0;
    this.recordTokenUsage(role, this.model, promptTokens, completionTokens);

    return JSON.parse(text) as T;
  }

  private async callOpenAi<T>(role: string, system: string, input: string, schema: unknown, seed?: number): Promise<T> {
    const url = "https://api.openai.com/v1/chat/completions";

    const body = {
      model: this.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: input },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "structured_output",
          schema: schema,
          strict: true,
        },
      },
      temperature: 0.1,
      ...(seed !== undefined ? { seed } : {}),
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API Request failed with status ${res.status}: ${errText}`);
    }

    const data: any = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("OpenAI API returned an empty or invalid response structure.");
    }

    const promptTokens = data.usage?.prompt_tokens ?? 0;
    const completionTokens = data.usage?.completion_tokens ?? 0;
    this.recordTokenUsage(role, this.model, promptTokens, completionTokens);

    return JSON.parse(text) as T;
  }
}

/**
 * A wrapper LLM client that automatically detects available environment variables for
 * Gemini or OpenAI API keys, initializing ApiLlmClient, and gracefully falls back to
 * MockLlmClient if no API keys are configured.
 */
export class FallbackLlmClient implements LlmClient {
  private activeClient: LlmClient;
  private isFallback: boolean = false;

  constructor(customMockAdapterResponse?: any) {
    if (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
      this.activeClient = new ApiLlmClient();
    } else {
      this.activeClient = new MockLlmClient(customMockAdapterResponse);
      this.isFallback = true;
    }
  }

  /**
   * Returns true if the client has fallen back to the MockLlmClient.
   */
  getIsFallback(): boolean {
    return this.isFallback;
  }

  /**
   * Returns the underlying LlmClient instance (either ApiLlmClient or MockLlmClient).
   */
  getActiveClient(): LlmClient {
    return this.activeClient;
  }

  async completeJson<T>(request: {
    role: "writer" | "adapter" | "playtester" | "debugger" | "fixer";
    system: string;
    input: unknown;
    schema: unknown;
    seed?: number;
  }): Promise<T> {
    try {
      return await this.activeClient.completeJson<T>(request);
    } catch (err) {
      if (this.activeClient instanceof ApiLlmClient) {
        console.warn(
          `⚠️ FallbackLlmClient: ApiLlmClient failed (Error: ${err instanceof Error ? err.message : String(err)}). Falling back to MockLlmClient.`
        );
        this.activeClient = new MockLlmClient();
        this.isFallback = true;
        return this.activeClient.completeJson<T>(request);
      }
      throw err;
    }
  }
}
