import { useEffect, useState } from "react";
import { firebaseConfigured } from "./firebase";
import {
  ensureOnDeviceReady,
  generateFlashcards,
  generateQuickSummary,
  generateQuiz,
  nanoStatus,
  type AiResult,
} from "./ai/onDevice";
import {
  askMyNotes,
  deepAnalysis,
  generateStudyPlan,
} from "./ai/cloud";
import type { Flashcard, QuizQuestion, StudyPlanDay } from "./ai/prompts";
import { saveNoteSet } from "./lib/firestore";
import HybridBadge from "./components/HybridBadge";

const SAMPLE_NOTES = `Operating Systems — Processes and Threads
A process is a program in execution with its own memory space, file handles and security context. A thread is the smallest unit of execution inside a process; threads of one process share memory and files.
Context switching between processes is expensive because the OS must save registers, switch address spaces and flush the TLB. Switching between threads of the same process is cheaper — same address space, no TLB flush.
A race condition happens when two threads access shared data at the same time and the result depends on timing. A mutex (mutual exclusion lock) allows only one thread into a critical section at a time. A semaphore counts available resources.
Deadlock needs four conditions together: mutual exclusion, hold and wait, no preemption, and circular wait. Breaking any one of them prevents deadlock.`;

type Tab = "flashcards" | "quiz" | "summary" | "deep" | "ask" | "plan";

export default function App() {
  const [notes, setNotes] = useState("");
  const [tab, setTab] = useState<Tab>("flashcards");
  const [online, setOnline] = useState(navigator.onLine);
  const [nano, setNano] = useState("checking…");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [flipped, setFlipped] = useState<number | null>(null);

  const [cards, setCards] = useState<AiResult<{ cards: Flashcard[] }> | null>(null);
  const [quiz, setQuiz] = useState<AiResult<{ questions: QuizQuestion[] }> | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [summary, setSummary] = useState<AiResult<{ summary: string }> | null>(null);
  const [deep, setDeep] = useState<AiResult<string> | null>(null);
  const [askAnswer, setAskAnswer] = useState<AiResult<string> | null>(null);
  const [question, setQuestion] = useState("");
  const [plan, setPlan] = useState<AiResult<{ days: StudyPlanDay[] }> | null>(null);
  const [examDate, setExamDate] = useState("2026-12-05");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    const onChange = () => setOnline(navigator.onLine);
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);
    nanoStatus().then(setNano).catch(() => setNano("unknown"));
    return () => {
      window.removeEventListener("online", onChange);
      window.removeEventListener("offline", onChange);
    };
  }, []);

  async function run<T>(label: string, fn: () => Promise<T>, apply: (r: T) => void) {
    if (notes.trim().length < 50) {
      setError("Pehle apne notes paste karo — kam se kam 2-3 lines.");
      return;
    }
    setError("");
    setLoading(label);
    try {
      const result = await fn();
      apply(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed. Try again.");
    } finally {
      setLoading(null);
    }
  }

  const quizScore = quiz
    ? quiz.data.questions.filter((q, i) => answers[i] === q.correctIndex).length
    : 0;

  if (!firebaseConfigured) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-slate-800">
        <h1 className="text-3xl font-bold">📚 PadhaiMitra</h1>
        <p className="mt-2 text-slate-600">
          Offline-first AI study companion — flashcards, quiz aur summary
          on-device (Gemini Nano), deep analysis aur study plan cloud se
          (Gemini Flash). Firebase AI Logic, ek hi SDK.
        </p>
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="font-semibold">Setup baki hai (5 minute)</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            <li>
              Chrome update karo (v139+), phir{" "}
              <code>chrome://flags/#prompt-api-for-gemini-nano-multimodal-input</code>{" "}
              on karo aur restart karo.
            </li>
            <li>
              Firebase console pe project banao → AI Logic → Gemini Developer
              API (Spark, free) → web app register karo.
            </li>
            <li>
              <code>.env.example</code> ko <code>.env</code> me copy karke
              apni Firebase config bharo, phir{" "}
              <code>npm run dev</code>.
            </li>
          </ol>
          <p className="mt-3 text-sm text-slate-600">
            Poori steps README.md me hain. Koi secret kabhi repo me commit
            mat karo.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 text-slate-800">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">📚 PadhaiMitra</h1>
          <p className="text-sm text-slate-500">
            Offline-first AI study companion · Firebase AI Logic
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className={`rounded-full px-2.5 py-1 font-semibold ${online ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
            {online ? "● Online" : "● Offline — on-device hi chalega"}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
            Nano: {nano}
          </span>
        </div>
      </header>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <label htmlFor="notes" className="font-semibold">
            1 · Apne notes paste karo
          </label>
          <div className="flex gap-2">
            <button
              className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
              onClick={() => setNotes(SAMPLE_NOTES)}
            >
              Sample notes bharo
            </button>
            <button
              className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
              onClick={async () => {
                try {
                  const id = await saveNoteSet("Untitled notes", notes);
                  setSaved(`Library me save ho gaya (id: ${id.slice(0, 8)}…)`);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Save failed.");
                }
              }}
            >
              Library me save karo
            </button>
          </div>
        </div>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
          placeholder="Class notes yahan paste karo — ek page ya ek chapter…"
          className="mt-2 w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {saved && <p className="mt-1 text-sm text-emerald-700">{saved}</p>}
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">2 · Kya banana hai?</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              ["flashcards", "⚡ Flashcards (on-device)"],
              ["quiz", "⚡ Quiz (on-device)"],
              ["summary", "⚡ Quick summary (on-device)"],
              ["deep", "☁️ Deep analysis (cloud)"],
              ["ask", "☁️ Ask my notes (cloud)"],
              ["plan", "☁️ 7-day plan (cloud)"],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                tab === t
                  ? "bg-indigo-600 text-white"
                  : "border hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {tab === "ask" && (
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Apne notes se sawaal poochho…"
              className="min-w-64 flex-1 rounded-lg border px-3 py-2 text-sm"
            />
          )}
          {tab === "plan" && (
            <label className="text-sm">
              Exam date:{" "}
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="rounded-lg border px-2 py-1.5"
              />
            </label>
          )}
          <button
            disabled={loading !== null}
            onClick={() => {
              if (tab === "flashcards")
                void run("flashcards", async () => {
                  await ensureOnDeviceReady();
                  return generateFlashcards(notes);
                }, setCards);
              if (tab === "quiz")
                void run("quiz", async () => {
                  await ensureOnDeviceReady();
                  return generateQuiz(notes);
                }, setQuiz);
              if (tab === "summary")
                void run("summary", async () => {
                  await ensureOnDeviceReady();
                  return generateQuickSummary(notes);
                }, setSummary);
              if (tab === "deep")
                void run("deep", () => deepAnalysis(notes), setDeep);
              if (tab === "ask") {
                if (!question.trim()) {
                  setError("Pehle sawaal likho.");
                  return;
                }
                void run("ask", () => askMyNotes(notes, question), setAskAnswer);
              }
              if (tab === "plan")
                void run("plan", () => generateStudyPlan(notes, examDate), setPlan);
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Bana raha hai…" : "Generate karo"}
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      <section className="mt-6">
        {tab === "flashcards" && cards && (
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">Flashcards</h2>
              <HybridBadge source={cards.source} latencyMs={cards.latencyMs} />
            </div>
            <p className="text-xs text-slate-500">Card pe click karo — answer dikhega.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {cards.data.cards.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setFlipped(flipped === i ? null : i)}
                  className="rounded-xl border p-4 text-left hover:border-indigo-300"
                >
                  <p className="font-medium">{c.question}</p>
                  {flipped === i && (
                    <p className="mt-2 text-sm text-slate-600">{c.answer}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "quiz" && quiz && (
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">Quiz</h2>
              <HybridBadge source={quiz.source} latencyMs={quiz.latencyMs} />
              <span className="text-sm text-slate-600">
                Score: {quizScore}/{quiz.data.questions.length}
              </span>
            </div>
            <div className="mt-3 space-y-4">
              {quiz.data.questions.map((q, i) => (
                <div key={i} className="rounded-xl border p-4">
                  <p className="font-medium">
                    {i + 1}. {q.question}
                  </p>
                  <div className="mt-2 space-y-1">
                    {q.options.map((opt, j) => {
                      const picked = answers[i] === j;
                      const correct = j === q.correctIndex;
                      return (
                        <button
                          key={j}
                          onClick={() => setAnswers({ ...answers, [i]: j })}
                          className={`block w-full rounded-lg border px-3 py-1.5 text-left text-sm ${
                            answers[i] !== undefined && correct
                              ? "border-emerald-400 bg-emerald-50"
                              : picked
                                ? "border-red-400 bg-red-50"
                                : "hover:bg-slate-50"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {answers[i] !== undefined && (
                    <p className="mt-2 text-sm text-slate-600">{q.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "summary" && summary && (
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">Quick summary</h2>
              <HybridBadge source={summary.source} latencyMs={summary.latencyMs} />
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-xl border p-4 text-sm leading-relaxed">
              {summary.data.summary}
            </p>
          </div>
        )}

        {tab === "deep" && deep && (
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">Deep analysis</h2>
              <HybridBadge source={deep.source} latencyMs={deep.latencyMs} />
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-xl border p-4 text-sm leading-relaxed">
              {deep.data}
            </p>
          </div>
        )}

        {tab === "ask" && askAnswer && (
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">Answer</h2>
              <HybridBadge source={askAnswer.source} latencyMs={askAnswer.latencyMs} />
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-xl border p-4 text-sm leading-relaxed">
              {askAnswer.data}
            </p>
          </div>
        )}

        {tab === "plan" && plan && (
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">7-day study plan</h2>
              <HybridBadge source={plan.source} latencyMs={plan.latencyMs} />
            </div>
            <div className="mt-3 space-y-3">
              {plan.data.days.map((d) => (
                <div key={d.day} className="rounded-xl border p-4">
                  <p className="font-medium">
                    Day {d.day} · {d.topic} · {d.minutes} min
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
                    {d.tasks.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <footer className="mt-10 border-t pt-4 text-xs text-slate-500">
        PadhaiMitra · #BuildHybridAI 2026 · All AI inference runs through
        Firebase AI Logic only. On-device = Gemini Nano (Chrome v139+);
        cloud = Gemini Flash. Your notes stay on your device for on-device
        features.
      </footer>
    </main>
  );
}
