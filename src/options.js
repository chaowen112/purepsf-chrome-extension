const DEFAULT_API_BASE = "https://purepsf.tet.sg";

const input = document.getElementById("apiBase");
const save = document.getElementById("save");
const status = document.getElementById("status");

chrome.storage.sync.get({ apiBase: DEFAULT_API_BASE }, (items) => {
  input.value = items.apiBase;
});

save.addEventListener("click", () => {
  const apiBase = input.value.trim().replace(/\/+$/, "") || DEFAULT_API_BASE;
  chrome.storage.sync.set({ apiBase }, () => {
    status.textContent = "Saved";
    setTimeout(() => {
      status.textContent = "";
    }, 1600);
  });
});
