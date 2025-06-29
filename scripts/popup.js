chrome.storage.local.get("articleSummary", (result) => {
  const summaryText = result.articleSummary || "No summary found.";
  document.getElementById("summaryText").textContent = summaryText;
});
