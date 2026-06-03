import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FallbackLlmClient, ApiLlmClient } from "../src/agents/llm/api_client.js";
import { MockLlmClient } from "../src/agents/llm/mock_client.js";

describe("FallbackLlmClient & ApiLlmClient environment resolution and fallback", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should fall back to MockLlmClient when no API keys are present", () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const client = new FallbackLlmClient();
    expect(client.getIsFallback()).toBe(true);
    expect(client.getActiveClient()).toBeInstanceOf(MockLlmClient);
  });

  it("should initialize ApiLlmClient in Gemini mode if GEMINI_API_KEY is set", () => {
    process.env.GEMINI_API_KEY = "dummy-gemini-key";
    delete process.env.OPENAI_API_KEY;

    const client = new FallbackLlmClient();
    expect(client.getIsFallback()).toBe(false);
    expect(client.getActiveClient()).toBeInstanceOf(ApiLlmClient);
    
    const apiCli = client.getActiveClient() as ApiLlmClient;
    expect((apiCli as any).apiType).toBe("gemini");
    expect((apiCli as any).apiKey).toBe("dummy-gemini-key");
    expect((apiCli as any).model).toBe("gemini-1.5-flash");
  });

  it("should initialize ApiLlmClient in OpenAI mode if OPENAI_API_KEY is set and GEMINI_API_KEY is not", () => {
    delete process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = "dummy-openai-key";

    const client = new FallbackLlmClient();
    expect(client.getIsFallback()).toBe(false);
    expect(client.getActiveClient()).toBeInstanceOf(ApiLlmClient);
    
    const apiCli = client.getActiveClient() as ApiLlmClient;
    expect((apiCli as any).apiType).toBe("openai");
    expect((apiCli as any).apiKey).toBe("dummy-openai-key");
    expect((apiCli as any).model).toBe("gpt-4o-mini");
  });

  it("should respect GEMINI_MODEL or OPENAI_MODEL environment variables", () => {
    process.env.GEMINI_API_KEY = "dummy-gemini-key";
    process.env.GEMINI_MODEL = "gemini-2.0-pro";

    const client = new FallbackLlmClient();
    const apiCli = client.getActiveClient() as ApiLlmClient;
    expect((apiCli as any).model).toBe("gemini-2.0-pro");
  });

  it("should call fetch with correct URL and body for Gemini API", async () => {
    process.env.GEMINI_API_KEY = "dummy-gemini-key";
    process.env.GEMINI_MODEL = "gemini-1.5-flash";
    delete process.env.OPENAI_API_KEY;

    const mockResponseData = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({ response: "gemini-success" })
              }
            ]
          }
        }
      ]
    };

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponseData
    });
    vi.stubGlobal("fetch", fetchSpy);

    const client = new FallbackLlmClient();
    const result = await client.completeJson<{ response: string }>({
      role: "writer",
      system: "system-instructions",
      input: { text: "hello" },
      schema: { type: "object" },
      seed: 42
    });

    expect(result.response).toBe("gemini-success");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    
    const [calledUrl, calledOptions] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=dummy-gemini-key");
    expect(calledOptions.method).toBe("POST");
    expect(calledOptions.headers).toEqual({ "Content-Type": "application/json" });
    
    const parsedBody = JSON.parse(calledOptions.body as string);
    expect(parsedBody.systemInstruction.parts[0].text).toBe("system-instructions\n\nYou are executing the role: writer. You MUST respond with a valid JSON object matching the requested schema.");
    expect(parsedBody.contents[0].parts[0].text).toBe(JSON.stringify({ text: "hello" }));
    expect(parsedBody.generationConfig.responseMimeType).toBe("application/json");
    expect(parsedBody.generationConfig.seed).toBe(42);

    vi.unstubAllGlobals();
  });

  it("should call fetch with correct URL and body for OpenAI API", async () => {
    delete process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = "dummy-openai-key";
    process.env.OPENAI_MODEL = "gpt-4o-mini";

    const mockResponseData = {
      choices: [
        {
          message: {
            content: JSON.stringify({ response: "openai-success" })
          }
        }
      ]
    };

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponseData
    });
    vi.stubGlobal("fetch", fetchSpy);

    const client = new FallbackLlmClient();
    const result = await client.completeJson<{ response: string }>({
      role: "writer",
      system: "system-instructions",
      input: { text: "hello" },
      schema: { type: "object" },
      seed: 42
    });

    expect(result.response).toBe("openai-success");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    
    const [calledUrl, calledOptions] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe("https://api.openai.com/v1/chat/completions");
    expect(calledOptions.method).toBe("POST");
    expect(calledOptions.headers).toEqual({
      "Content-Type": "application/json",
      "Authorization": "Bearer dummy-openai-key"
    });
    
    const parsedBody = JSON.parse(calledOptions.body as string);
    expect(parsedBody.model).toBe("gpt-4o-mini");
    expect(parsedBody.messages[0]).toEqual({ role: "system", content: "system-instructions\n\nYou are executing the role: writer. You MUST respond with a valid JSON object matching the requested schema." });
    expect(parsedBody.messages[1]).toEqual({ role: "user", content: JSON.stringify({ text: "hello" }) });
    expect(parsedBody.response_format.type).toBe("json_schema");
    expect(parsedBody.response_format.json_schema.schema).toEqual({ type: "object" });
    expect(parsedBody.seed).toBe(42);

    vi.unstubAllGlobals();
  });
});
