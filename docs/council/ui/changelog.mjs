/** Panel changelog — shown in What's New modal when chat version bumps. */

/** @typedef {{ kind: 'feature' | 'fix' | 'improvement', title: string, detail?: string }} ChangelogHighlight */
/** @typedef {{ version: number, headline: string, highlights: ChangelogHighlight[] }} ChangelogRelease */

/** @type {ChangelogRelease[]} — newest first */
export const PANEL_CHANGELOG = [
  {
    version: 40,
    headline: 'Live panel restored',
    highlights: [
      {
        kind: 'fix',
        title: 'Live typing works again',
        detail: 'Feed poll was crashing (escapeHtml scope bug) — members stream one-at-a-time like before.',
      },
    ],
  },
  {
    version: 39,
    headline: 'Image upload fixes',
    highlights: [
      {
        kind: 'fix',
        title: 'Attach, paste, and drag images reliably',
        detail: 'Windows file types fixed; uploads use multipart (not giant JSON). Status shows when images are ready.',
      },
    ],
  },
  {
    version: 38,
    headline: 'Image attachments',
    highlights: [
      {
        kind: 'feature',
        title: 'Attach multiple images to council topics',
        detail: 'Paperclip or paste up to 8 images (5MB each). Thumbnails show in chat; members Read them via prompts.',
      },
    ],
  },
  {
    version: 32,
    headline: 'Typing no longer freezes',
    highlights: [
      {
        kind: 'fix',
        title: 'Typing finishes the full message',
        detail: 'Panel no longer wipes the bubble mid-sentence — animation catches up to the server.',
      },
    ],
  },
  {
    version: 31,
    headline: 'Full group chat demo',
    highlights: [
      {
        kind: 'feature',
        title: 'Watch all three talk',
        detail: 'npm run council:chat-demo — Round 1 & 2 with read pauses between every message.',
      },
    ],
  },
  {
    version: 30,
    headline: 'Manual draft typing',
    highlights: [
      {
        kind: 'fix',
        title: 'Manual drafts animate like the demo',
        detail: 'Draft updates no longer flash the whole chat; use --type for char-by-char push from terminal.',
      },
    ],
  },
  {
    version: 29,
    headline: 'Typing demo + fixes',
    highlights: [
      {
        kind: 'fix',
        title: 'Letter typing works after server restart',
        detail: 'Panel now gets a typing payload; run npm run council:type-demo to verify.',
      },
    ],
  },
  {
    version: 28,
    headline: 'Smooth letter-by-letter typing',
    highlights: [
      {
        kind: 'improvement',
        title: 'Typing animates in place',
        detail: 'Draft text grows character-by-character with a cursor — no full-chat flicker on each update.',
      },
    ],
  },
  {
    version: 27,
    headline: 'Slower, readable council pace',
    highlights: [
      {
        kind: 'improvement',
        title: 'Replies stream slower with pauses',
        detail: '~120ms per word, 3.5s between members, 8s before Round 2 — tune in council.config.json.',
      },
      {
        kind: 'fix',
        title: 'Thinking bubbles clear after replies',
        detail: 'Stale “thinking…” chips and phase banners no longer stick after a session finishes.',
      },
    ],
  },
  {
    version: 26,
    headline: 'Auto-refresh chat',
    highlights: [
      {
        kind: 'fix',
        title: 'Chat updates without manual refresh',
        detail: 'Panel polls every 250ms — drafts and new messages appear live in Cursor Simple Browser.',
      },
    ],
  },
  {
    version: 25,
    headline: 'Live typing after Clear view',
    highlights: [
      {
        kind: 'fix',
        title: 'Drafts show when view is cleared',
        detail: 'Clear view hid live typing bubbles — mid-generation text now appears anyway.',
      },
    ],
  },
  {
    version: 24,
    headline: 'Real mid-generation typing',
    highlights: [
      {
        kind: 'fix',
        title: 'Stream no longer cut off',
        detail: 'Append waits for the typing animation to finish — was exiting instantly before.',
      },
      {
        kind: 'feature',
        title: 'Live drafts',
        detail: 'Members push text mid-generation via council:draft — panel shows it while they write.',
      },
    ],
  },
  {
    version: 23,
    headline: 'Live council stream',
    highlights: [
      {
        kind: 'feature',
        title: 'Typing stream',
        detail: 'Replies appear word-by-word in the panel as each member speaks.',
      },
      {
        kind: 'feature',
        title: 'Full session history',
        detail: 'See the whole council — no more “last 8 messages” trim during a session.',
      },
      {
        kind: 'improvement',
        title: 'Round phases',
        detail: '“Round 1” and “Reading each other…” banners show between rounds.',
      },
    ],
  },
  {
    version: 22,
    headline: 'Buttons work in Cursor',
    highlights: [
      {
        kind: 'fix',
        title: 'Clear view & Models',
        detail: 'Top bar buttons work in Cursor Simple Browser — no ES module required.',
      },
    ],
  },
  {
    version: 20,
    headline: 'Shorter, human replies',
    highlights: [
      {
        kind: 'improvement',
        title: 'Shorter council voice',
        detail: 'Members target 40–55 words — plain English, 1–2 short bubbles, like Slack.',
      },
      {
        kind: 'improvement',
        title: 'Separate short bubbles',
        detail: 'Split on blank lines again — but capped at 3 small thoughts, not essay walls.',
      },
    ],
  },
  {
    version: 19,
    headline: 'Live typing & fewer bubbles',
    highlights: [
      {
        kind: 'feature',
        title: 'Live typing in chat',
        detail: 'Thinking bubbles with a cursor appear while members speak — updates every 400ms.',
      },
      {
        kind: 'fix',
        title: 'Clear view works',
        detail: 'Messages actually disappear from the panel when you tap Clear view.',
      },
      {
        kind: 'fix',
        title: 'Models drawer toggle',
        detail: 'Models ▼ / ▲ expands and collapses the bench reliably in Cursor.',
      },
      {
        kind: 'improvement',
        title: 'One bubble per member',
        detail: 'Each council reply is a single message — no more 8-bubble walls.',
      },
    ],
  },
  {
    version: 18,
    headline: 'Compact panel for Cursor',
    highlights: [
      {
        kind: 'improvement',
        title: 'Compact layout',
        detail: 'Smaller text and tighter spacing — tuned for Cursor Simple Browser.',
      },
      {
        kind: 'improvement',
        title: 'Shorter Final Verdict',
        detail: 'Verdicts capped at ~45 words on screen; council prompt tightened.',
      },
      {
        kind: 'feature',
        title: "What's new popup",
        detail: 'Changelog modal when the panel version updates.',
      },
      {
        kind: 'improvement',
        title: 'Bench collapsed by default',
        detail: 'More room for chat in Cursor — tap Models to expand.',
      },
    ],
  },
  {
    version: 17,
    headline: 'Fresh chat feel',
    highlights: [
      {
        kind: 'feature',
        title: 'Clear view button',
        detail: 'Hide prior session on refresh without deleting backend history.',
      },
      {
        kind: 'improvement',
        title: 'Trimmed history',
        detail: 'Only the last few messages show after refresh.',
      },
    ],
  },
];

export function getChangelogSince(sinceVersion = 0) {
  const since = Number(sinceVersion) || 0;
  return PANEL_CHANGELOG.filter((r) => r.version > since).sort((a, b) => b.version - a.version);
}

export function getChangelogForVersion(version) {
  return PANEL_CHANGELOG.find((r) => r.version === Number(version)) ?? null;
}

export function getAllHighlightsSince(sinceVersion = 0) {
  return getChangelogSince(sinceVersion).flatMap((r) =>
    r.highlights.map((h) => ({ ...h, version: r.version }))
  );
}
