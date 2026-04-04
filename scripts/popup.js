/** Markdown-style * / - or Unicode bullets → rendered as styled • lists */
const BULLET_LINE = /^\s*(?:\*{1,2}|-|[•·])\s+(.*)$/;
const ORDERED_LINE = /^\s*(\d+)\.\s+(.*)$/;

const BOILERPLATE_LINE =
  /^(?:here(?:'s| is) a (?:summary|brief summary|quick summary) of (?:the )?article[^\n]*|summary of (?:the )?article[^\n]*)\s*(?:\n|$)/i;

function stripSummaryBoilerplate(text) {
  let t = text.trim();
  t = t.replace(
    /^here(?:'s| is) a (?:brief |quick )?summary of (?:the )?article[.…]?\s*[:\n-–—]?\s*/i,
    ""
  );
  t = t.replace(/^summary of (?:the )?article[.…]?\s*[:\n-–—]?\s*/i, "");
  let prev;
  do {
    prev = t;
    t = t.replace(BOILERPLATE_LINE, "").trim();
  } while (t !== prev);
  return t;
}

/** `**bold**` then single-asterisk `*bold*` pairs (safe: text + <strong> only). */
function appendInlineFormatted(parent, text) {
  if (!text) return;

  const double = /\*\*(.+?)\*\*/gs;
  let last = 0;
  let m;
  while ((m = double.exec(text)) !== null) {
    if (m.index > last) {
      appendSingleAsteriskBold(parent, text.slice(last, m.index));
    }
    const inner = m[1].trim();
    if (inner) {
      const strong = document.createElement("strong");
      strong.textContent = inner;
      parent.appendChild(strong);
    }
    last = double.lastIndex;
  }
  if (last < text.length) {
    appendSingleAsteriskBold(parent, text.slice(last));
  }
}

function appendSingleAsteriskBold(parent, text) {
  if (!text) return;
  const single = /\*([^*\n]+)\*/g;
  let last = 0;
  let m;
  while ((m = single.exec(text)) !== null) {
    if (m.index > last) {
      parent.appendChild(document.createTextNode(text.slice(last, m.index)));
    }
    const inner = m[1].trim();
    if (inner) {
      const strong = document.createElement("strong");
      strong.textContent = inner;
      parent.appendChild(strong);
    }
    last = single.lastIndex;
  }
  if (last < text.length) {
    parent.appendChild(document.createTextNode(text.slice(last)));
  }
}

function appendParagraph(container, text) {
  const p = document.createElement("p");
  appendInlineFormatted(p, text.trim());
  container.appendChild(p);
}

function appendBulletList(container, items) {
  const ul = document.createElement("ul");
  for (const item of items) {
    const li = document.createElement("li");
    appendInlineFormatted(li, item);
    ul.appendChild(li);
  }
  container.appendChild(ul);
}

function appendOrderedList(container, items) {
  const ol = document.createElement("ol");
  for (const item of items) {
    const li = document.createElement("li");
    appendInlineFormatted(li, item);
    ol.appendChild(li);
  }
  container.appendChild(ol);
}

/**
 * Turn model output into paragraphs and lists so * / - lines use real bullet styling.
 */
function renderSummaryText(root, text) {
  root.replaceChildren();
  const lines = text.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (line.trim() === "") {
      i++;
      continue;
    }

    const bullet = line.match(BULLET_LINE);
    if (bullet) {
      const items = [];
      while (i < lines.length) {
        const m = lines[i].trimEnd().match(BULLET_LINE);
        if (!m) break;
        items.push(m[1].trim());
        i++;
      }
      appendBulletList(root, items);
      continue;
    }

    const ordered = line.match(ORDERED_LINE);
    if (ordered) {
      const items = [];
      while (i < lines.length) {
        const m = lines[i].trimEnd().match(ORDERED_LINE);
        if (!m) break;
        items.push(m[2].trim());
        i++;
      }
      appendOrderedList(root, items);
      continue;
    }

    const paraLines = [line.trim()];
    i++;
    while (i < lines.length) {
      const next = lines[i].trimEnd();
      if (next.trim() === "") break;
      if (BULLET_LINE.test(next) || ORDERED_LINE.test(next)) break;
      paraLines.push(next.trim());
      i++;
    }
    appendParagraph(root, paraLines.join(" "));
  }
}

function getPreferredVoice() {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const list = synth.getVoices();
  if (!list.length) return null;
  const en = list.filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
  const pool = en.length ? en : list;
  const score = (v) => {
    const n = (v.name || "").toLowerCase();
    if (/google|microsoft|natural|neural|premium|enhanced|samantha|zira/.test(n)) {
      return 4;
    }
    if (/en-us/.test((v.lang || "").toLowerCase())) return 2;
    if (/en-gb|en-au/.test((v.lang || "").toLowerCase())) return 1;
    return 0;
  };
  return pool.reduce((best, v) => (score(v) > score(best) ? v : best), pool[0]);
}

function buildSpokenScript(titleEl, bodyEl, narrationPlain) {
  const title = titleEl.textContent.trim() || "Article";
  const script = (narrationPlain || "").replace(/\s+/g, " ").trim();
  if (script) {
    return `${title}. ${script}`;
  }
  const body = (bodyEl.innerText || "").replace(/\s+/g, " ").trim();
  if (!body) return "";
  return `${title}. Summary. ${body}`;
}

function setupNarration(titleEl, bodyEl, autoStart, narrationPlain) {
  const synth = window.speechSynthesis;
  const bar = document.getElementById("narrationBar");
  const btnPlay = document.getElementById("narrationPlay");
  const btnPause = document.getElementById("narrationPause");
  const btnStop = document.getElementById("narrationStop");
  const statusEl = document.getElementById("narrationStatus");

  if (!synth || !bar || !btnPlay || !btnPause || !btnStop) {
    return;
  }

  let utterance = null;

  function setUiIdle() {
    btnPlay.disabled = false;
    btnPause.disabled = true;
    btnStop.disabled = true;
  }

  function setUiSpeaking() {
    btnPlay.disabled = true;
    btnPause.disabled = false;
    btnStop.disabled = false;
  }

  function setUiPaused() {
    btnPlay.disabled = false;
    btnPause.disabled = true;
    btnStop.disabled = false;
  }

  function speakFromStart() {
    synth.cancel();
    const text = buildSpokenScript(titleEl, bodyEl, narrationPlain);
    if (!text) {
      statusEl.textContent = "Nothing to read.";
      setUiIdle();
      return;
    }
    utterance = new SpeechSynthesisUtterance(text);
    const v = getPreferredVoice();
    if (v) {
      utterance.voice = v;
      utterance.lang = v.lang || "en-US";
    } else {
      utterance.lang = "en-US";
    }
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.onstart = () => {
      statusEl.textContent = "Playing…";
      setUiSpeaking();
    };
    utterance.onend = () => {
      statusEl.textContent = "Finished.";
      utterance = null;
      setUiIdle();
    };
    utterance.onerror = (e) => {
      statusEl.textContent =
        e && e.error && e.error !== "canceled"
          ? `Audio: ${e.error}`
          : "";
      utterance = null;
      setUiIdle();
    };
    synth.speak(utterance);
  }

  setUiIdle();
  statusEl.textContent = "";

  btnPlay.addEventListener("click", () => {
    if (synth.paused) {
      synth.resume();
      statusEl.textContent = "Playing…";
      setUiSpeaking();
      return;
    }
    speakFromStart();
  });

  btnPause.addEventListener("click", () => {
    if (synth.speaking && !synth.paused) {
      synth.pause();
      statusEl.textContent = "Paused.";
      setUiPaused();
    }
  });

  btnStop.addEventListener("click", () => {
    synth.cancel();
    utterance = null;
    statusEl.textContent = "Stopped.";
    setUiIdle();
  });

  function tryAutoStart() {
    if (!autoStart) return;
    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      speakFromStart();
    };
    if (synth.getVoices().length) {
      go();
      return;
    }
    const onVoices = () => {
      if (synth.getVoices().length) {
        synth.removeEventListener("voiceschanged", onVoices);
        go();
      }
    };
    synth.addEventListener("voiceschanged", onVoices);
    setTimeout(() => {
      synth.removeEventListener("voiceschanged", onVoices);
      if (!started) {
        if (synth.getVoices().length === 0) {
          statusEl.textContent =
            "Press Play if nothing plays (browser voices may still be loading).";
        }
        go();
      }
    }, 900);
  }

  tryAutoStart();
}

chrome.storage.local.get(
  ["articleSummary", "articleTitle", "narrateSummary", "articleNarration"],
  (result) => {
    const titleEl = document.getElementById("articleTitle");
    const bodyEl = document.getElementById("summaryText");
    const bar = document.getElementById("narrationBar");
    const title = (result.articleTitle || "").trim() || "Article";
    const summaryText = stripSummaryBoilerplate(result.articleSummary || "");
    const narrateSummary = Boolean(result.narrateSummary);
    const narrationPlain = (result.articleNarration || "").trim();

    const narrLabel = document.querySelector(".narration-label");
    if (narrLabel) {
      narrLabel.textContent = narrationPlain ? "Spoken story" : "Listen";
    }

    if (narrateSummary) {
      chrome.storage.local.remove(["narrateSummary"]);
    }

    titleEl.textContent = title;
    document.title = `${title} (Summary)`;

    if (!summaryText.trim()) {
      bodyEl.classList.add("empty");
      bodyEl.textContent = "No summary found.";
      if (bar) bar.hidden = true;
      return;
    }

    bodyEl.classList.remove("empty");
    renderSummaryText(bodyEl, summaryText);

    const synth = window.speechSynthesis;
    if (bar && synth) {
      bar.hidden = false;
      setupNarration(titleEl, bodyEl, narrateSummary, narrationPlain);
    } else if (bar) {
      bar.hidden = true;
    }
  }
);
