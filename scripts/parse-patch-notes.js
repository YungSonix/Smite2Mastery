/**
 * Patch Notes Parser Script
 * 
 * Usage: 
 *   node scripts/parse-patch-notes.js <file-path>
 *   OR
 *   node scripts/parse-patch-notes.js <file-path> --text
 * 
 * This script parses patch notes from a text file and breaks it down into a simple JSON format
 * suitable for the "Catch Me Up" feature.
 * 
 * Example:
 *   node scripts/parse-patch-notes.js patch-notes.txt
 *   node scripts/parse-patch-notes.js patch-notes.html --text
 */

const fs = require('fs');
const path = require('path');

function readInput(inputPath) {
  try {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`File not found: ${inputPath}`);
    }
    return fs.readFileSync(inputPath, 'utf8');
  } catch (error) {
    throw new Error(`Error reading file: ${error.message}`);
  }
}

function parseText(text) {
  // Check if it's HTML or plain text
  const isHTML = text.trim().startsWith('<') || text.includes('<html') || text.includes('</div>') || text.includes('</p>');
  
  if (isHTML) {
    return parseHTML(text);
  } else {
    return parsePlainText(text);
  }
}

function parseHTML(html) {
  // Simple HTML parser - extracts text content
  // Remove script and style tags
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Extract main content
  const content = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || 
                  html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                  html.match(/<body[^>]*>([\s\S]*?)<\/body>/i) ||
                  [null, html]; // Fallback to entire HTML if no main content found
  
  let text = content[1] || html;
  
  // Remove HTML tags but preserve structure
  text = text.replace(/<h[1-6][^>]*>/gi, '\n## ');
  text = text.replace(/<\/h[1-6]>/gi, '\n');
  text = text.replace(/<p[^>]*>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '\n- ');
  text = text.replace(/<\/li>/gi, '');
  text = text.replace(/<ul[^>]*>/gi, '\n');
  text = text.replace(/<\/ul>/gi, '\n');
  text = text.replace(/<ol[^>]*>/gi, '\n');
  text = text.replace(/<\/ol>/gi, '\n');
  text = text.replace(/<div[^>]*>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<span[^>]*>/gi, '');
  text = text.replace(/<\/span>/gi, '');
  text = text.replace(/<a[^>]*>/gi, '');
  text = text.replace(/<\/a>/gi, '');
  text = text.replace(/<strong[^>]*>/gi, '**');
  text = text.replace(/<\/strong>/gi, '**');
  text = text.replace(/<em[^>]*>/gi, '*');
  text = text.replace(/<\/em>/gi, '*');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ''); // Remove any remaining HTML tags
  
  // Clean up whitespace
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Multiple newlines to double
  text = text.trim();
  
  return parsePlainText(text);
}

function parsePlainText(text) {
  // Clean up the text
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n'); // Multiple blank lines to double
  
  const result = {
    patchName: '',
    summary: '',
    gods: [], // Array of god objects with changeType and changes array
    items: [],  // Array of item objects with changeType and changes array
    gameModes: [], // Array of game mode objects with name and changes array
    newFeatures: [], // Array of new features
    metaShifts: [] // Array of meta shift descriptions
  };
  
  // Helper function to extract change summary
  function extractChangeSummary(content, matchIndex, entityName) {
    const lines = content.split('\n');
    
    // Find the start line (the line with the entity name)
    let startLine = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Match entity name followed by (Type) or just the name at start of line
      if ((line.startsWith(entityName + ' (') || line.startsWith(entityName + ' ')) && line.includes('(')) {
        startLine = i;
        break;
      }
    }
    
    if (startLine === -1) return '';
    
    // Extract the section for this entity (until next entity or section header)
    let summaryLines = [];
    
    for (let i = startLine + 1; i < lines.length; i++) {
      let line = lines[i].trim();
      const originalLine = line;
      
      // Remove leading dashes or bullets
      line = line.replace(/^[-•*]\s*/, '').trim();
      
      // Stop at next entity entry (line with format "Name (Type)" but NOT ability names with (1) or (P))
      if (/^[A-Z][a-zA-Z\s]+\s*\([^)]+\)/.test(line) && !line.match(/\([\dP]\)$/)) {
        break;
      }
      
      // Stop at major section headers
      if (/^(God Balance|Item Balance|Game Modes|New)/.test(line)) {
        break;
      }
      
      // Collect relevant change lines
      if (line.length > 0) {
        // Check if this is an ability name line (format: "AbilityName (1)" or "AbilityName (P)")
        const isAbilityNameLine = /^[A-Z][a-zA-Z\s]+ \([\dP]\)$/.test(line);
        
        // If this is an ability name, look at the NEXT line(s) for changes
        if (isAbilityNameLine) {
          // Look ahead to find ALL changes on following lines (not just the first one)
          let j = i + 1;
          const abilityChanges = [];
          
          // Check up to 10 lines ahead for changes (to capture multiple changes)
          while (j < lines.length && j <= i + 10) {
            const nextLine = lines[j].trim().replace(/^[-•*]\s*/, '').trim();
            
            // Stop if we hit another ability name or god name
            if (nextLine.match(/^[A-Z][a-zA-Z\s]+ \([\dP]\)$/) || 
                (nextLine.match(/^[A-Z][a-zA-Z\s]+\s*\([^)]+\)/) && !nextLine.match(/\([\dP]\)$/))) {
              break;
            }
            
            // Check if this line has changes
            if (nextLine.length > 0 && (
              nextLine.includes('Increased') || nextLine.includes('Decreased') || 
              nextLine.includes('Fixed') || nextLine.includes('Removed') ||
              nextLine.includes('Changed') || nextLine.includes('Adjusted') ||
              nextLine.includes('New:') || nextLine.includes('New :') ||
              nextLine.match(/\d+\s*->\s*\d+/) ||
              nextLine.match(/:\s*\d+/) ||
              nextLine.match(/\d+\/\d+/)
            )) {
              abilityChanges.push(nextLine);
            }
            
            j++;
            
            // If we've found changes and hit a blank line or non-change line, stop collecting
            if (abilityChanges.length > 0 && (nextLine.length === 0 || 
                (!nextLine.includes('Increased') && !nextLine.includes('Decreased') && 
                 !nextLine.includes('Fixed') && !nextLine.includes('Removed') &&
                 !nextLine.includes('Changed') && !nextLine.includes('Adjusted') &&
                 !nextLine.includes('New:') && !nextLine.includes('New :') &&
                 !nextLine.match(/\d+\s*->\s*\d+/) &&
                 !nextLine.match(/:\s*\d+/) &&
                 !nextLine.match(/\d+\/\d+/)))) {
              // Check if next line is also a change (might be a continuation)
              if (j < lines.length) {
                const peekLine = lines[j].trim().replace(/^[-•*]\s*/, '').trim();
                if (!(peekLine.includes('Increased') || peekLine.includes('Decreased') || 
                      peekLine.includes('Fixed') || peekLine.includes('Removed') ||
                      peekLine.includes('Changed') || peekLine.includes('Adjusted') ||
                      peekLine.includes('New:') || peekLine.includes('New :') ||
                      peekLine.match(/\d+\s*->\s*\d+/) ||
                      peekLine.match(/:\s*\d+/) ||
                      peekLine.match(/\d+\/\d+/))) {
                  break;
                }
              } else {
                break;
              }
            }
          }
          
          if (abilityChanges.length > 0) {
            // Group all changes for this ability together
            summaryLines.push(`${line}: ${abilityChanges.join(' | ')}`);
            i = j - 1; // Skip to after the last change line
          }
          continue; // Move on after processing ability name
        }
        
        // Collect actual change descriptions (direct changes, not under ability names)
        const hasChanges = line.includes('Increased') || line.includes('Decreased') || 
            line.includes('Fixed') || line.includes('Removed') ||
            line.includes('New:') || line.includes('New :') ||
            line.includes('Changed') || line.includes('Adjusted') ||
            line.match(/\d+\s*->\s*\d+/) || // Number changes like "525 -> 546"
            line.match(/:\s*\d+/) || // Lines with colons and numbers
            line.match(/\d+\/\d+/) || // Multi-value stats like "60/115/170/225/280"
            (line.length > 15 && (line.includes('%') || line.includes('Cooldown') || line.includes('Damage') || line.includes('Scaling')));
        
        if (hasChanges) {
          // Clean up the line - remove ability name prefix if present
          let cleanLine = line;
          // Remove ability name prefixes like "Nimble Strike (1) Increased..."
          cleanLine = cleanLine.replace(/^[A-Z][a-zA-Z\s]+ \([\dP]\)\s*/, '');
          // Also handle lines that start with ability name on previous line - keep the change part
          if (cleanLine.length > 0) {
            summaryLines.push(cleanLine);
          }
        }
        
        // Limit to first 6-8 meaningful change lines
        if (summaryLines.length >= 8) break;
      }
    }
    
    // Convert to changes array format
    const changes = [];
    
    for (let i = 0; i < summaryLines.length; i++) {
      const line = summaryLines[i].trim();
      if (line.length < 10) continue;
      
      // Check if this is an ability name line (format: "AbilityName (1)" or "AbilityName (P)")
      const isAbilityNameLine = /^[A-Z][a-zA-Z\s]+ \([\dP]\)$/.test(line);
      
      if (isAbilityNameLine && i + 1 < summaryLines.length) {
        // Look ahead for the change details
        const nextLine = summaryLines[i + 1].trim();
        if (nextLine.length > 0) {
          changes.push({
            ability: line,
            details: nextLine
          });
          i++; // Skip the next line since we used it
        }
      } else {
        // Regular change line - try to parse "Ability: details" format
        const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
        if (colonMatch) {
          const abilityName = colonMatch[1].trim();
          const details = colonMatch[2].trim();
          
          // Check if we already have an entry for this ability
          const existingIndex = changes.findIndex(c => c.ability === abilityName);
          
          if (existingIndex >= 0) {
            // Append to existing ability's details (separated by |)
            changes[existingIndex].details = changes[existingIndex].details + ' | ' + details;
          } else {
            // New ability entry
            changes.push({
              ability: abilityName,
              details: details
            });
          }
        } else if (line.match(/^\d+/) || line.match(/[A-Z][a-z]+/)) {
          // Base stats or general changes
          const abilityName = line.split(':')[0] || 'General';
          const details = line.split(':').slice(1).join(':').trim() || line;
          
          const existingIndex = changes.findIndex(c => c.ability === abilityName);
          if (existingIndex >= 0) {
            changes[existingIndex].details = changes[existingIndex].details + ' | ' + details;
          } else {
            changes.push({
              ability: abilityName,
              details: details
            });
          }
        }
      }
      
      if (changes.length >= 8) break;
    }
    
    return changes;
  }
  
  // Helper to convert changes array back to summary string (for backwards compatibility)
  function changesToSummary(changes) {
    if (!Array.isArray(changes)) return '';
    return changes.map(c => {
      if (typeof c === 'object' && c.ability && c.details) {
        return `${c.ability}: ${c.details}`;
      }
      return typeof c === 'string' ? c : '';
    }).filter(s => s).join(' | ');
  }
  
  // Extract summary from first 300 characters
  const firstLines = text.split('\n').slice(0, 15).join('\n');
  result.summary = firstLines.substring(0, 300);
  
  // Split into major sections (God Balance, Item Balance, Game Modes, etc.)
  const majorSections = text.split(/\n(?=[A-Z][a-z]+ [A-Z][a-z]+)/).filter(s => s.trim());
  
  // If that didn't work well, try splitting by common section headers
  let sections = [];
  const sectionHeaders = ['God Balance', 'Item Balance', 'Game Modes', 'New Ported God', 'New Wander Market'];
  let currentSection = '';
  let currentTitle = '';
  
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isHeader = sectionHeaders.some(header => line.startsWith(header));
    
    if (isHeader) {
      if (currentSection) {
        sections.push({ title: currentTitle, content: currentSection });
      }
      currentTitle = line;
      currentSection = '';
    } else {
      currentSection += (currentSection ? '\n' : '') + line;
    }
  }
  if (currentSection) {
    sections.push({ title: currentTitle || 'General', content: currentSection });
  }
  
  // Parse each section
  sections.forEach((section) => {
    const title = section.title || '';
    const content = section.content || '';
    const lowerTitle = title.toLowerCase();
    
    // Parse God Balance section - convert to new format
    if (lowerTitle.includes('god balance') || lowerTitle.includes('god')) {
      // Pattern: "GodName (Buff)", "GodName (Nerf)", "GodName (Shift)", etc.
      const godPattern = /^([A-Z][a-zA-Z\s]+?)\s*\(([^)]+)\)/gm;
      let match;
      const godEntries = {};
      
      while ((match = godPattern.exec(content)) !== null) {
        const godName = match[1].trim();
        const changeTypeRaw = match[2].toLowerCase().trim();
        
        // Skip if it's not a god name (like "Base", "General", etc.)
        if (godName.length < 3 || ['base', 'general', 'level', 'fixed', 'fix'].includes(godName.toLowerCase())) {
          continue;
        }
        
        // Map changeType - preserve combined types like "fix/buff"
        let changeType = changeTypeRaw;
        if (changeTypeRaw.includes('revert') || changeTypeRaw.includes('goal')) changeType = 'shift';
        else if (changeTypeRaw.includes('fix') && !changeTypeRaw.includes('buff')) changeType = 'fix';
        else if (changeTypeRaw.includes('fix') && changeTypeRaw.includes('buff')) changeType = 'fix/buff';
        else if (changeTypeRaw.includes('shift') && changeTypeRaw.includes('buff')) changeType = 'shift/buff';
        else if (changeTypeRaw.includes('shift') && !changeTypeRaw.includes('buff')) changeType = 'shift';
        else if (changeTypeRaw.includes('buff')) changeType = 'buff';
        else if (changeTypeRaw.includes('nerf')) changeType = 'nerf';
        else if (changeTypeRaw.includes('new')) changeType = 'new';
        
        // Create or get god entry
        const godKey = `${godName}_${changeType}`;
        if (!godEntries[godKey]) {
          godEntries[godKey] = {
            type: 'god',
            name: godName,
            changeType: changeType,
            changes: []
          };
        }
        
        // Get the content section for this god
        const godContent = content.substring(match.index);
        const lines = godContent.split('\n').slice(0, 50); // Look at next 50 lines
        
        // Extract abilities and their changes
        let currentAbility = null;
        let currentAbilityLines = [];
        let generalLines = [];
        let inGeneralSection = true;
        let hasGeneralSection = false;
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Stop if we hit another god
          if (i > 2 && /^[A-Z][a-zA-Z\s]+?\s*\([^)]+\)/.test(line) && !line.match(/\([\dP]\)$/)) {
            break;
          }
          
          // Check if this is an ability name line (format: "AbilityName (1)" or "AbilityName (P)")
          const abilityMatch = line.match(/^([A-Z][a-zA-Z\s/]+?)\s*\(([\dP]+)\)$/);
          
          if (abilityMatch) {
            // Save previous ability if any
            if (currentAbility && currentAbilityLines.length > 0) {
              const isPassive = currentAbility.number === 'P';
              // Check if ability name has "/" which indicates stances
              const hasStances = currentAbility.name.includes('/');
              
              if (hasStances) {
                // Parse stances (e.g., "Energy Surge / Maul Prey")
                const [stance1, stance2] = currentAbility.name.split('/').map(s => s.trim());
                const stance1Desc = currentAbilityLines[0] || '';
                const stance2Desc = currentAbilityLines[1] || currentAbilityLines[0] || '';
                
                godEntries[godKey].changes.push({
                  section: isPassive ? 'Passive' : 'Ability',
                  abilityName: currentAbility.name,
                  abilityNumber: `(${currentAbility.number})`,
                  stances: {
                    [stance1]: stance1Desc,
                    [stance2]: stance2Desc
                  }
                });
              } else {
                godEntries[godKey].changes.push({
                  section: isPassive ? 'Passive' : 'Ability',
                  abilityName: currentAbility.name,
                  abilityNumber: `(${currentAbility.number})`,
                  description: currentAbilityLines
                });
              }
            }
            
            // Start new ability
            currentAbility = {
              name: abilityMatch[1].trim(),
              number: abilityMatch[2].trim()
            };
            currentAbilityLines = [];
            inGeneralSection = false;
          } else if (line.length > 0 && !line.match(/^[-•*]\s*$/)) {
            const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
            
            // Check if line has changes
            const hasChanges = cleanLine.includes('Increased') || cleanLine.includes('Decreased') || 
                             cleanLine.includes('Fixed') || cleanLine.includes('Removed') ||
                             cleanLine.includes('New:') || cleanLine.includes('Changed') ||
                             cleanLine.match(/\d+\s*->\s*\d+/) || cleanLine.match(/:\s*\d+/) ||
                             cleanLine.length > 10;
            
            if (hasChanges || cleanLine.length > 5) {
              if (inGeneralSection) {
                generalLines.push(cleanLine);
                hasGeneralSection = true;
              } else if (currentAbility) {
                currentAbilityLines.push(cleanLine);
              }
            }
          }
        }
        
        // Save last ability if any
        if (currentAbility && currentAbilityLines.length > 0) {
          const isPassive = currentAbility.number === 'P';
          // Check if ability name has "/" which indicates stances
          const hasStances = currentAbility.name.includes('/');
          
          if (hasStances) {
            // Parse stances
            const [stance1, stance2] = currentAbility.name.split('/').map(s => s.trim());
            const stance1Desc = currentAbilityLines[0] || '';
            const stance2Desc = currentAbilityLines[1] || currentAbilityLines[0] || '';
            
            godEntries[godKey].changes.push({
              section: isPassive ? 'Passive' : 'Ability',
              abilityName: currentAbility.name,
              abilityNumber: `(${currentAbility.number})`,
              stances: {
                [stance1]: stance1Desc,
                [stance2]: stance2Desc
              }
            });
          } else {
            godEntries[godKey].changes.push({
              section: isPassive ? 'Passive' : 'Ability',
              abilityName: currentAbility.name,
              abilityNumber: `(${currentAbility.number})`,
              description: currentAbilityLines
            });
          }
        }
        
        // Add general section if we have general info
        if (hasGeneralSection && generalLines.length > 0) {
          godEntries[godKey].changes.push({
            section: 'General',
            description: generalLines
          });
        } else if (!hasGeneralSection && generalLines.length === 0 && !currentAbility) {
          // No abilities found, add a general entry
          godEntries[godKey].changes.push({
            section: 'General',
            description: ['Various changes']
          });
        }
      }
      
      // Add all god entries to result
      Object.values(godEntries).forEach(godEntry => {
        if (godEntry.changes.length > 0) {
          result.gods.push(godEntry);
        }
      });
    }
    
    // Parse Item Balance section - convert to new format
    if (lowerTitle.includes('item balance') || lowerTitle.includes('item')) {
      const lines = content.split('\n');
      const itemNames = [
        'Talisman of Purification', 'Leather Cowl', "Hunter's Cowl", 
        "Sharpshooter's Arrow", 'Dagger of Frenzy', 'Eye of Erebus', 'Polynomicon'
      ];
      
      // Look for items in the content
      itemNames.forEach(itemName => {
        const itemIndex = lines.findIndex(line => line.includes(itemName));
        if (itemIndex !== -1) {
          // Get item section content
          const itemSection = content.substring(content.indexOf(itemName));
          const itemLines = itemSection.split('\n').slice(0, 10);
          const nextLines = itemLines.join('\n').toLowerCase();
          
          // Determine changeType
          let changeType = 'shift';
          if (nextLines.includes('increased') && (nextLines.includes('buff') || nextLines.includes('decreased cost'))) {
            changeType = 'buff';
          } else if (nextLines.includes('decreased') || nextLines.includes('nerf') || nextLines.includes('increased cost')) {
            changeType = 'nerf';
          } else if (nextLines.includes('fixed')) {
            changeType = 'fix';
          } else if (nextLines.includes('shift')) {
            changeType = 'shift';
          }
          
          // Extract change descriptions
          const descriptions = [];
          for (let i = 1; i < itemLines.length; i++) {
            const line = itemLines[i].trim().replace(/^[-•*]\s*/, '').trim();
            
            // Stop at next item or section
            if (i > 2 && (itemNames.some(n => line.includes(n)) || /^[A-Z][a-zA-Z\s]+/.test(line))) {
              break;
            }
            
            if (line.length > 0 && (
              line.includes('Increased') || line.includes('Decreased') || 
              line.includes('Fixed') || line.includes('Removed') ||
              line.match(/\d+\s*->\s*\d+/) || line.match(/:\s*\d+/)
            )) {
              descriptions.push(line);
            }
          }
          
          if (descriptions.length > 0) {
            // Create item entry with changes array
            const changes = descriptions.map(desc => ({ description: desc }));
            
            result.items.push({
              type: 'item',
              name: itemName,
              changeType: changeType,
              changes: changes
            });
          }
        }
      });
    }
    
    // Parse New Ported God section - extract god name and abilities
    if (lowerTitle.includes('new ported god') || lowerTitle.includes('ported god')) {
      // Look for god name pattern in content
      const godPattern = /^([A-Z][a-zA-Z\s]+)/m;
      const match = content.match(godPattern);
      if (match) {
        const godName = match[1].trim();
        
        const godEntry = {
          type: 'god',
          name: godName,
          changeType: 'new',
          changes: []
        };
        
        const lines = content.split('\n');
        let currentSection = 'General';
        let currentAbility = null;
        let currentAbilityLines = [];
        let generalLines = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Check for section headers
          if (line.toLowerCase().includes('passive')) {
            currentSection = 'Passive';
            continue;
          }
          
          // Check if this is an ability name line
          const abilityMatch = line.match(/^([A-Z][a-zA-Z\s/]+?)\s*\(([\dP]+)\)$/);
          
          if (abilityMatch) {
            // Save previous ability if any
            if (currentAbility && currentAbilityLines.length > 0) {
              godEntry.changes.push({
                section: currentSection === 'Passive' ? 'Passive' : 'Ability',
                abilityName: currentAbility.name,
                abilityNumber: `(${currentAbility.number})`,
                description: currentAbilityLines
              });
            }
            
            // Start new ability
            currentAbility = {
              name: abilityMatch[1].trim(),
              number: abilityMatch[2].trim()
            };
            currentAbilityLines = [];
            currentSection = 'Ability';
          } else if (line.length > 0 && !line.match(/^[-•*]\s*$/)) {
            const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
            
            if (currentAbility) {
              currentAbilityLines.push(cleanLine);
            } else {
              generalLines.push(cleanLine);
            }
          }
        }
        
        // Save last ability if any
        if (currentAbility && currentAbilityLines.length > 0) {
          godEntry.changes.push({
            section: currentSection === 'Passive' ? 'Passive' : 'Ability',
            abilityName: currentAbility.name,
            abilityNumber: `(${currentAbility.number})`,
            description: currentAbilityLines
          });
        }
        
        // Add general section if we have general info
        if (generalLines.length > 0) {
          godEntry.changes.push({
            section: 'General',
            description: generalLines
          });
        }
        
        if (godEntry.changes.length > 0) {
          result.gods.push(godEntry);
        }
      }
    }
    
    // Parse Game Modes section
    if (lowerTitle.includes('game mode')) {
      const gameModeLines = content.split('\n').filter(l => l.trim());
      let currentGameMode = null;
      let currentCategory = null;
      let currentDetails = null;
      
      for (let i = 0; i < gameModeLines.length; i++) {
        const line = gameModeLines[i].trim();
        
        // Check if this is a game mode name (Conquest, Assault, Quickplay Joust, etc.)
        const gameModePattern = /^(Conquest|Assault|Joust|Arena|Slash|Quickplay Joust|Ranked Joust|Duel|Siege|Clash|Motd)/i;
        if (gameModePattern.test(line)) {
          // Save previous game mode if exists
          if (currentGameMode && currentGameMode.changes.length > 0) {
            result.gameModes.push(currentGameMode);
          }
          
          // Start new game mode
          currentGameMode = {
            type: 'gameMode',
            name: line.trim(),
            changes: []
          };
          currentCategory = null;
          currentDetails = null;
          continue;
        }
        
        if (!currentGameMode) continue;
        
        // Check if this is a category/subheading (Base Teleporters, Pyromancer, Healer Tiers, etc.)
        if (line.length > 0 && line.length < 50 && /^[A-Z][a-zA-Z\s]+$/.test(line) && 
            !line.includes(':') && !line.includes('->') && !line.match(/^\d/)) {
          // Save previous category if exists
          if (currentCategory && currentDetails) {
            if (Array.isArray(currentDetails) && currentDetails.length > 0) {
              currentGameMode.changes.push({
                category: currentCategory,
                description: currentDetails.join(' | ')
              });
            } else if (typeof currentDetails === 'string' && currentDetails.trim()) {
              currentGameMode.changes.push({
                category: currentCategory,
                description: currentDetails.trim()
              });
            }
          }
          
          currentCategory = line.trim();
          currentDetails = [];
          continue;
        }
        
        // Check if this is a tier entry (Tier 1 (description), Tier 2, etc.)
        const tierMatch = line.match(/^Tier\s+(\d+)\s*\((.+?)\)$/);
        if (tierMatch && currentCategory && currentCategory.toLowerCase().includes('healer')) {
          const tierNum = tierMatch[1];
          const tierDesc = tierMatch[2];
          const godsLine = gameModeLines[i + 1]?.trim() || '';
          const gods = godsLine.split(',').map(g => g.trim()).filter(g => g.length > 0);
          
          // Initialize details array for healer tiers
          let lastChange = currentGameMode.changes[currentGameMode.changes.length - 1];
          if (!lastChange || lastChange.category !== currentCategory || !lastChange.details) {
            currentGameMode.changes.push({
              category: currentCategory,
              description: '',
              details: []
            });
            lastChange = currentGameMode.changes[currentGameMode.changes.length - 1];
          }
          
          lastChange.details.push({
            tier: `Tier ${tierNum}`,
            description: tierDesc,
            gods: gods
          });
          
          i++; // Skip next line as we already processed it
          continue;
        }
        
        // Regular change line
        if (line.length > 0 && !line.match(/^Tier\s+\d+/)) {
          if (currentCategory) {
            if (Array.isArray(currentDetails)) {
              currentDetails.push(line);
            } else {
              currentDetails = line;
            }
          }
        }
      }
      
      // Save last game mode and category
      if (currentGameMode) {
        if (currentCategory && currentDetails) {
          if (Array.isArray(currentDetails) && currentDetails.length > 0) {
            currentGameMode.changes.push({
              category: currentCategory,
              description: currentDetails.join(' | ')
            });
          } else if (typeof currentDetails === 'string' && currentDetails.trim()) {
            currentGameMode.changes.push({
              category: currentCategory,
              description: currentDetails.trim()
            });
          }
        }
        
        if (currentGameMode.changes.length > 0) {
          result.gameModes.push(currentGameMode);
        }
      }
    }
    
  });
  
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node scripts/parse-patch-notes.js <file-path>');
    console.error('');
    console.error('The script will automatically detect if the file is HTML or plain text.');
    console.error('Supported formats: .txt, .md, .html');
    console.error('');
    console.error('Example:');
    console.error('  node scripts/parse-patch-notes.js patch-notes.txt');
    process.exit(1);
  }
  
  const filePath = path.resolve(args[0]);
  
  try {
    console.log(`Reading file: ${filePath}`);
    const text = readInput(filePath);
    
    console.log('Parsing content...');
    const result = parseText(text);
    
    if (result.error) {
      console.error('Error:', result.error);
      process.exit(1);
    }
    
    console.log('\n=== PARSED PATCH NOTES ===\n');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n=== SIMPLE SUMMARY ===\n');
    console.log(`Summary: ${result.summary.substring(0, 200)}...\n`);
    
    // Count unique gods by changeType
    const godCounts = {
      new: new Set(),
      buff: new Set(),
      nerf: new Set(),
      shift: new Set()
    };
    
    result.gods.forEach(entry => {
      const changeType = entry.changeType || 'shift';
      if (changeType === 'new') godCounts.new.add(entry.name);
      else if (changeType === 'buff') godCounts.buff.add(entry.name);
      else if (changeType === 'nerf') godCounts.nerf.add(entry.name);
      else if (changeType === 'shift') godCounts.shift.add(entry.name);
    });
    
    console.log(`New Gods: ${godCounts.new.size}`);
    if (godCounts.new.size > 0) {
      Array.from(godCounts.new).forEach(name => {
        console.log(`  - ${name}`);
      });
    }
    
    console.log(`\nGods Buffed: ${godCounts.buff.size}`);
    if (godCounts.buff.size > 0) {
      Array.from(godCounts.buff).forEach(name => {
        console.log(`  - ${name}`);
      });
    }
    
    console.log(`\nGods Nerfed: ${godCounts.nerf.size}`);
    if (godCounts.nerf.size > 0) {
      Array.from(godCounts.nerf).forEach(name => {
        console.log(`  - ${name}`);
      });
    }
    
    console.log(`\nGods Shifted: ${godCounts.shift.size}`);
    if (godCounts.shift.size > 0) {
      Array.from(godCounts.shift).forEach(name => {
        console.log(`  - ${name}`);
      });
    }
    
    // Filter items by changeType
    const itemsBuffed = result.items.filter(item => item.changeType === 'buff');
    const itemsNerfed = result.items.filter(item => item.changeType === 'nerf');
    const itemsChanged = result.items.filter(item => item.changeType === 'shift' || item.changeType === 'fix');
    
    console.log(`\nItems Buffed: ${itemsBuffed.length || 0}`);
    if (itemsBuffed.length > 0) {
      itemsBuffed.forEach(item => {
        const name = item.name || 'Unknown';
        const summary = item.changes && item.changes.length > 0 
          ? item.changes.map(c => c.description || '').filter(d => d).join(' | ').substring(0, 60)
          : '';
        console.log(`  - ${name}${summary ? `: ${summary}...` : ''}`);
      });
    }
    
    console.log(`\nItems Nerfed: ${itemsNerfed.length || 0}`);
    if (itemsNerfed.length > 0) {
      itemsNerfed.forEach(item => {
        const name = item.name || 'Unknown';
        const summary = item.changes && item.changes.length > 0 
          ? item.changes.map(c => c.description || '').filter(d => d).join(' | ').substring(0, 60)
          : '';
        console.log(`  - ${name}${summary ? `: ${summary}...` : ''}`);
      });
    }
    
    console.log(`\nItems Changed: ${itemsChanged.length || 0}`);
    if (itemsChanged.length > 0) {
      itemsChanged.forEach(item => {
        const name = item.name || 'Unknown';
        const summary = item.changes && item.changes.length > 0 
          ? item.changes.map(c => c.description || '').filter(d => d).join(' | ').substring(0, 60)
          : '';
        console.log(`  - ${name}${summary ? `: ${summary}...` : ''}`);
      });
    }
    
    // Check if newFeatures and metaShifts exist before accessing
    if (result.newFeatures && Array.isArray(result.newFeatures)) {
      console.log(`New Features: ${result.newFeatures.length}`);
    } else {
      console.log(`New Features: 0`);
    }
    
    if (result.metaShifts && Array.isArray(result.metaShifts)) {
      console.log(`\nMeta Shifts:\n${result.metaShifts.join('\n') || 'None'}`);
    } else {
      console.log(`\nMeta Shifts:\nNone`);
    }
    
    console.log(`\nGame Modes Changed: ${result.gameModes.length || 0}`);
    if (result.gameModes && result.gameModes.length > 0) {
      result.gameModes.forEach(mode => {
        console.log(`  - ${mode.name} (${mode.changes.length} changes)`);
        mode.changes.forEach(change => {
          console.log(`    - ${change.category}: ${typeof change.description === 'string' ? change.description.substring(0, 60) : 'See details'}...`);
        });
      });
    }
    
    // Save to JSON file
    const outputPath = filePath.replace(/\.(txt|html|md)$/, '.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`\n✅ Saved parsed data to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseText, parseHTML, parsePlainText };
