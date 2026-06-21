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

  function formatCost(cost) {
    if (cost == null) return '—';
    if (typeof cost === 'object' && cost.currency) {
      return `${cost.amount} ${cost.currency}`;
    }
    return String(cost);
  }

  function skinBadges(skin) {
    const tags = [];
    if (skin.isBaseSkin) tags.push('<span class="badge base">Base</span>');
    if (skin.isPrism) tags.push('<span class="badge prism">Prism</span>');
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

  function renderSkinCard(skin) {
    const cardArt = pickCardArt(skin);
    const icon = pickThumb(skin);
    const cardPath = (skin.assets && (skin.assets.cardArt || skin.assets.skin)) || skin.cardArt || skin.skin;
    const iconPath = (skin.assets && (skin.assets.icon || skin.assets.cardArt)) || skin.icon;
    const variants = skin.variants || [];
    return `
      <article class="skin-card${skin.isBaseSkin ? ' base' : ''}">
        <div class="skin-card-head">
          <h3>${esc(skin.skinName)}</h3>
          <div class="skin-key">${esc(skin.skinKey)}</div>
          <div class="god-badges" style="margin-top:8px;">${skinBadges(skin)}</div>
        </div>
        <div class="skin-art-row">
          ${imgTag(cardArt, '', skin.skinName + ' card', cardPath)}
          ${imgTag(icon, 'icon', skin.skinName + ' icon', iconPath)}
        </div>
        <div class="skin-fields">
          <dl>
            <dt>Cost</dt><dd>${esc(formatCost(skin.cost))}</dd>
            <dt>Rarity</dt><dd>${esc(skin.rarity ?? '—')}</dd>
            <dt>Type</dt><dd>${esc(skin.type || '—')}</dd>
            <dt>Card art</dt><dd>${esc((skin.assets && skin.assets.cardArt) || '—')}</dd>
            <dt>Icon</dt><dd>${esc((skin.assets && skin.assets.icon) || '—')}</dd>
            <dt>In-game</dt><dd>${esc((skin.assets && skin.assets.inGame) || '—')}</dd>
          </dl>
          ${
            variants.length
              ? `<div class="variants-block">
              <h4>Variants (${variants.length})</h4>
              ${variants
                .map(
                  (v) => `
                <div class="variant-row">
                  ${imgTag(mediaUrl(v.icon || v.cardArt || v.skin), '', v.name)}
                  <div>
                    <strong>${esc(v.name || 'Variant')}</strong>
                    ${v.masteryFromDisk ? '<span class="badge mastery">Mastery</span>' : ''}
                  </div>
                </div>`
                )
                .join('')}
            </div>`
              : ''
          }
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
      const data = await fetchJson(`/api/pantheon/${encodeURIComponent(pantheonId)}`);
      const god = (data.gods || []).find(
        (g) => g.godName.toLowerCase() === godName.toLowerCase()
      );
      if (!god) throw new Error(`God "${godName}" not found in ${pantheonId}`);

      const skins = god.skins || [];
      const base = skins.filter((s) => s.isBaseSkin);
      const mastery = skins.filter((s) => s.isMastery && !s.isBaseSkin);
      const rest = skins.filter((s) => !s.isBaseSkin && !s.isMastery);

      app.innerHTML = `
        <a class="back-link" href="#/pantheon/${encodeURIComponent(pantheonId)}">← ${esc(pantheonId)} pantheon</a>
        <h1 class="page-title">${esc(god.godName)}</h1>
        <p class="page-sub">${esc(data.pantheon)} · ${skins.length} skins · ${esc(god.internalName || '')}</p>
        ${
          base.length
            ? `<section class="skin-section"><h2>Base</h2><div class="skin-cards">${base.map(renderSkinCard).join('')}</div></section>`
            : ''
        }
        ${
          mastery.length
            ? `<section class="skin-section"><h2>Mastery</h2><div class="skin-cards">${mastery.map(renderSkinCard).join('')}</div></section>`
            : ''
        }
        ${
          rest.length
            ? `<section class="skin-section"><h2>Skins</h2><div class="skin-cards">${rest.map(renderSkinCard).join('')}</div></section>`
            : ''
        }
      `;
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
