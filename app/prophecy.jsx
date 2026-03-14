import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { getWallpaperByGodName, getRemoteGodIconByName, getLocalItemIcon } from './localIcons';
import buildsData from './data/builds.json';
import { playVOX } from '../lib/prophecyAudio';
import {
  PROPHECY_LEADERS,
  PROPHECY_UNITS,
  RARITY_ORDER,
  GOLD_PER_RARITY,
  getUnitsByRarity,
} from '../lib/prophecyData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GOLD = '#c8922a';
const GOLD_L = '#f0c060';
const MUTED = '#7a6a50';
const BG = '#0a0a12';
const BGC = '#1a1828';
const BGC2 = '#221f35';
const RARITY_COLORS = { common: '#889090', uncommon: '#3a9a30', rare: '#2060c0', epic: '#8020c0', legendary: '#c05010' };

function cloneObj(o) {
  return JSON.parse(JSON.stringify(o));
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}
function uid() {
  return '_' + Math.random().toString(36).slice(2);
}
function rng(lo, hi) {
  return lo + Math.random() * (hi - lo);
}

const MAX_FIELD = 5;
const HAND_SIZE_START = 4;
const MANA_START = 3;
const ITEM_CARD_DEFS = [
  { id: 'item_war_banner', internalName: 'WarBanner', fallbackName: 'War Banner', cardType: 'item', rarity: 'uncommon', cost: 2, atkBoost: 6, hpBoost: 12 },
  { id: 'item_aegis', internalName: 'AegisOfAcceleration', fallbackName: 'Aegis Charm', cardType: 'item', rarity: 'rare', cost: 3, atkBoost: 2, hpBoost: 26, heal: 18 },
  { id: 'item_bloodforge', internalName: 'BloodForge', fallbackName: 'Bloodforge Edge', cardType: 'item', rarity: 'epic', cost: 4, atkBoost: 10, hpBoost: 8 },
];
const TRAP_CARDS = [
  { id: 'trap_thorns', name: 'Thorns Trap', iconPath: 'HideOfNemean.webp', cardType: 'trap', rarity: 'uncommon', cost: 2, damage: 16 },
  { id: 'trap_ambush', name: 'Ambush Sigil', iconPath: 'BlinkRune.webp', cardType: 'trap', rarity: 'rare', cost: 3, damage: 24 },
];

function AttackAnimWrap({ children }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.22, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

export default function ProphecyPage({ onBack }) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const boardGap = screenW > 420 ? 10 : 8;
  const boardCardW = Math.max(58, Math.min(72, Math.floor(screenW * 0.19)));
  const boardCardH = Math.round(boardCardW * 0.74);
  const handCardW = Math.max(62, Math.min(76, Math.floor(screenW * 0.2)));
  const handArtW = Math.max(52, Math.min(62, Math.floor(screenW * 0.16)));
  const handArtH = Math.round(handArtW * 0.72);
  const useCompactHp = screenH <= 900;
  const [screen, setScreen] = useState('start'); // start | leader | battle | gameover
  const [selLeader, setSelLeader] = useState(null);
  const [G, setG] = useState(null);
  const [htpVisible, setHtpVisible] = useState(false);
  const [shopVisible, setShopVisible] = useState(false);
  const [attackAnimating, setAttackAnimating] = useState(null);
  const damageAnims = useRef({});
  const lowHpPlayedRef = useRef({ p: false, e: false });

  const itemCards = useMemo(() => {
    const rawItems = Array.isArray(buildsData?.items) ? buildsData.items : [];
    const byInternal = new Map(
      rawItems
        .filter((it) => it && typeof it === 'object')
        .map((it) => [String(it.internalName || ''), it])
    );

    const parsed = ITEM_CARD_DEFS.map((def) => {
      const found = byInternal.get(def.internalName);
      const iconRaw = found?.icon || `/icons/${def.internalName}.webp`;
      const iconPath = iconRaw.split('/').pop() || `${def.internalName}.webp`;
      return {
        ...def,
        name: found?.name || def.fallbackName,
        iconPath,
      };
    });

    if (__DEV__) {
      console.log(
        '[Prophecy] item parse checkpoint:',
        parsed.map((it) => ({ internalName: it.internalName, name: it.name, iconPath: it.iconPath }))
      );
    }
    return parsed;
  }, []);

  const generateRandomCard = useCallback((turn = 1) => {
    const maxR = Math.min(Math.floor(turn / 2), RARITY_ORDER.length - 1);
    const unitPool = getUnitsByRarity(maxR);
    const roll = Math.random();
    if (roll < 0.18) return cloneObj(itemCards[Math.floor(Math.random() * itemCards.length)]);
    if (roll < 0.3) return cloneObj(TRAP_CARDS[Math.floor(Math.random() * TRAP_CARDS.length)]);
    const unit = cloneObj(unitPool[Math.floor(Math.random() * unitPool.length)]);
    unit.cardType = 'unit';
    return unit;
  }, [itemCards]);

  const buildStarterDeck = useCallback(() => {
    const deck = [];
    for (let i = 0; i < 10; i++) deck.push(generateRandomCard(1));
    shuffle(deck);
    return deck;
  }, [generateRandomCard]);

  const newGame = useCallback((leader) => {
    const enemyList = PROPHECY_LEADERS.filter((l) => l.id !== leader.id);
    const el = enemyList[Math.floor(Math.random() * enemyList.length)];
    const pHp = leader.id === 'Athena' ? leader.hp + 30 : leader.hp;
    const deck = buildStarterDeck();
    const hand = [];
    for (let j = 0; j < HAND_SIZE_START; j++) {
      if (deck.length) {
        const c = deck.pop();
        c.iid = uid();
        if (!c.cardType) c.cardType = 'unit';
        hand.push(c);
      }
    }
    const ep = PROPHECY_UNITS.filter((u) => u.rarity === 'common');
    const firstEnemy = cloneObj(ep[Math.floor(Math.random() * ep.length)]);
    firstEnemy.rank = 1;
    firstEnemy.iid = 'e' + uid();
    firstEnemy.hp = firstEnemy.bHp;
    firstEnemy.maxHp = firstEnemy.bHp;
    firstEnemy.atk = firstEnemy.bAtk;

    setG({
      pl: leader,
      el: el,
      pHp,
      pMaxHp: pHp,
      eHp: el.hp,
      eMaxHp: el.hp,
      pField: [],
      eField: [firstEnemy],
      hand,
      deck,
      turn: 1,
      mana: MANA_START,
      maxMana: MANA_START,
      gold: 10,
      atker: null,
      attackedIds: {},
      log: ['Battle begins! Defeat ' + el.name + '!'],
      shop: [],
      heraBonus: 0,
      susanoCombo: 0,
      pGrave: [],
      eGrave: [],
      pTraps: [],
    });
    setScreen('battle');
    setTimeout(() => {
      playVOX(leader.name, 'intro');
      setTimeout(() => playVOX(el.name, 'intro'), 650);
    }, 200);
  }, [buildStarterDeck]);

  const drawCard = useCallback(() => {
    setG((prev) => {
      if (!prev || !prev.deck.length) return prev;
      let deck = [...prev.deck];
      if (deck.length < 4) {
        for (let i = 0; i < 4; i++) deck.push(generateRandomCard(prev.turn));
        shuffle(deck);
      }
      const c = deck.pop();
      c.iid = uid();
      if (!c.cardType) c.cardType = 'unit';
      return { ...prev, deck, hand: [...prev.hand, c] };
    });
  }, [generateRandomCard]);

  const addLog = useCallback((msg) => {
    setG((prev) => {
      if (!prev) return prev;
      const log = [...prev.log, msg];
      if (log.length > 7) log.shift();
      return { ...prev, log };
    });
  }, []);

  const spawnEnemy = useCallback(() => {
    setG((prev) => {
      if (!prev || prev.eField.length >= MAX_FIELD) return prev;
      const maxR = Math.min(Math.floor(prev.turn / 3), RARITY_ORDER.length - 2);
      const pool = getUnitsByRarity(maxR);
      const u = cloneObj(pool[Math.floor(Math.random() * pool.length)]);
      u.rank = 1;
      u.iid = 'e' + uid();
      u.hp = u.bHp;
      u.maxHp = u.bHp;
      u.atk = u.bAtk;
      return { ...prev, eField: [...prev.eField, u] };
    });
  }, []);

  const deploy = useCallback((iid) => {
    setG((prev) => {
      if (!prev) return prev;
      const idx = prev.hand.findIndex((c) => c.iid === iid);
      if (idx < 0) return prev;
      const c = prev.hand[idx];
      const isMageDiscount = prev.pl.id === 'Merlin' && c.cls === 'Mage';
      const cost = Math.max(1, (c.cost ?? 1) - (isMageDiscount ? 1 : 0));
      if (prev.mana < cost) return prev;
      const cardType = c.cardType || 'unit';
      const hand = prev.hand.filter((_, i) => i !== idx);

      if (cardType === 'item') {
        if (!prev.pField.length) {
          return { ...prev, log: [...prev.log, 'Play a god unit first to use items.'] };
        }
        const target = [...prev.pField].sort((a, b) => b.atk - a.atk)[0];
        const pField = prev.pField.map((u) => {
          if (u.iid !== target.iid) return u;
          const newMaxHp = u.maxHp + (c.hpBoost ?? 0);
          return {
            ...u,
            atk: u.atk + (c.atkBoost ?? 0),
            maxHp: newMaxHp,
            hp: Math.min(newMaxHp, u.hp + (c.heal ?? 0) + (c.hpBoost ?? 0)),
          };
        });
        return {
          ...prev,
          hand,
          mana: prev.mana - cost,
          pField,
          log: [...prev.log, `${c.name} boosted ${target.name}!`],
        };
      }

      if (cardType === 'trap') {
        return {
          ...prev,
          hand,
          mana: prev.mana - cost,
          pTraps: [...(prev.pTraps || []), { ...c, iid: uid() }],
          log: [...prev.log, `${c.name} set on your side.`],
        };
      }

      if (prev.pField.length >= MAX_FIELD) return prev;
      let hp = c.bHp,
        atk = c.bAtk;
      if (prev.pl.id === 'Odin') hp = Math.round(hp * 1.1);
      if (prev.pl.id === 'Bellona' && c.cls === 'Fighter') atk += 2;
      const u = cloneObj(c);
      u.iid = uid();
      u.rank = 1;
      u.hp = hp;
      u.maxHp = hp;
      u.atk = atk;
      return {
        ...prev,
        hand,
        mana: prev.mana - cost,
        pField: [...prev.pField, u],
      };
    });
  }, []);

  const selectAtk = useCallback((iid) => {
    setG((prev) => (prev ? { ...prev, atker: iid } : prev));
  }, []);

  const doAttack = useCallback((targetIid, isLeader) => {
    let attackerIid = null;
    let attackerName = null;
    let enemyLeaderName = null;
    let enemyLeaderHit = false;
    let enemyLeaderKilledByAttack = false;
    let enemyUnitKilled = null;
    let attackerDied = null;
    setG((prev) => {
      if (!prev) return prev;
      const att = prev.pField.find((u) => u.iid === prev.atker);
      if (!att) return { ...prev, atker: null };
      attackerIid = prev.atker;
      attackerName = att.name;
      enemyLeaderName = prev.el?.name;
      if (isLeader && prev.eField.length) {
        return { ...prev, log: [...prev.log, 'Defenders protect the enemy Leader. Clear the board first.'] };
      }
      let dmg = Math.round(att.atk * rng(0.85, 1.15));
      if (prev.pl.id === 'Thor' && att.cls === 'Fighter') dmg = Math.round(dmg * 1.2);
      if (prev.pl.id === 'Loki' && att.cls === 'Assassin' && Math.random() < 0.25) dmg = Math.round(dmg * 1.5);
      dmg += prev.heraBonus;
      const susanoCombo = prev.susanoCombo + 1;
      if (prev.pl.id === 'Susano') dmg += susanoCombo * 5;

      let eHp = prev.eHp;
      let eField = [...prev.eField];
      let pField = [...prev.pField];
      let gold = prev.gold;
      let log = [...prev.log];
      let pGrave = [...(prev.pGrave || [])];
      let eGrave = [...(prev.eGrave || [])];

      if (isLeader) {
        eHp = Math.max(0, prev.eHp - dmg);
        enemyLeaderHit = true;
        enemyLeaderKilledByAttack = eHp <= 0;
        log.push(att.name + ' hits ' + prev.el.name + ' for ' + dmg + '!');
      } else {
        const tgt = eField.find((u) => u.iid === targetIid);
        if (!tgt) return { ...prev, atker: null };
        const cdmg = Math.round(tgt.atk * rng(0.85, 1.15));
        const tgtNewHp = tgt.hp - dmg;
        eField = eField.map((u) => (u.iid === targetIid ? { ...u, hp: tgtNewHp } : u));
        const attIdx = pField.findIndex((u) => u.iid === prev.atker);
        if (attIdx >= 0) pField = pField.map((u, i) => (i === attIdx ? { ...u, hp: u.hp - cdmg } : u));
        log.push(att.name + '(' + dmg + ') vs ' + tgt.name + '(' + cdmg + ')');
        if (tgtNewHp <= 0) {
          eField = eField.filter((u) => u.iid !== tgt.iid);
          eGrave.push({ ...tgt, diedTurn: prev.turn });
          enemyUnitKilled = tgt.name;
          gold += GOLD_PER_RARITY[tgt.rarity] ?? 1;
          log.push(tgt.name + ' defeated! +' + (GOLD_PER_RARITY[tgt.rarity] ?? 1) + ' gold');
          if (prev.pl.id === 'Thanatos') log.push('Thanatos heals 8!');
        }
        const attNew = pField.find((u) => u.iid === prev.atker);
        if (attNew && attNew.hp <= 0) {
          pField = pField.filter((u) => u.iid !== prev.atker);
          attackerDied = attNew.name;
          pGrave.push({ ...attNew, diedTurn: prev.turn });
        }
      }

      const attackedIds = { ...prev.attackedIds, [prev.atker]: true };
      return {
        ...prev,
        eHp,
        eField,
        pField,
        gold,
        heraBonus: prev.heraBonus ?? 0,
        susanoCombo: prev.pl?.id === 'Susano' ? susanoCombo : 0,
        log,
        atker: null,
        attackedIds,
        pGrave,
        eGrave,
      };
    });
    if (attackerIid) {
      setAttackAnimating(attackerIid);
      setTimeout(() => setAttackAnimating(null), 450);
      if (attackerName) playVOX(attackerName, 'gruntAttack');
      if (enemyLeaderHit) playVOX(enemyLeaderName || '', 'grunthit');
      if (enemyUnitKilled) playVOX(attackerName || '', 'kill');
      if (attackerDied) playVOX(attackerDied, 'grunthit');
      if (enemyLeaderKilledByAttack) playVOX(attackerName || '', 'victory');
    }
  }, []);

  const endTurn = useCallback(() => {
    setG((prev) => {
      if (!prev) return prev;
      let eField = [...prev.eField];
      let eHp = prev.eHp;
      let eGrave = [...(prev.eGrave || [])];
      if (prev.pl.id === 'Zeus') {
        const d = 15;
        if (eField.length) {
          const t = eField[Math.floor(Math.random() * eField.length)];
          t.hp -= d;
          if (t.hp <= 0) {
            eField = eField.filter((u) => u.iid !== t.iid);
            eGrave.push({ ...t, diedTurn: prev.turn });
          }
        } else eHp = Math.max(0, eHp - d);
      }
      if (prev.pl.id === 'Poseidon' && prev.turn === 3) {
        eField = eField.map((u) => ({ ...u, hp: u.hp - 10 }));
        const dead = eField.filter((u) => u.hp <= 0);
        if (dead.length) eGrave = [...eGrave, ...dead.map((u) => ({ ...u, diedTurn: prev.turn }))];
        eField = eField.filter((u) => u.hp > 0);
        eHp = Math.max(0, eHp - 10);
      }
      return { ...prev, atker: null, eField, eHp, eGrave };
    });
    setTimeout(() => {
      setG((prev) => {
        if (!prev) return prev;
        let eField = [...prev.eField];
        let pField = [...prev.pField];
        let pHp = prev.pHp;
        let eHp = prev.eHp;
        let gold = prev.gold;
        let log = [...prev.log];
        let pTraps = [...(prev.pTraps || [])];
        let pGrave = [...(prev.pGrave || [])];
        let eGrave = [...(prev.eGrave || [])];
        eField.forEach((eu) => {
          const stillAlive = eField.find((x) => x.iid === eu.iid);
          if (!stillAlive) return;
          playVOX(eu.name, 'gruntAttack');
          if (pField.length) {
            const t = pField[Math.floor(Math.random() * pField.length)];
            const d = Math.round(eu.atk * rng(0.85, 1.15));
            t.hp -= d;
            if (t.hp <= 0) {
              pField = pField.filter((u) => u.iid !== t.iid);
              pGrave.push({ ...t, diedTurn: prev.turn });
              playVOX(eu.name, 'kill');
            }
            log.push(eu.name + ' hits ' + t.name + ' for ' + d);
            playVOX(t.name, 'grunthit');
          } else {
            if (pTraps.length) {
              const [trap, ...restTraps] = pTraps;
              pTraps = restTraps;
              const reflected = trap.damage ?? 16;
              const target = eField.find((u) => u.iid === eu.iid);
              if (target) {
                const nextHp = target.hp - reflected;
                eField = eField.map((u) => (u.iid === eu.iid ? { ...u, hp: nextHp } : u));
                log.push(`${trap.name} triggers! ${eu.name} takes ${reflected}.`);
                playVOX(eu.name, 'grunthit');
                if (nextHp <= 0) {
                  eField = eField.filter((u) => u.iid !== eu.iid);
                  eGrave.push({ ...target, hp: 0, diedTurn: prev.turn });
                  gold += GOLD_PER_RARITY[target.rarity] ?? 1;
                  playVOX(prev.pl.name, 'kill');
                }
              }
              return;
            }
            const d2 = Math.round(eu.atk * rng(0.85, 1.15));
            pHp = Math.max(0, pHp - d2);
            log.push(eu.name + ' hits you for ' + d2 + '!');
            playVOX(prev.pl.name, 'grunthit');
          }
        });
        if (!eField.length && !pField.length) {
          const ld = Math.round(prev.el.atk * rng(0.4, 0.7));
          pHp = Math.max(0, pHp - ld);
          log.push(prev.el.name + ' attacks you for ' + ld + '!');
          playVOX(prev.el.name, 'gruntAttack');
          playVOX(prev.pl.name, 'grunthit');
        }
        if (prev.turn % 2 === 0 && eField.length < MAX_FIELD) {
          const maxR = Math.min(Math.floor(prev.turn / 3), RARITY_ORDER.length - 2);
          const pool = getUnitsByRarity(maxR);
          const u = cloneObj(pool[Math.floor(Math.random() * pool.length)]);
          u.rank = 1;
          u.iid = 'e' + uid();
          u.hp = u.bHp;
          u.maxHp = u.bHp;
          u.atk = u.bAtk;
          eField.push(u);
          log.push(prev.el.name + ' summons a unit!');
        }
        const turn = prev.turn + 1;
        const maxMana = Math.min(10, turn + 2);
        const deck = [...prev.deck];
        let hand = [...prev.hand];
        if (deck.length) {
          const c = deck.pop();
          c.iid = uid();
          if (!c.cardType) c.cardType = 'unit';
          hand.push(c);
        } else {
          for (let i = 0; i < 4; i++) deck.push(generateRandomCard(turn));
          shuffle(deck);
          const c = deck.pop();
          c.iid = uid();
          if (!c.cardType) c.cardType = 'unit';
          hand.push(c);
        }
        return {
          ...prev,
          eField,
          pField,
          pHp,
          eHp,
          turn,
          maxMana,
          mana: maxMana,
          deck,
          hand,
          gold,
          log,
          attackedIds: {},
          susanoCombo: 0,
          pTraps,
          pGrave,
          eGrave,
        };
      });
    }, 400);
  }, [generateRandomCard]);

  useEffect(() => {
    if (!G || screen !== 'battle') return;
    if (G.eHp <= 0) setScreen('gameover');
    else if (G.pHp <= 0) setScreen('gameover');
  }, [G?.eHp, G?.pHp, screen, G]);

  const refreshShop = useCallback(() => {
    setG((prev) => {
      if (!prev) return prev;
      const maxR = Math.min(Math.floor(prev.turn / 2), RARITY_ORDER.length - 1);
      const avail = getUnitsByRarity(maxR).map((u) => ({ ...u, cardType: 'unit' }));
      const sh = [...avail, ...itemCards, ...TRAP_CARDS].sort(() => Math.random() - 0.5);
      return { ...prev, shop: sh.slice(0, 6) };
    });
  }, [itemCards]);

  const buyCard = useCallback((id) => {
    setG((prev) => {
      if (!prev) return prev;
      const u = prev.shop.find((x) => x.id === id);
      if (!u) return prev;
      const cost = u.cost * 2;
      if (prev.gold < cost) return prev;
      if ((u.cardType || 'unit') !== 'unit') {
        const c = cloneObj(u);
        c.iid = uid();
        return {
          ...prev,
          gold: prev.gold - cost,
          deck: [...prev.deck, c],
          log: [...prev.log, `${u.name} added to deck!`],
        };
      }
      const exist = prev.pField.find((x) => x.id === id && x.rank < 5);
      if (exist) {
        const pField = prev.pField.map((x) => {
          if (x.iid !== exist.iid) return x;
          const rank = x.rank + 1;
          const m = 1 + rank * 0.25;
          return {
            ...x,
            rank,
            maxHp: Math.round(u.bHp * m),
            hp: Math.min(x.hp, Math.round(u.bHp * m)),
            atk: Math.round(u.bAtk * m),
          };
        });
        return { ...prev, gold: prev.gold - cost, pField, log: [...prev.log, u.name + ' ranked up!'] };
      }
      const c = cloneObj(u);
      c.iid = uid();
      return {
        ...prev,
        gold: prev.gold - cost,
        deck: [...prev.deck, c],
        log: [...prev.log, u.name + ' added to deck!'],
      };
    });
    setShopVisible(false);
  }, []);

  useEffect(() => {
    if (!G || screen !== 'battle') return;
    if (G.eHp <= 0 || G.pHp <= 0) setScreen('gameover');
  }, [G?.eHp, G?.pHp, screen, G]);

  useEffect(() => {
    if (!G || screen !== 'battle') return;
    const pLow = G.pHp <= G.pMaxHp * 0.25;
    const eLow = G.eHp <= G.eMaxHp * 0.25;
    if (pLow && !lowHpPlayedRef.current.p) {
      playVOX(G.pl.name, 'health_low');
      lowHpPlayedRef.current.p = true;
    }
    if (eLow && !lowHpPlayedRef.current.e) {
      playVOX(G.el.name, 'health_low');
      lowHpPlayedRef.current.e = true;
    }
    if (!pLow) lowHpPlayedRef.current.p = false;
    if (!eLow) lowHpPlayedRef.current.e = false;
  }, [G?.pHp, G?.eHp, G?.pMaxHp, G?.eMaxHp, G?.pl?.name, G?.el?.name, screen, G]);

  useEffect(() => {
    if (!G || screen !== 'gameover') return;
    if (G.eHp <= 0) {
      playVOX(G.pl.name, 'victory');
      playVOX(G.el.name, 'defeat');
    } else if (G.pHp <= 0) {
      playVOX(G.el.name, 'victory');
      playVOX(G.pl.name, 'defeat');
    }
  }, [screen, G]);

  // Card art from Wallpapers (same source as data.jsx skins); fallback to god icon
  const getCardArtSource = (godName) => {
    const wallpaper = getWallpaperByGodName(godName);
    if (wallpaper?.uri) return wallpaper;
    const icon = getRemoteGodIconByName(godName);
    return icon?.uri ? { uri: icon.uri } : icon;
  };

  // Full card art visible in a smaller frame (contain = no crop)
  const renderCardArt = (godName, width, height, rounded = 4) => {
    const src = getCardArtSource(godName);
    if (!src || !src.uri) return <View style={[styles.cardArtPlaceholder, { width, height }]}><Text style={styles.godIconPlaceholderText}>?</Text></View>;
    return <Image source={src} style={{ width, height, borderRadius: rounded }} contentFit="contain" />;
  };

  // Leaders use god icons (circular), not card art
  const renderLeaderIcon = (godName, size = 44) => {
    const src = getRemoteGodIconByName(godName);
    if (!src || !src.uri) return <View style={[styles.godIconPlaceholder, { width: size, height: size }]}><Text style={styles.godIconPlaceholderText}>?</Text></View>;
    return <Image source={src} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  };

  const getCardTypeLabel = (card) => {
    const t = card?.cardType || 'unit';
    if (t === 'item') return 'ITEM';
    if (t === 'trap') return 'TRAP';
    return 'GOD';
  };

  const getCardTypeStyle = (card) => {
    const t = card?.cardType || 'unit';
    if (t === 'item') return styles.typeItem;
    if (t === 'trap') return styles.typeTrap;
    return styles.typeGod;
  };

  const renderHandCardFace = (card) => {
    const t = card?.cardType || 'unit';
    if (t === 'unit') return <View style={styles.handCardArt}>{renderCardArt(card.name, handArtW, handArtH, 4)}</View>;
    const iconSource = getLocalItemIcon(card.iconPath || 'Gem.webp');
    const icon = iconSource?.primary || iconSource;
    return (
      <View style={[styles.handCardArt, styles.specialCardFace, { width: handArtW, height: handArtH }]}>
        {icon ? <Image source={icon} style={styles.specialCardItemIcon} contentFit="cover" /> : <Text style={styles.specialCardIcon}>✦</Text>}
        <Text style={styles.specialCardName} numberOfLines={1}>{card.name}</Text>
      </View>
    );
  };

  // —— Start screen
  if (screen === 'start') {
    return (
      <View style={styles.container}>
        <View style={styles.startRoot}>
          <View style={styles.emblem}>
            <Text style={styles.emblemText}>⚡</Text>
          </View>
          <Text style={styles.titleMain}>Smite 2</Text>
          <Text style={styles.titleSub}>Prophecy</Text>
          <View style={styles.divider} />
          <Text style={styles.startDesc}>Command the gods. Build your army. Fulfill the Prophecy.</Text>
          <TouchableOpacity style={styles.btnGold} onPress={() => { setSelLeader(null); setScreen('leader'); }} activeOpacity={0.9}>
            <Text style={styles.btnGoldText}>Begin Battle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnOutline} onPress={() => setHtpVisible(true)} activeOpacity={0.9}>
            <Text style={styles.btnOutlineText}>How to Play</Text>
          </TouchableOpacity>
        </View>
        {onBack && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Modal visible={htpVisible} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setHtpVisible(false)}>
            <View style={styles.htpPanel}>
              <Text style={styles.htpTitle}>Smite 2 Prophecy — Quick Rules</Text>
              <ScrollView style={styles.htpScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.htpSection}>Summary</Text>
                <Text style={styles.htpBody}>1v1 turn-based battle. Each side has a Smite 2 Leader and units. Reduce the enemy Leader HP to 0 to win.</Text>
                <Text style={styles.htpSection}>Order of Play</Text>
                <Text style={styles.htpBody}>• Start of game: Both players begin with mana and an opening hand.</Text>
                <Text style={styles.htpBody}>• Start of turn: Draw 1 card and refill mana up to your max.</Text>
                <Text style={styles.htpBody}>• Main phase: Play units from hand (cost shown on card), then choose attacks.</Text>
                <Text style={styles.htpBody}>• Combat: Tap your unit, then tap an enemy unit or enemy Leader. Unit-vs-unit attacks deal return damage.</Text>
                <Text style={styles.htpBody}>• End turn: Enemy takes their turn. Repeat until a Leader is defeated.</Text>
                <Text style={styles.htpSection}>Deck Growth</Text>
                <Text style={styles.htpBody}>Defeat units to gain gold, then buy stronger units in the Shop to improve your deck.</Text>
              </ScrollView>
              <TouchableOpacity style={styles.btnOutline} onPress={() => setHtpVisible(false)}><Text style={styles.btnOutlineText}>Got It!</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // —— Leader select
  if (screen === 'leader') {
    const leaders = PROPHECY_LEADERS;
    return (
      <View style={styles.container}>
        <View style={styles.topbar}>
          <Text style={styles.topbarLogo}>Smite 2 Prophecy</Text>
          <TouchableOpacity onPress={() => setScreen('start')} style={styles.topbarBack}>
            <Text style={styles.topbarBackText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.leaderHeader}>
          <Text style={styles.leaderHeaderTitle}>Choose Your Leader</Text>
          <Text style={styles.leaderHeaderSub}>Your god commands the battlefield</Text>
        </View>
        {selLeader && (
          <View style={styles.leaderPreview}>
            <Text style={styles.leaderPreviewName}>{selLeader.name} — {selLeader.cls}</Text>
            <Text style={styles.leaderPreviewAbility}>{selLeader.ability}</Text>
          </View>
        )}
        <ScrollView style={styles.leaderScroll} contentContainerStyle={styles.leaderGrid} showsVerticalScrollIndicator={false}>
          {leaders.map((l) => (
            <TouchableOpacity
              key={l.id}
              style={[styles.leaderCard, selLeader?.id === l.id && styles.leaderCardSel]}
              onPress={() => setSelLeader(l)}
              activeOpacity={0.9}
            >
              <View style={styles.leaderCardIcon}>{renderLeaderIcon(l.name, 44)}</View>
              <Text style={styles.leaderCardName}>{l.name}</Text>
              <Text style={styles.leaderCardClass}>{l.cls}</Text>
              <View style={styles.leaderCardPills}>
                <View style={styles.pillHp}><Text style={styles.pillText}>❤ {l.hp}</Text></View>
                <View style={styles.pillAtk}><Text style={styles.pillText}>⚔ {l.atk}</Text></View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.confirmWrap}>
          <TouchableOpacity
            style={[styles.btnGold, styles.confirmBtn]}
            onPress={() => selLeader && newGame(selLeader)}
            disabled={!selLeader}
          >
            <Text style={styles.btnGoldText}>Confirm Leader</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // —— Battle
  if (screen === 'battle' && G) {
    const shopList = G.shop?.length ? G.shop : (() => {
      const maxR = Math.min(Math.floor(G.turn / 2), RARITY_ORDER.length - 1);
      const avail = getUnitsByRarity(maxR).map((u) => ({ ...u, cardType: 'unit' }));
      return [...avail, ...itemCards, ...TRAP_CARDS].sort(() => Math.random() - 0.5).slice(0, 6);
    })();

    return (
      <View style={styles.container}>
        <View style={styles.topbar}>
          <Text style={styles.topbarTurn}>Turn {G.turn}</Text>
          <View style={styles.resRow}>
            <View style={styles.rpill}><Text style={styles.rpillLabel}>💎</Text><Text style={styles.rpillVal}>{G.gold}</Text></View>
            <View style={styles.rpill}><Text style={styles.rpillLabel}>🔮</Text><Text style={styles.rpillVal}>{G.mana}/{G.maxMana}</Text></View>
            <View style={styles.rpill}><Text style={styles.rpillLabel}>☠</Text><Text style={styles.rpillVal}>{(G.pGrave?.length || 0)}/{(G.eGrave?.length || 0)}</Text></View>
          </View>
        </View>
        <View style={styles.battleBoard}>
          <Text style={styles.zoneLabel}>⚔ Enemy</Text>
          <View style={styles.leaderDisplay}>
            <View style={styles.leaderDisplayIcon}>{renderLeaderIcon(G.el.name, 32)}</View>
            <View style={styles.leaderDisplayInfo}>
              <Text style={styles.leaderDisplayName}>{G.el.name}</Text>
              <Text style={[styles.leaderHpSimple, G.eHp <= G.eMaxHp * 0.25 && styles.leaderHpCritical]}>❤ {Math.max(0, G.eHp)}/{G.eMaxHp}</Text>
            </View>
          </View>
          <View style={[styles.fieldRow, { gap: boardGap }]}>
            {[G.el, ...G.eField].map((u, i) => {
              const isLeader = i === 0;
              const tgt = isLeader ? 'leader' : u.iid;
              return (
                <TouchableOpacity
                  key={isLeader ? 'e-leader' : u.iid}
                  style={[styles.fieldUnit, { width: boardCardW + 6 }, styles.fieldUnitEnemy, G.atker && (isLeader ? styles.fieldUnitTgt : false)]}
                  onPress={() => G.atker && doAttack(tgt, isLeader)}
                  activeOpacity={0.9}
                >
                  <View style={[styles.rarityBar, { backgroundColor: RARITY_COLORS.common }]} />
                  <View style={styles.fieldUnitCardArt}>{renderCardArt(u.name, boardCardW, boardCardH, 4)}</View>
                  <Text style={styles.fieldUnitName} numberOfLines={1}>{u.name}</Text>
                  <View style={styles.fieldUnitStats}>
                    <Text style={styles.fieldUnitHp}>❤{isLeader ? G.eHp : u.hp}</Text>
                    <Text style={styles.fieldUnitAtk}>⚔{u.atk}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.synergyLine}>
            {`Synergy: ${G.pl.trait}`}
            {[...new Set(G.pField.map((u) => u.cls))]
              .map((cls) => `${cls} x${G.pField.filter((u) => u.cls === cls).length}`)
              .join(' • ')
              ? ` • ${[...new Set(G.pField.map((u) => u.cls))]
                  .map((cls) => `${cls} x${G.pField.filter((u) => u.cls === cls).length}`)
                  .join(' • ')}`
              : ''}
            {` • Traps ${(G.pTraps?.length || 0)}`}
          </Text>
          <View style={styles.logBox}>
            {G.log.slice(-2).map((line, i) => (
              <Text key={i} style={styles.logLine}>{line}</Text>
            ))}
          </View>
          <View style={[styles.fieldRow, { gap: boardGap, marginTop: 4 }]}>
            {G.pField.map((u) => {
              const isAttacking = attackAnimating === u.iid;
              const card = (
                <TouchableOpacity
                  key={u.iid}
                  style={[styles.fieldUnit, { width: boardCardW + 6 }, G.atker === u.iid && styles.fieldUnitSel]}
                  onPress={() => {
                    if (G.atker === u.iid) selectAtk(null);
                    else if (G.attackedIds[u.iid]) return;
                    else selectAtk(u.iid);
                  }}
                  activeOpacity={0.9}
                >
                  <View style={[styles.rarityBar, { backgroundColor: RARITY_COLORS[u.rarity] || RARITY_COLORS.common }]} />
                  <View style={styles.fieldUnitCardArt}>{renderCardArt(u.name, boardCardW, boardCardH, 4)}</View>
                  <Text style={styles.fieldUnitName} numberOfLines={1}>{u.name}</Text>
                  <View style={styles.fieldUnitStats}>
                    <Text style={styles.fieldUnitHp}>❤{u.hp}</Text>
                    <Text style={styles.fieldUnitAtk}>⚔{u.atk}</Text>
                  </View>
                  {u.rank > 1 && <View style={styles.rankBadge}><Text style={styles.rankBadgeText}>{u.rank}</Text></View>}
                </TouchableOpacity>
              );
              if (!isAttacking) return card;
              return <AttackAnimWrap key={u.iid}>{card}</AttackAnimWrap>;
            })}
          </View>
        </View>
        <View style={styles.playerLeaderBar}>
          <View style={styles.leaderDisplayIcon}>{renderLeaderIcon(G.pl.name, 34)}</View>
          <View style={styles.leaderDisplayInfo}>
            <Text style={styles.leaderDisplayName}>{G.pl.name}</Text>
            <Text style={[styles.leaderHpSimple, useCompactHp && styles.leaderHpSimpleCompact, G.pHp <= G.pMaxHp * 0.25 && styles.leaderHpCritical]}>❤ {Math.max(0, G.pHp)}/{G.pMaxHp}</Text>
          </View>
        </View>
        <View style={styles.handWrap}>
          <Text style={styles.handLabel}>Your Hand — Tap to Deploy</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.handScroll}>
            {G.hand.map((c) => {
              const can = G.mana >= c.cost;
              return (
                <TouchableOpacity
                  key={c.iid}
                  style={[styles.handCard, { width: handCardW }, can && styles.handCardPlay]}
                  onPress={() => can && deploy(c.iid)}
                  activeOpacity={0.9}
                >
                  <View style={[styles.rarityBar, { backgroundColor: RARITY_COLORS[c.rarity] || RARITY_COLORS.common }]} />
                  <View style={styles.handCardCost}><Text style={styles.handCardCostText}>{c.cost}</Text></View>
                  <View style={[styles.cardTypeBadge, getCardTypeStyle(c)]}>
                    <Text style={styles.cardTypeText}>{getCardTypeLabel(c)}</Text>
                  </View>
                  {renderHandCardFace(c)}
                  <Text style={styles.handCardName} numberOfLines={1}>{c.name}</Text>
                  <View style={styles.handCardStats}>
                    {c.cardType === 'unit' ? (
                      <>
                        <Text style={styles.fieldUnitHp}>❤{c.bHp}</Text>
                        <Text style={styles.fieldUnitAtk}>⚔{c.bAtk}</Text>
                      </>
                    ) : (
                      <Text style={styles.handEffectText} numberOfLines={1}>
                        {c.cardType === 'item' ? `+${c.atkBoost || 0} ATK` : `${c.damage || 0} DMG`}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        <View style={styles.actionBar}>
          <View style={styles.manaRow}>
            {Array.from({ length: Math.min(G.maxMana, 10) }).map((_, i) => (
              <View key={i} style={[styles.manaDot, i < G.mana && styles.manaDotFull]} />
            ))}
          </View>
          <TouchableOpacity style={styles.shopBtn} onPress={() => { refreshShop(); setShopVisible(true); }}>
            <Text style={styles.shopBtnText}>⚗ Shop</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.endBtn} onPress={endTurn}>
            <Text style={styles.endBtnText}>End Turn ›</Text>
          </TouchableOpacity>
        </View>
        <Modal visible={shopVisible} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShopVisible(false)}>
            <View style={styles.shopPanel}>
              <View style={styles.shopHandle} />
              <Text style={styles.shopPanelTitle}>⚗ Divine Market</Text>
              <View style={styles.shopGrid}>
                {shopList.map((u) => {
                  const cost = u.cost * 2;
                  const can = G.gold >= cost;
                  const shopItemIcon = getLocalItemIcon(u.iconPath || 'Gem.webp');
                  const shopItemIconSource = shopItemIcon?.primary || shopItemIcon;
                  return (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.shopUnit, !can && styles.shopUnitCant]}
                      onPress={() => can && buyCard(u.id)}
                      disabled={!can}
                    >
                      <View style={[styles.rarityBar, { backgroundColor: RARITY_COLORS[u.rarity] || RARITY_COLORS.common }]} />
                      <View style={styles.shopUnitArt}>
                        {(u.cardType || 'unit') === 'unit' ? (
                          renderCardArt(u.name, 44, 32, 4)
                        ) : shopItemIconSource ? (
                          <Image source={shopItemIconSource} style={styles.shopSpecialIcon} contentFit="cover" />
                        ) : (
                          <View style={styles.cardArtPlaceholder}><Text style={styles.godIconPlaceholderText}>?</Text></View>
                        )}
                      </View>
                      <Text style={styles.shopUnitName} numberOfLines={1}>{u.name}</Text>
                      <Text style={styles.shopUnitCost}>💎{cost}</Text>
                      {(u.cardType || 'unit') === 'unit' ? (
                        <Text style={styles.shopUnitStats}>❤{u.bHp} ⚔{u.bAtk}</Text>
                      ) : (
                        <Text style={styles.shopUnitStats}>
                          {u.cardType === 'item' ? `+${u.atkBoost || 0} ATK` : `${u.damage || 0} DMG`}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={styles.btnOutline} onPress={() => setShopVisible(false)}><Text style={styles.btnOutlineText}>Close Market</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // —— Game over
  if (screen === 'gameover' && G) {
    const won = G.eHp <= 0;
    return (
      <View style={styles.container}>
        <View style={styles.goRoot}>
          <Text style={styles.goIcon}>{won ? '🏆' : '💀'}</Text>
          <Text style={styles.goTitle}>{won ? 'VICTORY!' : 'DEFEATED'}</Text>
          <Text style={styles.goSub}>{won ? 'You defeated ' + G.el.name + '!' : G.el.name + ' was victorious.'}</Text>
          <Text style={styles.goStats}>Turn {G.turn} • {G.pField?.length ?? 0} units alive</Text>
          <TouchableOpacity style={styles.btnGold} onPress={() => newGame(G.pl)}><Text style={styles.btnGoldText}>Play Again</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnOutline} onPress={() => { setG(null); setScreen('start'); }}><Text style={styles.btnOutlineText}>Main Menu</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  startRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, paddingTop: 44 },
  emblem: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: GOLD, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emblemText: { fontSize: 28 },
  titleMain: { fontSize: 22, fontWeight: '700', color: GOLD_L, letterSpacing: 2 },
  titleSub: { fontSize: 9, letterSpacing: 4, color: MUTED, marginTop: 4, textTransform: 'uppercase' },
  divider: { width: 140, height: 1, backgroundColor: GOLD, marginVertical: 12, opacity: 0.6 },
  startDesc: { fontSize: 12, color: MUTED, textAlign: 'center', maxWidth: 280, lineHeight: 20, marginBottom: 18 },
  btnGold: { backgroundColor: GOLD, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 4, borderWidth: 1, borderColor: GOLD_L, minWidth: 200, alignItems: 'center', marginBottom: 8 },
  btnGoldText: { color: '#060606', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#7a5510', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 4, minWidth: 200, alignItems: 'center' },
  btnOutlineText: { color: GOLD, fontSize: 11, letterSpacing: 1 },
  backBtn: { position: 'absolute', top: 40, left: 10 },
  backBtnText: { color: MUTED, fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', alignItems: 'center' },
  htpPanel: { backgroundColor: BGC, width: '100%', maxWidth: 430, borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 14, paddingBottom: 20, maxHeight: '78%' },
  htpTitle: { fontSize: 14, color: GOLD, letterSpacing: 1, textAlign: 'center', marginBottom: 10 },
  htpSection: { fontSize: 12, color: GOLD_L, fontWeight: '600', marginTop: 8, marginBottom: 2 },
  htpScroll: { marginBottom: 12 },
  htpBody: { fontSize: 11, color: MUTED, lineHeight: 20, marginBottom: 8 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: 'rgba(10,10,18,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(200,146,42,0.2)' },
  topbarLogo: { fontSize: 12, color: GOLD, letterSpacing: 1 },
  topbarTurn: { fontSize: 10, color: MUTED },
  topbarBack: { borderWidth: 1, borderColor: 'rgba(200,146,42,0.3)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 3 },
  topbarBackText: { color: MUTED, fontSize: 9 },
  resRow: { flexDirection: 'row', gap: 6 },
  rpill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(200,146,42,0.1)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.2)', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 },
  rpillLabel: { fontSize: 10 },
  rpillVal: { color: GOLD_L, fontWeight: '600', fontSize: 10 },
  leaderHeader: { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  leaderHeaderTitle: { fontSize: 13, color: GOLD, letterSpacing: 1, textTransform: 'uppercase' },
  leaderHeaderSub: { fontSize: 10, color: MUTED, marginTop: 2 },
  leaderPreview: { marginHorizontal: 10, marginBottom: 6, padding: 8, backgroundColor: BGC2, borderWidth: 1, borderColor: 'rgba(200,146,42,0.3)', borderRadius: 6 },
  leaderPreviewName: { fontSize: 11, color: GOLD, marginBottom: 2 },
  leaderPreviewAbility: { fontSize: 10, color: MUTED, lineHeight: 16 },
  leaderScroll: { flex: 1 },
  leaderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10, paddingBottom: 12 },
  leaderCard: { width: (SCREEN_WIDTH - 10 * 2 - 6) / 2, backgroundColor: BGC, borderWidth: 1, borderColor: 'rgba(200,146,42,0.25)', borderRadius: 6, padding: 8, alignItems: 'center' },
  leaderCardSel: { borderColor: GOLD, backgroundColor: BGC2, shadowColor: GOLD, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  leaderCardIcon: { marginBottom: 4 },
  leaderCardName: { fontSize: 11, color: '#f0e8d0', fontWeight: '600' },
  leaderCardClass: { fontSize: 9, color: MUTED, marginTop: 1 },
  leaderCardPills: { flexDirection: 'row', gap: 4, marginTop: 4 },
  pillHp: { backgroundColor: 'rgba(192,48,48,0.2)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6 },
  pillAtk: { backgroundColor: 'rgba(200,146,42,0.2)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6 },
  pillText: { fontSize: 8 },
  confirmWrap: { padding: 10 },
  confirmBtn: { maxWidth: '100%' },
  battleBoard: { flex: 1, width: '100%', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 4 },
  zoneLabel: { fontSize: 8, letterSpacing: 1, color: MUTED, textAlign: 'center', marginTop: 4, marginBottom: 4 },
  leaderDisplay: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(18,17,30,0.85)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.2)', borderRadius: 5, padding: 5, width: '96%' },
  leaderDisplayIcon: {},
  leaderDisplayInfo: { flex: 1 },
  leaderDisplayName: { fontSize: 10, color: GOLD },
  leaderHpSimple: { fontSize: 10, color: '#f8caca', marginTop: 2, backgroundColor: 'rgba(192,48,48,0.2)', borderWidth: 1, borderColor: 'rgba(240,96,96,0.45)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 1, alignSelf: 'flex-start' },
  leaderHpSimpleCompact: { fontSize: 9 },
  leaderHpCritical: { color: '#ffd0d0', shadowColor: '#ff4d4d', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 6 },
  hpBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  hpBarBg: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  hpBarFill: { height: '100%', backgroundColor: '#e05050', borderRadius: 2 },
  hpBarText: { fontSize: 9, color: MUTED, minWidth: 36, textAlign: 'right' },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 68, paddingVertical: 4, justifyContent: 'center', alignSelf: 'center', width: '96%' },
  fieldUnit: { width: 58, backgroundColor: BGC, borderWidth: 1, borderColor: 'rgba(200,146,42,0.3)', borderRadius: 6, padding: 3, alignItems: 'center', position: 'relative' },
  fieldUnitEnemy: { borderColor: 'rgba(192,48,48,0.3)' },
  fieldUnitSel: { borderColor: GOLD, shadowColor: GOLD, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  fieldUnitTgt: { borderColor: '#c03030', shadowColor: '#c03030', shadowOpacity: 0.4, shadowRadius: 6 },
  rarityBar: { height: 2, borderRadius: 1, marginBottom: 2, width: '100%' },
  fieldUnitCardArt: { marginBottom: 2, overflow: 'hidden', borderRadius: 4 },
  fieldUnitName: { fontSize: 8, color: '#f0e8d0', maxWidth: 52, textAlign: 'center' },
  fieldUnitStats: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 2 },
  fieldUnitHp: { fontSize: 9, color: '#f06060' },
  fieldUnitAtk: { fontSize: 9, color: GOLD_L },
  rankBadge: { position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  rankBadgeText: { fontSize: 8, fontWeight: '700', color: '#060606' },
  traitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginVertical: 2, justifyContent: 'center' },
  traitPill: { backgroundColor: 'rgba(74,56,112,0.4)', borderWidth: 1, borderColor: 'rgba(122,95,170,0.3)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 },
  traitPillText: { fontSize: 8, color: '#b090e0' },
  synergyLine: { fontSize: 8, color: '#b090e0', marginVertical: 2, textAlign: 'center', paddingHorizontal: 4 },
  logBox: { width: '96%', backgroundColor: 'rgba(18,17,30,0.8)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.1)', borderRadius: 4, padding: 4, maxHeight: 36 },
  logLine: { fontSize: 8, color: MUTED, lineHeight: 14 },
  handWrap: { paddingVertical: 5, paddingHorizontal: 6, backgroundColor: 'rgba(10,10,18,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(200,146,42,0.15)' },
  handLabel: { fontSize: 8, letterSpacing: 1, color: MUTED, textAlign: 'center', marginBottom: 3 },
  handScroll: { flexDirection: 'row', gap: 8, paddingBottom: 4, paddingHorizontal: 6, justifyContent: 'flex-start', flexGrow: 1 },
  handCard: { width: 54, backgroundColor: BGC, borderWidth: 1, borderColor: 'rgba(200,146,42,0.4)', borderRadius: 6, padding: 3, alignItems: 'center', opacity: 0.7 },
  handCardPlay: { opacity: 1 },
  handCardCost: { position: 'absolute', top: -5, left: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#24479a', borderWidth: 1, borderColor: '#9fc5ff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, zIndex: 1 },
  handCardCostText: { fontSize: 9, fontWeight: '700', color: '#e5f2ff' },
  cardTypeBadge: { position: 'absolute', top: -5, right: -3, minWidth: 24, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, zIndex: 1 },
  typeGod: { backgroundColor: '#7a5a2a', borderWidth: 1, borderColor: '#f0c060' },
  typeItem: { backgroundColor: '#2f5a8b', borderWidth: 1, borderColor: '#7dc2ff' },
  typeTrap: { backgroundColor: '#5a2f7a', borderWidth: 1, borderColor: '#c790ff' },
  cardTypeText: { fontSize: 7, fontWeight: '700', color: '#f8f4ec' },
  handCardArt: { marginTop: 2, marginBottom: 2, overflow: 'hidden', borderRadius: 4 },
  specialCardFace: { width: 48, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(26,24,40,0.95)', borderWidth: 1, borderColor: 'rgba(200,146,42,0.35)' },
  specialCardItemIcon: { width: 18, height: 18, borderRadius: 3, marginBottom: 1 },
  specialCardIcon: { fontSize: 13, color: GOLD_L, marginBottom: 1 },
  specialCardName: { fontSize: 7, color: MUTED, textAlign: 'center', paddingHorizontal: 2 },
  handCardName: { fontSize: 8, color: MUTED, maxWidth: 52, textAlign: 'center' },
  handCardStats: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 2 },
  handEffectText: { fontSize: 8, color: '#b8c6ff', width: '100%', textAlign: 'center' },
  actionBar: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 5, backgroundColor: 'rgba(10,10,18,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(200,146,42,0.1)' },
  manaRow: { flexDirection: 'row', gap: 2 },
  manaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(30,70,200,0.2)', borderWidth: 1, borderColor: 'rgba(30,70,200,0.4)' },
  manaDotFull: { backgroundColor: '#4488ff', borderColor: '#88aaff' },
  shopBtn: { backgroundColor: 'rgba(74,56,112,0.6)', borderWidth: 1, borderColor: 'rgba(122,95,170,0.4)', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4 },
  shopBtnText: { color: '#b090e0', fontSize: 10 },
  endBtn: { flex: 1, backgroundColor: GOLD, borderWidth: 1, borderColor: GOLD_L, paddingVertical: 6, borderRadius: 4, alignItems: 'center' },
  endBtnText: { color: '#060606', fontSize: 11, fontWeight: '700' },
  playerLeaderBar: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4, backgroundColor: 'rgba(18,17,30,0.85)', borderTopWidth: 1, borderTopColor: 'rgba(200,146,42,0.15)' },
  godIconPlaceholder: { backgroundColor: BGC2, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  godIconPlaceholderText: { color: MUTED, fontSize: 16 },
  cardArtPlaceholder: { backgroundColor: BGC2, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  shopPanel: { backgroundColor: BGC, width: '100%', maxWidth: 430, borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 12, paddingBottom: 18 },
  shopHandle: { width: 28, height: 3, backgroundColor: 'rgba(200,146,42,0.3)', borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  shopPanelTitle: { fontSize: 13, color: GOLD, letterSpacing: 1, textAlign: 'center', marginBottom: 10 },
  shopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  shopUnit: { width: '31%', backgroundColor: BGC, borderWidth: 1, borderColor: 'rgba(200,146,42,0.2)', borderRadius: 5, padding: 5, alignItems: 'center' },
  shopUnitCant: { opacity: 0.5 },
  shopUnitArt: { marginBottom: 2, overflow: 'hidden', borderRadius: 4 },
  shopSpecialIcon: { width: 28, height: 28, borderRadius: 4 },
  shopUnitName: { fontSize: 7, color: MUTED, marginBottom: 2 },
  shopUnitCost: { fontSize: 8, color: '#88aaff', marginBottom: 1 },
  shopUnitStats: { fontSize: 7, color: MUTED },
  goRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  goIcon: { fontSize: 44 },
  goTitle: { fontSize: 20, fontWeight: '700', color: GOLD_L, letterSpacing: 1 },
  goSub: { fontSize: 12, color: MUTED },
  goStats: { fontSize: 11, color: MUTED },
});
