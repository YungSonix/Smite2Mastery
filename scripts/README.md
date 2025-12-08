# Builds Validation Script

This script validates the `builds.json` file to check if all gods have builds.

## Usage

```bash
node scripts/validate-builds.js
```

## What It Checks

1. **God Coverage**
   - Verifies all gods have at least one build
   - Lists any gods missing builds

2. **Build Role Validation**
   - Checks that each build includes a role keyword in the notes
   - Required roles: adc, support, mid, jungle, or solo (also accepts "carry" for adc and "middle" for mid)
   - Lists which builds are missing role information

3. **Statistics**
   - Total gods count
   - Number of gods with builds
   - Number of gods without builds
   - Total builds count
   - Number of builds without role information
   - Coverage percentage

## Output

The script outputs:
- ✅ Statistics about gods and builds
- ⚠️ List of gods without builds (if any)
- ⚠️ List of builds missing role keywords (if any)

## Exit Codes

- `0` - All gods have builds AND all builds include role keywords
- `1` - One or more gods are missing builds OR one or more builds are missing role keywords

## Example Output

```
================================================================================
BUILDS VALIDATION REPORT
================================================================================

📊 STATISTICS
--------------------------------------------------------------------------------
Total Gods: 72
Gods with Builds: 72 (100.0%)
Gods without Builds: 0 (0.0%)
Total Builds: 126
Builds without Role: 0

⚠️  ISSUES FOUND
--------------------------------------------------------------------------------
✅ All gods have at least one build!
✅ All builds include a role (adc, support, mid, jungle, or solo)!
```

## Fixing Issues

### Gods Without Builds
Add builds to the god's `builds` array in `builds.json`.

### Builds Without Role
Add one of the required role keywords to the build's `notes` field:
- `adc` or `carry`
- `support`
- `mid` or `middle`
- `jungle`
- `solo`

Example:

```json
{
  "name": "GodName",
  "builds": [
    {
      "author": "AuthorName",
      "starting": ["Item1", "Item2"],
      "full_build": ["Item1", "Item2", "Item3", "Item4", "Item5", "Item6", "Item7"],
      "notes": "Support build description"
    }
  ]
}
```
