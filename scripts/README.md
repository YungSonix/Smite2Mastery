# Scripts Documentation

## parse-patch-notes.js

**Purpose**: Parses patch notes from a text file into structured JSON.

**Usage**:
```bash
node scripts/parse-patch-notes.js <file-path>
```

**Example**:
```bash
node scripts/parse-patch-notes.js patch-notes.txt
node scripts/parse-patch-notes.js patch-notes.html
node scripts/parse-patch-notes.js patch-notes.md
```

**What it does**:
1. Reads the patch notes from a text file (supports .txt, .html, .md)
2. Auto-detects if the file is HTML or plain text
3. Parses the content to extract:
   - Summary text
   - Sections (with titles and content)
   - Gods that were buffed, nerfed, or shifted (extracts names from text)
   - Items that were buffed, nerfed, or changed (extracts names from text)
   - New features
   - Meta shifts summary
4. Outputs a JSON structure with all the parsed data
5. Automatically saves the parsed JSON to a file (same name, .json extension)

**Output**: 
- Prints JSON to console
- Saves parsed data to `<filename>.json` in the same directory

**How to use**:
1. Copy/paste patch notes into a text file (e.g., `patch-notes.txt`)
2. Run the script with the file path
3. Review the output JSON
4. Use the parsed data to create your `changes.json` for `add-patch-indicators.js`

---

## add-patch-indicators.js

**Purpose**: Adds patch change indicators (buffed, nerfed, shifted, new) to gods and items in `builds.json`.

**Usage**:
```bash
node scripts/add-patch-indicators.js <patch-version> <path-to-builds.json>
```

**Example**:
```bash
node scripts/add-patch-indicators.js "2.1.0" "./app/data/builds.json"
```

**How it works**:

1. **Requires a `changes.json` file** in the same directory as `builds.json`
   - If `changes.json` doesn't exist, the script creates a template file
   - The template will be saved as `changes-template.json`

2. **The `changes.json` format**:
```json
{
  "gods": {
    "buffed": ["Achilles", "Zeus"],
    "nerfed": ["Loki"],
    "shifted": ["Anubis"],
    "new": []
  },
  "items": {
    "buffed": ["Item Name 1"],
    "nerfed": ["Item Name 2"],
    "shifted": ["Item Name 3"],
    "new": ["Item Name 4"]
  }
}
```

3. **What it does**:
   - Loads `builds.json` and `changes.json`
   - Finds each god/item by name (case-insensitive)
   - Adds patch change indicators to each found god/item:
     - `patchChanges` object with version-specific changes
     - `latestPatchChange` for quick lookup
   - Saves the updated `builds.json`

4. **The indicators added**:
   - **buffed**: God/item was made stronger
   - **nerfed**: God/item was made weaker
   - **shifted**: God/item was changed (reworked/rebalanced)
   - **new**: New god/item introduced

**Workflow**:
1. Run `parse-patch-notes.js` to get patch data
2. Create a `changes.json` file with the gods/items that changed
3. Run `add-patch-indicators.js` to add the indicators to `builds.json`
4. The app will now show badges on gods/items in the UI
