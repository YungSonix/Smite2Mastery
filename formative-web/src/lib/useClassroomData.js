import { useCallback, useEffect, useMemo, useState } from 'react';
import { hostApi } from './api';
import { mergeClassroomStudent } from './classroomBadges';
import { attachThesesToStudents } from './classroomThesis';
import { buildSubmissionIntegrity } from './submissionIntegrity';
import { buildPlayerLeaderboard } from './triviaPlayerStats';

export function useClassroomData() {
  const [data, setData] = useState({
    quizzes: [],
    questions: [],
    responses: [],
    playerProfiles: [],
    profileSync: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await hostApi('/api/trivia/host?action=analytics&syncProfiles=0');
    setData(res);
    return res;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await load();
      } catch (e) {
        const network = e.message === 'Failed to fetch' || e.name === 'TypeError';
        const timedOut =
          e.status === 504 ||
          e.status === 503 ||
          /timeout|timed out|gateway|function_invocation|load failed/i.test(String(e.message || ''));
        if (alive) {
          setError(
            network || timedOut
              ? 'Classroom took too long to load. Refresh once — student lists no longer rebuild every profile on open.'
              : e.message || 'Failed to load classroom'
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const profileByKey = useMemo(
    () => Object.fromEntries((data.playerProfiles || []).map((p) => [p.discord_key, p])),
    [data.playerProfiles]
  );

  const integrityIndex = useMemo(
    () => buildSubmissionIntegrity(data.responses || []),
    [data.responses]
  );

  const students = useMemo(() => {
    const players = buildPlayerLeaderboard(data.responses || [], {
      quizzes: data.quizzes,
      questions: data.questions,
      integrityIndex,
    });
    return players.map((p) =>
      mergeClassroomStudent(p, profileByKey[p.discordKey], {
        responses: data.responses || [],
        quizzes: data.quizzes || [],
      })
    );
  }, [data, integrityIndex, profileByKey]);

  const studentsWithThesis = useMemo(
    () => attachThesesToStudents(students, data.questions),
    [students, data.questions]
  );

  const upsertProfile = useCallback((profile) => {
    if (!profile) return;
    setData((prev) => {
      const list = [...(prev.playerProfiles || [])];
      const idx = list.findIndex((p) => p.discord_key === profile.discord_key);
      if (idx >= 0) list[idx] = profile;
      else list.push(profile);
      return { ...prev, playerProfiles: list };
    });
  }, []);

  return {
    data,
    loading,
    error,
    setError,
    load,
    studentsWithThesis,
    upsertProfile,
  };
}
