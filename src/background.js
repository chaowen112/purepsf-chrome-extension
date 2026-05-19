chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "purepsf:getJSON") return false;

  getJSON(message.url)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err) => sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }));

  return true;
});

async function getJSON(url) {
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Unsupported API protocol");
  }

  const res = await fetch(parsed.toString(), { credentials: "omit" });
  if (!res.ok) throw new Error(`purePSF API returned ${res.status}`);
  return res.json();
}
