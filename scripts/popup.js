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

chrome.storage.local.get(["articleSummary", "articleTitle"], (result) => {
  const titleEl = document.getElementById("articleTitle");
  const bodyEl = document.getElementById("summaryText");
  const title = (result.articleTitle || "").trim() || "Article";
  const summaryText = stripSummaryBoilerplate(result.articleSummary || "");

  titleEl.textContent = title;
  document.title = `${title} (Summary)`;

  if (!summaryText.trim()) {
    bodyEl.classList.add("empty");
    bodyEl.textContent = "No summary found.";
    return;
  }

  bodyEl.classList.remove("empty");
  renderSummaryText(bodyEl, summaryText);
});
