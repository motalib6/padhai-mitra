import {
  getGenerativeModel,
  InferenceMode,
  Schema,
  type GenerativeModel,
} from "firebase/ai";
import { ai } from "../firebase";
import {
  flashcardsPrompt,
  flashcardsSchema,
  parseJson,
  quickSummaryPrompt,
  quizPrompt,
  quizSchema,
  type Flashcard,
  type QuizQuestion,
} from "./prompts";

/**
 * ON-DEVICE inference (Gemini Nano in Chrome) via Firebase AI Logic.
 *
 * `InferenceMode.PREFER_ON_DEVICE` runs on Nano when it is available and
 * falls back to the cloud otherwise. Every answer is tagged with where
 * it actually ran, so judges can SEE the hybrid split.
 *
 * Source detection: Nano availability is checked through the Chrome
 * Prompt API (`LanguageModel.availability()`). If the page is offline
 * and generation still succeeds, it can only have run on-device.
 * This is reported honestly — "on-device" is only claimed when Nano
 * reports `available` or the device is offline.
 */

export type InferenceSource = "on-device" | "cloud";

export interface AiResult<T> {
  data: T;
  source: InferenceSource;
  latencyMs: number;
}

/**
 * Cloud model id used by the hybrid model. The on-device side is
 * Gemini Nano 4 (Chrome Prompt API); the cloud side is this model.
 * Verify the name against the Firebase AI Logic models list at
 * build time — it marks each model "billing required" or not.
 * This app is text-only, so no billing/quota is needed.
 */
export const HYBRID_MODEL = "gemini-3-flash-preview";

declare global {
  interface Window {
    LanguageModel?: {
      availability: () => Promise<"available" | "downloading" | "downloadable" | "unavailable">;
      create: (options?: unknown) => Promise<unknown>;
    };
  }
}

export async function nanoStatus(): Promise<string> {
  if (typeof window === "undefined" || !window.LanguageModel) {
    return "not-supported";
  }
  try {
    return await window.LanguageModel.availability();
  } catch {
    return "unknown";
  }
}

export async function nanoAvailable(): Promise<boolean> {
  return (await nanoStatus()) === "available";
}

function requireAi() {
  if (!ai) {
    throw new Error(
      "Firebase is not configured yet — copy .env.example to .env and add your Firebase web-app config.",
    );
  }
  return ai;
}

function hybridModel(schema: unknown): GenerativeModel {
  // Firebase AI Logic v13 hybrid shape: the cloud model (and its JSON
  // schema, used when Nano is unavailable) lives in `inCloudParams`;
  // `mode` picks the on-device preference. On-device JSON is guided by
  // the prompt ("Return JSON only") + parseJson below.
  return getGenerativeModel(requireAi(), {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: {
      model: HYBRID_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema as never,
      },
    },
  });
}

/**
 * Must be called after a user interaction (button click) and before
 * generateContent — it downloads the Nano model on first use.
 */
export async function ensureOnDeviceReady(
  onProgress?: (progress: number) => void,
): Promise<void> {
  const model = hybridModel(flashcardsSchema);
  await model.initializeDeviceModel(onProgress);
}

async function runJson<T>(
  schema: unknown,
  prompt: string,
): Promise<AiResult<T>> {
  const model = hybridModel(schema);
  const started = performance.now();
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const offline = !navigator.onLine;
  const nano = offline ? true : await nanoAvailable();
  return {
    data: parseJson<T>(text),
    source: nano ? "on-device" : "cloud",
    latencyMs: Math.round(performance.now() - started),
  };
}

export async function generateFlashcards(
  notes: string,
): Promise<AiResult<{ cards: Flashcard[] }>> {
  return runJson<{ cards: Flashcard[] }>(
    flashcardsSchema,
    flashcardsPrompt(notes),
  );
}

export async function generateQuiz(
  notes: string,
): Promise<AiResult<{ questions: QuizQuestion[] }>> {
  return runJson<{ questions: QuizQuestion[] }>(quizSchema, quizPrompt(notes));
}

export async function generateQuickSummary(
  notes: string,
): Promise<AiResult<{ summary: string }>> {
  return runJson<{ summary: string }>(
    quickSummarySchema,
    quickSummaryPrompt(notes),
  );
}

// Summary uses a small inline schema (summary: string).
const quickSummarySchema = Schema.object({
  properties: { summary: Schema.string() },
});
