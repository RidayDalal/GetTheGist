# Get The Gist! - News Summarizer Chrome Extension

A Chrome extension that automatically summarizes lengthy news articles from LiveMint and New York Times. When visiting supported news sites, the extension prompts users to generate a 200-word summary with bullet points covering key aspects of the article.

### Features
- Extracts article content using [Mozilla's Readability library](https://github.com/mozilla/readability/tree/main)
- Generates a concise summary of the news article via Meta Llama 4-Maverick through OpenRouter's API
- Removes and ignores annoying popups and paywalls before processing the news article
- Displays summaries in a separate new tab with clean UI
