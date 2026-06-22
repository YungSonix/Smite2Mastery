/**
 * Browser port of lib/skinVox.js line-group resolution (skins viewer dev tool).
 */
(function () {
  const SKIN_VOX_PREVIEW_RE =
    /^(Ability_[0-9]+[a-z]|Passive_[0-9]+[a-z]|Joke_|Laugh_|Taunt_|Intro_|Select|Ward_Placed_|Purchase_)/i;

  const GOD_FOLDER_MAP = {
    'Guan Yu': 'Guan_Yu',
    'Jing Wei': 'JingWei',
    'Sun Wukong': 'SunWukong',
    'Ne Zha': 'Ne Zha',
    'Da Ji': 'Da_Ji',
    'The Morrigan': 'The_Morrigan',
    'Nu Wa': 'NuWa',
    'Hou Yi': 'HouYi',
    'Baron Samedi': 'BaronSamedi',
    'Hun Batz': 'HunBatz',
  };

  const GOD_KEY_SUFFIX_TO_FOLDER = {
    NeZha: 'Ne Zha',
    DaJi: 'Da_Ji',
  };

  let manifest = null;
  let voiceBase = '';
  let activeAudio = null;

  function stripGodKey(key) {
    const k = String(key || '').trim();
    if (!k) return '';
    return k.startsWith('God.') ? k.slice(4) : k;
  }

  function normalizeSkinToken(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function normalizeSkinRow(skin) {
    if (!skin || typeof skin !== 'object') return {};
    const assets = skin.assets || {};
    return {
      name: skin.name || skin.skinName || '',
      type: skin.type || '',
      cardArt: skin.cardArt || assets.cardArt || '',
      card_art: skin.card_art || assets.cardArt || '',
      skin: skin.skin || assets.skin || assets.cardArt || '',
      icon: skin.icon || assets.icon || '',
      voiceSkinFolder: skin.voiceSkinFolder || skin.voice_skin_folder || skin.voxSkinFolder || skin.vox_skin_folder,
    };
  }

  function resolveGodVoiceFolder(displayName, opts) {
    opts = opts || {};
    const name = String(displayName || '').trim();
    const suffix = stripGodKey(opts.godKey);
    if (suffix && GOD_KEY_SUFFIX_TO_FOLDER[suffix]) return GOD_KEY_SUFFIX_TO_FOLDER[suffix];
    if (name && GOD_FOLDER_MAP[name]) return GOD_FOLDER_MAP[name];
    if (suffix && /^[A-Za-z][A-Za-z0-9]*$/.test(suffix)) {
      if (manifest[suffix]) return suffix;
      const underscored = suffix.replace(/([a-z])([A-Z])/g, '$1_$2');
      if (manifest[underscored]) return underscored;
    }
    if (name) {
      const underscored = name.replace(/\s+/g, '_');
      if (manifest[underscored]) return underscored;
    }
    return name ? name.replace(/\s+/g, '_') : '';
  }

  function extractSkinPathSegment(skin) {
    const p = skin.cardArt || skin.card_art || skin.skin || skin.icon || '';
    const m = String(p).match(/\/Skins\/([^/]+)\//i);
    return m ? m[1] : '';
  }

  function isBaseSkinRow(skinKey, skin, godDisplayName) {
    const type = String(skin.type || '').toLowerCase();
    const name = String(skin.name || '').toLowerCase();
    const godNorm = normalizeSkinToken(godDisplayName);
    const keyNorm = normalizeSkinToken(skinKey);
    if (type.includes('base')) return true;
    if (name.startsWith('base ')) return true;
    if (godNorm && keyNorm && (keyNorm === godNorm || keyNorm.includes(godNorm) || godNorm.includes(keyNorm))) {
      return true;
    }
    const segment = extractSkinPathSegment(skin);
    if (!segment || /default/i.test(segment)) return true;
    return false;
  }

  function skinHasAudio(manifestEntry) {
    const subfolders = manifestEntry && manifestEntry.subfolders;
    return subfolders && Object.keys(subfolders).some((k) => subfolders[k] && subfolders[k].files && subfolders[k].files.length);
  }

  function isAbilitySubfolder(name) {
    return /^Ability/i.test(String(name || '')) || /^Fox/i.test(String(name || ''));
  }

  function resolveSkinVoiceFolder(godVoiceFolder, skinKey, skin, godDisplayName) {
    const manifestEntry = manifest[godVoiceFolder];
    if (!manifestEntry || typeof manifestEntry !== 'object') return null;

    const folders = Object.keys(manifestEntry).filter((f) => skinHasAudio(manifestEntry[f]));
    if (!folders.length) return null;

    const explicit = skin.voiceSkinFolder;
    if (explicit) {
      const hit = folders.find((f) => f.toLowerCase() === String(explicit).toLowerCase());
      if (hit) return hit;
    }

    if (isBaseSkinRow(skinKey, skin, godDisplayName)) {
      const base = folders.find((f) => /^skin00_/i.test(f)) || folders.find((f) => /base/i.test(f));
      if (base) return base;
    }

    const segment = extractSkinPathSegment(skin);
    const tokens = [segment, skinKey, skin.name].map(normalizeSkinToken).filter(Boolean);

    let best = null;
    let bestScore = 0;
    for (const folder of folders) {
      if (/^skin00_/i.test(folder)) continue;
      const folderToken = normalizeSkinToken(folder.replace(/^skin\d+[a-z]?_/i, ''));
      if (!folderToken) continue;
      for (const t of tokens) {
        if (!t) continue;
        if (folderToken === t) return folder;
        if (folderToken.includes(t) || t.includes(folderToken)) {
          const score = Math.min(folderToken.length, t.length);
          if (score > bestScore) {
            bestScore = score;
            best = folder;
          }
        }
      }
    }
    if (best) return best;
    return folders.find((f) => /^skin00_/i.test(f)) || folders[0] || null;
  }

  function formatSkinVoxLineLabel(filename) {
    let label = String(filename || '').replace(/\.(wav|WAV)$/i, '');
    label = label.replace(/^VOX_VGS_/i, '').replace(/^VOX_/i, '');
    label = label.replace(/_/g, ' ').trim();
    if (!label) return String(filename || '').replace(/\.(wav|WAV)$/i, '');
    return label.replace(/\b([a-z])/g, (c) => c.toUpperCase());
  }

  function buildSkinVoiceUrl(godFolder, skinFolder, subfolder, filename) {
    const encodedGod = encodeURIComponent(godFolder).replace(/%2F/g, '/');
    const encodedSkin = encodeURIComponent(skinFolder).replace(/%2F/g, '/');
    const encodedSub = encodeURIComponent(subfolder).replace(/%2F/g, '/');
    return `${voiceBase}/${encodedGod}/${encodedSkin}/${encodedSub}/${encodeURIComponent(filename)}`;
  }

  function entryKey(subfolder, filename) {
    return `${subfolder}/${filename}`;
  }

  function sortLines(lines) {
    return lines.slice().sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }

  function buildLineEntry(godFolder, skinFolder, subfolder, filename) {
    return {
      subfolder,
      filename,
      label: formatSkinVoxLineLabel(filename),
      url: buildSkinVoiceUrl(godFolder, skinFolder, subfolder, filename),
      key: entryKey(subfolder, filename),
    };
  }

  function getSkinVoxLineGroups(godDisplayName, godKey, skinKey, skin) {
    const row = normalizeSkinRow(skin);
    const godFolder = resolveGodVoiceFolder(godDisplayName, { godKey });
    if (!godFolder) return { godFolder: '', skinFolder: '', groups: [] };
    const skinFolder = resolveSkinVoiceFolder(godFolder, skinKey, row, godDisplayName);
    if (!skinFolder) return { godFolder, skinFolder: '', groups: [] };

    const subfolders = (manifest[godFolder] && manifest[godFolder][skinFolder] && manifest[godFolder][skinFolder].subfolders) || {};
    const groups = [];

    const vgsFiles = (subfolders.VGS && subfolders.VGS.files) || [];
    if (vgsFiles.length) {
      groups.push({
        id: 'VGS',
        lines: sortLines(vgsFiles.map((f) => buildLineEntry(godFolder, skinFolder, 'VGS', f))),
      });
    }

    const voxFiles = ((subfolders.VOX && subfolders.VOX.files) || []).filter((f) => SKIN_VOX_PREVIEW_RE.test(String(f || '')));
    if (voxFiles.length) {
      groups.push({
        id: 'VOX',
        lines: sortLines(voxFiles.map((f) => buildLineEntry(godFolder, skinFolder, 'VOX', f))),
      });
    }

    Object.keys(subfolders)
      .sort()
      .forEach((subfolder) => {
        if (subfolder === 'VGS' || subfolder === 'VOX' || !isAbilitySubfolder(subfolder)) return;
        const files = (subfolders[subfolder] && subfolders[subfolder].files) || [];
        if (!files.length) return;
        groups.push({
          id: subfolder,
          lines: sortLines(files.map((f) => buildLineEntry(godFolder, skinFolder, subfolder, f))),
        });
      });

    return { godFolder, skinFolder, groups };
  }

  function stopActiveAudio() {
    if (!activeAudio) return;
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch (_) {
      /* ignore */
    }
    activeAudio = null;
  }

  function playUrl(url, btnEl) {
    stopActiveAudio();
    document.querySelectorAll('.skin-vox-random-btn.playing').forEach((el) => el.classList.remove('playing'));
    const audio = new Audio(url);
    activeAudio = audio;
    if (btnEl) btnEl.classList.add('playing');
    const clearPlaying = () => {
      if (btnEl) {
        btnEl.classList.remove('playing');
        if (btnEl.classList.contains('skin-vox-random-btn')) {
          btnEl.textContent = 'Play a voiceline from this skin';
        }
      }
      if (activeAudio === audio) activeAudio = null;
    };
    audio.addEventListener('ended', clearPlaying);
    audio.addEventListener('error', clearPlaying);
    audio.play().catch(clearPlaying);
  }

  function playSkinVoxLine(godDisplayName, godKey, skinKey, skin, subfolder, filename, btnEl) {
    const row = normalizeSkinRow(skin);
    const godFolder = resolveGodVoiceFolder(godDisplayName, { godKey });
    if (!godFolder) return false;
    const skinFolder = resolveSkinVoiceFolder(godFolder, skinKey, row, godDisplayName);
    if (!skinFolder) return false;

    stopActiveAudio();
    document.querySelectorAll('.skin-vox-random-btn.playing').forEach((el) => el.classList.remove('playing'));

    const uri = buildSkinVoiceUrl(godFolder, skinFolder, subfolder, filename);
    const audio = new Audio(uri);
    activeAudio = audio;
    if (btnEl) btnEl.classList.add('playing');

    const clearPlaying = () => {
      if (btnEl) {
        btnEl.classList.remove('playing');
        if (btnEl.classList.contains('skin-vox-random-btn')) {
          btnEl.textContent = 'Play a voiceline from this skin';
        }
      }
      if (activeAudio === audio) activeAudio = null;
    };

    audio.addEventListener('ended', clearPlaying);
    audio.addEventListener('error', clearPlaying);
    audio.play().catch(clearPlaying);
    return true;
  }

  let lastSkinVoxKey = '';
  let lastSkinVoxEntryKey = '';

  function hasSkinVoxPreview(godDisplayName, godKey, skinKey, skin) {
    const { groups } = getSkinVoxLineGroups(godDisplayName, godKey, skinKey, skin);
    return groups.some((g) => g.lines.length > 0);
  }

  function playRandomSkinVox(godDisplayName, godKey, skinKey, skin, btnEl) {
    const result = getSkinVoxLineGroups(godDisplayName, godKey, skinKey, skin);
    const entries = [];
    for (const group of result.groups) {
      for (const line of group.lines) entries.push(line);
    }
    if (!entries.length) return false;

    const avoidKey = `${result.godFolder}::${result.skinFolder}`;
    const candidates =
      lastSkinVoxKey === avoidKey
        ? entries.filter((e) => e.key !== lastSkinVoxEntryKey)
        : entries;
    const pickFrom = candidates.length ? candidates : entries;
    const pick = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    lastSkinVoxKey = avoidKey;
    lastSkinVoxEntryKey = pick.key;
    playUrl(pick.url, btnEl);
    return true;
  }

  window.SkinVox = {
    init(manifestData, voiceAudioBase) {
      manifest = manifestData || {};
      voiceBase = String(voiceAudioBase || '').replace(/\/$/, '');
      return window.SkinVox;
    },
    hasSkinVoxPreview,
    playRandomSkinVox,
    normalizeSkinRow,
  };
})();
