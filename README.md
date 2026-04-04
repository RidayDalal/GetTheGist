# GetTheGist

**News summaries in seconds—read bullet points or listen to a short spoken overview.**

GetTheGist is a **Manifest V3** Chrome extension for people who want the substance of long news articles without the scroll. It pulls the main story text, sends it to an LLM through **OpenRouter**, and opens a clean summary page with optional **text-to-speech** for multitasking or auditory learning.

---

## Problem

Long-form reporting is valuable but time-consuming. This extension is a small product-style workflow: **choose how you want the summary (on-screen bullets vs. bullets + voice-over)**, then get a structured ~200-word digest focused on who, what, when, and why—without pasting links into another app.

---

## Features

| Capability | What it does |
|------------|----------------|
| **Smart article extraction** | Uses Mozilla’s [**Readability**](https://github.com/mozilla/readability) to isolate the main article body from surrounding page noise. |
| **LLM summaries via OpenRouter** | Summaries are generated through the OpenRouter API with **automatic model fallbacks** when a free-tier provider is unavailable—more resilient than a single hard-coded endpoint. |
| **Two delivery modes** | **Text only:** bullet list on a dedicated summary page. **Voice-over:** same bullets on screen, plus a **shorter, continuous narration script** (written for listening, not read-aloud of the list). |
| **Listen in the browser** | Uses the **Web Speech API** (`speechSynthesis`) with play / pause / stop and a sensible default English voice when available. |
| **Cleaner reading surface** | Before extraction, strips common **popups, modals, overlays, and paywall-style elements** so Readability sees less clutter. |
| **Summary page UI** | Opens in a **new tab**: article title, “(Summary)” label, styled bullets (not raw asterisks), and optional **bold** from markdown-style `**markers**`. |
| **Secure API key setup** | Key is entered once on the **extension options** page and stored in **`chrome.storage.local`** (not in the repo). Options open automatically on first install. |

---

## Tech stack (high level)

- **Chrome Extension Manifest V3** — service worker background, content scripts, `storage`, `tabs`
- **JavaScript (ES modules)** — `background.js` imports shared API client logic
- **OpenRouter** — OpenAI-compatible chat completions, `models[]` fallback chain
- **Readability** — client-side DOM simplification and article parsing
- **Web Speech API** — narration on the summary tab (no extra hosting)

---

## Setup

1. Clone this repository.
2. In Chrome, go to `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked** → select the extension folder.
3. On first load, set your **OpenRouter API key** in the options page ([openrouter.ai/keys](https://openrouter.ai/keys)).
4. Open an article on a supported site; when prompted, pick **voice-over** or **text only**, then wait for the summary tab.

---
