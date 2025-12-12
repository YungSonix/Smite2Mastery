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
  if (!item.patchChanges) {
    item.patchChanges = {};
  }
  
  if (!item.patchChanges[patchVersion]) {
    item.patchChanges[patchVersion] = [];
  }
  
  if (!item.patchChanges[patchVersion].includes(changeType)) {
    item.patchChanges[patchVersion].push(changeType);
  }
  
  // Add latestPatchChange for quick lookup
  item.latestPatchChange = {
    version: patchVersion,
    type: changeType,
  };
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
    
    // Convert patch notes format to changes format
    // Extract god/item names, handling both string and object formats
    const extractNames = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.map(item => typeof item === 'string' ? item : (item.name || item)).filter(Boolean);
    };
    
    changes = {
      gods: {
        buffed: extractNames(patchNotes.gods?.buffed || []),
        nerfed: extractNames(patchNotes.gods?.nerfed || []),
        shifted: extractNames(patchNotes.gods?.shifted || []),
        new: extractNames(patchNotes.gods?.new || []) // Extract new gods (like Artio)
      },
      items: {
        buffed: extractNames(patchNotes.items?.buffed || []),
        nerfed: extractNames(patchNotes.items?.nerfed || []),
        shifted: extractNames(patchNotes.items?.changed || []),
        new: extractNames(patchNotes.items?.new || []) // Extract new items if they exist
      }
    };
    
    // Check for items that might be in wrong category (e.g., Dagger of Frenzy in buffed but should be nerfed)
    // If an item appears in both or has conflicting indicators, prioritize based on summary
    const allItemNames = new Set([
      ...changes.items.buffed,
      ...changes.items.nerfed,
      ...changes.items.shifted
    ]);
    
    allItemNames.forEach(itemName => {
      const buffedIndex = changes.items.buffed.indexOf(itemName);
      const nerfedIndex = changes.items.nerfed.indexOf(itemName);
      
      if (buffedIndex !== -1 && nerfedIndex !== -1) {
        // Item in both - check summaries to determine
        const itemEntry = patchNotes.items?.buffed?.find(i => (typeof i === 'string' ? i : i.name) === itemName) ||
                         patchNotes.items?.nerfed?.find(i => (typeof i === 'string' ? i : i.name) === itemName);
        const summary = itemEntry?.summary?.toLowerCase() || '';
        
        // If summary indicates cost increase or stat decrease, it's likely a nerf
        if (summary.includes('increased cost') || (summary.includes('decreased') && !summary.includes('cost'))) {
          changes.items.buffed.splice(buffedIndex, 1);
        } else {
          changes.items.nerfed.splice(nerfedIndex, 1);
        }
      }
    });
    
    console.log(`✅ Converted patch notes: ${changes.gods.buffed.length} buffed, ${changes.gods.nerfed.length} nerfed, ${changes.gods.shifted.length} shifted, ${changes.gods.new.length} new gods`);
    console.log(`   Items: ${changes.items.buffed.length} buffed, ${changes.items.nerfed.length} nerfed, ${changes.items.shifted.length} changed, ${changes.items.new.length} new`);
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

