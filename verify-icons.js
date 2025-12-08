#!/usr/bin/env node

/**
 * Verification script to ensure all required icon files are tracked in git
 * Run this before building to verify everything is in place
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Required icon files based on code analysis
const requiredIcons = {
  'Role Icons': [
    'T_GodRole_Carry_Small.png',
    'T_GodRole_Solo_Small.png',
    'T_GodRole_Support.png',
    'T_GodRole_Mid_Small.png',
    'T_GodRole_Jungle.png',
  ],
  'Pantheon Icons': [
    'Greek.png',
    'Roman.png',
    'Egyptian.png',
    'Norse.png',
    'Chinese.png',
    'Tales of Arabia.png',
    'Korean.png',
    'Hindu.png',
    'Maya.png',
    'Celtic.png',
    'Japanese.png',
    'Voodoo.png',
    'Yoruba.png',
    'Polynesian.png',
    'Arthurian.png',
  ],
  'Stat Icons': [
    'HUD_Stats_Icon_BasicAttackPower.png',
    'T_StatIcon_Active.png',
    'T_StatIcon_AttackSpeed.png',
    'T_StatIcon_Consumable.png',
    'T_StatIcon_Cooldown.png',
    'T_StatIcon_HealReduction.png',
    'T_StatIcon_Health.png',
    'T_StatIcon_HealthRegen.png',
    'T_StatIcon_Intelligence.png',
    'T_StatIcon_Lifesteal.png',
    'T_StatIcon_MagicalProt.png',
    'T_StatIcon_Mana.png',
    'T_StatIcon_ManaRegen.png',
    'T_StatIcon_MovementSpeed.png',
    'T_StatIcon_Passive.png',
    'T_StatIcon_Pen.png',
    'T_StatIcon_PhysicalProt.png',
    'T_StatIcon_Starter.png',
    'T_StatIcon_Strength.png',
    'T_StatIcon_Crit.png',
  ],
  'Consumables': [
    'Consumable_Barons_Brew.png',
    'Consumable_Eyes_of_the_Jungle.png',
    'Consumable_Obsidian_Dagger.png',
    'Consumable_Vision_Ward.png',
    'Consumable_Sentry_Ward.png',
    'Consumable_Warding_Chalice.png',
    'Consumable_Elixir_of_Strength.png',
    'Consumable_Elixir_of_Intelligence.png',
  ],
  'Vulcan Mods': [
    'GodSpecific_Vulcan_Alternator_Mod.png',
    'GodSpecific_Vulcan_Dual_Mod.png',
    'GodSpecific_Vulcan_Efficiency_Mod.png',
    'GodSpecific_Vulcan_Resonator_Mod.png',
    'GodSpecific_Vulcan_Thermal_Mod.png',
    'GodSpecific_Vulcan_Shrapnel_Mod.png',
    'GodSpecific_Vulcan_Masterwork_Mod.png',
    'GodSpecific_Vulcan_Surplus_Mod.png',
    'GodSpecific_Vulcan_Seismic_Mod.png',
  ],
  'Game Modes': [
    'Conquest/conquestmap.webp',
    'Arena/ArenaCA1Update.webp',
    'Joust/Joust_Minimap_F2P.webp',
    'Duel/Duel_Minimap_F2P.webp',
    'Assault/t_Assault_F2P.webp',
    'Conquest/CausticBuff.webp',
    'Conquest/PrimalBuff.webp',
    'Conquest/InspirationBuff.webp',
    'Conquest/PathfinderBuff.webp',
    'Conquest/Towers.webp',
    'Conquest/Phoenix.webp',
    'Conquest/Titan.webp',
  ],
};

let allPassed = true;
const basePath = path.join(__dirname, 'app', 'data', 'Icons');

console.log('🔍 Verifying required icon files...\n');

// Check if files exist locally
for (const [category, files] of Object.entries(requiredIcons)) {
  console.log(`📁 Checking ${category}:`);
  const categoryPath = path.join(basePath, category);
  
  for (const file of files) {
    const filePath = path.join(categoryPath, file);
    const relativePath = path.relative(process.cwd(), filePath);
    const exists = fs.existsSync(filePath);
    
    if (!exists) {
      console.log(`  ❌ MISSING: ${relativePath}`);
      allPassed = false;
    } else {
      // Check if tracked in git
      try {
        const gitPath = `app/data/Icons/${category}/${file}`;
        execSync(`git ls-files --error-unmatch "${gitPath}"`, { stdio: 'ignore' });
        console.log(`  ✅ ${file}`);
      } catch (error) {
        console.log(`  ⚠️  EXISTS but NOT TRACKED in git: ${relativePath}`);
        allPassed = false;
      }
    }
  }
  console.log('');
}

// Check .gitignore configuration
console.log('📋 Checking .gitignore configuration...');
const gitignorePath = path.join(__dirname, '.gitignore');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

const shouldIgnore = [
  'app/data/Icons/God Info/',
  'app/data/Icons/Item Icons/',
  'app/data/Icons/Wallpapers/',
];

const shouldNotIgnore = [
  'app/data/Icons/Role Icons/',
  'app/data/Icons/Pantheon Icons/',
  'app/data/Icons/Stat Icons/',
  'app/data/Icons/Consumables/',
  'app/data/Icons/Vulcan Mods/',
  'app/data/Icons/Game Modes/',
  'app/data/Icons/Conquest Images/',
];

for (const pattern of shouldIgnore) {
  if (gitignoreContent.includes(pattern)) {
    console.log(`  ✅ Correctly ignoring: ${pattern}`);
  } else {
    console.log(`  ⚠️  Should ignore but not found: ${pattern}`);
  }
}

console.log('');

// Final summary
console.log('='.repeat(50));
if (allPassed) {
  console.log('✅ All checks passed! Build should succeed.');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
  process.exit(1);
}

