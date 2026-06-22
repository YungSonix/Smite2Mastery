(function () {
  const app = document.getElementById('app');
  const crumbs = document.getElementById('breadcrumbs');
  const hoverPanel = document.getElementById('hoverPanel');
  let hoverHideTimer = null;

  function parseRoute() {
    const hash = location.hash.replace(/^#/, '') || '/';
    const parts = hash.split('/').filter(Boolean);
    if (!parts.length) return { view: 'home', tab: 'pantheons' };
    if (parts[0] === 'all-gods') return { view: 'home', tab: 'all-gods' };
    if (parts[0] === 'pantheon' && parts[1]) {
      return { view: 'pantheon', pantheon: decodeURIComponent(parts[1]) };
    }
    if (parts[0] === 'god' && parts[1] && parts[2]) {
      return {
        view: 'god',
        pantheon: decodeURIComponent(parts[1]),
        godName: decodeURIComponent(parts[2]),
      };
    }
    return { view: 'home', tab: 'pantheons' };
  }

  function nav(path) {
    location.hash = path;
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function mediaUrl(assetPath) {
    if (!assetPath) return null;
    const raw = String(assetPath).trim();
    if (/^https?:\/\//i.test(raw)) return raw;
    const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '');
    let pathForMedia = normalized;
    if (/\.json$/i.test(pathForMedia)) {
      pathForMedia = pathForMedia.replace(/\.json$/i, '.png');
    }
    if (pathForMedia.startsWith('icons/')) {
      return `/media/app/data/Icons/${pathForMedia.slice('icons/'.length)}`;
    }
    if (pathForMedia.startsWith('app/data/')) {
      return `/media/${encodeURI(pathForMedia)}`;
    }
    return `/media/app/data/${encodeURI(pathForMedia)}`;
  }

  function isJsonAssetPath(assetPath) {
    if (!assetPath) return false;
    const raw = String(assetPath).trim();
    if (!/\.json$/i.test(raw)) return false;
    // If a raster sibling exists, mediaUrl already maps to PNG — not a blocking JSON-only asset.
    return false;
  }

  function pickThumb(skin) {
    const a = skin.assets || {};
    return (
      mediaUrl(a.icon) ||
      mediaUrl(a.cardArt) ||
      mediaUrl(a.skin) ||
      mediaUrl(a.inGame) ||
      mediaUrl(skin.icon) ||
      mediaUrl(skin.skin)
    );
  }

  function pickCardArt(skin) {
    const a = skin.assets || {};
    return (
      mediaUrl(a.cardArt) ||
      mediaUrl(a.skin) ||
      mediaUrl(a.inGame) ||
      mediaUrl(skin.cardArt) ||
      mediaUrl(skin.skin)
    );
  }

  const CURRENCY_ICONS = {
    diamonds: 'app/data/Tiers/t_currency_diamond_512 (1).png',
    gems: 'app/data/Tiers/t_currency_gem_512.png',
  };

  function normalizeCurrency(currency) {
    const key = String(currency || '').toLowerCase();
    if (key === 'gem' || key === 'gems') return 'gems';
    if (key === 'diamond' || key === 'diamonds') return 'diamonds';
    return key;
  }

  function resolveSkinCost(skin) {
    if (skin?.isBaseSkin) {
      return { currency: 'diamonds', amount: '0' };
    }
    if (skin?.cost != null) {
      if (typeof skin.cost === 'object' && (skin.cost.currency || skin.cost.amount != null)) {
        return skin.cost;
      }
      if (typeof skin.cost === 'string' || typeof skin.cost === 'number') {
        return { currency: 'diamonds', amount: String(skin.cost) };
      }
    }
    const price = skin?.price;
    if (price && typeof price === 'object') {
      const gems = String(price.gems || '').trim();
      const diamonds = String(price.diamonds || '').trim();
      const gemsdia = String(price.gemsdia || '').trim();
      if (gems) return { currency: 'gems', amount: gems };
      if (diamonds) return { currency: 'diamonds', amount: diamonds };
      if (gemsdia) return { currency: 'gems', amount: gemsdia };
    }
    return null;
  }

  function formatCostHtml(skinOrCost) {
    const entry =
      skinOrCost && (skinOrCost.loadoutMeta || skinOrCost.cost !== undefined || skinOrCost.price !== undefined)
        ? skinOrCost
        : null;
    const buttonText = entry?.loadoutMeta?.buttonText;
    if (buttonText && String(buttonText).trim()) {
      const label = String(buttonText).trim().toUpperCase();
      const cls = label === 'LOCKED' ? 'cost-action-label locked' : 'cost-action-label go-to';
      return `<span class="${cls}">${esc(label)}</span>`;
    }
    const cost =
      entry && (entry.cost !== undefined || entry.price !== undefined)
        ? resolveSkinCost(entry)
        : skinOrCost;
    if (cost == null) return '—';
    if (typeof cost === 'object' && cost.currency) {
      const currency = normalizeCurrency(cost.currency);
      const iconPath = CURRENCY_ICONS[currency];
      const amount = cost.amount != null && String(cost.amount).trim() !== '' ? String(cost.amount) : '—';
      if (iconPath) {
        const label = currency === 'gems' ? 'Gems' : 'Diamonds';
        return `<span class="currency-cost"><img class="currency-icon" src="${esc(mediaUrl(iconPath))}" alt="${esc(label)}" loading="lazy" /><span class="currency-amount">${esc(amount)}</span></span>`;
      }
      return `${esc(amount)} ${esc(cost.currency)}`;
    }
    return esc(String(cost));
  }

  function skinBadges(skin) {
    const tags = [];
    if (skin.isBaseSkin) tags.push('<span class="badge base">Base</span>');
    if (skin.isPrism || skin.loadoutMeta?.gridBadge?.type === 'prism') {
      tags.push('<span class="badge prism">Prism</span>');
    }
    if (skin.isMastery) tags.push('<span class="badge mastery">Mastery</span>');
    if (skin.isCrossGen) tags.push('<span class="badge cross">Cross-gen</span>');
    if (skin.isRecolor) tags.push('<span class="badge recolor">Recolor</span>');
    if (skin.hideFromSkinList) tags.push('<span class="badge">Hidden</span>');
    return tags.join('');
  }

  function imgTag(src, className, alt, jsonPath) {
    if (isJsonAssetPath(jsonPath || src)) {
      return `<div class="${className || ''} json-asset" title="${esc(jsonPath || src)}" style="display:flex;align-items:center;justify-content:center;min-height:72px;padding:8px;border:1px dashed var(--accent-dim);border-radius:6px;color:var(--muted);font-size:0.68rem;text-align:center;">UE JSON export<br/>(no PNG on disk)</div>`;
    }
    if (!src) {
      return `<div class="${className || ''} err" style="display:flex;align-items:center;justify-content:center;min-height:72px;border:1px dashed var(--danger);border-radius:6px;color:var(--danger);font-size:0.75rem;">No path</div>`;
    }
    return `<img class="${className || ''}" src="${esc(src)}" alt="${esc(alt || '')}" loading="lazy" onerror="this.classList.add('err'); this.alt='Failed to load';" />`;
  }

  function setBreadcrumbs(items) {
    crumbs.innerHTML = items
      .map((item, i) => {
        if (i) items.length && (items[i - 1], '');
        const sep = i ? '<span class="sep">/</span>' : '';
        if (item.href) {
          return `${sep}<a href="${esc(item.href)}">${esc(item.label)}</a>`;
        }
        return `${sep}<span>${esc(item.label)}</span>`;
      })
      .join('');
  }

  function hideHover() {
    hoverPanel.classList.add('hidden');
    hoverPanel.setAttribute('aria-hidden', 'true');
    hoverPanel.innerHTML = '';
  }

  function showHover(god, e) {
    clearTimeout(hoverHideTimer);
    const skins = god.skins || [];
    const html = `
      <p class="hover-title">${esc(god.godName)} — ${skins.length} skin${skins.length === 1 ? '' : 's'}</p>
      <div class="hover-skins">
        ${skins
          .map((s) => {
            const thumb = pickThumb(s);
            const thumbPath = (s.assets && (s.assets.icon || s.assets.cardArt || s.assets.skin)) || s.icon || s.skin;
            return `<div class="hover-skin">
              ${imgTag(thumb, '', s.skinName, thumbPath)}
              <span>${esc(s.skinName)}${s.isBaseSkin ? ' ★' : ''}</span>
            </div>`;
          })
          .join('')}
      </div>
      <p style="margin:10px 0 0;font-size:0.75rem;color:var(--muted);">Click base portrait or name for full detail</p>
    `;
    hoverPanel.innerHTML = html;
    hoverPanel.classList.remove('hidden');
    hoverPanel.setAttribute('aria-hidden', 'false');

    const pad = 12;
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    hoverPanel.style.left = '0';
    hoverPanel.style.top = '0';
    const rect = hoverPanel.getBoundingClientRect();
    if (x + rect.width > window.innerWidth - pad) x = e.clientX - rect.width - pad;
    if (y + rect.height > window.innerHeight - pad) y = e.clientY - rect.height - pad;
    hoverPanel.style.left = `${Math.max(pad, x)}px`;
    hoverPanel.style.top = `${Math.max(pad, y)}px`;
  }

  function bindGodHover(card, god) {
    card.addEventListener('mouseenter', (e) => showHover(god, e));
    card.addEventListener('mousemove', (e) => showHover(god, e));
    card.addEventListener('mouseleave', () => {
      hoverHideTimer = setTimeout(hideHover, 120);
    });
  }

  function baseSkin(god) {
    return (god.skins || []).find((s) => s.isBaseSkin) || (god.skins || [])[0];
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  let skinVoxReady = null;

  function ensureSkinVox() {
    if (!skinVoxReady) {
      skinVoxReady = fetchJson('/api/vox-manifest')
        .then((data) => {
          if (!window.SkinVox) throw new Error('skinVox.js not loaded');
          window.SkinVox.init(data.manifest, data.voiceAudioBase);
          return window.SkinVox;
        })
        .catch((err) => {
          console.warn('Skin VOX manifest unavailable:', err.message);
          return null;
        });
    }
    return skinVoxReady;
  }

  let currentGodVoxCtx = null;
  let currentGodSkinsByKey = null;

  function renderSkinVoxButton(skin, godCtx) {
    if (!window.SkinVox || !godCtx || !skin?.skinKey) return '';
    if (!window.SkinVox.hasSkinVoxPreview(godCtx.godName, godCtx.godKey, skin.skinKey, skin)) {
      return '';
    }
    return `<button type="button" class="skin-vox-random-btn" data-skin-key="${esc(skin.skinKey)}">Play a voiceline from this skin</button>`;
  }

  function bindSkinVoxClicks(root) {
    if (!root || !window.SkinVox || !currentGodVoxCtx || !currentGodSkinsByKey) return;
    root.querySelectorAll('.skin-vox-random-btn').forEach((btn) => {
      if (btn.dataset.voxBound) return;
      btn.dataset.voxBound = '1';
      btn.addEventListener('click', () => {
        const skinKey = btn.getAttribute('data-skin-key');
        const skin = currentGodSkinsByKey[skinKey];
        if (!skin || btn.classList.contains('playing')) return;
        btn.textContent = 'Playing voiceline…';
        window.SkinVox.playRandomSkinVox(
          currentGodVoxCtx.godName,
          currentGodVoxCtx.godKey,
          skinKey,
          skin,
          btn
        );
      });
    });
  }

  /** `/api/gods` needs a restarted viewer; fall back to pantheon fetches if server is stale. */
  async function fetchAllGods() {
    try {
      return await fetchJson('/api/gods');
    } catch (err) {
      if (!String(err.message).includes('404')) throw err;
      const { pantheons } = await fetchJson('/api/pantheons');
      const gods = [];
      for (const p of pantheons) {
        const data = await fetchJson(`/api/pantheon/${encodeURIComponent(p.id)}`);
        for (const god of data.gods || []) {
          gods.push({
            ...god,
            pantheon: data.pantheon || p.id,
            pantheonId: p.id,
          });
        }
      }
      gods.sort((a, b) =>
        String(a.godName || '').localeCompare(String(b.godName || ''), undefined, {
          sensitivity: 'base',
        })
      );
      return { gods, total: gods.length };
    }
  }

  function homeTabs(activeTab) {
    const pantheonsActive = activeTab === 'pantheons' ? ' active' : '';
    const allActive = activeTab === 'all-gods' ? ' active' : '';
    return `
      <nav class="home-tabs" aria-label="Browse mode">
        <a class="home-tab${pantheonsActive}" href="#/" data-tab="pantheons">By pantheon</a>
        <a class="home-tab${allActive}" href="#/all-gods" data-tab="all-gods">All gods (A–Z)</a>
      </nav>`;
  }

  function appendGodCard(grid, god, pantheonId) {
    const base = baseSkin(god);
    const thumb = base ? pickThumb(base) : null;
    const thumbPath = base && ((base.assets && (base.assets.icon || base.assets.cardArt)) || base.icon);
    const card = document.createElement('article');
    card.className = 'god-card';
    const pantheonLabel =
      god.pantheonId && god.pantheon
        ? `<div class="god-pantheon">${esc(god.pantheon)}</div>`
        : '';
    card.innerHTML = `
      <a class="god-thumb-link" href="#/god/${encodeURIComponent(pantheonId)}/${encodeURIComponent(god.godName)}" title="View all skins">
        ${imgTag(thumb, 'god-thumb', god.godName, thumbPath)}
      </a>
      <div class="god-info">
        <h3><a href="#/god/${encodeURIComponent(pantheonId)}/${encodeURIComponent(god.godName)}">${esc(god.godName)}</a></h3>
        ${pantheonLabel}
        <div class="god-meta">${(god.skins || []).length} skins</div>
        <div class="god-badges">${(god.skins || []).map(skinBadges).join(' ')}</div>
      </div>
    `;
    bindGodHover(card, god);
    grid.appendChild(card);
  }

  async function renderHome(tab) {
    const activeTab = tab === 'all-gods' ? 'all-gods' : 'pantheons';

    if (activeTab === 'all-gods') {
      setBreadcrumbs([{ label: 'All gods (A–Z)' }]);
      app.innerHTML = `${homeTabs('all-gods')}<div class="loading">Loading all gods…</div>`;
      hideHover();
      try {
        const { gods, total } = await fetchAllGods();
        app.innerHTML = `
          ${homeTabs('all-gods')}
          <div class="help-banner">
            <strong>How to use:</strong> Every god in one list — hover to preview skins, click the portrait or name for full detail. Pantheon shown under each name.
          </div>
          <h1 class="page-title">All gods</h1>
          <p class="page-sub">${total} gods · alphabetical · hover for skin preview</p>
          <div class="god-grid" id="godGrid"></div>
        `;
        const grid = document.getElementById('godGrid');
        for (const god of gods) {
          appendGodCard(grid, god, god.pantheonId || god.pantheon);
        }
      } catch (err) {
        app.innerHTML = `
          ${homeTabs('all-gods')}
          <div class="error-box">Failed to load gods: ${esc(err.message)}</div>
        `;
      }
      return;
    }

    setBreadcrumbs([{ label: 'Pantheons' }]);
    app.innerHTML = `${homeTabs('pantheons')}<div class="loading">Loading pantheons…</div>`;
    hideHover();
    try {
      const { pantheons } = await fetchJson('/api/pantheons');
      app.innerHTML = `
        ${homeTabs('pantheons')}
        <div class="help-banner">
          <strong>How to use:</strong> Pick a pantheon folder → hover a god to preview skins → click the base portrait or god name for the full skin list and metadata. Red borders = image failed to load.
        </div>
        <h1 class="page-title">Pantheons</h1>
        <p class="page-sub">${pantheons.length} pantheon files · ${pantheons.reduce((n, p) => n + p.godCount, 0)} gods</p>
        <div class="grid-pantheons">
          ${pantheons
            .map(
              (p) => `
            <a class="folder-card" href="#/pantheon/${encodeURIComponent(p.id)}">
              <div class="folder-icon">📁</div>
              <div class="folder-name">${esc(p.id)}</div>
              <div class="folder-meta">${p.godCount} gods · ${p.skinCount} skins</div>
            </a>`
            )
            .join('')}
        </div>
      `;
    } catch (err) {
      app.innerHTML = `
        ${homeTabs('pantheons')}
        <div class="error-box">Failed to load pantheons: ${esc(err.message)}</div>
      `;
    }
  }

  async function renderPantheon(id) {
    setBreadcrumbs([
      { label: 'Pantheons', href: '#/' },
      { label: id },
    ]);
    app.innerHTML = '<div class="loading">Loading…</div>';
    hideHover();
    try {
      const data = await fetchJson(`/api/pantheon/${encodeURIComponent(id)}`);
      const gods = data.gods || [];
      app.innerHTML = `
        <a class="back-link" href="#/">← Home</a>
        <h1 class="page-title">${esc(data.pantheon || id)}</h1>
        <p class="page-sub">${gods.length} gods · hover for skin preview</p>
        <div class="god-grid" id="godGrid"></div>
      `;
      const grid = document.getElementById('godGrid');
      for (const god of gods) {
        appendGodCard(grid, god, id);
      }
    } catch (err) {
      app.innerHTML = `<div class="error-box">Failed to load pantheon: ${esc(err.message)}</div>`;
    }
  }

  const LOADOUT_ZOOM = 1080 / 940;

  function shouldShowUnlock(entry) {
    const u = entry && entry.unlock;
    if (!u || u.source === 'base' || u.source === 'prism') return false;
    if (u.masteryRank || u.requiresAscensionPass || u.masteryEmblem) return true;
    if (u.source === 'ascension' || u.source === 'event' || u.source === 'traveler') return true;
    const text = formatUnlock(u);
    return Boolean(text && text !== '—');
  }

  function shouldShowGridBadge(entry) {
    return Boolean(gridBadgeTag(entry?.loadoutMeta?.gridBadge));
  }

  function shouldShowType(skin) {
    const t = skin && skin.type;
    return Boolean(t && String(t).trim() && t !== '—');
  }

  function dlRow(label, valueHtml, show) {
    if (!show) return '';
    return `<dt>${label}</dt><dd>${valueHtml}</dd>`;
  }

  function collectFolderPaths(entry) {
    const rows = [];
    const cardArt =
      (entry.assets && (entry.assets.cardArt || entry.assets.skin)) || entry.cardArt || entry.skin;
    const icon = (entry.assets && entry.assets.icon) || entry.icon;
    const inGame = entry.assets && entry.assets.inGame;
    const loadout = entry.loadout && entry.loadout.screenshot;
    if (cardArt) rows.push(['Card art', cardArt]);
    if (loadout) rows.push(['Loadout shot', loadout]);
    if (icon) rows.push(['Icon', icon]);
    if (inGame) rows.push(['In-game', inGame]);
    return rows;
  }

  function folderLocationsBlock(entry) {
    const rows = collectFolderPaths(entry);
    if (!rows.length) return '';
    return `<details class="folder-locations">
      <summary>Show Folder Location</summary>
      <dl>${rows.map(([label, path]) => dlRow(label, esc(path), true)).join('')}</dl>
    </details>`;
  }

  function skinInformationRows(entry) {
    return entry?.information || entry?.loadoutMeta?.information || [];
  }

  function skinInformationBlock(entry) {
    const rows = skinInformationRows(entry);
    if (!rows.length) return '';
    return `<div class="skin-information">
      ${rows
        .map(
          (row) => `
        <div class="info-section">
          <div class="info-label">${esc(row.label || row.key || 'Info')}</div>
          <div class="info-text">${esc(row.text || '')}</div>
        </div>`
        )
        .join('')}
    </div>`;
  }

  function visibleVariants(skin) {
    return (skin.variants || []).filter((v) => !/^Mastery Light$/i.test(String(v.name || '')));
  }

  function formatUnlock(unlock) {
    if (!unlock || typeof unlock !== 'object') return '—';
    if (unlock.displayText) return unlock.displayText;
    const parts = [];
    if (unlock.masteryRank) parts.push(`Mastery rank ${unlock.masteryRank === 10 ? 'X' : unlock.masteryRank}`);
    if (unlock.requiresAscensionPass) parts.push('Ascension Pass');
    if (unlock.source) parts.push(unlock.source);
    return parts.length ? parts.join(' · ') : '—';
  }

  function masteryEmblemTag(unlock, gridBadge) {
    const path =
      (unlock && unlock.masteryEmblem) ||
      (gridBadge && gridBadge.type === 'masteryRank' && gridBadge.emblemPath) ||
      null;
    if (!path) return '';
    return `<img class="mastery-emblem" src="${esc(mediaUrl(path))}" alt="Mastery ${unlock?.masteryRank || gridBadge?.rank || ''}" loading="lazy" />`;
  }

  function gridBadgeTag(gridBadge) {
    if (!gridBadge) return '';
    if (gridBadge.type === 'prism') {
      return '<span class="badge prism">Prism</span>';
    }
    if (gridBadge.type === 'masteryRank') {
      const emblem = gridBadge.emblemPath
        ? `<img class="mastery-emblem small" src="${esc(mediaUrl(gridBadge.emblemPath))}" alt="" />`
        : '';
      return `<span class="grid-badge mastery">${emblem}<span>Rank ${gridBadge.rank === 10 ? 'X' : 'V'}</span></span>`;
    }
    return '';
  }

  function formatRarity(skin) {
    if (skin.isBaseSkin || (!skin.rarity && !skin.tierBadge)) return '—';
    const badge = skin.tierBadge
      ? `<img class="tier-badge" src="${esc(mediaUrl(skin.tierBadge))}" alt="" loading="lazy" />`
      : '';
    const label = skin.rarity || skin.loadoutMeta?.rarity || '';
    return `<span class="tier-line">${badge}<span class="tier-label">${esc(label)}</span></span>`;
  }

  function loadoutFrameTag(entry, label) {
    const lo = entry && entry.loadout;
    if (!lo || !lo.screenshot) return '';
    const src = mediaUrl(lo.screenshot);
    const frame = lo.frame || {};
    const fx = frame.focalX ?? 50;
    const fy = frame.focalY ?? 50;
    const zoom = frame.zoom ?? frame.zoomY ?? LOADOUT_ZOOM;
    return `
      <div class="loadout-frame-wrap">
        <span class="loadout-frame-label">${esc(label || 'In-game loadout')}</span>
        <div class="loadout-frame" style="--pos-x:${fx}%;--pos-y:${fy}%;--loadout-zoom:${zoom};">
          ${imgTag(src, '', (entry.skinName || entry.name || 'loadout') + ' render', lo.screenshot)}
        </div>
      </div>`;
  }

  function skinHasVisibleVariants(skin) {
    return visibleVariants(skin).length > 0;
  }

  function compareSkinsForDisplay(a, b) {
    const aHas = skinHasVisibleVariants(a);
    const bHas = skinHasVisibleVariants(b);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    if (a.isBaseSkin && !b.isBaseSkin) return -1;
    if (!a.isBaseSkin && b.isBaseSkin) return 1;
    return String(a.skinName || a.skinKey || '').localeCompare(
      String(b.skinName || b.skinKey || ''),
      undefined,
      { sensitivity: 'base' }
    );
  }

  function renderSkinSections(skins, godCtx) {
    if (!skins.length) return '<p class="page-sub">No skins listed.</p>';

    const ordered = [...skins].sort(compareSkinsForDisplay);
    const withVariants = ordered.filter(skinHasVisibleVariants);
    const withoutVariants = ordered.filter((s) => !skinHasVisibleVariants(s));

    const section = (title, list, extraClass) => {
      if (!list.length) return '';
      return `<section class="skin-section ${extraClass || ''}">
        <h2 class="skin-section-title">${esc(title)} <span class="skin-section-count">${list.length}</span></h2>
        <div class="skin-cards">${list.map((s) => renderSkinCard(s, godCtx)).join('')}</div>
      </section>`;
    };

    return [
      section('Skins with variants', withVariants, 'skin-section-has-variants'),
      section('Other skins', withoutVariants, 'skin-section-simple'),
    ]
      .filter(Boolean)
      .join('');
  }

  function variantFrameLabel(v) {
    const name = v.loadoutMeta?.displayName || v.name || 'Variant';
    const tail = String(name).includes('-') ? String(name).split('-').pop().trim() : name;
    const cleaned = tail.replace(/^Mastery\s+/i, '');
    if (/^light$/i.test(cleaned)) return 'RADIANT';
    return cleaned.toUpperCase();
  }

  function renderVariantChip(v) {
    return `
      <div class="variant-chip">
        ${imgTag(mediaUrl(v.icon || v.cardArt || v.skin), 'variant-icon', v.name)}
        ${loadoutFrameTag(v, variantFrameLabel(v))}
        <div class="variant-meta">
          <strong>${esc(v.loadoutMeta?.displayName || v.name || 'Variant')}</strong>
          ${v.masteryFromDisk ? '<span class="badge mastery">Mastery</span>' : ''}
          ${shouldShowGridBadge(v) ? gridBadgeTag(v.loadoutMeta?.gridBadge) : ''}
          ${v.rarity ? `<div class="tier-line">${v.tierBadge ? `<img class="tier-badge" src="${esc(mediaUrl(v.tierBadge))}" alt="" />` : ''}<span class="tier-label">${esc(v.rarity)}</span></div>` : ''}
          ${
            shouldShowUnlock(v)
              ? `<div class="unlock-cell variant-unlock">${masteryEmblemTag(v.unlock, v.loadoutMeta?.gridBadge)}${esc(formatUnlock(v.unlock))}</div>`
              : ''
          }
          ${skinInformationBlock(v)}
          ${folderLocationsBlock(v)}
        </div>
      </div>`;
  }

  function renderSkinCardBody(skin, godCtx) {
    return `
        <div class="skin-card-head">
          <h3>${esc(skin.skinName)}</h3>
          <div class="skin-key">${esc(skin.skinKey)}</div>
          <div class="god-badges" style="margin-top:8px;">${skinBadges(skin)}</div>
        </div>
        <div class="skin-art-row">
          ${imgTag(pickCardArt(skin), '', skin.skinName + ' card', (skin.assets && (skin.assets.cardArt || skin.assets.skin)) || skin.cardArt || skin.skin)}
          ${loadoutFrameTag(skin, 'In-game loadout')}
          ${imgTag(pickThumb(skin), 'icon', skin.skinName + ' icon', (skin.assets && (skin.assets.icon || skin.assets.cardArt)) || skin.icon)}
        </div>
        <div class="skin-fields">
          ${
            skin.loadoutMeta?.godName
              ? `<div class="loadout-god-name">${esc(skin.loadoutMeta.godName)}</div>`
              : ''
          }
          <dl>
            ${dlRow('Cost', formatCostHtml(skin), true)}
            ${dlRow('Tier', formatRarity(skin), !skin.isBaseSkin && Boolean(skin.rarity || skin.tierBadge))}
            ${dlRow(
              'Unlock',
              `${masteryEmblemTag(skin.unlock, skin.loadoutMeta?.gridBadge)}${esc(formatUnlock(skin.unlock))}`,
              shouldShowUnlock(skin)
            )}
            ${dlRow('Grid badge', gridBadgeTag(skin.loadoutMeta?.gridBadge), shouldShowGridBadge(skin))}
            ${dlRow('Type', esc(skin.type), shouldShowType(skin))}
          </dl>
          ${skinInformationBlock(skin)}
          ${folderLocationsBlock(skin)}
          ${godCtx ? renderSkinVoxButton(skin, godCtx) : ''}
        </div>`;
  }

  function renderSkinCard(skin, godCtx) {
    const variants = visibleVariants(skin);
    const hasVariants = variants.length > 0;
    if (!hasVariants) {
      return `
      <article class="skin-card${skin.isBaseSkin ? ' base' : ''}">
        ${renderSkinCardBody(skin, godCtx)}
      </article>`;
    }

    return `
      <article class="skin-card has-variants${skin.isBaseSkin ? ' base' : ''}">
        <div class="skin-card-split">
          <div class="skin-card-main">
            ${renderSkinCardBody(skin, godCtx)}
          </div>
          <div class="skin-card-variants">
            <h4>Variants (${variants.length})</h4>
            <div class="variants-grid" style="--variant-cols: ${variants.length}">
              ${variants.map((v) => renderVariantChip(v)).join('')}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  async function renderGod(pantheonId, godName) {
    setBreadcrumbs([
      { label: 'Pantheons', href: '#/' },
      { label: pantheonId, href: `#/pantheon/${encodeURIComponent(pantheonId)}` },
      { label: godName },
    ]);
    app.innerHTML = '<div class="loading">Loading…</div>';
    hideHover();
    try {
      await ensureSkinVox();
      const data = await fetchJson(`/api/pantheon/${encodeURIComponent(pantheonId)}`);
      const god = (data.gods || []).find(
        (g) => g.godName.toLowerCase() === godName.toLowerCase()
      );
      if (!god) throw new Error(`God "${godName}" not found in ${pantheonId}`);

      const godCtx = { godName: god.godName, godKey: god.internalName || '' };
      const skins = god.skins || [];
      const orderedSkins = [...skins].sort(compareSkinsForDisplay);
      currentGodVoxCtx = godCtx;
      currentGodSkinsByKey = Object.fromEntries(orderedSkins.map((s) => [s.skinKey, s]));

      app.innerHTML = `
        <a class="back-link" href="#/pantheon/${encodeURIComponent(pantheonId)}">← ${esc(pantheonId)} pantheon</a>
        <h1 class="page-title">${esc(god.godName)}</h1>
        <p class="page-sub">${esc(data.pantheon)} · ${skins.length} skins · ${esc(god.internalName || '')}</p>
        ${renderSkinSections(skins, godCtx)}
      `;
      bindSkinVoxClicks(app);
    } catch (err) {
      app.innerHTML = `<div class="error-box">${esc(err.message)}</div>`;
    }
  }

  async function render() {
    const route = parseRoute();
    if (route.view === 'home') return renderHome(route.tab);
    if (route.view === 'pantheon') return renderPantheon(route.pantheon);
    if (route.view === 'god') return renderGod(route.pantheon, route.godName);
    return renderHome('pantheons');
  }

  window.addEventListener('hashchange', render);
  render();
})();
