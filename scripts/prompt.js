/** Keep input reasonable so smaller-context fallbacks can still run if needed. */
const MAX_INPUT_CHARS = 48_000;

/** Tried in order; OpenRouter advances on provider errors, rate limits, etc. */
const MODEL_CHAIN = [
    "google/gemma-3-4b-it:free",
    "google/gemma-2-9b-it:free",
    "meta-llama/llama-3.3-8b-instruct:free"
];

function buildUserContent(text) {
    const body =
        text.length > MAX_INPUT_CHARS
            ? text.slice(0, MAX_INPUT_CHARS) +
              "\n\n[Article truncated for length.]"
            : text;
    return (
        "You are a helpful assistant that summarizes web articles.\n\n" +
        "Summarize this content in 200 words with bullet points covering key points in article:\n\n" +
        body
    );
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

async function requestCompletion(API_KEY, userContent) {
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
            max_tokens: 1024
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

export async function getLlamaSummary(text, API_KEY) {
    const userContent = buildUserContent(text);
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 2000));
        }
        try {
            return await requestCompletion(API_KEY, userContent);
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            lastError = e instanceof Error ? e : new Error(message);
            if (attempt === 0 && shouldRetry(message)) {
                continue;
            }
            throw lastError;
        }
    }
    throw lastError;
}
