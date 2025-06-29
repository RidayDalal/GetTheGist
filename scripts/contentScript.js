// Ask user before generating a summary
if (confirm("News too long? Want me to summarize it for you?")) {

    // Remove popups
    const annoyingSelectors = ['.popup', '.modal', '.overlay', '#paywall', '[id*="subscribe"]'];
    annoyingSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
    });

    // Wait 2 seconds for the page to settle
    setTimeout(() => {
        try {
            // Make a clone of the DOM so original page remains untouched
            const documentClone = document.cloneNode(true);
            const articleObj = new Readability(documentClone).parse();

            //console.log('%cArticle Title:', 'color: green; font-weight: bold;', article.title);
            //console.log('%cArticle Content:', 'color: blue;', article.textContent);

            // Intead of displaying the contents in the console, I'm sending them in a prompt for summary
            chrome.runtime.sendMessage(
                {
                    type: "summarizeContent",
                    content: articleObj.textContent
                },
                (response) => {
                    // console.log("News Summary:", response.summary);
                    // alert(response.summary);

                    if (response && response.summary) {
                        chrome.storage.local.set(
                            {articleSummary: response.summary}, 
                            () => {
                            chrome.runtime.sendMessage({type: "openPopupPage"});
                        });
                    } else {
                        alert("Failed to generate summary!");
                    }
                }
            );

        } catch (err) {
            alert("Failed to extract article:", err);
        }
    }, 2000);

} else {
    console.log("Article content scraping canceled by user.");
}