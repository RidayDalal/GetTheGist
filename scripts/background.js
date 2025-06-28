import dotenv from "dotenv";
dotenv.config();

// Obtain the API KEY of the model
const API_KEY = process.env.API_KEY_LLAMA;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

if (!API_KEY) {
    console.error("API key not found!");
    process.exit(1);
}

// Receive message thrown by contentScript.js (contains news article text)
chrome.runtime.onMessage.addListener(async (message, sender) => {
    if (message.action === "summarize") {
        let newsArticleContent = message.content;
        // If length of text in news article more than 4 million, shorten to 4 million
        if (newsArticleContent.length > 4e6) {
            newsArticleContent = newsArticleContent.slice(0, 4e6);
        }
        const prompt = `Summarize this news article in ~100 words in clear separate bullet points covering all major facts and developments. 
        News Article:
        ${newsArticleContent}
        `;

        const response = await fetch(API_URL, {
            method: "POST", 
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-type": "application/json"
            }, 
            body: JSON.stringify({
                model: "meta-llama/4-maverick", 
                messages: [
                    {
                        role: "user", 
                        content: prompt
                    }
                ]
            })
        });

        const data = await response.json();
        const summaryOfArticle = data.choices;

        console.log(summaryOfArticle);
    }
});