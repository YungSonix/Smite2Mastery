import { Linking, Platform } from 'react-native';

const TRIVIA_SITE_ORIGIN = 'https://smitescroll.com';

export function triviaTakePath(slug) {
  return `/trivia/take/${encodeURIComponent(String(slug || '').trim())}`;
}

export async function fetchCurrentAssignedTrivia() {
  const publicUrl =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? '/api/trivia/public'
      : `${TRIVIA_SITE_ORIGIN}/api/trivia/public`;
  try {
    const res = await fetch(publicUrl);
    if (res.ok) {
      const data = await res.json();
      if (data?.quiz?.slug) return data.quiz;
    }
  } catch (_) {}
  return null;
}

export function openTriviaTake(slug) {
  const path = triviaTakePath(slug);
  if (!slug) return;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(path);
    return;
  }
  Linking.openURL(`${TRIVIA_SITE_ORIGIN}${path}`).catch(() => {});
}
