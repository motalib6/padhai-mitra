import {
  getGenerativeModel,
  type GenerativeModel,
} from "firebase/ai";
import { ai } from "../firebase";
import {
  askNotesPrompt,
  deepAnalysisPrompt,
  parseJson,
  studyPlanPrompt,
  studyPlanSchema,
  type StudyPlanDay,
} from "./prompts";
import type { AiResult } from "./onDevice";

/**
 * CLOUD inference (Gemini Flash) via Firebase AI Logic.
 * Used for the heavy work Nano cannot do: long-document analysis,
 * multi-turn RAG Q&A over all saved notes, and the 7-day study plan.
 * Text-only, on the free Spark plan — no billing or quota needed.
 */

const CLOUD_MODEL = "gemini-3-flash-preview";

function requireAi() {
  if (!ai) {
    throw new Error(
      "Firebase is not configured yet — copy .env.example to .env and add your Firebase web-app config.",
    );
  }
  return ai;
}

function cloudModel(schema?: unknown): GenerativeModel {
  // Plain cloud model (GoogleAIBackend): no hybrid mode needed.
  return getGenerativeModel(requireAi(), {
    model: CLOUD_MODEL,
    ...(schema
      ? {
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema as never,
          },
        }
      : {}),
  });
}

async function runText(prompt: string): Promise<AiResult<string>> {
  const started = performance.now();
  const result = await cloudModel().generateContent(prompt);
  return {
    data: result.response.text(),
    source: "cloud",
    latencyMs: Math.round(performance.now() - started),
  };
}

export async function deepAnalysis(notes: string): Promise<AiResult<string>> {
  return runText(deepAnalysisPrompt(notes));
}

export async function askMyNotes(
  notes: string,
  question: string,
): Promise<AiResult<string>> {
  return runText(askNotesPrompt(notes, question));
}

export async function generateStudyPlan(
  notes: string,
  examDate: string,
): Promise<AiResult<{ days: StudyPlanDay[] }>> {
  const started = performance.now();
  const result = await cloudModel(studyPlanSchema).generateContent(
    studyPlanPrompt(notes, examDate),
  );
  return {
    data: parseJson<{ days: StudyPlanDay[] }>(result.response.text()),
    source: "cloud",
    latencyMs: Math.round(performance.now() - started),
  };
}
