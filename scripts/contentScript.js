// // Remove annoying overlays/popups
// const annoyingSelectors = ['.popup', '.modal', '.overlay', '#paywall', '[id*="subscribe"]'];
// annoyingSelectors.forEach(sel => {
//   document.querySelectorAll(sel).forEach(el => el.remove());
// });

// // Run Readability
// setTimeout(() => {
//   try {
//     const article = new Readability(document).parse();

//     console.log('%cArticle Title:', 'color: green; font-weight: bold;', article.title);
//     console.log('%cContent:', 'color: blue;', article.textContent);

//     // You could also show it in a modal or download it if you want
//     alert("Article scraped: " + article.title);
//   } catch (err) {
//     console.error("Failed to parse article:", err);
//   }
// }, 1000); // wait a bit in case page hasn't fully loaded



// // 1. Remove annoying popups (non-destructive)
// const annoyingSelectors = ['.popup', '.modal', '.overlay', '#paywall', '[id*="subscribe"]'];
// annoyingSelectors.forEach(sel => {
//   document.querySelectorAll(sel).forEach(el => el.remove());
// });

// // 2. Wait a bit to ensure page is loaded
// setTimeout(() => {
//   try {
//     // ✅ Clone the DOM instead of parsing the live document
//     const clonedDocument = document.cloneNode(true);
//     const article = new Readability(clonedDocument).parse();

//     // Log the extracted content to the console
//     console.log('%c✅ Article Title:', 'color: green; font-weight: bold;', article.title);
//     console.log('%c📝 Article Content:', 'color: blue;', article.textContent);

//   } catch (err) {
//     console.error("Failed to parse article:", err);
//     alert("Failed to extract article");
//   }
// }, 1500); // Adjust wait time as needed



// Ask user before scraping
if (confirm("📰 Do you want to scrape this article content?")) {

  // 1. Remove popups (optional)
  const annoyingSelectors = ['.popup', '.modal', '.overlay', '#paywall', '[id*="subscribe"]'];
  annoyingSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.remove());
  });

  // 2. Wait a bit for the page to settle
  setTimeout(() => {
    try {
      // ✅ Clone the DOM so original page remains untouched
      const clonedDocument = document.cloneNode(true);
      const article = new Readability(clonedDocument).parse();

      // ✅ Log the result in the DevTools Console
      console.log('%c✅ Article Title:', 'color: green; font-weight: bold;', article.title);
      console.log('%c📝 Article Content:', 'color: blue;', article.textContent);

    } catch (err) {
      console.error("❌ Failed to extract article:", err);
    }
  }, 1500);

} else {
  console.log("🚫 Scraping canceled by user.");
}