// Ask user before generating a summary
if (!confirm("News too long? Want me to summarize it for you?")) {
    console.log("Article content scraping canceled by user.");
} else {
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
                        apiKey: apiKey
                    },
                    (response) => {
                        if (response && response.summary) {
                            chrome.storage.local.set(
                                {
                                    articleSummary: response.summary,
                                    articleTitle
                                },
                                () => {
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
}
