import { LlmClient } from "./client.js";

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
      return this.callGemini<T>(systemPrompt, userText, request.schema, request.seed);
    } else {
      return this.callOpenAi<T>(systemPrompt, userText, request.schema, request.seed);
    }
  }

  private async callGemini<T>(
    system: string,
    input: string,
    schema: unknown,
    seed?: number
  ): Promise<T> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    const body = {
      systemInstruction: {
        parts: [{ text: system }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: input }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
        ...(seed !== undefined ? { seed } : {})
      }
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

    return JSON.parse(text) as T;
  }

  private async callOpenAi<T>(
    system: string,
    input: string,
    schema: unknown,
    seed?: number
  ): Promise<T> {
    const url = "https://api.openai.com/v1/chat/completions";

    const body = {
      model: this.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: input }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "structured_output",
          schema: schema,
          strict: true
        }
      },
      temperature: 0.1,
      ...(seed !== undefined ? { seed } : {})
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
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

    return JSON.parse(text) as T;
  }
}
