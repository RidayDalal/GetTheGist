export async function getLlamaSummary(text, API_KEY) {
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