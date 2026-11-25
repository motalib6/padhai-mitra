import { Schema } from "firebase/ai";

/**
 * Prompts + structured-output schemas for PadhaiMitra.
 * All on-device features are single-turn text generation — exactly what
 * Gemini Nano supports. Cloud features use the same prompts with a
 * larger model / multi-turn chat where needed.
 */

export interface Flashcard {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StudyPlanDay {
  day: number;
  topic: string;
  tasks: string[];
  minutes: number;
}

export const flashcardsSchema = Schema.object({
  properties: {
    cards: Schema.array({
      items: Schema.object({
        properties: {
          question: Schema.string(),
          answer: Schema.string(),
        },
      }),
    }),
  },
});

export const quizSchema = Schema.object({
  properties: {
    questions: Schema.array({
      items: Schema.object({
        properties: {
          question: Schema.string(),
          options: Schema.array({ items: Schema.string() }),
          correctIndex: Schema.integer(),
          explanation: Schema.string(),
        },
      }),
    }),
  },
});

export const studyPlanSchema = Schema.object({
  properties: {
    days: Schema.array({
      items: Schema.object({
        properties: {
          day: Schema.integer(),
          topic: Schema.string(),
          tasks: Schema.array({ items: Schema.string() }),
          minutes: Schema.integer(),
        },
      }),
    }),
  },
});

export function flashcardsPrompt(notes: string): string {
  return [
    "You are a study assistant for an Indian college student.",
    "From the notes below, create 8 concise flashcards.",
    "Each question must test one fact from the notes; each answer must be",
    "one or two sentences, in simple English. Return JSON only.",
    "",
    "NOTES:",
    notes.slice(0, 6000),
  ].join("\n");
}

export function quizPrompt(notes: string): string {
  return [
    "You are a study assistant for an Indian college student.",
    "From the notes below, create 5 multiple-choice questions.",
    "Each question has exactly 4 options, one correct answer",
    "(correctIndex is the 0-based index), and a one-line explanation.",
    "Return JSON only.",
    "",
    "NOTES:",
    notes.slice(0, 6000),
  ].join("\n");
}

export function quickSummaryPrompt(notes: string): string {
  return [
    "Summarise the notes below in 5-8 bullet points, simple English,",
    "keeping every key fact and number. Return JSON only, as",
    '{ "summary": "..." } with newlines as \\n.',
    "",
    "NOTES:",
    notes.slice(0, 6000),
  ].join("\n");
}

export function deepAnalysisPrompt(notes: string): string {
  return [
    "You are a tutor. Analyse the full chapter notes below in depth:",
    "1) the 5 most important concepts, each explained in 2-3 sentences;",
    "2) common exam traps / mistakes students make on this topic;",
    "3) 3 practice questions with short answers.",
    "Use clear headings and simple English. Plain text, no JSON.",
    "",
    "NOTES:",
    notes.slice(0, 12000),
  ].join("\n");
}

export function studyPlanPrompt(notes: string, examDate: string): string {
  return [
    `Create a realistic 7-day study plan for a student whose exam is on ${examDate}.`,
    "Base every day on the notes below. Each day: one topic, 2-4 small",
    "tasks, and total minutes (45-120). Return JSON only.",
    "",
    "NOTES:",
    notes.slice(0, 8000),
  ].join("\n");
}

export function askNotesPrompt(notes: string, question: string): string {
  return [
    "Answer the question using ONLY the notes below. If the notes do not",
    "contain the answer, say so honestly instead of guessing. Cite the",
    "part of the notes you used, in one short line at the end.",
    "",
    "NOTES:",
    notes.slice(0, 12000),
    "",
    "QUESTION:",
    question,
  ].join("\n");
}

/** Parse model JSON output, tolerating prose around the JSON block. */
export function parseJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model returned no JSON object.");
  }
  return JSON.parse(text.slice(start, end + 1)) as T;
}
