import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useGuideContributorAccess } from '../hooks/useGuideContributorAccess';
import { fetchCommunityGuides, insertCommunityGuide, updateCommunityGuide } from './guidesSupabase';
import CommunityGuideCard from './guides/CommunityGuideCard';
import GuideFilterBar from './guides/GuideFilterBar';
import { flattenBuildsGods } from './normalizeBuildsGod';

const ROLE_OPTIONS = ['Solo', 'Jungle', 'Mid', 'Support', 'Carry'];

function mapDbRowToCard(g) {
  return {
    ...g,
    type: g.guide_type,
    authorName: g.author_display_name || g.username,
    godName: g.god_name,
    god_name: g.god_name,
  };
}

function applyFilters(rows, { typeFilter, roleFilter, patchFilter }) {
  return rows.filter((g) => {
    if (typeFilter !== 'all' && g.guide_type !== typeFilter) return false;
    if (roleFilter !== 'all' && (g.role_lane || '') !== roleFilter) return false;
    if (patchFilter !== 'all' && (g.patch || '') !== patchFilter) return false;
    return true;
  });
}

export default function GuidesPage({ currentUsername = '', onOpenBuildsContributors }) {
  const { isContributor, loading: contributorLoading } = useGuideContributorAccess(currentUsername);

  const [hubTab, setHubTab] = useState('featured'); // 'featured' | 'community'
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [typeFilter, setTypeFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [patchFilter, setPatchFilter] = useState('all');

  const [allGods, setAllGods] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState('god'); // god | role
  const [godQuery, setGodQuery] = useState('');
  const [pickedGod, setPickedGod] = useState(null);
  const [roleLane, setRoleLane] = useState('Solo');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [body, setBody] = useState('');
  const [patch, setPatch] = useState('');
  const [saving, setSaving] = useState(false);

  const [detailGuide, setDetailGuide] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editPatch, setEditPatch] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try {
      const data = require('../app/data/builds.json');
      const gods = flattenBuildsGods(data.gods || []);
      if (!cancelled) {
        setAllGods(
          [...gods].sort((a, b) =>
            String(a.name || a.GodName || a.title || '').localeCompare(
              String(b.name || b.GodName || b.title || ''),
              undefined,
              { sensitivity: 'base' }
            )
          )
        );
      }
    } catch (_) {
      if (!cancelled) setAllGods([]);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const featured = hubTab === 'featured';
      const rows = await fetchCommunityGuides({ featured, limit: 200 });
      setRawRows(rows);
    } catch (e) {
      setLoadError(e?.message || 'Could not load guides');
      setRawRows([]);
    } finally {
      setLoading(false);
    }
  }, [hubTab]);

  useEffect(() => {
    reload();
  }, [reload]);

  const patchOptions = useMemo(() => {
    const s = new Set();
    rawRows.forEach((g) => {
      if (g.patch && String(g.patch).trim()) s.add(String(g.patch).trim());
    });
    return Array.from(s).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [rawRows]);

  const filtered = useMemo(
    () => applyFilters(rawRows, { typeFilter, roleFilter, patchFilter }),
    [rawRows, typeFilter, roleFilter, patchFilter]
  );

  const godChoices = useMemo(() => {
    const q = godQuery.trim().toLowerCase();
    if (!q) return allGods.slice(0, 24);
    return allGods
      .filter((god) => {
        const name = String(god.name || god.GodName || god.title || '').toLowerCase();
        const internal = String(god.internalName || god.GodName || '').toLowerCase();
        return name.includes(q) || internal.includes(q);
      })
      .slice(0, 24);
  }, [allGods, godQuery]);

  const resetCreateForm = () => {
    setCreateType('god');
    setGodQuery('');
    setPickedGod(null);
    setRoleLane('Solo');
    setTitle('');
    setSubtitle('');
    setBody('');
    setPatch('');
  };

  const openDetail = (row) => {
    setDetailGuide(row);
    setEditTitle(row.title || '');
    setEditSubtitle(row.subtitle || '');
    setEditBody(row.body || '');
    setEditPatch(row.patch || '');
  };

  const ownerUsername = String(detailGuide?.username || '').trim();
  const isOwner = ownerUsername && ownerUsername === String(currentUsername || '').trim();

  const submitCreate = async () => {
    const user = String(currentUsername || '').trim();
    if (!user) {
      Alert.alert('Sign in', 'Set your username from Profile so guides can be saved.');
      return;
    }
    const t = title.trim();
    if (!t) {
      Alert.alert('Title required', 'Give your guide a title.');
      return;
    }
    if (!body.trim()) {
      Alert.alert('Body required', 'Write something for the guide body.');
      return;
    }
    if (createType === 'god' && !pickedGod) {
      Alert.alert('Pick a god', 'Select a god for this guide.');
      return;
    }
    setSaving(true);
    try {
      const inserted = await insertCommunityGuide(user, {
        guide_type: createType,
        title: t,
        subtitle: subtitle.trim() || null,
        body: body.trim(),
        god_name:
          createType === 'god'
            ? String(pickedGod.name || pickedGod.GodName || pickedGod.title || '').trim() || null
            : null,
        god_internal_name:
          createType === 'god' ? String(pickedGod.internalName || pickedGod.GodName || '').trim() || null : null,
        role_lane: createType === 'role' ? roleLane : null,
        patch: patch.trim() || null,
      });
      setCreateOpen(false);
      resetCreateForm();
      await reload();
      const dest = inserted?.author_is_featured ? 'Featured' : 'Community';
      Alert.alert('Saved', `Your guide was posted under ${dest}.`);
    } catch (e) {
      Alert.alert('Save failed', e?.message || 'Could not save guide. Run supabase/community_guides.sql in Supabase.');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!detailGuide?.id || !isOwner) return;
    const user = String(currentUsername || '').trim();
    if (!user) return;
    setEditSaving(true);
    try {
      await updateCommunityGuide(detailGuide.id, user, {
        title: editTitle.trim(),
        subtitle: editSubtitle.trim() || null,
        body: editBody.trim(),
        patch: editPatch.trim() || null,
        guide_type: detailGuide.guide_type,
        god_name: detailGuide.god_name,
        god_internal_name: detailGuide.god_internal_name,
        role_lane: detailGuide.role_lane,
        author_display_name: detailGuide.author_display_name,
      });
      setDetailGuide(null);
      await reload();
      Alert.alert('Updated', 'Guide saved.');
    } catch (e) {
      Alert.alert('Update failed', e?.message || 'Could not update.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Guides</Text>
      <Text style={styles.lead}>
        God guides and role guides from players. Contributors (approved certification or featured creator) are listed
        under Featured; everyone else under Community.
      </Text>

      {!contributorLoading && !isContributor && hubTab === 'featured' ? (
        <Text style={styles.hint}>
          Want to be Featured? Request contributor access from Builds → Contributors.{' '}
          {onOpenBuildsContributors ? (
            <Text style={styles.link} onPress={onOpenBuildsContributors}>
              Open Contributors
            </Text>
          ) : null}
        </Text>
      ) : null}

      <View style={styles.hubTabs}>
        <TouchableOpacity
          style={[styles.hubTab, hubTab === 'featured' && styles.hubTabActive]}
          onPress={() => setHubTab('featured')}
        >
          <Text style={[styles.hubTabText, hubTab === 'featured' && styles.hubTabTextActive]}>Featured</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.hubTab, hubTab === 'community' && styles.hubTabActive]}
          onPress={() => setHubTab('community')}
        >
          <Text style={[styles.hubTabText, hubTab === 'community' && styles.hubTabTextActive]}>Community</Text>
        </TouchableOpacity>
      </View>

      <GuideFilterBar
        typeFilter={typeFilter}
        roleFilter={roleFilter}
        patchFilter={patchFilter}
        patchOptions={patchOptions}
        onTypeFilter={setTypeFilter}
        onRoleFilter={setRoleFilter}
        onPatchFilter={setPatchFilter}
      />

      <TouchableOpacity style={styles.createBtn} onPress={() => setCreateOpen(true)}>
        <Text style={styles.createBtnText}>Create guide</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color="#1e90ff" style={{ marginTop: 24 }} />
      ) : loadError ? (
        <Text style={styles.error}>{loadError}</Text>
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>No guides match these filters yet.</Text>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {filtered.map((g) => {
            const card = mapDbRowToCard(g);
            return (
              <View key={String(g.id)} style={styles.cardWrap}>
                <CommunityGuideCard guide={card} onPress={() => openDetail(g)} />
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Create */}
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => !saving && setCreateOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New guide</Text>

            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeChip, createType === 'god' && styles.typeChipOn]}
                onPress={() => setCreateType('god')}
              >
                <Text style={[styles.typeChipText, createType === 'god' && styles.typeChipTextOn]}>God</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeChip, createType === 'role' && styles.typeChipOn]}
                onPress={() => setCreateType('role')}
              >
                <Text style={[styles.typeChipText, createType === 'role' && styles.typeChipTextOn]}>Role</Text>
              </TouchableOpacity>
            </View>

            {createType === 'god' ? (
              <>
                <Text style={styles.label}>Search god</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Type a god name…"
                  placeholderTextColor="#64748b"
                  value={godQuery}
                  onChangeText={(t) => {
                    setGodQuery(t);
                    setPickedGod(null);
                  }}
                />
                <ScrollView style={styles.godPickList} nestedScrollEnabled>
                  {godChoices.map((god) => {
                    const label = String(god.name || god.GodName || god.title || god.internalName || '?');
                    const picked =
                      pickedGod &&
                      String(pickedGod.internalName || pickedGod.GodName) === String(god.internalName || god.GodName);
                    return (
                      <TouchableOpacity
                        key={String(god.internalName || god.GodName || label)}
                        style={[styles.godRow, picked && styles.godRowOn]}
                        onPress={() => setPickedGod(god)}
                      >
                        <Text style={styles.godRowText}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            ) : (
              <>
                <Text style={styles.label}>Role</Text>
                <View style={styles.roleRow}>
                  {ROLE_OPTIONS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleChip, roleLane === r && styles.roleChipOn]}
                      onPress={() => setRoleLane(r)}
                    >
                      <Text style={[styles.roleChipText, roleLane === r && styles.roleChipTextOn]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Guide title"
              placeholderTextColor="#64748b"
              value={title}
              onChangeText={setTitle}
            />
            <Text style={styles.label}>Subtitle (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="One-liner"
              placeholderTextColor="#64748b"
              value={subtitle}
              onChangeText={setSubtitle}
            />
            <Text style={styles.label}>Patch (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. OB 2.6"
              placeholderTextColor="#64748b"
              value={patch}
              onChangeText={setPatch}
            />
            <Text style={styles.label}>Body</Text>
            <TextInput
              style={[styles.input, styles.bodyInput]}
              placeholder="Tips, ability order, macro…"
              placeholderTextColor="#64748b"
              value={body}
              onChangeText={setBody}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => !saving && setCreateOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} disabled={saving} onPress={submitCreate}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Publish</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Detail + edit */}
      <Modal visible={!!detailGuide} transparent animationType="fade" onRequestClose={() => setDetailGuide(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => !editSaving && setDetailGuide(null)}>
          <View style={styles.modalCard}>
            {detailGuide ? (
              <>
                <Text style={styles.modalTitle}>{detailGuide.title}</Text>
                <Text style={styles.meta}>
                  {detailGuide.author_display_name || detailGuide.username}
                  {detailGuide.patch ? ` • ${detailGuide.patch}` : ''} • {detailGuide.guide_type}
                  {detailGuide.role_lane ? ` • ${detailGuide.role_lane}` : ''}
                </Text>
                {isOwner ? (
                  <>
                    <Text style={styles.label}>Title</Text>
                    <TextInput style={styles.input} value={editTitle} onChangeText={setEditTitle} />
                    <Text style={styles.label}>Subtitle</Text>
                    <TextInput style={styles.input} value={editSubtitle} onChangeText={setEditSubtitle} />
                    <Text style={styles.label}>Patch</Text>
                    <TextInput style={styles.input} value={editPatch} onChangeText={setEditPatch} />
                    <Text style={styles.label}>Body</Text>
                    <TextInput
                      style={[styles.input, styles.bodyInput]}
                      value={editBody}
                      onChangeText={setEditBody}
                      multiline
                    />
                    <TouchableOpacity style={styles.saveBtn} disabled={editSaving} onPress={submitEdit}>
                      {editSaving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.saveBtnText}>Save changes</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <ScrollView style={{ maxHeight: 420 }} nestedScrollEnabled>
                    <Text style={styles.bodyRead}>{detailGuide.body || ''}</Text>
                  </ScrollView>
                )}
                <TouchableOpacity style={styles.closeLink} onPress={() => setDetailGuide(null)}>
                  <Text style={styles.closeLinkText}>Close</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 24 },
  heading: { color: '#f8fafc', fontSize: 26, fontWeight: '800' },
  lead: { color: '#94a3b8', fontSize: 14, marginTop: 8, lineHeight: 20 },
  hint: { color: '#cbd5e1', fontSize: 13, marginTop: 10 },
  link: { color: '#38bdf8', fontWeight: '700' },
  hubTabs: { flexDirection: 'row', gap: 10, marginTop: 16 },
  hubTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0b1226',
    alignItems: 'center',
  },
  hubTabActive: { backgroundColor: '#1e90ff', borderColor: '#1e90ff' },
  hubTabText: { color: '#94a3b8', fontWeight: '700' },
  hubTabTextActive: { color: '#fff' },
  createBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createBtnText: { color: '#e2e8f0', fontWeight: '800' },
  list: { marginTop: 12, flex: 1 },
  listContent: { paddingBottom: 40, gap: 0 },
  cardWrap: { marginBottom: 12 },
  error: { color: '#f87171', marginTop: 16 },
  empty: { color: '#64748b', marginTop: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    padding: 16,
    maxHeight: '90%',
  },
  modalTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  meta: { color: '#64748b', fontSize: 12, marginBottom: 12 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: '#0b1226',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e2e8f0',
  },
  bodyInput: { minHeight: 140, textAlignVertical: 'top' },
  bodyRead: { color: '#e2e8f0', fontSize: 15, lineHeight: 22 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0b1226',
  },
  typeChipOn: { backgroundColor: '#1e90ff', borderColor: '#1e90ff' },
  typeChipText: { color: '#94a3b8', fontWeight: '700' },
  typeChipTextOn: { color: '#fff' },
  godPickList: { maxHeight: 160, marginBottom: 8 },
  godRow: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4, backgroundColor: '#0b1226' },
  godRowOn: { borderWidth: 1, borderColor: '#1e90ff' },
  godRowText: { color: '#e2e8f0' },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0b1226',
  },
  roleChipOn: { borderColor: '#1e90ff', backgroundColor: '#111827' },
  roleChipText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  roleChipTextOn: { color: '#e2e8f0' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  cancelBtnText: { color: '#94a3b8', fontWeight: '700' },
  saveBtn: {
    backgroundColor: '#1e90ff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 110,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '800' },
  closeLink: { marginTop: 12, alignSelf: 'center' },
  closeLinkText: { color: '#38bdf8', fontWeight: '700' },
});
