import { stripAssignSettings } from './quizSettings';

const LS_PREFIX = 'scroll_trivia_editor_draft:';
const IDB_NAME = 'scroll_trivia_editor_drafts';
const IDB_STORE = 'drafts';

function draftKey(quizId) {
  return `${LS_PREFIX}${String(quizId || '').trim()}`;
}

function isHeavyUrl(url) {
  const s = String(url || '');
  return s.startsWith('data:') || s.startsWith('blob:');
}

function stripQuestionMedia(q) {
  if (!q || typeof q !== 'object') return q;
  const next = { ...q };
  if (isHeavyUrl(next.image_url)) next.image_url = null;
  if (Array.isArray(next.image_urls)) {
    next.image_urls = next.image_urls.filter((u) => u && !isHeavyUrl(u));
  }
  if (next.meta && typeof next.meta === 'object') {
    const meta = { ...next.meta };
    if (Array.isArray(meta.variants)) {
      meta.variants = meta.variants.map((v) => {
        const nv = { ...v };
        if (isHeavyUrl(nv.image_url)) nv.image_url = null;
        if (Array.isArray(nv.image_urls)) {
          nv.image_urls = nv.image_urls.filter((u) => u && !isHeavyUrl(u));
        }
        return nv;
      });
    }
    meta._draft_lite = true;
    next.meta = meta;
  }
  return next;
}

function stripAssignFromQuiz(quiz) {
  if (!quiz || typeof quiz !== 'object') return quiz;
  return {
    ...quiz,
    settings: stripAssignSettings(quiz.settings),
  };
}

export function sanitizeEditorDraft(payload) {
  return {
    ...payload,
    lite: true,
    questions: (payload.questions || []).map(stripQuestionMedia),
    quiz: payload.quiz
      ? stripAssignFromQuiz({
          ...payload.quiz,
          banner_url: isHeavyUrl(payload.quiz.banner_url) ? null : payload.quiz.banner_url,
        })
      : null,
  };
}

function openIdb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => {
      db.close();
      resolve(req.result || null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

async function idbSet(key, value) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve(true);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function readLiteFromLocalStorage(quizId) {
  try {
    const raw = localStorage.getItem(draftKey(quizId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.questions) || !data.questions.length) return null;
    return data;
  } catch {
    return null;
  }
}

/** Best available draft — prefers full IndexedDB copy when newer. */
export async function loadEditorDraft(quizId) {
  const lite = readLiteFromLocalStorage(quizId);
  let full = null;
  try {
    full = await idbGet(draftKey(quizId));
  } catch {
    full = null;
  }
  if (!lite && !full) return null;
  if (!lite) return full;
  if (!full) return lite;
  return (Number(full.savedAt) || 0) >= (Number(lite.savedAt) || 0) ? full : lite;
}

/** Latest server touch — quiz.updated_at or any question.updated_at (ms). */
export function serverQuizUpdatedMs(quiz, questions) {
  let max = 0;
  const quizAt = Date.parse(quiz?.updated_at || '');
  if (Number.isFinite(quizAt)) max = Math.max(max, quizAt);
  for (const q of questions || []) {
    const t = Date.parse(q?.updated_at || '');
    if (Number.isFinite(t)) max = Math.max(max, t);
  }
  return max;
}

/**
 * Prefer server when it is newer or equal to the local draft (stale phone drafts,
 * post-save). Prefer draft only when it has a strictly newer savedAt (unsaved edits).
 */
export function shouldPreferServerOverDraft(draft, quiz, questions) {
  if (!draft?.questions?.length) return true;
  const draftAt = Number(draft.savedAt) || 0;
  const serverAt = serverQuizUpdatedMs(quiz, questions);
  return serverAt >= draftAt;
}

/** Full draft in IndexedDB (~50MB+); lite text-only copy in localStorage when it fits. */
export async function saveEditorDraft(quizId, payload) {
  const key = draftKey(quizId);
  const stored = {
    ...payload,
    quiz: payload.quiz ? stripAssignFromQuiz(payload.quiz) : null,
  };
  const lite = sanitizeEditorDraft(stored);
  let idbOk = false;
  let lsOk = false;
  let lsSkipped = false;
  try {
    await idbSet(key, stored);
    idbOk = true;
  } catch {
    idbOk = false;
  }
  let liteBytes = 0;
  try {
    liteBytes = JSON.stringify(lite).length;
  } catch {
    liteBytes = Infinity;
  }
  // localStorage is ~5MB total — skip lite copy when huge and IDB already has the full draft
  const tryLs = !idbOk || liteBytes < 3_500_000;
  if (!tryLs) {
    lsSkipped = true;
  } else {
    try {
      localStorage.setItem(key, JSON.stringify(lite));
      lsOk = true;
    } catch {
      lsOk = false;
    }
  }
  if (idbOk) return { status: 'ok', idb: true, local: lsOk, lsSkipped };
  if (lsOk) return { status: 'lite', idb: false, local: true, lsSkipped: false };
  return { status: 'fail', idb: false, local: false, lsSkipped: false };
}

export function clearEditorDraft(quizId) {
  const key = draftKey(quizId);
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  if (typeof indexedDB === 'undefined') return;
  openIdb()
    .then((db) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => db.close();
    })
    .catch(() => null);
}

/** @deprecated use loadEditorDraft */
export function readEditorDraft(quizId) {
  return readLiteFromLocalStorage(quizId);
}

/** @deprecated use saveEditorDraft */
export function writeEditorDraft(quizId, payload) {
  try {
    localStorage.setItem(draftKey(quizId), JSON.stringify(sanitizeEditorDraft(payload)));
    return true;
  } catch {
    return false;
  }
}
