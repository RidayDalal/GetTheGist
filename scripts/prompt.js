/** Keep input reasonable so smaller-context fallbacks can still run if needed. */
const MAX_INPUT_CHARS = 48_000;

/** Tried in order; OpenRouter advances on provider errors, rate limits, etc. */
const MODEL_CHAIN = [
    "google/gemma-3-4b-it:free",
    "google/gemma-2-9b-it:free",
    "meta-llama/llama-3.3-8b-instruct:free"
];

const BULLETS_HEADER = /###\s*BULLETS\s*###/gi;
const NARR_SPLIT = /###\s*NARRATION\s*###/i;

function truncateArticle(text) {
    if (text.length <= MAX_INPUT_CHARS) return text;
    return (
        text.slice(0, MAX_INPUT_CHARS) + "\n\n[Article truncated for length.]"
    );
}

function buildPromptTextOnly(articleBody) {
    return (
        "You summarize news articles for a browser extension.\n\n" +
        "Output ONLY bullet points. Each non-empty line must start with \"- \" or \"* \" (dash or asterisk, then a space).\n" +
        "Do not write an introduction, closing paragraph, or phrases like \"Here is a summary\". Start directly with the first bullet.\n" +
        "Aim for about 200 words total across all bullets. Cover the main facts, who, what, when, and why.\n\n" +
        "Article:\n\n" +
        articleBody
    );
}

function buildPromptVoiceOver(articleBody) {
    return (
        "You summarize news articles for a browser extension. The user will see bullet points on screen but hear a shorter, separate script read aloud.\n\n" +
        "You MUST output exactly two sections, in this order, using these exact header lines (including the ### marks):\n\n" +
        "###BULLETS###\n" +
        "Then bullet points only: each line starts with \"- \" or \"* \". About 200 words total. No intro or outro lines outside bullets.\n\n" +
        "###NARRATION###\n" +
        "Then a SHORTER piece of continuous prose for text-to-speech only: one or two short paragraphs, full sentences, natural and cohesive like a brief radio story. " +
        "No bullet characters, no markdown, no list formatting, no headers, no quotation marks around the whole thing. " +
        "Cover the same facts as the bullets but do not read the bullet list verbatim—rewrite for listening.\n\n" +
        "Article:\n\n" +
        articleBody
    );
}

function parseVoiceOverResponse(raw) {
    const text = String(raw).trim();
    const narrParts = text.split(NARR_SPLIT);
    const head = (narrParts[0] || "").trim();
    const narration =
        narrParts.length > 1
            ? narrParts.slice(1).join("").trim() || null
            : null;

    let bullets = head.replace(BULLETS_HEADER, "").trim();
    if (!bullets) {
        bullets = head;
    }
    if (!bullets) {
        bullets = text;
    }

    return {
        bullets,
        narration: narration && narration.length > 0 ? narration : null
    };
}

function describeFailure(data, response) {
    const parts = [];
    const err = data?.error;
    if (err?.message) parts.push(String(err.message));
    const meta = err?.metadata;
    if (meta?.provider_name) parts.push(`provider: ${meta.provider_name}`);
    if (meta?.raw != null) {
        const raw =
            typeof meta.raw === "string"
                ? meta.raw
                : JSON.stringify(meta.raw);
        parts.push(raw.length > 400 ? `raw: ${raw.slice(0, 400)}…` : `raw: ${raw}`);
    }
    const choice = data?.choices?.[0];
    if (
        choice &&
        (choice.finish_reason === "error" || choice.native_finish_reason)
    ) {
        parts.push(
            `finish_reason: ${choice.finish_reason || choice.native_finish_reason}`
        );
    }
    if (parts.length === 0) {
        return `OpenRouter HTTP ${response.status}`;
    }
    return parts.join(" | ");
}

async function requestCompletion(API_KEY, userContent, maxTokens) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": chrome.runtime.getURL("options.html"),
            "X-Title": "GetTheGist"
        },
        body: JSON.stringify({
            models: MODEL_CHAIN,
            messages: [{ role: "user", content: userContent }],
            max_tokens: maxTokens
        })
    });

    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error(`OpenRouter returned non-JSON (HTTP ${response.status}).`);
    }

    const choice = data?.choices?.[0];

    if (data?.error) {
        throw new Error(describeFailure(data, response));
    }

    if (choice?.finish_reason === "error") {
        throw new Error(describeFailure(data, response));
    }

    if (!response.ok) {
        throw new Error(describeFailure(data, response));
    }

    const content = choice?.message?.content;
    if (content == null || String(content).trim() === "") {
        throw new Error(
            "No summary in API response. Try again in a minute (free providers often cold-start)."
        );
    }

    return content;
}

function shouldRetry(message) {
    return /provider|502|503|504|timeout|unavailable|overloaded|rate|429/i.test(
        message
    );
}

/**
 * @param {"text" | "voice"} mode - text: bullets only; voice: bullets + spoken script
 * @returns {{ summary: string, narration: string | null }}
 */
export async function getLlamaSummary(text, API_KEY, mode = "text") {
    const articleBody = truncateArticle(text);
    const userContent =
        mode === "voice" ? buildPromptVoiceOver(articleBody) : buildPromptTextOnly(articleBody);
    const maxTokens = mode === "voice" ? 1536 : 1024;

    let lastError;
    let rawContent = "";
    for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 2000));
        }
        try {
            rawContent = await requestCompletion(API_KEY, userContent, maxTokens);
            break;
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            lastError = e instanceof Error ? e : new Error(message);
            if (attempt === 0 && shouldRetry(message)) {
                continue;
            }
            throw lastError;
        }
    }

    if (mode === "voice") {
        const { bullets, narration } = parseVoiceOverResponse(rawContent);
        if (!bullets.trim()) {
            throw new Error("Model returned empty bullet section.");
        }
        return { summary: bullets.trim(), narration };
    }

    return { summary: String(rawContent).trim(), narration: null };
}
