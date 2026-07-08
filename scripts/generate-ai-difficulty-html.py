# -*- coding: utf-8 -*-
"""Merge AI behavior configs + GameplayEffect stats into color-coded HTML."""
import json
import os
import re
from html import escape

AI_ROOT = r'c:\Users\Carri\Downloads\Output\Exports\Hemingway\Content\AI\AIDifficulty'
GE_ROOT = r'c:\Users\Carri\Downloads\Output\Exports\Hemingway\Content\GameplayEffects\AIDifficulty'
OUT = r'c:\Users\Carri\Downloads\Output\Exports\Hemingway\smite2-ai-difficulty-reference.html'

GA_DESC = {
    'GA_AIDifficulty_DamageToAndFromPlayerModifier': '60% dmg to you · 130% dmg from you',
    'GA_AIDifficulty_DamageToMinionsModifier': '80% dmg to minions',
    'GA_AIDifficulty_DamageModifier_VsGods': 'Less dmg when low HP (65–80%)',
    'GA_AIDifficulty_PlayerDamageMarks': 'Tracks hit/get hit (AI scaling)',
}

PLAY_LABELS = {
    'AIPlay.BackToBase': 'Back to base',
    'AIPlay.DefendObjective': 'Defend objective',
    'AIPlay.Gank': 'Gank',
    'AIPlay.SupportGank': 'Support gank',
    'AIPlay.JungleBoss': 'Jungle boss',
    'AIPlay.SeigeObjective': 'Siege objective',
}

ABILITY_LABELS = {
    'BotAbilityFlags.Option.Ultimate': 'Ults',
    'BotAbilityFlags.Option.Escape': 'Escape',
    'BotAbilityFlags.Option.CC': 'CC',
    'BotAbilityFlags.Item.Relic': 'Relics',
    'BotAbilityFlags.Item.Consumable': 'Pots',
    'BotAbilityFlags.Item.Active': 'Actives',
}

TIER_ORDER = [
    'NPE', 'ExtremelyEasy', 'VeryEasy', 'Easy', 'Medium', 'Hard', 'VeryHard', 'Custom', 'JunglePractice', 'SoloNPE',
]

TIER_LABEL = {
    'VeryEasy': 'Very Easy',
    'VeryHard': 'Very Hard',
    'ExtremelyEasy': 'Extremely Easy',
    'JunglePractice': 'Jungle Practice',
    'SoloNPE': 'Solo NPE',
}


def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def find_obj(data, pred):
    if isinstance(data, list):
        for x in data:
            r = find_obj(x, pred)
            if r:
                return r
    elif isinstance(data, dict):
        if pred(data):
            return data
        for v in data.values():
            r = find_obj(v, pred)
            if r:
                return r
    return None


def parse_ge(path):
    if not os.path.isfile(path):
        return None
    data = load_json(path)
    d = find_obj(data, lambda o: o.get('Name', '').startswith('Default__GE_'))
    if not d:
        return None
    p = d.get('Properties', {})
    out = {'atk': None, 'cdr': None, 'dmg': None, 'scripts': []}
    asm = (p.get('AttackSpeedModifierMagnitude') or {}).get('ScalableFloatMagnitude', {})
    if asm.get('Value') is not None:
        out['atk'] = asm['Value']
    for m in p.get('Modifiers') or []:
        attr = m.get('Attribute', {}).get('AttributeName', '')
        val = (m.get('ModifierMagnitude', {}).get('ScalableFloatMagnitude') or {}).get('Value')
        if val is None:
            continue
        if attr == 'AttackSpeed' and out['atk'] is None:
            out['atk'] = val
        elif attr == 'CooldownRateBase':
            out['cdr'] = val
        elif attr == 'DamageDealtPercentModifier':
            out['dmg'] = val
    for item in data if isinstance(data, list) else [data]:
        if item.get('Type') == 'AbilitiesGameplayEffectComponent':
            for cfg in item.get('Properties', {}).get('GrantAbilityConfigs', []):
                ab = cfg.get('Ability', {}).get('ObjectName', '')
                ab = re.sub(r"BlueprintGeneratedClass'|'", '', ab).replace('_C', '')
                out['scripts'].append(ab)
    return out


def ge_path_from_ref(ref):
    op = ref.get('ObjectPath', '')
    m = re.search(r'/Game/GameplayEffects/AIDifficulty/(.+)\.\d+', op)
    if not m:
        return None
    rel = m.group(1).replace('/', os.sep) + '.json'
    return os.path.join(GE_ROOT, rel)


def parse_config(path):
    data = load_json(path)
    cfg = find_obj(data, lambda o: o.get('Type') == 'HWAIDifficultyConfig')
    if not cfg:
        return None
    name = cfg.get('Name', os.path.basename(path).replace('.json', ''))
    props = cfg.get('Properties', {})
    rel = os.path.relpath(path, AI_ROOT).replace('\\', '/')
    parts = rel.split('/')
    mode = parts[0] if len(parts) > 1 else 'Generic'
    team = 'Friendly' if 'FriendlyTeam' in name else ('Enemy' if 'EnemyTeam' in name else 'Enemy')

    rows = []
    for block in props.get('DataByDifficulty') or []:
        ge_stats = None
        effects = block.get('Effects') or []
        if effects:
            gp = ge_path_from_ref(effects[0])
            ge_stats = parse_ge(gp) if gp else None

        plays_off = [PLAY_LABELS.get(p, p.replace('AIPlay.', '')) for p in block.get('PlaysToDisable') or []]
        abilities_off = [ABILITY_LABELS.get(a, a.split('.')[-1]) for a in block.get('AbilitiesToDisableByOption') or []]
        focus = block.get('MaxFocusFireOnPlayer')
        focus_str = 'Unlimited' if focus == -1 else str(focus)

        script_str = ''
        if ge_stats and ge_stats['scripts']:
            script_str = '; '.join(GA_DESC.get(s, s.replace('GA_AIDifficulty_', '')) for s in ge_stats['scripts'])

        rows.append({
            'config_name': name,
            'mode': mode,
            'team': team,
            'combos': block.get('AllowAbilityCombos'),
            'focus_fire': focus_str,
            'focus_raw': focus,
            'min_level_aggro': block.get('MinPlayerLevelForAggression'),
            'threat_mod': block.get('PlayerThreatModifier'),
            'plays_off': plays_off,
            'abilities_off': abilities_off,
            'atk': ge_stats['atk'] if ge_stats else None,
            'cdr': ge_stats['cdr'] if ge_stats else None,
            'dmg': ge_stats['dmg'] if ge_stats else None,
            'scripts': script_str,
        })
    return rows


def tier_from_name(name):
    for t in sorted(TIER_ORDER, key=len, reverse=True):
        if t in name:
            return t
    return name


def tier_class(tier):
    mapping = {
        'NPE': 'tier-npe',
        'ExtremelyEasy': 'tier-extreme',
        'VeryEasy': 'tier-veryeasy',
        'Easy': 'tier-easy',
        'Medium': 'tier-medium',
        'Hard': 'tier-hard',
        'VeryHard': 'tier-veryhard',
    }
    return mapping.get(tier, 'tier-other')


def tier_label(tier):
    return TIER_LABEL.get(tier, tier)


def fmt_stat(val, suffix=''):
    if val is None:
        return '—'
    sign = '+' if val > 0 else ''
    return f'{sign}{val:g}{suffix}'


def stat_class(val):
    if val is None:
        return 'neutral'
    if val > 0:
        return 'buff'
    if val < 0:
        return 'nerf'
    return 'neutral'


def stat_cell(val, suffix=''):
    cls = stat_class(val)
    return f'<td class="stat {cls}">{escape(fmt_stat(val, suffix))}</td>'


def chips(items, kind='off'):
    if not items:
        if kind == 'off':
            return '<span class="muted-good">none</span>'
        return '<span class="muted">—</span>'
    return '<span class="tag-list">' + ', '.join(f'<span class="tag">{escape(x)}</span>' for x in items) + '</span>'


def bool_pill(yes, yes_text='yes', no_text='no'):
    return f'<span class="yn {"yes" if yes else "no"}">{yes_text if yes else no_text}</span>'


def mode_badge(mode):
    return f'<span class="mode">{escape(mode)}</span>'


def tier_badge(tier):
    return f'<span class="tier-label {tier_class(tier)}">{escape(tier_label(tier))}</span>'


def focus_cell(raw):
    if raw == -1:
        return (
            '<td class="explain-cell">'
            '<span class="explain-main">No limit</span>'
            '<span class="explain-sub">Any number of bots can attack you at once</span>'
            '</td>'
        )
    n = int(raw)
    bot_word = 'bot' if n == 1 else 'bots'
    return (
        f'<td class="explain-cell" title="MaxFocusFireOnPlayer">'
        f'<span class="explain-main">Up to {n}</span>'
        f'<span class="explain-sub">{n} {bot_word} can pile on you at once</span>'
        f'</td>'
    )


def aggro_cell(level):
    level = int(level or 0)
    if level <= 0:
        return (
            '<td class="explain-cell" title="MinPlayerLevelForAggression">'
            '<span class="explain-main">Always</span>'
            '<span class="explain-sub">Aggressive from level 1</span>'
            '</td>'
        )
    return (
        f'<td class="explain-cell" title="MinPlayerLevelForAggression">'
        f'<span class="explain-main">Level {level}+</span>'
        f'<span class="explain-sub">Ignores you until you reach level {level}</span>'
        f'</td>'
    )


def threat_cell(mod):
    mod = float(mod or 1.0)
    if mod == 1.0:
        sub = 'Normal target priority'
    elif mod < 1.0:
        pct = round(mod * 100)
        sub = f'Bots care about you {pct}% as much as normal'
    else:
        pct = round((mod - 1) * 100)
        sub = f'Bots treat you {pct}% more dangerous than normal'
    return (
        f'<td class="explain-cell" title="PlayerThreatModifier">'
        f'<span class="explain-main">{mod:g}</span>'
        f'<span class="explain-sub">{escape(sub)}</span>'
        f'</td>'
    )


all_rows = []
for dp, _, files in os.walk(AI_ROOT):
    for f in sorted(files):
        if not f.endswith('.json'):
            continue
        rows = parse_config(os.path.join(dp, f))
        if rows:
            all_rows.extend(rows)

# Enemy bots only
all_rows = [r for r in all_rows if r['team'] == 'Enemy']

all_rows.sort(key=lambda r: (
    r['mode'],
    0 if r['team'] == 'Enemy' else 1,
    TIER_ORDER.index(tier_from_name(r['config_name'])) if tier_from_name(r['config_name']) in TIER_ORDER else 99,
    r['config_name'],
))

modes = sorted({r['mode'] for r in all_rows}, key=lambda m: (
    ['Arena', 'Conquest', 'Joust', 'Custom', 'Generic'].index(m) if m in ['Arena', 'Conquest', 'Joust', 'Custom', 'Generic'] else 99,
    m,
))

# Build table rows HTML
row_html = []
for r in all_rows:
    tier = tier_from_name(r['config_name'])
    tc = tier_class(tier)
    search = ' '.join([
        r['mode'], tier, r['team'], r['config_name'], r['scripts'],
        ' '.join(r['plays_off']), ' '.join(r['abilities_off']),
    ]).lower()
    if r['scripts']:
        scripts_html = ', '.join(f'<span class="tag tag-script">{escape(s.strip())}</span>' for s in r['scripts'].split(';'))
    else:
        scripts_html = '<span class="muted">—</span>'
    abil_html = chips(r['abilities_off']) if r['abilities_off'] else '<span class="muted-good">full kit</span>'
    plays_html = chips(r['plays_off']) if r['plays_off'] else '<span class="muted-good">all plays</span>'

    row_html.append(
        f'<tr class="data-row {tc}" data-mode="{escape(r["mode"])}" data-team="{escape(r["team"])}" data-search="{escape(search)}">'
        f'<td class="sticky col-mode">{mode_badge(r["mode"])}</td>'
        f'<td class="sticky col-tier"><div class="tier-cell">{tier_badge(tier)}<span class="config-id" title="{escape(r["config_name"])}">{escape(r["config_name"])}</span></div></td>'
        f'{stat_cell(r["atk"], "%")}'
        f'{stat_cell(r["cdr"], "%")}'
        f'{stat_cell(r["dmg"], "%")}'
        f'<td>{bool_pill(r["combos"])}</td>'
        f'{focus_cell(r["focus_raw"])}'
        f'{aggro_cell(r["min_level_aggro"])}'
        f'{threat_cell(r["threat_mod"])}'
        f'<td class="tag-cell">{plays_html}</td>'
        f'<td class="tag-cell">{abil_html}</td>'
        f'<td class="tag-cell">{scripts_html}</td>'
        f'</tr>'
    )

mode_buttons = ''.join(
    f'<button type="button" class="filter-btn" data-filter-mode="{escape(m)}">{escape(m)}</button>'
    for m in modes
)

glossary_rows = ''.join(
    f'<tr><td><code>{escape(k.replace("GA_AIDifficulty_", ""))}</code></td><td>{escape(v)}</td></tr>'
    for k, v in GA_DESC.items()
)

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Smite 2 — AI Difficulty Reference</title>
<style>
  :root {{
    --bg: #071024;
    --panel: #0b1220;
    --panel-2: #121c31;
    --border: #1e3a5f;
    --accent: #7dd3fc;
    --text: #f1f5f9;
    --muted: #94a3b8;
    --ok: #4ade80;
    --bad: #f87171;
    --warn: #facc15;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
    min-height: 100vh;
  }}
  .topbar {{
    position: sticky; top: 0; z-index: 20;
    padding: 14px 20px;
    background: rgba(8, 12, 22, 0.98);
    border-bottom: 1px solid var(--border);
  }}
  .topbar h1 {{ margin: 0 0 4px; font-size: 1.15rem; font-weight: 700; color: var(--text); }}
  .topbar .subtitle {{ margin: 0; font-size: 0.85rem; color: var(--muted); }}
  .topbar code {{ font-size: 0.82em; color: #cbd5e1; }}
  .page {{ max-width: 1680px; margin: 0 auto; padding: 20px; }}
  .legend {{
    display: flex; flex-wrap: wrap; gap: 14px 20px;
    margin: 12px 0 0; padding: 0; list-style: none;
    font-size: 0.8rem; color: var(--muted);
  }}
  .legend li {{ display: flex; align-items: center; gap: 6px; }}
  .legend-dot {{ width: 8px; height: 8px; border-radius: 1px; flex-shrink: 0; }}
  .toolbar {{
    display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
    margin-bottom: 16px; padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }}
  .search-wrap {{ flex: 1; min-width: 200px; }}
  #search {{
    width: 100%; max-width: 320px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--panel);
    color: var(--text); font-size: 0.88rem;
    outline: none;
  }}
  #search:focus {{ border-color: var(--accent); }}
  .filter-group {{ display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }}
  .filter-label {{ font-size: 0.8rem; color: var(--muted); margin-right: 6px; }}
  .filter-btn {{
    padding: 6px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--panel);
    color: var(--muted);
    cursor: pointer; font-size: 0.82rem;
  }}
  .filter-btn:hover {{ color: var(--text); border-color: #2a4a6f; }}
  .filter-btn.active {{ background: var(--panel-2); color: var(--accent); border-color: var(--accent); }}
  .section {{
    border: 1px solid var(--border);
    background: var(--panel);
    margin-bottom: 16px;
  }}
  .section-header {{
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center;
    font-size: 0.9rem; font-weight: 600;
  }}
  .row-count {{ font-size: 0.8rem; color: var(--muted); font-weight: 400; }}
  .table-wrap {{ overflow: auto; max-height: 78vh; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 0.84rem; }}
  thead th {{
    position: sticky; top: 0; z-index: 3;
    background: var(--panel-2);
    color: var(--muted);
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
    border-right: 1px solid rgba(30, 58, 95, 0.5);
    white-space: nowrap;
    font-size: 0.78rem;
    font-weight: 600;
  }}
  thead th:last-child {{ border-right: none; }}
  tbody td {{
    padding: 8px 10px;
    border-bottom: 1px solid rgba(30, 58, 95, 0.35);
    border-right: 1px solid rgba(30, 58, 95, 0.2);
    vertical-align: top;
  }}
  tbody td:last-child {{ border-right: none; }}
  tbody tr.data-row:hover td {{ background: rgba(255,255,255,0.02); }}
  tbody tr.data-row.hidden {{ display: none; }}
  td.sticky {{ position: sticky; z-index: 2; background: var(--panel); }}
  td.col-mode {{ left: 0; min-width: 88px; }}
  td.col-tier {{ left: 88px; min-width: 140px; border-right: 1px solid var(--border) !important; }}
  thead th.col-mode {{ left: 0; z-index: 4; }}
  thead th.col-tier {{ left: 88px; z-index: 4; }}
  tr.data-row td:first-child {{ border-left: 3px solid transparent; }}
  tr.tier-npe td:first-child {{ border-left-color: #38bdf8; }}
  tr.tier-extreme td:first-child {{ border-left-color: #22c55e; }}
  tr.tier-veryeasy td:first-child {{ border-left-color: #4ade80; }}
  tr.tier-easy td:first-child {{ border-left-color: #86efac; }}
  tr.tier-medium td:first-child {{ border-left-color: #facc15; }}
  tr.tier-hard td:first-child {{ border-left-color: #fb923c; }}
  tr.tier-veryhard td:first-child {{ border-left-color: #ef4444; }}
  tr.tier-other td:first-child {{ border-left-color: #64748b; }}
  .mode {{ font-weight: 600; font-size: 0.82rem; }}
  .tier-cell {{ display: flex; flex-direction: column; gap: 2px; }}
  .tier-label {{ font-weight: 600; font-size: 0.82rem; }}
  .tier-npe.tier-label {{ color: #7dd3fc; }}
  .tier-extreme.tier-label {{ color: #86efac; }}
  .tier-veryeasy.tier-label {{ color: #4ade80; }}
  .tier-easy.tier-label {{ color: #86efac; }}
  .tier-medium.tier-label {{ color: #fde047; }}
  .tier-hard.tier-label {{ color: #fdba74; }}
  .tier-veryhard.tier-label {{ color: #fca5a5; }}
  .tier-other.tier-label {{ color: #94a3b8; }}
  .config-id {{
    font-size: 0.65rem; color: var(--muted);
    font-family: ui-monospace, Consolas, monospace;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;
  }}
  .stat {{ font-variant-numeric: tabular-nums; font-weight: 600; }}
  .stat.buff {{ color: var(--ok); }}
  .stat.nerf {{ color: var(--bad); }}
  .stat.neutral {{ color: var(--muted); }}
  .yn {{ font-size: 0.82rem; }}
  .yn.yes {{ color: var(--ok); }}
  .yn.no {{ color: var(--bad); }}
  .tag-list {{ line-height: 1.5; }}
  .tag {{
    display: inline;
    font-size: 0.78rem;
    color: #fca5a5;
    background: rgba(248,113,113,0.08);
    padding: 1px 4px;
    border-radius: 2px;
    margin-right: 2px;
  }}
  .tag-script {{ color: #bae6fd; background: rgba(125,211,252,0.08); }}
  .muted {{ color: var(--muted); }}
  .muted-good {{ color: var(--ok); font-size: 0.82rem; }}
  .tag-cell {{ max-width: 200px; }}
  .explain-cell {{ min-width: 140px; max-width: 180px; }}
  .explain-main {{ display: block; font-weight: 600; font-variant-numeric: tabular-nums; }}
  .explain-sub {{ display: block; margin-top: 2px; font-size: 0.72rem; line-height: 1.35; color: var(--muted); }}
  th abbr {{ text-decoration: none; border-bottom: 1px dotted var(--muted); cursor: help; }}
  .column-guide {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    margin-bottom: 16px;
  }}
  .guide-card {{
    background: var(--panel);
    padding: 12px 14px;
  }}
  .guide-card h3 {{ margin: 0 0 4px; font-size: 0.88rem; font-weight: 600; color: var(--text); }}
  .guide-card p {{ margin: 0; font-size: 0.8rem; color: var(--muted); line-height: 1.45; }}
  .guide-card code {{ color: #cbd5e1; font-size: 0.76rem; }}
  .glossary {{ margin-top: 8px; }}
  .glossary table {{ font-size: 0.85rem; }}
  .glossary code {{ color: #bae6fd; }}
  .footnote {{ margin-top: 12px; color: var(--muted); font-size: 0.8rem; }}
  @media (max-width: 900px) {{
    td.col-tier {{ left: 72px; min-width: 110px; }}
    thead th.col-tier {{ left: 72px; }}
    td.col-mode {{ min-width: 72px; }}
  }}
</style>
</head>
<body>
<header class="topbar">
  <h1>Smite 2 — AI Difficulty Reference</h1>
  <p class="subtitle">Enemy bots · stats from <code>GameplayEffects/AIDifficulty</code> + behavior from <code>AI/AIDifficulty</code></p>
  <ul class="legend">
    <li><span class="legend-dot" style="background:#4ade80"></span> Very Easy</li>
    <li><span class="legend-dot" style="background:#86efac"></span> Easy</li>
    <li><span class="legend-dot" style="background:#facc15"></span> Medium</li>
    <li><span class="legend-dot" style="background:#fb923c"></span> Hard</li>
    <li><span class="legend-dot" style="background:#ef4444"></span> Very Hard</li>
    <li><span class="stat buff">+</span> bot buff</li>
    <li><span class="stat nerf">−</span> bot nerf</li>
  </ul>
</header>
<div class="page">
  <div class="toolbar">
    <div class="search-wrap">
      <input type="search" id="search" placeholder="Search difficulty, mode, disabled abilities…" autocomplete="off">
    </div>
    <div class="filter-group">
      <span class="filter-label">Mode</span>
      <button type="button" class="filter-btn active" data-filter-mode="all">All</button>
      {mode_buttons}
    </div>
  </div>

  <div class="column-guide">
    <div class="guide-card">
      <h3>Focus you</h3>
      <p><code>MaxFocusFireOnPlayer</code> — cap on how many enemy bots can attack <em>you</em> at the same time. <strong>4</strong> means at most four bots can pile on you; <strong>Unlimited</strong> means no cap.</p>
    </div>
    <div class="guide-card">
      <h3>Aggro lvl</h3>
      <p><code>MinPlayerLevelForAggression</code> — minimum player level before bots start hunting you. <strong>2</strong> = bots mostly ignore you at level 1; <strong>0</strong> = aggressive from the start.</p>
    </div>
    <div class="guide-card">
      <h3>Threat</h3>
      <p><code>PlayerThreatModifier</code> — how much priority bots give you as a target. <strong>0.5</strong> = half normal; <strong>1.05</strong> = 5% more dangerous than baseline.</p>
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <span>Master table</span>
      <span class="row-count" id="row-count">{len(all_rows)} configs</span>
    </div>
    <div class="table-wrap">
      <table id="main-table">
        <thead>
          <tr>
            <th class="sticky col-mode">Mode</th>
            <th class="sticky col-tier">Difficulty</th>
            <th class="group-stats">Atk spd</th>
            <th class="group-stats">CDR</th>
            <th class="group-stats">Dmg</th>
            <th class="group-behavior">Combos</th>
            <th class="group-behavior"><abbr title="MaxFocusFireOnPlayer — max enemy bots attacking you at once">Focus you</abbr></th>
            <th class="group-behavior"><abbr title="MinPlayerLevelForAggression — min level before bots hunt you">Aggro lvl</abbr></th>
            <th class="group-behavior"><abbr title="PlayerThreatModifier — target priority vs baseline (1.0)">Threat</abbr></th>
            <th class="group-behavior">Plays off</th>
            <th class="group-behavior">Abilities off</th>
            <th class="group-behavior">Hidden scripts</th>
          </tr>
        </thead>
        <tbody>
          {''.join(row_html)}
        </tbody>
      </table>
    </div>
  </div>

  <div class="section glossary">
    <div class="section-header"><span>Hidden script glossary</span></div>
    <div class="table-wrap" style="max-height:none">
      <table>
        <thead><tr><th>Script</th><th>What it does</th></tr></thead>
        <tbody>{glossary_rows}</tbody>
      </table>
    </div>
  </div>

  <p class="footnote">
    Enemy bots only · Atk spd, CDR, and Dmg are % modifiers from gameplay effects · Hover column headers for tooltips.
  </p>
</div>

<script>
(function() {{
  let modeFilter = 'all';
  const rows = document.querySelectorAll('.data-row');
  const countEl = document.getElementById('row-count');
  const searchEl = document.getElementById('search');

  function applyFilters() {{
    const q = (searchEl.value || '').trim().toLowerCase();
    let visible = 0;
    rows.forEach(row => {{
      const modeOk = modeFilter === 'all' || row.dataset.mode === modeFilter;
      const searchOk = !q || row.dataset.search.includes(q);
      const show = modeOk && searchOk;
      row.classList.toggle('hidden', !show);
      if (show) visible++;
    }});
    countEl.textContent = visible + ' shown · {len(all_rows)} total';
  }}

  document.querySelectorAll('[data-filter-mode]').forEach(btn => {{
    btn.addEventListener('click', () => {{
      document.querySelectorAll('[data-filter-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      modeFilter = btn.dataset.filterMode;
      applyFilters();
    }});
  }});

  searchEl.addEventListener('input', applyFilters);
  applyFilters();
}})();
</script>
</body>
</html>
'''

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'Wrote {OUT}')
print(f'Rows: {len(all_rows)}')
