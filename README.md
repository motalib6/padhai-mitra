# PadhaiMitra — #BuildHybridAI 2026

Offline-first AI study companion for Indian students. Paste class notes →
flashcards + quiz + quick summary **on-device (Gemini Nano in Chrome)**,
deep chapter analysis + RAG Q&A + 7-day study plan **in the cloud
(Gemini Flash)** — all through **Firebase AI Logic**, one SDK. Every
answer carries a visible **⚡ On-device / ☁️ Cloud** badge.

- **Hackathon:** [#BuildHybridAI 2026](https://firebasehybridaihackathon.devpost.com/)
- **Deadline:** Mon 30 Nov 2026, 2:00 PM PT (Tue 1 Dec, 3:30 AM IST) —
  submit by **Sat 29 Nov evening IST**.
- **Target:** Best Web/Chrome App ($3,000) + Grand Prize contention.
- **Cost:** text-only, free Spark plan — **no billing, no quota needed**.

## Run it

```bash
npm install
cp .env.example .env   # fill in your Firebase web-app config
npm run dev
```

## Setup (user-only, on your own laptop)

1. **Chrome v139+**: update, enable
   `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, restart,
   then in DevTools console run `await LanguageModel.availability()` and
   `await LanguageModel.create()` to download the Nano model.
2. **Firebase**: console.firebase.google.com → new project → AI Logic →
   choose **Gemini Developer API (Spark, no billing, no card)** → register
   a web app → copy the config into `.env`.
3. **App Check (required)**: in local dev the debug provider is used —
   the debug token printed in the console must be registered in the
   Firebase console. For production, set `VITE_APPCHECK_SITE_KEY`
   (reCAPTCHA v3). **Never commit `.env` or debug tokens.**

## What is built (MVP)

- Paste notes → 8 flashcards (on-device, JSON schema, flip UI)
- Paste notes → 5-MCQ quiz with score + explanations (on-device)
- Quick summary (on-device) vs deep chapter analysis (cloud), side by side
- Ask my notes — RAG Q&A with citations (cloud)
- 7-day exam study plan (cloud, structured JSON → calendar view)
- Note-set library in Firestore (anonymous auth, one click)
- Offline indicator: on-device features keep working with Wi-Fi off —
  **the demo's money shot**

## Repo layout

```
src/
  firebase.ts            # init, AI Logic client, App Check, anonymous auth
  ai/
    onDevice.ts          # PREFER_ON_DEVICE, initializeDeviceModel(), Nano check
    cloud.ts             # PREFER_IN_CLOUD (Gemini Flash)
    prompts.ts           # prompts + JSON schemas
  features/              # (in App.tsx for the MVP; split out when it grows)
  components/HybridBadge.tsx
  lib/firestore.ts       # save note-sets
```

## Demo video outline (≤3 min)

0:00–0:30 hook ("Hostel Wi-Fi down the night before exams — PadhaiMitra
still teaches"); 0:30–1:20 on-device flashcards + quiz, then **Wi-Fi OFF
on camera and generate again**; 1:20–2:15 cloud deep analysis, RAG
answer, 7-day plan; 2:15–2:45 architecture (repo + `PREFER_ON_DEVICE`
code + Firebase console); 2:45–3:00 close + links.

## Submission checklist

- [ ] Platform: Web (Best Web/Chrome App)
- [ ] Public repo, Apache-2.0 licence visible in About, README with run instructions
- [ ] YouTube demo ≤3 min, public, English
- [ ] Hosted URL (Firebase Hosting) + test instructions (anonymous auth =
      no login; Chrome v139+ + flag for on-device)
- [ ] No secrets in repo (no `.env`, no debug tokens, no API keys)

## Status

Scaffold + full MVP UI built 24 Nov 2026 (Day 1). **Not yet tested live:**
on-device generation still needs the user's Chrome Nano setup + Firebase
project (steps above), then `npm run dev` → paste sample notes → generate.
