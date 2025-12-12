# Patch Notes File Structure

## Recommended: Separate JSON Files Per Patch

Keep each patch in its own file for easier maintenance:

```
Patch Notes/
  ├── patchnotesob24.json  (latest)
  ├── patchnotesob23.json
  ├── patchnotesob22.json
  ├── patchnotesob21.json
  └── ... (one file per patch)
```

### Why Separate Files?
- ✅ Easier to update (just add a new file per patch)
- ✅ Don't need to load all patches at once
- ✅ Can lazy load patches on demand
- ✅ Cleaner structure
- ✅ Better for version control

### File Naming Convention
- Format: `patchnotesob{number}.json`
- Example: `patchnotesob24.json`, `patchnotesob23.json`, etc.

### Current Implementation
The "Catch Me Up" feature now:
1. Shows a dropdown with patch numbers (OB24 down to OB1)
2. Loads the selected patch file dynamically
3. Compares it with the latest patch (OB24)
4. Shows all changes between the two patches

### Adding New Patches
1. Run `parse-patch-notes.js` on the new patch notes text file
2. Copy the generated JSON to `Patch Notes/patchnotesob{number}.json`
3. The app will automatically detect and include it in the dropdown

