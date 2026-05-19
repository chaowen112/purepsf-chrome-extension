const DEFAULT_API_BASE = "https://purepsf.tet.sg";
const MAX_TXNS = 6;

let currentUrl = location.href;

main();

setInterval(() => {
  if (location.href === currentUrl) return;
  currentUrl = location.href;
  main();
}, 1000);

async function main() {
  const root = ensureRoot();
  renderLoading(root);

  try {
    const candidate = extractProjectCandidate();
    if (!candidate) {
      renderEmpty(root, "No project name found on this page.");
      return;
    }

    const apiBase = await getApiBase();
    const hit = await findProject(apiBase, candidate);
    if (!hit) {
      renderEmpty(root, `No purePSF match for "${candidate}".`);
      return;
    }

    const [project, txns, comparison] = await Promise.all([
      getJSON(apiBase, `/api/projects/${hit.id}`),
      getJSON(apiBase, `/api/projects/${hit.id}/transactions`),
      getJSON(apiBase, `/api/projects/${hit.id}/comparison`).catch(() => null),
    ]);

    renderProject(root, apiBase, project, txns, comparison, candidate);
  } catch (err) {
    renderEmpty(root, err instanceof Error ? err.message : "Unable to load purePSF data.");
  }
}

function ensureRoot() {
  let root = document.getElementById("purepsf-pg-overlay");
  if (root) return root;

  root = document.createElement("aside");
  root.id = "purepsf-pg-overlay";
  document.documentElement.appendChild(root);
  return root;
}

function extractProjectCandidate() {
  const candidates = [
    text(document.querySelector("h1")),
    meta("og:title"),
    meta("twitter:title"),
    document.title,
  ];

  for (const raw of candidates) {
    const cleaned = cleanProjectName(raw);
    if (cleaned) return cleaned;
  }
  return "";
}

function cleanProjectName(value) {
  if (!value) return "";
  let s = value.replace(/\s+/g, " ").trim();
  s = s.split("|")[0].trim();
  s = s.replace(/\b(PropertyGuru Singapore|PropertyGuru)\b/gi, "").trim();
  s = s.replace(/\b(for sale|for rent|apartment for sale|condo for sale|condo for rent)\b.*$/i, "").trim();
  s = s.replace(/\b\d+\s+bed(?:room)?s?\b.*$/i, "").trim();
  s = s.replace(/\b\d+\s+bath(?:room)?s?\b.*$/i, "").trim();
  s = s.replace(/\s+in\s+Singapore$/i, "").trim();
  return s.length >= 3 ? s : "";
}

function text(node) {
  return node?.textContent?.trim() ?? "";
}

function meta(property) {
  return document.querySelector(`meta[property="${property}"], meta[name="${property}"]`)?.content ?? "";
}

async function getApiBase() {
  const stored = await chrome.storage.sync.get({ apiBase: DEFAULT_API_BASE });
  return String(stored.apiBase || DEFAULT_API_BASE).replace(/\/+$/, "");
}

async function findProject(apiBase, query) {
  const tries = compactUnique([
    query,
    query.replace(/\s+(condominium|condo|apartment|residences?)$/i, ""),
    query.replace(/[@]/g, " at "),
  ]);

  for (const q of tries) {
    const hits = await getJSON(apiBase, `/api/search?q=${encodeURIComponent(q)}&limit=8`);
    const projectHits = hits.filter((h) => h.type === "project");
    const uraHit = projectHits.find((h) => h.source === "URA");
    if (uraHit) return uraHit;
    if (projectHits[0]) return projectHits[0];
  }
  return null;
}

function compactUnique(values) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

async function getJSON(apiBase, path) {
  const res = await chrome.runtime.sendMessage({
    type: "purepsf:getJSON",
    url: apiBase + path,
  });
  if (!res?.ok) throw new Error(res?.error || "Unable to load purePSF API");
  return res.data;
}

function renderLoading(root) {
  root.innerHTML = `
    <div class="purepsf-card">
      <div class="purepsf-head">
        <strong>purePSF</strong>
        <button type="button" class="purepsf-collapse" aria-label="Collapse purePSF overlay">-</button>
      </div>
      <div class="purepsf-muted">Matching project...</div>
    </div>`;
  wireCollapse(root);
}

function renderEmpty(root, message) {
  root.innerHTML = `
    <div class="purepsf-card">
      <div class="purepsf-head">
        <strong>purePSF</strong>
        <button type="button" class="purepsf-collapse" aria-label="Collapse purePSF overlay">-</button>
      </div>
      <div class="purepsf-muted">${escapeHTML(message)}</div>
    </div>`;
  wireCollapse(root);
}

function renderProject(root, apiBase, project, txns, comparison, candidate) {
  const recent = [...txns]
    .sort((a, b) => String(b.contract_date).localeCompare(String(a.contract_date)))
    .slice(0, MAX_TXNS);
  const ownAvg = comparison?.own?.avg_psf ?? project.avg_psf;
  const nearbyAvg = comparison?.nearby_500m?.avg_psf;
  const purepsfUrl = `${siteBaseFromApiBase(apiBase)}/p/${project.id}/${slug(project.name)}`;

  root.innerHTML = `
    <div class="purepsf-card">
      <div class="purepsf-head">
        <strong>purePSF</strong>
        <button type="button" class="purepsf-collapse" aria-label="Collapse purePSF overlay">-</button>
      </div>
      <div class="purepsf-project">${escapeHTML(project.name)}</div>
      <div class="purepsf-sub">${escapeHTML(project.street ?? candidate)}${project.district ? ` · D${escapeHTML(project.district)}` : ""}</div>
      <div class="purepsf-stats">
        <div><span>${fmtMoneyPSF(ownAvg)}</span><label>Own avg PSF</label></div>
        <div><span>${fmtMoneyPSF(nearbyAvg)}</span><label>Nearby 500m</label></div>
      </div>
      <div class="purepsf-txns">
        ${recent.length ? recent.map(renderTxn).join("") : '<div class="purepsf-muted">No transactions found.</div>'}
      </div>
      <a class="purepsf-open" href="${escapeAttr(purepsfUrl)}" target="_blank" rel="noreferrer">Open in purePSF</a>
      <div class="purepsf-note">Shows purePSF transaction data only.</div>
    </div>`;
  wireCollapse(root);
}

function renderTxn(txn) {
  return `
    <div class="purepsf-txn">
      <span>${escapeHTML(month(txn.contract_date))}</span>
      <strong>${fmtMoneyPSF(txn.psf)}</strong>
      <em>${escapeHTML(txn.type_of_sale ?? txn.flat_type ?? txn.property_type ?? "")}</em>
    </div>`;
}

function siteBaseFromApiBase(apiBase) {
  const url = new URL(apiBase);
  if ((url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.port === "8080") {
    return `${url.protocol}//${url.hostname}`;
  }
  return apiBase.replace(/\/api$/, "");
}

function wireCollapse(root) {
  const button = root.querySelector(".purepsf-collapse");
  button?.addEventListener("click", () => {
    root.classList.toggle("purepsf-minimized");
    button.textContent = root.classList.contains("purepsf-minimized") ? "+" : "-";
  });
}

function fmtMoneyPSF(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return `$${Math.round(Number(value)).toLocaleString()}`;
}

function month(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 7);
  return date.toLocaleDateString("en-SG", { year: "numeric", month: "short" });
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHTML(value);
}
