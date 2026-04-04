// Format: voice-over (bullets + spoken story) vs text-only bullets
const voiceOverMode = confirm(
    "GetTheGist — choose format:\n\n" +
        "OK — Voice-over: bullet list on screen + shorter spoken story (same facts)\n" +
        "Cancel — Text only: bullet list on screen"
);

chrome.storage.local.get(["openRouterApiKey"], (result) => {
    const apiKey = (result.openRouterApiKey || "").trim();

    if (!apiKey) {
        alert(
            "Add your OpenRouter API key in extension options (right-click the extension icon → Options, or open from chrome://extensions)."
        );
        chrome.runtime.sendMessage({ type: "openOptions" });
        return;
    }

    const annoyingSelectors = ['.popup', '.modal', '.overlay', '#paywall', '[id*="subscribe"]'];
    annoyingSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
    });

    setTimeout(() => {
        try {
            const documentClone = document.cloneNode(true);
            const articleObj = new Readability(documentClone).parse();
            if (!articleObj || !articleObj.textContent) {
                alert("Failed to extract article text.");
                return;
            }
            const articleTitle =
                (articleObj.title && articleObj.title.trim()) ||
                document.title.trim() ||
                "Article";

            chrome.runtime.sendMessage(
                {
                    type: "summarizeContent",
                    content: articleObj.textContent,
                    apiKey: apiKey,
                    summaryMode: voiceOverMode ? "voice" : "text"
                },
                (response) => {
                    if (response && response.summary) {
                        const payload = {
                            articleSummary: response.summary,
                            articleTitle,
                            narrateSummary: voiceOverMode,
                            articleNarration: response.narration
                                ? String(response.narration).trim()
                                : ""
                        };
                        chrome.storage.local.set(payload, () => {
                            chrome.runtime.sendMessage({ type: "openPopupPage" });
                        });
                    } else {
                        const detail =
                            response && response.error
                                ? "\n\n" + response.error
                                : "";
                        alert("Failed to generate summary." + detail);
                    }
                }
            );

        } catch (err) {
            alert("Failed to extract article: " + err);
        }
    }, 2000);
});
