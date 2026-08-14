import { Linking, Platform } from 'react-native';

const TRIVIA_SITE_ORIGIN = 'https://smitescroll.com';

export function triviaTakePath(slug) {
  return `/formative/take/${encodeURIComponent(String(slug || '').trim())}`;
}

export async function fetchCurrentAssignedTrivia() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/trivia/public');
      if (res.ok) {
        const data = await res.json();
        if (data?.quiz?.slug) return data.quiz;
      }
    } catch (_) {}
  }

  try {
    const { supabase } = require('../config/supabase');
    const { data, error } = await supabase
      .from('trivia_quizzes')
      .select('slug, title, banner_url, updated_at')
      .eq('is_assigned', true)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error || !Array.isArray(data) || !data[0]?.slug) return null;
    return data[0];
  } catch (_) {
    return null;
  }
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
