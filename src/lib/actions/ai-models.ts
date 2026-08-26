"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { decryptSecret } from "@/lib/crypto";
import { OPENAI_COMPATIBLE_BASE_URL } from "@/lib/ai-providers";
import type { AiProviderId } from "@/lib/ai-provider-labels";
import { toActionResult, UserFacingError, type ActionResult } from "@/lib/action-result";

const TIMEOUT_MS = 15000;

/**
 * Model names that exist on an OpenAI-compatible /models listing but can't
 * serve a chat completion — embeddings, speech, images, moderation and the
 * legacy completions-only families. Left in, they'd fill the dropdown with
 * choices that fail at call time with an opaque 400.
 */
const NON_CHAT = /embed|whisper|tts|dall-e|moderation|davinci|babbage|image|audio|rerank|sora|realtime|transcribe|search-|codex-mini/i;

async function getJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { headers, signal: controller.signal });
  } catch {
    throw new UserFacingError("连接服务商超时，请检查网络或代理设置");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[ai-models] ${response.status} ${url}`, detail.slice(0, 300));
    if (response.status === 401 || response.status === 403) {
      throw new UserFacingError("API Key 无效，拉不到模型列表");
    }
    if (response.status === 404) {
      throw new UserFacingError("这个服务商的地址不支持列模型，请手动填模型名");
    }
    throw new UserFacingError("服务商暂时没响应，请稍后重试或手动填模型名");
  }
  return response.json();
}

/**
 * Asks the provider itself which models this key can call, instead of
 * shipping a hardcoded list that goes stale. `apiKey` may be passed
 * directly so the button works while first configuring a provider, before
 * the key has been saved; when omitted the stored (encrypted) key is used.
 */
export async function listProviderModels(input: {
  provider: AiProviderId;
  apiKey?: string;
}): Promise<ActionResult<{ models: string[] }>> {
  return toActionResult(async () => {
    const user = await requireUser();
    const { provider } = input;

    let apiKey = input.apiKey?.trim();
    if (!apiKey) {
      const stored = await db.aiKey.findUnique({
        where: { userId_provider: { userId: user.id, provider } },
      });
      if (!stored) throw new UserFacingError("先填上 API Key，再拉模型列表");
      apiKey = decryptSecret(stored.apiKeyEncrypted);
    }

    let models: string[];

    if (provider === "gemini") {
      const data = (await getJson(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=200`,
        {}
      )) as { models?: { name?: string; supportedGenerationMethods?: string[] }[] };
      models = (data.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => (m.name ?? "").replace(/^models\//, ""))
        .filter((m) => m.startsWith("gemini"));
    } else if (provider === "anthropic") {
      const data = (await getJson("https://api.anthropic.com/v1/models?limit=100", {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      })) as { data?: { id?: string }[] };
      models = (data.data ?? []).map((m) => m.id ?? "").filter(Boolean);
    } else {
      const base = OPENAI_COMPATIBLE_BASE_URL[provider as keyof typeof OPENAI_COMPATIBLE_BASE_URL];
      const data = (await getJson(`${base.replace(/\/$/, "")}/models`, {
        Authorization: `Bearer ${apiKey}`,
      })) as { data?: { id?: string }[] };
      models = (data.data ?? [])
        .map((m) => m.id ?? "")
        .filter((id) => id && !NON_CHAT.test(id));
    }

    models = Array.from(new Set(models)).sort((a, b) =>
      b.localeCompare(a, "en", { numeric: true })
    );

    if (models.length === 0) {
      throw new UserFacingError("服务商没返回任何可用模型，请手动填模型名");
    }
    return { models };
  });
}
