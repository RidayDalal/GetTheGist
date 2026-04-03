const apiKeyInput = document.getElementById("apiKey");
const saveBtn = document.getElementById("save");
const toggleBtn = document.getElementById("toggleVisibility");
const statusEl = document.getElementById("status");
const hintEl = document.getElementById("hint");

chrome.storage.local.get(["openRouterApiKey"], (result) => {
  if (result.openRouterApiKey) {
    hintEl.textContent =
      "A key is already saved. Paste a new key above to replace it.";
  }
});

saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  statusEl.textContent = "";
  chrome.storage.local.set({ openRouterApiKey: key }, () => {
    if (chrome.runtime.lastError) {
      statusEl.textContent = "Could not save: " + chrome.runtime.lastError.message;
      statusEl.style.color = "#c62828";
      return;
    }
    statusEl.style.color = "#2e7d32";
    statusEl.textContent = key ? "Saved." : "Cleared.";
    if (key) {
      hintEl.textContent =
        "A key is saved. Paste a new key above to replace it.";
    } else {
      hintEl.textContent = "";
    }
    apiKeyInput.value = "";
  });
});

toggleBtn.addEventListener("click", () => {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
  toggleBtn.textContent = isPassword ? "Hide" : "Show";
});
