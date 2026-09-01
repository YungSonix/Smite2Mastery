import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import HostShell from '../components/HostShell';
import ClassroomAvatarPicker from '../components/ClassroomAvatarPicker';
import ClassroomStudentDetail, { PointControls } from '../components/ClassroomStudentDetail';
import { hostApi } from '../lib/api';
import { useClassroomData } from '../lib/useClassroomData';

export default function ClassroomStudent() {
  const { discordKey } = useParams();
  const navigate = useNavigate();
  const { loading, error, setError, studentsWithThesis, upsertProfile } = useClassroomData();
  const [busyKey, setBusyKey] = useState(null);
  const [avatarStudent, setAvatarStudent] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const decodedKey = decodeURIComponent(discordKey || '');

  const student = useMemo(
    () => studentsWithThesis.find((s) => s.discordKey === decodedKey) || null,
    [studentsWithThesis, decodedKey]
  );

  const handleAdjust = useCallback(
    async (key, delta) => {
      setBusyKey(key);
      setError('');
      try {
        const res = await hostApi('/api/trivia/host', {
          method: 'POST',
          body: { action: 'classroom-points', discordKey: key, delta },
        });
        if (res.profile) upsertProfile(res.profile);
      } catch (e) {
        setError(e.message || 'Could not update points');
      } finally {
        setBusyKey(null);
      }
    },
    [upsertProfile, setError]
  );

  const handleSaveAvatar = useCallback(
    async ({ kind, ref }) => {
      if (!avatarStudent) return;
      setAvatarBusy(true);
      setError('');
      try {
        const res = await hostApi('/api/trivia/host', {
          method: 'POST',
          body: {
            action: 'set-classroom-avatar',
            discordKey: avatarStudent.discordKey,
            kind,
            ref,
          },
        });
        upsertProfile(res.profile);
        setAvatarStudent(null);
      } catch (e) {
        setError(e.message || 'Could not save avatar');
      } finally {
        setAvatarBusy(false);
      }
    },
    [avatarStudent, upsertProfile, setError]
  );

  return (
    <HostShell active="classroom">
      <div className="f-classroom-page f-classroom-student-page">
        <div className="f-classroom-student-nav">
          <button
            type="button"
            className="f-outline-btn f-compact"
            onClick={() => navigate('/classroom')}
          >
            ← Back to classroom
          </button>
          {student ? (
            <PointControls
              student={student}
              onAdjust={handleAdjust}
              busy={busyKey === student.discordKey}
              steps={[1]}
            />
          ) : null}
        </div>

        {error ? <div className="f-error">{error}</div> : null}
        {loading ? <p className="f-muted">Loading student profile…</p> : null}

        {!loading && !student ? (
          <div className="f-classroom-student-missing">
            <p className="f-muted">Student not found.</p>
            <Link to="/classroom" className="f-outline-btn f-compact">
              Return to classroom
            </Link>
          </div>
        ) : null}

        {!loading && student ? (
          <ClassroomStudentDetail
            student={student}
            onAdjust={handleAdjust}
            busy={busyKey === student.discordKey}
            onChangeAvatar={() => setAvatarStudent(student)}
          />
        ) : null}

        <ClassroomAvatarPicker
          open={Boolean(avatarStudent)}
          student={avatarStudent}
          onClose={() => setAvatarStudent(null)}
          onSave={handleSaveAvatar}
          busy={avatarBusy}
        />
      </div>
    </HostShell>
  );
}
