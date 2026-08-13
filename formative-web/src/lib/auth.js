const HOST_USER_KEY = 'formativeHostUsername';
const HOST_SECRET_KEY = 'formativeHostSecret';

export function getHostSession() {
  try {
    const username = localStorage.getItem(HOST_USER_KEY) || '';
    const secret = localStorage.getItem(HOST_SECRET_KEY) || '';
    if (!username || !secret) return null;
    return { username, secret };
  } catch {
    return null;
  }
}

export function setHostSession(username, secret) {
  localStorage.setItem(HOST_USER_KEY, String(username || '').trim());
  localStorage.setItem(HOST_SECRET_KEY, String(secret || ''));
}

export function clearHostSession() {
  localStorage.removeItem(HOST_USER_KEY);
  localStorage.removeItem(HOST_SECRET_KEY);
}

export function hostHeaders() {
  const session = getHostSession();
  if (!session) return {};
  return {
    'x-host-username': session.username,
    'x-host-secret': session.secret,
  };
}
