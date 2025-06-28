function extractCleanArticleText() {
    const newsArticle = document.querySelector("article");

    if (!newsArticle) {
        console.error("Unable to fetch news article text");
    }

    const title = document.querySelector("h1").innerText.trim();
    const paragraphs = Array.from(document.querySelectorAll("article p")).map(p => p.innerText);
    const articleText = title + "\\n\\n" + paragraphs.join("\\n\\n");

    return articleText;
}

(function () {

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeExtension);
    } else {
        initializeExtension();
    }

    function initializeExtension() {
        if (document.body.innerText.length > 300) {
            const banner = document.createElement("div");
            banner.style = `
                position: fixed; 
                bottom: 10px; 
                right: 10px;
                background: #fefefe; 
                border: 1px; 
                solid: #ccc;
                padding: 10px;
                z-index: 9999;
            `;

            banner.innerHTML = `
                <strong>Article too long? Want me to summarize it?</strong><br>
                <button id="summarize-yes">Yes</button>
                <button id="summarize-no">No</button>
            `;
            document.body.appendChild(banner);

            const newsArticleText = extractCleanArticleText();

            document.getElementById("summarize-yes").onclick = () => {
                chrome.runtime.sendMessage({
                    action: "summarize",
                    content: newsArticleText
                });
                banner.remove();
            }

            document.getElementById("summarize-no").onclick = () => {
                banner.remove();
            }
        }
    }
})();