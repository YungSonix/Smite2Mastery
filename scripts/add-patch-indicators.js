/**
 * Patch Indicators Script
 * 
 * Usage: node scripts/add-patch-indicators.js <patch-version> <path-to-builds.json> [path-to-patch-notes.json]
 * 
 * This script adds patch change indicators to gods and items in builds.json
 * based on the latest patch changes.
 * 
 * Example:
 * node scripts/add-patch-indicators.js "2.1.0" "./app/data/builds.json"
 * node scripts/add-patch-indicators.js "2.1.0" "./app/data/builds.json" "./patchnotesob24.json"
 */

const fs = require('fs');
const path = require('path');

// Patch change indicators
const CHANGE_TYPES = {
  BUFFED: 'buffed',
  NERFED: 'nerfed',
  SHIFTED: 'shifted',
  NEW: 'new',
};

function loadJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    process.exit(1);
  }
}

function saveJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Successfully updated ${filePath}`);
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error.message);
    process.exit(1);
  }
}

function addPatchIndicator(item, changeType, patchVersion) {
  // Initialize patchChanges if it doesn't exist
  if (!item.patchChanges) {
    item.patchChanges = {};
  }
  
  // Initialize the current patch version if it doesn't exist
  if (!item.patchChanges[patchVersion]) {
    item.patchChanges[patchVersion] = [];
  }
  
  // Add the current change type to the latest patch (if not already present)
  if (!item.patchChanges[patchVersion].includes(changeType)) {
    item.patchChanges[patchVersion].push(changeType);
  }
  
  // Add latestPatchChange for quick lookup
  item.latestPatchChange = {
    version: patchVersion,
    type: changeType,
  };
}

function clearOldPatches(item, patchVersion) {
  // Clear all patch changes except the current patch version
  if (item.patchChanges) {
    const currentPatchChanges = item.patchChanges[patchVersion] || [];
    item.patchChanges = {};
    if (currentPatchChanges.length > 0) {
      item.patchChanges[patchVersion] = currentPatchChanges;
    }
  }
}

function flattenAny(a) {
  if (!a) return [];
  if (!Array.isArray(a)) return [a];
  return a.flat(Infinity).filter(Boolean);
}

// Name mapping for gods that have different names in patch notes vs builds.json
const godNameMap = {
  'mulan': 'hua mulan',
};

function findGodByName(builds, godName) {
  if (!builds || !builds.gods) return null;
  
  // Flatten the gods array first (builds.json has nested arrays)
  const gods = flattenAny(builds.gods);
  
  // Check name mapping first
  const normalizedName = godName.toLowerCase().trim();
  const mappedName = godNameMap[normalizedName] || normalizedName;
  
  for (const god of gods) {
    if (!god || typeof god !== 'object') continue;
    
    const name = god.name || god.GodName || god.title || god.displayName;
    if (name && name.toLowerCase().trim() === mappedName) {
      return god;
    }
  }
  
  return null;
}

function findItemByName(builds, itemName) {
  if (!builds || !builds.items) return null;
  
  // Flatten the items array first (builds.json has nested arrays)
  const items = flattenAny(builds.items);
  
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    
    const name = item.name || item.internalName;
    if (name && name.toLowerCase().trim() === itemName.toLowerCase().trim()) {
      return item;
    }
  }
  
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node add-patch-indicators.js <patch-version> <path-to-builds.json> [path-to-patch-notes.json]');
    console.error('');
    console.error('Options:');
    console.error('  1. Provide a parsed patch notes JSON file (from parse-patch-notes.js)');
    console.error('  2. Or create a changes.json file in the same directory as builds.json');
    console.error('');
    console.error('Example with parsed patch notes:');
    console.error('  node scripts/add-patch-indicators.js "2.1.0" "./app/data/builds.json" "./patchnotesob24.json"');
    process.exit(1);
  }
  
  const patchVersion = args[0];
  const buildsPath = path.resolve(args[1]);
  const patchNotesPath = args[2] ? path.resolve(args[2]) : null;
  
  if (!fs.existsSync(buildsPath)) {
    console.error(`Error: File not found: ${buildsPath}`);
    process.exit(1);
  }
  
  console.log(`📦 Loading builds.json from: ${buildsPath}`);
  const builds = loadJsonFile(buildsPath);
  
  let changes = null;
  
  // First, try to use the patch notes JSON if provided
  if (patchNotesPath && fs.existsSync(patchNotesPath)) {
    console.log(`📝 Loading patch notes from: ${patchNotesPath}`);
    const patchNotes = loadJsonFile(patchNotesPath);
    
    // Check if this is the new format (flat array with changeType) or old format (grouped by type)
    const isNewFormat = Array.isArray(patchNotes.gods) && patchNotes.gods.length > 0 && patchNotes.gods[0].changeType;
    
    if (isNewFormat) {
      // New format: flat arrays with changeType property (e.g., patchnotesob25.json)
      changes = {
        gods: {
          buffed: [],
          nerfed: [],
          shifted: [],
          new: [],
        },
        items: {
          buffed: [],
          nerfed: [],
          shifted: [],
          new: [],
        },
      };
      
      // Process gods from flat array
      if (Array.isArray(patchNotes.gods)) {
        patchNotes.gods.forEach((entry) => {
          if (entry.type === 'god' && entry.name) {
            const changeType = (entry.changeType || '').toLowerCase();
            if (changeType === 'buff') {
              changes.gods.buffed.push(entry.name);
            } else if (changeType === 'nerf') {
              changes.gods.nerfed.push(entry.name);
            } else if (changeType === 'shift' || changeType === 'rework') {
              changes.gods.shifted.push(entry.name);
            } else if (changeType === 'new') {
              changes.gods.new.push(entry.name);
            }
          }
        });
      }
      
      // Process items from flat array
      if (Array.isArray(patchNotes.items)) {
        patchNotes.items.forEach((entry) => {
          if (entry.type === 'item' && entry.name) {
            const changeType = (entry.changeType || '').toLowerCase();
            if (changeType === 'buff') {
              changes.items.buffed.push(entry.name);
            } else if (changeType === 'nerf') {
              changes.items.nerfed.push(entry.name);
            } else if (changeType === 'shift' || changeType === 'fix' || changeType === 'change' || changeType === 'rework' || changeType === 'major_system') {
              changes.items.shifted.push(entry.name);
            } else if (changeType === 'new') {
              changes.items.new.push(entry.name);
            }
          }
        });
      }
    } else {
      // Old format: grouped by changeType (e.g., gods.buffed, gods.nerfed, etc.)
      const extractNames = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((item) => (typeof item === 'string' ? item : item.name || item)).filter(Boolean);
      };
      
      changes = {
        gods: {
          buffed: extractNames(patchNotes.gods?.buffed || []),
          nerfed: extractNames(patchNotes.gods?.nerfed || []),
          shifted: extractNames(patchNotes.gods?.shifted || []),
          new: extractNames(patchNotes.gods?.new || []),
        },
        items: {
          buffed: extractNames(patchNotes.items?.buffed || []),
          nerfed: extractNames(patchNotes.items?.nerfed || []),
          shifted: extractNames(patchNotes.items?.changed || []),
          new: extractNames(patchNotes.items?.new || []),
        },
      };
    }
    
    // Check for items that might be in wrong category (e.g., Dagger of Frenzy in buffed but should be nerfed)
    // If an item appears in both or has conflicting indicators, prioritize based on summary
    const allItemNames = new Set([
      ...changes.items.buffed,
      ...changes.items.nerfed,
      ...changes.items.shifted,
      ...changes.items.new,
    ]);
    
    allItemNames.forEach((itemName) => {
      const buffedIndex = changes.items.buffed.indexOf(itemName);
      const nerfedIndex = changes.items.nerfed.indexOf(itemName);
      
      if (buffedIndex !== -1 && nerfedIndex !== -1) {
        // Item in both - check summaries to determine
        let itemEntry = null;
        if (isNewFormat) {
          itemEntry = patchNotes.items?.find((i) => i.name === itemName);
        } else {
          itemEntry =
            patchNotes.items?.buffed?.find((i) => (typeof i === 'string' ? i : i.name) === itemName) ||
            patchNotes.items?.nerfed?.find((i) => (typeof i === 'string' ? i : i.name) === itemName);
        }
        const summary = itemEntry?.summary?.toLowerCase() || '';
        const description = Array.isArray(itemEntry?.changes)
          ? itemEntry.changes.map((c) => c.description || '').join(' ').toLowerCase()
          : '';
        const combined = summary + ' ' + description;
        
        // If summary indicates cost increase or stat decrease, it's likely a nerf
        if (combined.includes('increased cost') || (combined.includes('decreased') && !combined.includes('cost'))) {
          changes.items.buffed.splice(buffedIndex, 1);
        } else {
          changes.items.nerfed.splice(nerfedIndex, 1);
        }
      }
    });
    
    console.log(
      `✅ Converted patch notes: ${changes.gods.buffed.length} buffed, ${changes.gods.nerfed.length} nerfed, ${changes.gods.shifted.length} shifted, ${changes.gods.new.length} new gods`
    );
    console.log(
      `   Items: ${changes.items.buffed.length} buffed, ${changes.items.nerfed.length} nerfed, ${changes.items.shifted.length} shifted, ${changes.items.new.length} new`
    );
  } else {
    // Fall back to changes.json file
    const changesPath = path.resolve(path.dirname(buildsPath), 'changes.json');
    
    if (fs.existsSync(changesPath)) {
      console.log(`📝 Loading changes from: ${changesPath}`);
      changes = loadJsonFile(changesPath);
    } else {
      console.log('📝 No changes.json or patch notes file found. Creating template...');
      console.log('Please create a changes.json file with your patch changes, or');
      console.log('run parse-patch-notes.js first and provide the output JSON file.');
      console.log('Template saved to:', path.resolve(path.dirname(buildsPath), 'changes-template.json'));
      
      const template = {
        gods: {
          buffed: [],
          nerfed: [],
          shifted: [],
          new: [],
        },
        items: {
          buffed: [],
          nerfed: [],
          shifted: [],
          new: [],
        }
      };
      
      fs.writeFileSync(
        path.resolve(path.dirname(buildsPath), 'changes-template.json'),
        JSON.stringify(template, null, 2),
        'utf8'
      );
      
      process.exit(0);
    }
  }
  
  // First, clear all old patches for all gods and items (keep only current patch)
  console.log('🧹 Clearing old patch indicators...');
  const allGods = flattenAny(builds.gods || []);
  const allItems = flattenAny(builds.items || []);
  
  allGods.forEach(god => {
    if (god && typeof god === 'object') {
      clearOldPatches(god, patchVersion);
    }
  });
  
  allItems.forEach(item => {
    if (item && typeof item === 'object') {
      clearOldPatches(item, patchVersion);
    }
  });
  
  console.log(`   Cleared old patches for ${allGods.length} gods and ${allItems.length} items`);
  
  let changedCount = 0;
  
  // Process god changes
  if (changes.gods) {
    Object.keys(CHANGE_TYPES).forEach(changeType => {
      const type = CHANGE_TYPES[changeType].toLowerCase();
      const godNames = changes.gods[type] || [];
      
      godNames.forEach(godName => {
        // Try original name first
        let god = findGodByName(builds, godName);
        
        // If not found and it's "Mulan", try "Hua Mulan" (with space)
        if (!god && godName.toLowerCase() === 'mulan') {
          god = findGodByName(builds, 'Hua Mulan');
        }
        
        if (god) {
          addPatchIndicator(god, type, patchVersion);
          changedCount++;
          console.log(`  ✅ ${changeType}: ${godName}`);
        } else {
          console.log(`  ⚠️  Not found: ${godName}`);
        }
      });
    });
  }
  
  // Process item changes
  if (changes.items) {
    Object.keys(CHANGE_TYPES).forEach(changeType => {
      const type = CHANGE_TYPES[changeType].toLowerCase();
      let itemNames = changes.items[type] || [];
      
      // Handle "changed" items - map to "shifted" for consistency
      if (type === 'shifted' && changes.items.changed) {
        itemNames = [...itemNames, ...changes.items.changed];
      }
      
      // Remove duplicates
      itemNames = [...new Set(itemNames)];
      
      itemNames.forEach(itemName => {
        const item = findItemByName(builds, itemName);
        if (item) {
          addPatchIndicator(item, type, patchVersion);
          changedCount++;
          console.log(`  ✅ ${changeType}: ${itemName}`);
        } else {
          console.log(`  ⚠️  Not found: ${itemName}`);
        }
      });
    });
  }
  
  console.log(`\n📊 Total changes applied: ${changedCount}`);
  
  // Save updated builds.json
  saveJsonFile(buildsPath, builds);
  
  console.log('\n✨ Done! Patch indicators have been added to builds.json');
  console.log(`   Patch version: ${patchVersion}`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { addPatchIndicator, findGodByName, findItemByName };

