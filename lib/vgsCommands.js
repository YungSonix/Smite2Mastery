/**
 * SMITE VGS catalog — PC codes + callout text, mapped to VoiceAudio VGS filenames.
 * Codes: https://smite.fandom.com/wiki/VGS_Cheat_Sheet
 * Audio: GitHub assets branch app/data/VoiceAudio/<god>/<skin>/VGS/VOX_VGS_*.WAV
 */

export const VGS_CHEAT_SHEET_URL = 'https://smite.fandom.com/wiki/VGS_Cheat_Sheet';

function vgs(code, text, file, category, extra = {}) {
  return { code, text, file: file || null, category, ...extra };
}

export const VGS_COMMANDS = [
  vgs('VA1', 'Attack left lane!', 'VOX_VGS_Attack_1.WAV', 'Attack'),
  vgs('VA2', 'Attack middle lane!', 'VOX_VGS_Attack_2.WAV', 'Attack'),
  vgs('VA3', 'Attack right lane!', 'VOX_VGS_Attack_3.WAV', 'Attack'),
  vgs('VAA', 'Attack!', 'VOX_VGS_Attack_A.WAV', 'Attack'),
  vgs('VAF', 'Attack the Fire Giant!', 'VOX_VGS_Attack_F.WAV', 'Attack'),
  vgs('VAG', 'Attack the Gold Fury!', 'VOX_VGS_Attack_G.WAV', 'Attack'),
  vgs('VAM', 'Attack the Titan!', 'VOX_VGS_Attack_M.WAV', 'Attack'),
  vgs('VAT', 'Attack the tower!', 'VOX_VGS_Attack_T.WAV', 'Attack'),
  vgs('VAT1', 'Attack the left tower!', 'VOX_VGS_Tower_1.WAV', 'Attack'),
  vgs('VAT2', 'Attack the middle tower!', 'VOX_VGS_Tower_2.WAV', 'Attack'),
  vgs('VAT3', 'Attack the right tower!', 'VOX_VGS_Tower_3.WAV', 'Attack'),
  vgs('VATT', 'Attack the tower!', 'VOX_VGS_Tower.WAV', 'Attack'),
  vgs('VAP1', 'Attack the left phoenix!', 'VOX_VGS_Phoenix_1.WAV', 'Attack', { s2: true }),
  vgs('VAP2', 'Attack the middle phoenix!', 'VOX_VGS_Phoenix_2.WAV', 'Attack', { s2: true }),
  vgs('VAP3', 'Attack the right phoenix!', 'VOX_VGS_Phoenix_3.WAV', 'Attack', { s2: true }),
  vgs('VAP', 'Attack the phoenix!', 'VOX_VGS_Phoenix.WAV', 'Attack', { s2: true }),
  vgs('ARM', 'Arena objective (M)', 'VOX_VGS_Arena_M.WAV', 'Arena', { s2: true }),
  vgs('ARP', 'Arena objective (P)', 'VOX_VGS_Arena_P.WAV', 'Arena', { s2: true }),
  vgs('VB1', 'Enemies in left lane!', 'VOX_VGS_Enemy_1.WAV', 'Enemy'),
  vgs('VB2', 'Enemies in middle lane!', 'VOX_VGS_Enemy_2.WAV', 'Enemy'),
  vgs('VB3', 'Enemies in right lane!', 'VOX_VGS_Enemy_3.WAV', 'Enemy'),
  vgs('VBA', 'Enemy ultimate incoming!', 'VOX_VGS_Ultimate_Enemy_A.WAV', 'Enemy'),
  vgs('VBB', 'Enemies have returned to base.', 'VOX_VGS_Enemy_B.WAV', 'Enemy'),
  vgs('VBD', 'Enemy ultimate down!', 'VOX_VGS_Ultimate_Enemy_D.WAV', 'Enemy'),
  vgs('VBE', 'Enemies behind us!', 'VOX_VGS_Enemy_E.WAV', 'Enemy'),
  vgs('VBF', 'Enemies at the Fire Giant!', 'VOX_VGS_Enemy_F.WAV', 'Enemy'),
  vgs('VBG', 'Enemies at the Gold Fury!', 'VOX_VGS_Enemy_G.WAV', 'Enemy'),
  vgs('VBJ1', 'Enemies in the left jungle!', 'VOX_VGS_Enemy_Jungle_1.WAV', 'Enemy'),
  vgs('VBJ2', 'Enemies in the right jungle!', 'VOX_VGS_Enemy_Jungle_2.WAV', 'Enemy', { aliases: ['VBJ3'] }),
  vgs('VBJJ', 'Enemies in the jungle!', 'VOX_VGS_Enemy_J.WAV', 'Enemy'),
  vgs('VBM', 'Enemies at our Titan!', 'VOX_VGS_Enemy_M.WAV', 'Enemy'),
  vgs('VBS', 'Enemy spotted!', 'VOX_VGS_Enemy_S.WAV', 'Enemy'),
  vgs('VBT', 'Enemies at the tower!', 'VOX_VGS_Enemy_T.WAV', 'Enemy', { s2: true }),
  vgs('VC1', 'Be careful left!', 'VOX_VGS_Careful_1.WAV', 'Careful'),
  vgs('VC2', 'Be careful middle!', 'VOX_VGS_Careful_2.WAV', 'Careful'),
  vgs('VC3', 'Be careful right!', 'VOX_VGS_Careful_3.WAV', 'Careful'),
  vgs('VCB', 'Return to base!', 'VOX_VGS_Careful_B.WAV', 'Careful'),
  vgs('VCC', 'Be careful!', 'VOX_VGS_Careful_C.WAV', 'Careful'),
  vgs('VCJ', 'Be careful in the jungle!', 'VOX_VGS_Careful_J.WAV', 'Careful'),
  vgs('VD1', 'Defend left lane!', 'VOX_VGS_Defend_1.WAV', 'Defend'),
  vgs('VD2', 'Defend middle lane!', 'VOX_VGS_Defend_2.WAV', 'Defend'),
  vgs('VD3', 'Defend right lane!', 'VOX_VGS_Defend_3.WAV', 'Defend'),
  vgs('VDD', 'Defend!', 'VOX_VGS_Defend_D.WAV', 'Defend'),
  vgs('VDF', 'Defend the Fire Giant!', 'VOX_VGS_Defend_F.WAV', 'Defend'),
  vgs('VDG', 'Defend the Gold Fury!', 'VOX_VGS_Defend_G.WAV', 'Defend'),
  vgs('VDM', 'Defend the Titan!', 'VOX_VGS_Defend_M.WAV', 'Defend'),
  vgs('VDT', 'Defend the tower!', 'VOX_VGS_Defend_T.WAV', 'Defend', { s2: true }),
  vgs('VEA', 'Awesome!', 'VOX_VGS_Emote_A.WAV', 'Emote'),
  vgs('VEF', 'Fantastic!', 'VOX_VGS_Emote_F.WAV', 'Emote'),
  vgs('VEG', 'You are the greatest!', 'VOX_VGS_Emote_G.WAV', 'Emote'),
  vgs('VEJ', 'Joke', null, 'Emote'),
  vgs('VEL', 'Laugh', null, 'Emote'),
  vgs('VER', 'You rock!', 'VOX_VGS_Emote_R.WAV', 'Emote'),
  vgs('VET', 'Taunt', null, 'Emote'),
  vgs('VEW', 'Woohoo!', 'VOX_VGS_Emote_W.WAV', 'Emote'),
  vgs('VVN', 'No!', 'VOX_VGS_Emote_No.WAV', 'Other'),
  vgs('VVP', 'Please?', 'VOX_VGS_Emote_Please.WAV', 'Other'),
  vgs('VVY', 'Yes!', 'VOX_VGS_Emote_Yes.WAV', 'Other'),
  vgs('VF1', 'Enemy missing left!', 'VOX_VGS_MIA_1.WAV', 'MIA'),
  vgs('VF2', 'Enemy missing middle!', 'VOX_VGS_MIA_2.WAV', 'MIA'),
  vgs('VF3', 'Enemy missing right!', 'VOX_VGS_MIA_3.WAV', 'MIA'),
  vgs('VFF', 'Enemy missing!', 'VOX_VGS_MIA_M.WAV', 'MIA'),
  vgs('VG1', 'Gank left lane!', 'VOX_VGS_Gank_1.WAV', 'Gank'),
  vgs('VG2', 'Gank middle lane!', 'VOX_VGS_Gank_2.WAV', 'Gank'),
  vgs('VG3', 'Gank right lane!', 'VOX_VGS_Gank_3.WAV', 'Gank'),
  vgs('VGG', 'Gank!', 'VOX_VGS_Gank_G.WAV', 'Gank'),
  vgs('VH1', 'Help left lane!', 'VOX_VGS_Help_1.WAV', 'Help'),
  vgs('VH2', 'Help middle lane!', 'VOX_VGS_Help_2.WAV', 'Help'),
  vgs('VH3', 'Help right lane!', 'VOX_VGS_Help_3.WAV', 'Help'),
  vgs('VHH', 'Help!', 'VOX_VGS_Help.WAV', 'Help'),
  vgs('VHS', 'Need healing!', 'VOX_VGS_Help_S.WAV', 'Help'),
  vgs('VI1', 'Enemies incoming left!', 'VOX_VGS_Incoming_1.WAV', 'Incoming'),
  vgs('VI2', 'Enemies incoming middle!', 'VOX_VGS_Incoming_2.WAV', 'Incoming'),
  vgs('VI3', 'Enemies incoming right!', 'VOX_VGS_Incoming_3.WAV', 'Incoming'),
  vgs('VII', 'Enemies incoming!', 'VOX_VGS_Incoming_I.WAV', 'Incoming'),
  vgs('VQ1', 'Ward left!', 'VOX_VGS_Ward_1.WAV', 'Ward'),
  vgs('VQ2', 'Ward middle!', 'VOX_VGS_Ward_2.WAV', 'Ward'),
  vgs('VQ3', 'Ward right!', 'VOX_VGS_Ward_3.WAV', 'Ward'),
  vgs('VQF', 'Ward Fire Giant!', 'VOX_VGS_Ward_F.WAV', 'Ward'),
  vgs('VQG', 'Ward Gold Fury!', 'VOX_VGS_Ward_G.WAV', 'Ward'),
  vgs('VQN', 'Need wards!', 'VOX_VGS_Ward_N.WAV', 'Ward'),
  vgs('VQQ', 'Ward here!', 'VOX_VGS_Ward.WAV', 'Ward'),
  vgs('VQT', 'Place a ward for teleport!', 'VOX_VGS_Ward_T.WAV', 'Ward'),
  vgs('VR1', 'Retreat left lane!', 'VOX_VGS_Retreat_1.WAV', 'Retreat'),
  vgs('VR2', 'Retreat middle lane!', 'VOX_VGS_Retreat_2.WAV', 'Retreat'),
  vgs('VR3', 'Retreat right lane!', 'VOX_VGS_Retreat_3.WAV', 'Retreat'),
  vgs('VRJ', 'Retreat from the jungle!', 'VOX_VGS_Retreat_J.WAV', 'Retreat'),
  vgs('VRR', 'Retreat!', 'VOX_VGS_Retreat_R.WAV', 'Retreat'),
  vgs('VRS', 'Save yourself!', 'VOX_VGS_Retreat_S.WAV', 'Retreat'),
  vgs('VSA1', "I'll attack left lane!", 'VOX_VGS_Self_Attack_1.WAV', 'Self', { group: 'Attack' }),
  vgs('VSA2', "I'll attack middle lane!", 'VOX_VGS_Self_Attack_2.WAV', 'Self', { group: 'Attack' }),
  vgs('VSA3', "I'll attack right lane!", 'VOX_VGS_Self_Attack_3.WAV', 'Self', { group: 'Attack' }),
  vgs('VSAA', "I'll attack!", 'VOX_VGS_Self_Attack.WAV', 'Self', { group: 'Attack' }),
  vgs('VSAF', "I'll attack Fire Giant!", 'VOX_VGS_Self_Attack_F.WAV', 'Self', { group: 'Attack' }),
  vgs('VSAG', "I'll attack the Gold Fury!", 'VOX_VGS_Self_Attack_G.WAV', 'Self', { group: 'Attack' }),
  vgs('VSAM', "I'll attack the Titan!", 'VOX_VGS_Self_Attack_M.WAV', 'Self', { group: 'Attack' }),
  vgs('VSAT', "I'll attack the tower!", 'VOX_VGS_Self_Attack_T.WAV', 'Self', { group: 'Attack' }),
  vgs('VSBB', "I'm going for jungle buff!", 'VOX_VGS_Self_B.WAV', 'Self', { group: 'Jungle buff' }),
  vgs('VSBN', 'I need the jungle buff.', 'VOX_VGS_Jungle_Buff_N.WAV', 'Self', { group: 'Jungle buff' }),
  vgs('VSBT', 'Take this jungle buff.', 'VOX_VGS_Jungle_Buff_C.WAV', 'Self', { group: 'Jungle buff' }),
  vgs('VSD1', "I'll defend left lane!", 'VOX_VGS_Self_Defend_1.WAV', 'Self', { group: 'Defend' }),
  vgs('VSD2', "I'll defend middle lane!", 'VOX_VGS_Self_Defend_2.WAV', 'Self', { group: 'Defend' }),
  vgs('VSD3', "I'll defend right lane!", 'VOX_VGS_Self_Defend_3.WAV', 'Self', { group: 'Defend' }),
  vgs('VSDD', "I'll defend!", 'VOX_VGS_Self_Defend.WAV', 'Self', { group: 'Defend' }),
  vgs('VSDF', "I'll defend the Fire Giant!", 'VOX_VGS_Self_Defend_F.WAV', 'Self', { group: 'Defend' }),
  vgs('VSDG', "I'll defend the Gold Fury!", 'VOX_VGS_Self_Defend_G.WAV', 'Self', { group: 'Defend' }),
  vgs('VSDM', "I'll defend the Titan!", 'VOX_VGS_Self_Defend_M.WAV', 'Self', { group: 'Defend' }),
  vgs('VSDT', "I'll defend the tower!", 'VOX_VGS_Self_Defend_T.WAV', 'Self', { group: 'Defend' }),
  vgs('VSG1', "I'll gank left lane!", 'VOX_VGS_Self_Gank_1.WAV', 'Self', { group: 'Gank' }),
  vgs('VSG2', "I'll gank middle lane!", 'VOX_VGS_Self_Gank_2.WAV', 'Self', { group: 'Gank' }),
  vgs('VSG3', "I'll gank right lane!", 'VOX_VGS_Self_Gank_3.WAV', 'Self', { group: 'Gank' }),
  vgs('VSGG', "I'll gank!", 'VOX_VGS_Self_Gank.WAV', 'Self', { group: 'Gank' }),
  vgs('VSO', "I'm on it!", 'VOX_VGS_Self_O.WAV', 'Self', { group: 'On it' }),
  vgs('VSQ1', 'I will ward left!', 'VOX_VGS_Self_Ward_1.WAV', 'Self', { group: 'Ward' }),
  vgs('VSQ2', 'I will ward middle!', 'VOX_VGS_Self_Ward_2.WAV', 'Self', { group: 'Ward' }),
  vgs('VSQ3', 'I will ward right!', 'VOX_VGS_Self_Ward_3.WAV', 'Self', { group: 'Ward' }),
  vgs('VSQQ', 'I will ward!', 'VOX_VGS_Self_Ward.WAV', 'Self', { group: 'Ward' }),
  vgs('VSR', 'Falling back!', 'VOX_VGS_Self_R.WAV', 'Self', { group: 'Retreat' }),
  vgs('VSS', "I'm building stacks!", 'VOX_VGS_Self_Stacks.WAV', 'Self', { group: 'Stacks' }),
  vgs('VST1', "I'm returning left lane!", 'VOX_VGS_Self_Returned_1.WAV', 'Self', { group: 'Returned' }),
  vgs('VST2', "I'm returning middle lane!", 'VOX_VGS_Self_Returned_2.WAV', 'Self', { group: 'Returned' }),
  vgs('VST3', "I'm returning right lane!", 'VOX_VGS_Self_Returned_3.WAV', 'Self', { group: 'Returned' }),
  vgs('VSTB', "I'm returning to base!", 'VOX_VGS_Self_Returned_B.WAV', 'Self', { group: 'Returned' }),
  vgs('VSTT', 'I have returned!', 'VOX_VGS_Self_Returned.WAV', 'Self', { group: 'Returned' }),
  vgs('VT1', 'Enemies have returned left!', 'VOX_VGS_Returned_1.WAV', 'Returned'),
  vgs('VT2', 'Enemies have returned middle!', 'VOX_VGS_Returned_2.WAV', 'Returned'),
  vgs('VT3', 'Enemies have returned right!', 'VOX_VGS_Returned_3.WAV', 'Returned'),
  vgs('VTT', 'Enemies have returned!', 'VOX_VGS_Returned_E.WAV', 'Returned'),
  vgs('VVA', 'Ok!', 'VOX_VGS_OK.WAV', 'Other'),
  vgs('VVB', 'Be right back!', 'VOX_VGS_BRB.WAV', 'Other'),
  vgs('VVC', 'Completed!', 'VOX_VGS_Completed.WAV', 'Other'),
  vgs('VVGB', 'Bye!', 'VOX_VGS_Other_G_B.WAV', 'Other', { group: 'General' }),
  vgs('VVGF', 'Have fun!', 'VOX_VGS_Other_G_F.WAV', 'Other', { group: 'General' }),
  vgs('VVGG', 'Good game!', 'VOX_VGS_Other_G_G.WAV', 'Other', { group: 'General' }),
  vgs('VVGH', 'Hi!', 'VOX_VGS_Other_G_H.WAV', 'Other', { group: 'General' }),
  vgs('VVGL', 'Good luck!', 'VOX_VGS_Other_G_L.WAV', 'Other', { group: 'General' }),
  vgs('VVGM', 'Great match!', 'VOX_VGS_Other_G_M.WAV', 'Other', { group: 'General', s2: true }),
  vgs('VVGN', 'Nice job!', 'VOX_VGS_NiceJob.WAV', 'Other', { group: 'General' }),
  vgs('VVGO', 'Oops!', 'VOX_VGS_Other_G_O.WAV', 'Other', { group: 'General' }),
  vgs('VVGQ', 'Quiet!', 'VOX_VGS_Other_G_Q.WAV', 'Other', { group: 'General' }),
  vgs('VVGR', 'No problem!', 'VOX_VGS_Other_G_R.WAV', 'Other', { group: 'General' }),
  vgs('VVGS', 'Curses!', 'VOX_VGS_Other_G_S.WAV', 'Other', { group: 'General' }),
  vgs('VVGT', "That's too bad!", 'VOX_VGS_Other_G_T.WAV', 'Other', { group: 'General' }),
  vgs('VVGW', "You're welcome!", 'VOX_VGS_Other_G_W.WAV', 'Other', { group: 'General' }),
  vgs('VVK', 'Stepping away for a moment.', 'VOX_VGS_AFK.WAV', 'Other'),
  vgs('VVS', 'Sorry!', 'VOX_VGS_Other_S.WAV', 'Other'),
  vgs('VVW', 'Wait!', 'VOX_VGS_Other_W.WAV', 'Other'),
  vgs('VVX', 'Cancel that!', 'VOX_VGS_Cancel.WAV', 'Other'),
  vgs('VVVA', 'Set up an ambush here!', 'VOX_VGS_Other_V_A.WAV', 'Other', { group: 'Position' }),
  vgs('VVVB', 'Behind us!', 'VOX_VGS_Other_V_B.WAV', 'Other', { group: 'Position' }),
  vgs('VVVC', 'Chase the enemy!', 'VOX_VGS_Other_V_C.WAV', 'Other', { group: 'Position' }),
  vgs('VVVD', 'Ultimate is down!', 'VOX_VGS_Other_V_D.WAV', 'Other', { group: 'Position' }),
  vgs('VVVF', 'Follow me!', 'VOX_VGS_Other_V_F.WAV', 'Other', { group: 'Position' }),
  vgs('VVVG', 'Group up!', 'VOX_VGS_Other_V_G.WAV', 'Other', { group: 'Position' }),
  vgs('VVVJ', 'Going into the jungle!', 'VOX_VGS_Other_V_J.WAV', 'Other', { group: 'Position' }),
  vgs('VVVP', 'Split push!', 'VOX_VGS_Other_V_P.WAV', 'Other', { group: 'Position' }),
  vgs('VVVP1', 'Split push left!', 'VOX_VGS_Other_V_P_1.WAV', 'Other', { group: 'Position', s2: true }),
  vgs('VVVP2', 'Split push right!', 'VOX_VGS_Other_V_P_2.WAV', 'Other', { group: 'Position', s2: true }),
  vgs('VVVR', 'Ultimate is ready!', 'VOX_VGS_Other_V_R.WAV', 'Other', { group: 'Position' }),
  vgs('VVVS', 'Stay here!', 'VOX_VGS_Other_V_S.WAV', 'Other', { group: 'Position' }),
  vgs('VVVT', "It's a trap!", 'VOX_VGS_Other_V_T.WAV', 'Other', { group: 'Position' }),
  vgs('VVVW', 'Place a ward for teleport!', 'VOX_VGS_Other_V_W.WAV', 'Other', { group: 'Position' }),
  vgs('VVVX', 'Spread out!', 'VOX_VGS_Other_V_X.WAV', 'Other', { group: 'Position' }),
  vgs('VXW', 'Wave', null, 'Social'),
  vgs('VXD', 'Dance', null, 'Social'),
  vgs('VXC', 'Clap', null, 'Social'),
  vgs('VXS', 'Special', null, 'Social'),
  vgs('VXF', 'Furious', null, 'Social'),
  vgs('VXG', 'Special 2', null, 'Social'),
  vgs('VXE', 'Global emote', null, 'Social'),
];

export const VGS_CATEGORIES = [...new Set(VGS_COMMANDS.map((c) => c.category))];

export function normalizeVgsCode(input) {
  return String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function codesMatch(guess, expected) {
  const a = normalizeVgsCode(guess);
  const b = normalizeVgsCode(expected);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith('V') && a.slice(1) === b) return true;
  if (b.startsWith('V') && b.slice(1) === a) return true;
  return false;
}

export function isCorrectVgsCode(input, command) {
  if (!command) return false;
  if (codesMatch(input, command.code)) return true;
  return (command.aliases || []).some((alias) => codesMatch(input, alias));
}

export function commandHasAudio(command) {
  return Boolean(command?.file);
}

export function pickVgsCommand({ requireAudio = false, excludeCode = '' } = {}) {
  let pool = VGS_COMMANDS.filter((c) => c.code && c.text);
  if (requireAudio) pool = pool.filter(commandHasAudio);
  if (excludeCode) {
    const filtered = pool.filter((c) => c.code !== excludeCode);
    if (filtered.length) pool = filtered;
  }
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function filterVgsCommands({ category = null, query = '' } = {}) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  return VGS_COMMANDS.filter((c) => {
    if (category && c.category !== category) return false;
    if (!q) return true;
    return (
      c.code.toLowerCase().includes(q) ||
      c.text.toLowerCase().includes(q) ||
      String(c.group || '')
        .toLowerCase()
        .includes(q)
    );
  });
}
