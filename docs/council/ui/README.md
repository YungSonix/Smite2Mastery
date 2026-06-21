# Council chat panel

In-repo messenger-style UI for the AI council.

## Bookmark the panel file (not just a line)

**In Explorer (always there):**  
`docs/council/ui/index.html` — expand **docs → council → ui**.

**Pin the tab:** open `index.html` → right-click tab → **Pin Tab**.

**Bookmarks extension (whole file):**
1. Open `docs/council/ui/index.html`
2. Put cursor on **line 1**
3. `Ctrl+Alt+K` → **Bookmarks: Label** → `Council panel`
4. Jump back anytime: `Ctrl+Alt+L` → click the label (opens the file)

To bookmark **without a line number** showing in the list: use **Pin Tab** or bookmark line 1 — both open the file.

**Running UI (browser):** bookmark **http://localhost:3939** in Chrome/Edge — that's the live chat, not the HTML source.

**Port already in use?** The panel is probably already running — just open http://localhost:3939. To restart: `npx kill-port 3939` then `npm run council:ui`.

---

```powershell
npm run council:ui
```

Open **http://localhost:3939**

## How it works

1. **You** type a topic in the panel → **Send** (optional: **📎** attach or **paste** up to 8 images, 5MB each)
2. **You** switch to pinned **Chair** chat in Cursor → type **`go`**
3. **Agent** runs Nala / London / Fasa → writes `sessions/latest.json`
4. **Panel** shows chat bubbles (polls every 3s)

Setup: **`../CHAIR_SETUP.md`**

## Files

| File | Purpose |
|------|---------|
| `index.html` | Chat layout |
| `app.js` | UI logic |
| `styles.css` | Dark green theme |
| `state.json` | Model picks |
| `pending-convene.json` | Queued topic (+ optional `attachments[]`) waiting for `go` |
| `attachments/` | Saved panel images (gitignored; served at `/attachments/...`) |
