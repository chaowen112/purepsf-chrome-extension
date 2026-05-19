# purePSF Chrome Extension

Chrome extension for showing purePSF transaction context while browsing
PropertyGuru Singapore pages.

The extension is intentionally a browser-side companion. It reads the current
PropertyGuru page locally, asks the purePSF API for matching project data, and
injects a compact floating panel. It does **not** scrape, store, upload, mirror,
or republish PropertyGuru listing content.

## What It Shows

- Matched purePSF project name and address.
- Own average PSF.
- Nearby 500m average PSF.
- Recent transaction rows from purePSF.
- Link back to the matched purePSF project page.

## How It Works

1. A content script runs on `https://www.propertyguru.com.sg/*`.
2. It extracts a project candidate from the page `h1`, Open Graph title,
   Twitter title, or document title.
3. It asks the extension service worker to call purePSF:
   - `/api/search`
   - `/api/projects/{id}`
   - `/api/projects/{id}/transactions`
   - `/api/projects/{id}/comparison`
4. The content script renders the returned purePSF data in a right-bottom
   overlay.

API requests go through `src/background.js`, so Chrome extension host
permissions control network access instead of the PropertyGuru page origin.

## Install For Development

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository directory:

   ```text
   /Users/chaowen/go/src/purepsf-chrome-extension
   ```

5. Visit a PropertyGuru Singapore page.

No build step is required. This is a plain Manifest V3 extension.

## Configuration

Default API base:

```text
https://purepsf.tet.sg
```

For local development, open the extension details page, click **Extension
options**, and set:

```text
http://localhost:8080
```

When using `http://localhost:8080`, the "Open in purePSF" link points to the
local frontend root at `http://localhost`.

## Files

```text
manifest.json        Chrome Manifest V3 config
src/background.js    API fetch proxy through extension host permissions
src/content.js       PropertyGuru page matcher and overlay renderer
src/styles.css       Overlay styles
src/options.html     Extension options page
src/options.css      Options page styles
src/options.js       Saves API base URL in chrome.storage.sync
```

## Privacy And Terms Boundary

This extension only displays purePSF data in the user's browser session. It does
not collect or persist PropertyGuru page data. Keep it that way unless the legal
boundary is reviewed again.

Allowed direction:

- Read current page text locally to identify a likely project.
- Query purePSF-owned API data.
- Show purePSF transaction context beside PropertyGuru.

Avoid:

- Copying PropertyGuru listing descriptions, prices, photos, agent data, or
  availability into purePSF.
- Bulk crawling PropertyGuru pages.
- Sending PropertyGuru page content to purePSF servers.

## Debugging

- Go to `chrome://extensions`.
- Find **purePSF PropertyGuru Overlay**.
- Click **service worker** to inspect background logs.
- On the PropertyGuru page, open DevTools to inspect content-script behavior.
- If the panel says no match was found, test the extracted project name in
  purePSF search first.
