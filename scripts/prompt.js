export async function getLlamaSummary(text) {
    // Here, exposing the API key is ok as the model is a free model with unlimited prompts per day.
    const API_KEY = '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';

    // Create a prompt and send it to Meta Llama for generating 200 word summary
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "meta-llama/llama-4-maverick:free",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that summarizes web articles."
                },
                {
                    role: "user",
                    content: `Summarize this content in 200 words with bullet points covering key points in article:\n\n${text}`
                }
            ]
        })
    });
    // Receive the response from Meta Llama
    const data = await response.json();
    // Return this summary so it can be displayed on screen
    return data.choices?.[0].message.content || "Failed to summarize.";
}