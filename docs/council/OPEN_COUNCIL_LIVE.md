# Open Council Live

## Two UIs (pick one)

| UI | In file tree? | How to open |
|----|---------------|-------------|
| **In-repo panel** | Yes — `docs/council/ui/` | `npm run council:ui` → http://localhost:3939 |
| **Cursor Canvas** | Yes — if you use `WorkOutApp.code-workspace` | Sidebar **Canvases** or folder **Cursor Canvases** |

---

## See canvases in the file tab (Explorer)

Cursor stores canvas **source files** outside `WorkOutApp/` unless you add them to the workspace:

1. **File → Open Workspace from File…**
2. Open **`WorkOutApp.code-workspace`** (repo root)
3. In the **Explorer** (file tab), you should see two roots:
   - **WorkOutApp** — your app
   - **Cursor Canvases** — `council-live.canvas.tsx` lives here

Path on disk:

`C:\Users\Carri\.cursor\projects\c-Users-Carri-Documents-WorkOutApp\canvases\council-live.canvas.tsx`

---

## Canvases sidebar (live panel)

Separate from Explorer: Cursor’s **Canvases** section (e.g. **CANVASES IN WORKOUTAPP** → **Council Live**) opens the **live** panel beside chat — not the same as browsing the `.tsx` file.

- **Explorer** = edit the canvas source file  
- **Canvases sidebar** = run the interactive panel  

---

## In-repo panel (always in tree)

No workspace trick needed:

```
docs/council/ui/index.html
```

`npm run council:ui` → http://localhost:3939

