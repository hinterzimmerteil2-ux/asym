'use client';

import { useEffect, useRef, useState, useCallback, useReducer } from 'react';
import Link from 'next/link';
import { createGameConnection } from '../lib/socket';
import {
  getStoredToken,
  getStoredDisplayName,
  loginAsGuest,
  redirectToOAuthLogin,
  clearSession,
  updateDisplayName,
} from '../lib/session';
import GameScene from '../components/GameScene';
import { play as playSfx, trackSteps, unlockAudio } from '../lib/sfx';
import SkillIcon from '../components/SkillIcon';
import HelpPanel from '../components/HelpPanel';
import StatusColumn from '../components/StatusColumn';
import RhythmBar from '../components/RhythmBar';
import SelfDamageBar from '../components/SelfDamageBar';
import EventLayer from '../components/EventLayer';
import CommunityMaps from '../components/CommunityMaps';
import LmsIntro from '../components/LmsIntro';
import { matches as keyMatches, getKey, keyLabel } from '../lib/keybinds';
import TouchControls from '../components/TouchControls';
import { createModeKey } from '../lib/modeKey';
import { KEYWORDS } from '../lib/keywords';
import { ITEMS, COLORS, SLOT_LABELS } from '../lib/cosmetics';
import { loadDesgracias, saveDesgracias, priceOf, FREE_ITEMS, emptyQ, addQ, normQ, spendQ, awardToQ, formatQ } from '../lib/desgracias';

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function LiveScene({ store, replay, waiting, ...props }) {
  const [, bump] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    store.subs.add(bump);
    return () => { store.subs.delete(bump); };
  }, [store]);
  const frame = replay ? replay.frames[replay.i] : null;
  const own = waiting ? store.entities[props.myPlayerId] : null;
  if (waiting) return <GameScene {...props} entities={own ? { [props.myPlayerId]: { ...own, x: 0, y: 0, z: 0 } } : {}} ghosts={{}} revealedIds={undefined} />;
  return <GameScene {...props} entities={frame ? frame.entities : store.entities} ghosts={frame ? frame.ghosts : store.ghosts} revealedIds={frame ? undefined : store.revealed} />;
}

function KeywordChip({ id }) {
  const k = KEYWORDS[id];
  if (!k) return null;
  return (
    <span
      title={`${k.label}: ${k.description}`}
      style={{
        fontSize: 9,
        fontWeight: 600,
        padding: '1px 5px',
        borderRadius: 4,
        border: `1px solid ${k.color}`,
        color: k.color,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
      }}
    >
      {k.label}
    </span>
  );
}

function fmtHp(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) < 1e6) return String(Math.round(v));
  const [m, e] = v.toExponential(1).split('e+');
  const sup = String(e).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('');
  return `${m}×10${sup}`;
}

export default function LobbyPage() {
  const connRef = useRef(null);
  const isAsymRoleRef = useRef(false);
  const chatEndRef = useRef(null);
  const [status, setStatus] = useState('checking_session');
  const [sessionToken, setSessionToken] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [guestNameInput, setGuestNameInput] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomList, setRoomList] = useState([]);
  const [players, setPlayers] = useState([]);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [isAsymRole, setIsAsymRole] = useState(false);
  const [phase, setPhase] = useState('lobby');
  const [compact, setCompact] = useState(false);
  const [touch, setTouch] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [specIndex, setSpecIndex] = useState(0);
  const [shiftLock, setShiftLock] = useState(false);
  const shiftKeyRef = useRef(null);
  if (!shiftKeyRef.current) shiftKeyRef.current = createModeKey('shiftMode', (v) => setShiftLock(v));
  useEffect(() => { shiftKeyRef.current.sync(shiftLock); }, [shiftLock]);
  const [warn, setWarn] = useState(false);
  const [hitboxCfg, setHitboxCfg] = useState({ half: 0.36, height: 1.8, interact: 1.2 });
  const specRef = useRef({ on: false });
  const [panelOpen, setPanelOpen] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => {
    if (status !== 'in_room') return undefined;
    const muted = () => { try { return localStorage.getItem('asym_no_warn') === '1'; } catch { return false; } };
    const onBefore = (e) => { if (muted()) return; e.preventDefault(); e.returnValue = ''; };
    const onKey = (e) => {
      const tag = e.target && e.target.tagName;
      if (!e.ctrlKey || tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      if ((e.code === 'KeyD' || e.code === 'KeyS') && !muted()) setWarn(true);
    };
    const onFs = () => {
      try {
        if (document.fullscreenElement) navigator.keyboard?.lock?.(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyG', 'ControlLeft', 'ControlRight']);
        else navigator.keyboard?.unlock?.();
      } catch {}
    };
    window.addEventListener('beforeunload', onBefore);
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      window.removeEventListener('beforeunload', onBefore);
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, [status]);
  useEffect(() => {
    const block = (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
    };
    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    return () => { document.removeEventListener('contextmenu', block); document.removeEventListener('dragstart', block); };
  }, []);
  useEffect(() => {
    const mc = window.matchMedia('(pointer: coarse), (max-width: 760px)');
    const mt = window.matchMedia('(pointer: coarse)');
    const mp = window.matchMedia('(orientation: portrait)');
    const upd = () => { setCompact(mc.matches); setTouch(mt.matches); setPortrait(mp.matches); };
    upd();
    mc.addEventListener('change', upd);
    mt.addEventListener('change', upd);
    mp.addEventListener('change', upd);
    return () => { mc.removeEventListener('change', upd); mt.removeEventListener('change', upd); mp.removeEventListener('change', upd); };
  }, []);
  useEffect(() => { setPanelOpen(null); setChatOpen(false); setSpecIndex(0); }, [phase]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const sceneStore = useRef({ entities: {}, ghosts: {}, revealed: [], subs: new Set() }).current;
  const [entityMeta, setEntityMeta] = useState({});
  const [myGhost, setMyGhost] = useState(null);
  const [ping, setPing] = useState(null);
  const [lobbyPlatforms, setLobbyPlatforms] = useState([]);
  const [cosmetics, setCosmetics] = useState({});
  const [cosmeticsOpen, setCosmeticsOpen] = useState(false);
  const [desgracias, setDesgracias] = useState({ balance: emptyQ(), owned: FREE_ITEMS });
  const [lastAward, setLastAward] = useState(null);
  const [tutorial, setTutorial] = useState({ launching: false, active: false, minimized: false, flags: {} });
  const tutStartRef = useRef(null);
  const tutSentRef = useRef({ role: false, start: false });
  const pingSentRef = useRef(0);
  const frameBuf = useRef([]);
  const lastSnapRef = useRef(null);
  const [replay, setReplay] = useState(null);
  const [selfDamageObjects, setSelfDamageObjects] = useState({});
  const [sdTypes, setSdTypes] = useState({});
  const [zones, setZones] = useState([]);
  const [curatorHp, setCuratorHp] = useState(null);
  const [effects, setEffects] = useState([]);
  const [stunnedIds, setStunnedIds] = useState([]);
  const [ragdollIds, setRagdollIds] = useState([]);
  const [channelNow, setChannelNow] = useState(0);
  const channelRef = useRef(null);
  const sdRef = useRef(null);
  const pressMinigameRef = useRef(() => {});
  const pressDirRef = useRef(() => {});
  const entitiesRef = useRef({});
  const effectCounterRef = useRef(0);
  const [collisionObjects, setCollisionObjects] = useState([]);
  const [matchHalf, setMatchHalf] = useState(60);
  const [roles, setRoles] = useState([]);
  const [myRole, setMyRole] = useState(null);
  const [kitPref, setKitPref] = useState({ on: false, kit: 'none' });
  const kitSentRef = useRef(false);
  const [platforms, setPlatforms] = useState([]);
  const [patients, setPatients] = useState({});
  const [timeRemainingMs, setTimeRemainingMs] = useState(null);
  const [lastActionFeedback, setLastActionFeedback] = useState(null);
  const [gameOverInfo, setGameOverInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hostId, setHostId] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [cardCatalog, setCardCatalog] = useState([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [spawnMs, setSpawnMs] = useState(0);
  const [mapEvents, setMapEvents] = useState([]);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [lmsUntil, setLmsUntil] = useState(0);
  const [lmsInfo, setLmsInfo] = useState(null);
  const [hiddenPlatforms, setHiddenPlatforms] = useState([]);
  const [plankHp, setPlankHp] = useState({});
  const [communityName, setCommunityName] = useState({});
  const myPosRef = useRef(null);
  const [hitboxes, setHitboxes] = useState({ on: false, opacity: 0.8 });
  const [maps, setMaps] = useState([]);
  const [mutation, setMutation] = useState('none');
  const [isDefaultRoom, setIsDefaultRoom] = useState(false);
  const [startAt, setStartAt] = useState(null);
  const [lobbyNow, setLobbyNow] = useState(Date.now());
  const [votes, setVotes] = useState({ bots: {}, map: {}, mutation: {}, curator: {} });
  const [mutations, setMutations] = useState([]);
  const [mapId, setMapId] = useState('default');
  const [mapSeedWanted, setMapSeedWanted] = useState(null);
  const [seedInput, setSeedInput] = useState('');
  const [matchSeed, setMatchSeed] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [skillCooldowns, setSkillCooldowns] = useState({});
  const [skillCooldownNow, setSkillCooldownNow] = useState(() => Date.now());
  const [flojera, setFlojera] = useState(null);
  const [hand, setHand] = useState([]);
  const [cardCooldowns, setCardCooldowns] = useState({});
  const [cardCooldownNow, setCardCooldownNow] = useState(() => Date.now());
  const [draftEndsAt, setDraftEndsAt] = useState(0);
  const [rerolls, setRerolls] = useState(0);
  const [draftNow, setDraftNow] = useState(0);

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      setSessionToken(token);
      setDisplayName(getStoredDisplayName());
      setStatus('logged_in');
    } else {
      setStatus('needs_login');
    }
  }, []);

  const roomIdRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const myPlayerIdRef = useRef(null);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { sessionTokenRef.current = sessionToken; }, [sessionToken]);
  useEffect(() => { myPlayerIdRef.current = myPlayerId; }, [myPlayerId]);

  const hasConnectedOnceRef = useRef(false);
  useEffect(() => {
    const shouldConnect = status === 'logged_in' || status === 'in_room';
    if (!shouldConnect || hasConnectedOnceRef.current) return;
    hasConnectedOnceRef.current = true;
    const conn = createGameConnection({
      onOpen: () => {
        setIsConnected(true);
        // Si ya estábamos en una sala y se cayó la conexión (por ejemplo,
        // un redeploy del servidor), hay que volver a mandar join_room:
        // la conexión vieja murió junto con el estado de esa sala en el
        // servidor, así que sin este re-join los botones quedan "muertos"
        // (el cliente cree que sigue en la sala pero el servidor no lo sabe).
        if (roomIdRef.current && sessionTokenRef.current) {
          conn.send('join_room', { roomId: roomIdRef.current, token: sessionTokenRef.current });
        }
      },
      onClose: () => setIsConnected(false),
      onMessage: (type, payload) => {
        switch (type) {
          case 'room_joined':
            setJoinLoading(false);
            setStatus('in_room');
            setMyPlayerId(payload.playerId);
            setIsAsymRole(payload.isAsymRole);
            setPlayers(payload.players);
            setChatMessages(payload.chatHistory || []);
            setHostId(payload.hostId ?? null);
            setCharacters(payload.characters || []);
            setCardCatalog(payload.cards || []);
            setMaps(payload.maps || []);
            setIsDefaultRoom(Boolean(payload.isDefault));
            setStartAt(payload.startAt || null);
            setVotes(payload.votes || { bots: {}, map: {}, mutation: {}, curator: {} });
            setLobbyPlatforms(payload.lobbyPlatforms || []);
            setMapId(payload.mapId || 'default');
            setMapSeedWanted(payload.mapSeedWanted ?? null);
            setMutation(payload.mutation || 'none');
            setMutations(payload.mutations || []);
            break;
          case 'room_update':
            setPlayers(payload.players);
            if (payload.hostId !== undefined) setHostId(payload.hostId);
            if (payload.mapId !== undefined) setMapId(payload.mapId);
            if (payload.mapSeedWanted !== undefined) setMapSeedWanted(payload.mapSeedWanted);
            if (payload.mutation !== undefined) setMutation(payload.mutation);
            if (payload.votes !== undefined) setVotes(payload.votes);
            if (payload.startAt !== undefined) setStartAt(payload.startAt);
            break;
          case 'chat_broadcast':
            setChatMessages((prev) => [...prev, payload]);
            break;
          case 'state_snapshot': {
            const prevSnap = lastSnapRef.current;
            if (payload.delta && prevSnap) {
              for (const k of ['entities', 'ghosts', 'flojera']) {
                const merged = { ...(prevSnap[k] || {}) };
                for (const id of payload.rm?.[k] || []) delete merged[id];
                Object.assign(merged, payload[k] || {});
                payload[k] = merged;
              }
              for (const k of Object.keys(prevSnap)) if (!(k in payload) && k !== 'events') payload[k] = prevSnap[k];
            } else if (payload.delta) break;
            lastSnapRef.current = payload;
          }
            sceneStore.entities = payload.entities || {};
            sceneStore.ghosts = payload.ghosts || {};
            sceneStore.revealed = payload.revealed || [];
            sceneStore.subs.forEach((fn) => fn());
            {
              const meta = {};
              for (const [id, en] of Object.entries(payload.entities || {})) meta[id] = { corpse: Boolean(en.corpse), gone: Boolean(en.gone) };
              setEntityMeta((prev) => (sameValue(prev, meta) ? prev : meta));
              const mg = payload.ghosts?.[myPlayerIdRef.current];
              const slim = mg ? { uses: mg.uses, maxUses: mg.maxUses, visible: mg.visible, visibleMs: Math.ceil((mg.visibleMs || 0) / 1000) * 1000, cooldownMs: Math.ceil((mg.cooldownMs || 0) / 1000) * 1000 } : null;
              setMyGhost((prev) => (sameValue(prev, slim) ? prev : slim));
            }
            frameBuf.current.push({ entities: payload.entities || {}, ghosts: payload.ghosts || {} });
            if (frameBuf.current.length > 100) frameBuf.current.shift();
            setSelfDamageObjects((prev) => (sameValue(prev, payload.selfDamageObjects || {}) ? prev : payload.selfDamageObjects || {}));
            setSdTypes((prev) => (sameValue(prev, payload.selfDamageTypes || {}) ? prev : payload.selfDamageTypes || {}));
            setZones((prev) => (sameValue(prev, payload.zones || []) ? prev : payload.zones || []));
            setCuratorHp(payload.curator || null);
            setSpawnMs(payload.spawnMs || 0);
            setPlankHp((prev) => (sameValue(prev, payload.plankHp || {}) ? prev : payload.plankHp || {}));
            setHiddenPlatforms((prev) => (sameValue(prev, payload.hiddenPlatforms || []) ? prev : payload.hiddenPlatforms || []));
            setMapEvents((prev) => (sameValue(prev, payload.events || []) ? prev : payload.events || []));
            {
              const me = (payload.entities || {})[myPlayerIdRef.current];
              myPosRef.current = me ? { x: me.x, y: me.y || 0, z: me.z } : null;
            }
            entitiesRef.current = payload.entities || {};
            trackSteps(payload.entities, myPlayerIdRef.current);
            {
              const stun = Object.entries(payload.flojera || {}).filter(([, v]) => v.stunned).map(([id]) => id);
              const rag = Object.entries(payload.flojera || {}).filter(([, v]) => v.ragdoll).map(([id]) => id);
              setStunnedIds((prev) => (sameValue(prev, stun) ? prev : stun));
              setRagdollIds((prev) => (sameValue(prev, rag) ? prev : rag));
            }
            channelRef.current = payload.flojera?.[myPlayerIdRef.current]?.channel ? { ...payload.flojera[myPlayerIdRef.current].channel, at: performance.now() } : null;
            sdRef.current = payload.flojera?.[myPlayerIdRef.current]?.sdGame ? { ...payload.flojera[myPlayerIdRef.current].sdGame, at: performance.now() } : null;
            setPatients(payload.patients || {});
            setTimeRemainingMs(payload.timeRemainingMs ?? null);
            if (payload.flojera && myPlayerIdRef.current) {
              setFlojera(payload.flojera[myPlayerIdRef.current] || null);
              const mine = payload.flojera[myPlayerIdRef.current];
              if (mine?.cooldowns && mine.statuses?.some((s) => s.id === 'pereza')) {
                setCardCooldowns(mine.cooldowns.cards || {});
                setSkillCooldowns(mine.cooldowns.skills || {});
              }
            }
            break;
          case 'cure_result':
          case 'self_damage_result':
            if (type === 'self_damage_result') setTutorial((t) => (t.active && !t.flags.selfDamage ? { ...t, flags: { ...t.flags, selfDamage: true } } : t));
            setLastActionFeedback(
              type === 'cure_result'
                ? `Curaste a un Paciente (HP: ${payload.newHp})`
                : payload.failed ? 'Fallaste el ritmo' : payload.damage ? `Te hiciste ${payload.damage} de daño${payload.perfect ? ' (¡perfecto!)' : ''} (HP: ${payload.newHp})` : `Te hiciste daño (HP: ${payload.newHp})`
            );
            break;
          case 'curator_pulse_result': {
            const caster = entitiesRef.current[payload.playerId];
            if (caster && payload.healedPlayerIds?.length) playSfx('cure', caster.x, caster.y || 0, caster.z, payload.playerId === myPlayerIdRef.current);
            if (caster && !payload.silent) {
              const effect = {
                id: `fx${++effectCounterRef.current}`,
                casterId: payload.playerId,
                kind: `skill_${payload.skillId || payload.skillType}`,
                baseKind: `skill_${payload.skillType}`,
                x: payload.center ? payload.center.x : caster.x,
                z: payload.center ? payload.center.z : caster.z,
                radius: payload.radius || undefined,
                startedAt: Date.now(),
              };
              setEffects((prev) => [...prev.filter((e) => Date.now() - e.startedAt < 1500), effect]);
            }
            if (payload.patients) setPatients(payload.patients);
            if (payload.playerId === myPlayerIdRef.current) {
              setSkillCooldowns((prev) => ({ ...prev, [payload.skillIndex]: payload.cooldownUntil }));
              if (payload.healedPlayerIds?.length > 0) {
                setLastActionFeedback(`${payload.skillName}: ${payload.healedPlayerIds.length} Paciente(s) curado(s)`);
              } else if (payload.affectedPlayerIds?.length > 0) {
                setLastActionFeedback(`${payload.skillName}: ${payload.affectedPlayerIds.length} Paciente(s) afectado(s)`);
              }
            }
            break;
          }
          case 'card_offer':
            setHand(payload.slots.map((slot) => ({ options: slot.options, chosen: slot.chosen || null })));
            setDraftEndsAt(payload.draftEndsAt);
            setRerolls(payload.rerolls || 0);
            setCardCooldowns({});
            break;
          case 'role_selected':
            setMyRole(payload.roleId);
            break;
          case 'card_chosen':
            setHand((prev) => prev.map((slot, i) => (i === payload.slot ? { ...slot, chosen: payload.card } : slot)));
            break;
          case 'last_standing':
            setLmsInfo(payload);
            setLmsUntil(Date.now() + 5500);
            setTimeout(() => setLmsUntil(0), 5500);
            break;
          case 'hit_fx': {
            const effect = { id: `fx${++effectCounterRef.current}`, casterId: payload.playerId, kind: 'hit', boxes: payload.boxes, startedAt: Date.now() };
            setEffects((prev) => [...prev.filter((e) => Date.now() - e.startedAt < 1500), effect]);
            break;
          }
          case 'card_result': {
            const caster = entitiesRef.current[payload.playerId];
            if (caster && !payload.silent && payload.cardId === 'lanza_quijote') playSfx('spear', caster.x, caster.y || 0, caster.z, payload.playerId === myPlayerIdRef.current);
            if (caster && !payload.silent) {
              const effect = {
                id: `fx${++effectCounterRef.current}`,
                casterId: payload.playerId,
                kind: `card_${payload.cardId}`,
                x: payload.center ? payload.center.x : caster.x,
                z: payload.center ? payload.center.z : caster.z,
                radius: payload.hitRadius || undefined,
                boxes: payload.boxes || undefined,
                startedAt: Date.now(),
              };
              setEffects((prev) => [...prev.filter((e) => Date.now() - e.startedAt < 1500), effect]);
            }
            if (payload.playerId === myPlayerIdRef.current) {
              setCardCooldowns((prev) => ({ ...prev, [payload.slot]: payload.cooldownUntil }));
              setLastActionFeedback(`Usaste: ${payload.cardId}`);
            }
            break;
          }
          case 'pong':
            if (pingSentRef.current) setPing(Math.round(performance.now() - pingSentRef.current));
            break;
          case 'game_over':
            setGameOverInfo(payload);
            setLastAward(null);
            break;
          case 'desgracias_award':
            setLastAward(payload);
            setDesgracias((prev) => {
              const next = { ...prev, balance: addQ(prev.balance, awardToQ(payload.items)) };
              saveDesgracias(next);
              return next;
            });
            break;
          case 'game_started':
            setPhase(payload.phase);
            setMatchSeed(payload.mapSeed ?? null);
            setLmsInfo(null);
            setLmsUntil(0);
            frameBuf.current = [];
            setCollisionObjects(payload.collisionObjects || []);
            setPlatforms(payload.platforms || []);
            setMatchHalf(payload.halfSize || 60);
            setRoles(payload.roles || []);
            setMyRole(null);
            if (payload.hitbox) setHitboxCfg(payload.hitbox);
            break;
          case 'room_full':
            setJoinLoading(false);
            setErrorMsg('La sala está llena.');
            break;
          case 'phase_change':
            setPhase(payload.newPhase);
            if (payload.newPhase === 'lobby') {
              // Volvimos al lobby (game over o el host canceló la partida):
              // limpiamos todo rastro de la partida anterior para que la UI
              // no se quede mostrando HP, resultado o colisiones viejas.
              setGameOverInfo(null);
              setPatients({});
              setCollisionObjects([]);
              setTimeRemainingMs(null);
              setLastActionFeedback(null);
              setSkillCooldowns({});
              setFlojera(null);
              setHand([]);
              setCardCooldowns({});
              setDraftEndsAt(0);
            }
            break;
          case 'error':
            setJoinLoading(false);
            setErrorMsg(payload.message);
            if (payload.message?.toLowerCase().includes('sesión')) {
              clearSession();
              setStatus('needs_login');
            }
            break;
          default:
            break;
        }
      },
    });
    connRef.current = conn;
    return () => {
      conn.close();
      hasConnectedOnceRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status === 'logged_in' || status === 'in_room']);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // El host puede reasignar quién es el Curador en cualquier momento del
  // lobby (room_update), así que el propio rol no puede quedar fijo desde
  // el room_joined inicial: hay que derivarlo de la lista de jugadores
  // actualizada en cada cambio.
  useEffect(() => {
    if (!myPlayerId) return;
    const me = players.find((p) => p.id === myPlayerId);
    if (me) setIsAsymRole(me.isAsymRole);
  }, [players, myPlayerId]);

  useEffect(() => {
    if (!lastActionFeedback) return;
    const timeout = setTimeout(() => setLastActionFeedback(null), 3000);
    return () => clearTimeout(timeout);
  }, [lastActionFeedback]);

  // Refresca el HUD del cooldown del Pulso de Curación mientras está
  // activo, pulseCooldownUntil es un timestamp fijo, necesitamos un
  // "ahora" que avance para poder mostrar la cuenta regresiva.
  useEffect(() => {
    const interval = setInterval(() => setSkillCooldownNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (draftEndsAt <= Date.now()) return;
    const interval = setInterval(() => setDraftNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [draftEndsAt]);

  useEffect(() => {
    const interval = setInterval(() => setCardCooldownNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, []);

  // Antes un error se quedaba pegado en pantalla para siempre hasta la
  // próxima acción, ahora se auto-oculta (salvo que el usuario ya lo haya
  // cerrado a mano) y además se puede cerrar con el botón de la propia
  // tarjeta de error.
  useEffect(() => {
    if (!errorMsg) return;
    const timeout = setTimeout(() => setErrorMsg(null), 6000);
    return () => clearTimeout(timeout);
  }, [errorMsg]);

  async function handleGuestLogin(e) {
    e.preventDefault();
    if (!guestNameInput.trim()) return;
    setErrorMsg(null);
    setGuestLoading(true);
    try {
      const token = await loginAsGuest(guestNameInput.trim());
      setSessionToken(token);
      setDisplayName(guestNameInput.trim());
      setStatus('logged_in');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setGuestLoading(false);
    }
  }

  useEffect(() => {
    if (!sessionToken) return undefined;
    let dead = false;
    const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
    const load = () => fetch(`${base}/rooms`).then((r) => r.json()).then((d) => { if (!dead && Array.isArray(d.rooms)) setRoomList(d.rooms); }).catch(() => {});
    load();
    const t = setInterval(load, 8000);
    return () => { dead = true; clearInterval(t); };
  }, [sessionToken]);

  function handleJoin(e) {
    e.preventDefault();
    // Normalizamos igual que el servidor para que lo que se muestra en
    // pantalla coincida con el id real de la sala (el servidor también
    // normaliza, esto es solo para que la UI y el reconnect usen el
    // mismo valor desde el principio).
    const trimmedRoomId = roomId.trim().toLowerCase();
    if (!trimmedRoomId || !sessionToken) return;
    setErrorMsg(null);
    setJoinLoading(true);
    setRoomId(trimmedRoomId);
    connRef.current?.send('join_room', { roomId: trimmedRoomId, token: sessionToken });
  }

  function handleBotCount(target) {
    const current = players.filter((pl) => pl.isBot).length;
    const room = Math.min(target, current + (20 - players.length));
    for (let i = current; i < room; i++) connRef.current?.send('add_bot', {});
    for (let i = current; i > target; i--) connRef.current?.send('remove_bot', {});
  }

  function handleStart() {
    connRef.current?.send('start_game', {});
  }

  function handleStartTutorial() {
    tutSentRef.current = { role: false, start: false };
    tutStartRef.current = null;
    setTutorial({ launching: true, active: false, minimized: false, flags: {} });
    connRef.current?.send('add_bot', { tutorial: true });
  }

  useEffect(() => {
    if (tutorial.launching && phase === 'lobby') {
      const bot = players.find((pl) => pl.isBot);
      if (!bot) return;
      if (!bot.isAsymRole) {
        if (!tutSentRef.current.role) { tutSentRef.current.role = true; connRef.current?.send('set_asym_role', { targetPlayerId: bot.id }); }
        return;
      }
      if (!tutSentRef.current.start) { tutSentRef.current.start = true; connRef.current?.send('start_game', {}); }
    }
    if (tutorial.launching && phase === 'action') setTutorial((t) => ({ ...t, launching: false, active: true }));
    if (tutorial.active && phase === 'lobby') setTutorial({ launching: false, active: false, minimized: false, flags: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorial.launching, tutorial.active, phase, players]);

  const tutLive = useRef({});
  tutLive.current = { flojera, hand, cardCooldowns, myPlayerId };

  useEffect(() => {
    if (!tutorial.active || phase !== 'action') return;
    const id = setInterval(() => {
      const { flojera, hand, cardCooldowns, myPlayerId } = tutLive.current;
      const me = sceneStore.entities[myPlayerId];
      if (!me) return;
      if (!tutStartRef.current) tutStartRef.current = { x: me.x, z: me.z };
      const moved = Math.hypot(me.x - tutStartRef.current.x, me.z - tutStartRef.current.z) > 3;
      setTutorial((t) => {
        const f = { ...t.flags };
        if (moved) f.move = true;
        if (flojera && flojera.value < flojera.max - 8 && f.move) f.run = true;
        if (flojera && flojera.mode === 'walk' && f.run) f.walk = true;
        if (hand.some((slot) => slot.chosen)) f.pick = true;
        if (Object.values(cardCooldowns).some((until) => until > Date.now())) f.card = true;
        return JSON.stringify(f) === JSON.stringify(t.flags) ? t : { ...t, flags: f };
      });
    }, 400);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorial.active, phase]);

  function handleSetAsymRole(targetPlayerId) {
    connRef.current?.send('set_asym_role', { targetPlayerId });
  }

  function handleSelectCharacter(characterId) {
    connRef.current?.send('select_character', { characterId });
  }

  function handleSetMutation(id) {
    connRef.current?.send('set_mutation', { mutation: id });
  }

  function handleSetMap(newMapId, seed) {
    connRef.current?.send('set_map', { mapId: newMapId, seed });
  }

  function handleReturnToLobby() {
    connRef.current?.send('return_to_lobby', {});
  }

  function handleStartEditName() {
    setNameInput(displayName || '');
    setEditingName(true);
  }

  async function handleSaveDisplayName(e) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed || !sessionToken) return;
    setNameSaving(true);
    setErrorMsg(null);
    try {
      const newToken = await updateDisplayName(sessionToken, trimmed);
      setSessionToken(newToken);
      setDisplayName(trimmed);
      sessionTokenRef.current = newToken;
      // Si ya estamos dentro de una sala, avisamos al servidor para que
      // el nombre se actualice ahí mismo sin tener que reconectar -
      // el nuevo token solo se usa en la próxima conexión/join_room.
      if (status === 'in_room') {
        connRef.current?.send('set_display_name', { displayName: trimmed });
      }
      setEditingName(false);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setNameSaving(false);
    }
  }

  function handleSendChat(e) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    connRef.current?.send('chat_message', { text });
    setChatInput('');
  }

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('asym_cosmetics') || 'null');
      if (stored && typeof stored === 'object') { setCosmetics(stored); setDesgracias(loadDesgracias(stored)); }
      else setDesgracias(loadDesgracias({}));
    } catch {}
  }, []);

  useEffect(() => {
    if (status !== 'in_room' || !isConnected) return;
    connRef.current?.send('set_cosmetics', { cosmetics });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isConnected]);

  const buyItem = (id) => {
    const price = priceOf(id);
    if (desgracias.owned.includes(id) || normQ(desgracias.balance) < price) return false;
    const next = { balance: spendQ(desgracias.balance, price), owned: [...desgracias.owned, id] };
    setDesgracias(next);
    saveDesgracias(next);
    return true;
  };

  const updateCosmetics = (next) => {
    setCosmetics(next);
    try { localStorage.setItem('asym_cosmetics', JSON.stringify(next)); } catch {}
    connRef.current?.send('set_cosmetics', { cosmetics: next });
  };

  useEffect(() => {
    if (status !== 'in_room') return undefined;
    const id = setInterval(() => {
      pingSentRef.current = performance.now();
      connRef.current?.send('ping', {});
    }, 2000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (!replay) return undefined;
    const id = setInterval(() => {
      setReplay((r) => (r && r.i + 1 < r.frames.length ? { ...r, i: r.i + 1 } : null));
    }, 50);
    return () => clearInterval(id);
  }, [replay === null]);

  const startReplay = () => {
    if (frameBuf.current.length < 5) return;
    setReplay({ frames: frameBuf.current.slice(), i: 0 });
  };

  const handleSendInput = useCallback((input) => {
    connRef.current?.send('player_input', { input });
  }, []);

  const handleSendAction = useCallback((type, payload) => {
    connRef.current?.send(type, payload);
  }, []);

  const mySkills = players.find((p) => p.id === myPlayerId)?.character?.skills || [];

  useEffect(() => {
    if (!kitPref.on || kitSentRef.current) return;
    if (phase !== 'action' || isAsymRole || !roles.length || myRole || !hand[0] || hand[0].chosen) return;
    const ids = ['none', ...roles.map((r) => r.id)];
    const pick = kitPref.kit === 'random' || !ids.includes(kitPref.kit) ? ids[Math.floor(Math.random() * ids.length)] : kitPref.kit;
    kitSentRef.current = true;
    connRef.current?.send('select_role', { roleId: pick });
  }, [kitPref, phase, isAsymRole, roles, myRole, hand]);

  const handlePulse = useCallback((skill) => {
    // Validamos en el cliente solo para no spamear el servidor con un
    // mensaje que de todos modos va a rechazar, la validación real
    // (rol, cooldown, fase) vive en Room.applyCuratorPulse.
    if (phase !== 'action') return;
    if (!isAsymRole) {
      if (skill === 0) connRef.current?.send('ghost_reveal', {});
      return;
    }
    connRef.current?.send('curator_pulse_action', { skill });
  }, [isAsymRole, phase]);

  const handleUseCard = useCallback((slot) => {
    if (isAsymRole || phase !== 'action') return;
    connRef.current?.send('use_card_action', { slot });
  }, [isAsymRole, phase]);

  useEffect(() => {
    function onKeyDown(e) {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (keyMatches('help', e.code)) setHelpOpen((open) => !open);
      else if (keyMatches('shiftlock', e.code)) { if (!e.repeat) shiftKeyRef.current.down(); }
      else if (keyMatches('hitboxes', e.code)) setHitboxes((prev) => ({ ...prev, on: !prev.on }));
      else if (e.code === 'Escape') setHelpOpen(false);
      else if (sdRef.current?.type === 'keys' && ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(e.code)) {
        e.preventDefault();
        if (!e.repeat) pressDirRef.current(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].indexOf(e.code));
      }
      else if (keyMatches('minigame', e.code)) {
        if (sdRef.current) { if (!e.repeat) pressMinigameRef.current(); return; }
        const ch = channelRef.current;
        if (ch) handleUseCard(ch.slot ?? 0);
      }
      else if (specRef.current.on && (e.code === 'ArrowRight' || e.code === 'BracketRight')) setSpecIndex((i) => i + 1);
      else if (specRef.current.on && (e.code === 'ArrowLeft' || e.code === 'BracketLeft')) setSpecIndex((i) => i - 1);
      else if (keyMatches('carry', e.code)) { if (!e.repeat && !isAsymRoleRef.current) connRef.current?.send('module_carry', {}); }
      else if (keyMatches('dropmod', e.code)) { if (!e.repeat && !isAsymRoleRef.current) connRef.current?.send('module_drop', {}); }
      else if (keyMatches('card1', e.code)) { if (!e.repeat) handleUseCard(0); }
      else if (keyMatches('card2', e.code)) { if (!e.repeat) handleUseCard(1); }
    }
    function onKeyUp(e) {
      if (keyMatches('shiftlock', e.code)) shiftKeyRef.current.up();
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('pointerdown', unlockAudio); window.removeEventListener('keydown', unlockAudio); };
  }, [handleUseCard]);

  useEffect(() => {
    function onPointerDown(e) {
      if (!sdRef.current || e.pointerType === 'touch' || e.button !== 0) return;
      const t = e.target;
      if (t && t.closest && t.closest('button,input,select,textarea,a,label')) return;
      pressMinigameRef.current();
    }
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('asym_hitboxes') || 'null');
      if (stored) setHitboxes({ on: Boolean(stored.on), opacity: 0.8 });
    } catch {}
  }, []);

  function updateHitboxes(next) {
    setHitboxes(next);
    try { localStorage.setItem('asym_hitboxes', JSON.stringify(next)); } catch {}
  }

  useEffect(() => {
    try {
      const k = JSON.parse(localStorage.getItem('asym_kit') || 'null');
      if (k && typeof k === 'object') setKitPref({ on: Boolean(k.on), kit: typeof k.kit === 'string' ? k.kit : 'none' });
    } catch {}
  }, []);
  const updateKitPref = (next) => {
    setKitPref(next);
    try { localStorage.setItem('asym_kit', JSON.stringify(next)); } catch {}
  };
  useEffect(() => { kitSentRef.current = false; }, [roles]);

  const handleSelectRole = useCallback((roleId) => {
    if (isAsymRole || phase !== 'action') return;
    connRef.current?.send('select_role', { roleId });
  }, [isAsymRole, phase]);

  const handleReroll = useCallback((cardId) => {
    if (isAsymRole || phase !== 'action') return;
    connRef.current?.send('reroll_card', { cardId });
  }, [isAsymRole, phase]);

  useEffect(() => {
    if (!isDefaultRoom || phase !== 'lobby' || !startAt) return undefined;
    const t = setInterval(() => setLobbyNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [isDefaultRoom, phase, startAt]);

  const handleVote = useCallback((kind, value) => {
    connRef.current?.send('vote', { kind, value });
  }, []);

  const handleChooseCard = useCallback((slot, cardId) => {
    if (isAsymRole || phase !== 'action') return;
    connRef.current?.send('choose_card_action', { slot, cardId });
  }, [isAsymRole, phase]);

  function handleLogout() {
    clearSession();
    connRef.current?.close();
    setSessionToken(null);
    setDisplayName(null);
    setStatus('needs_login');
  }

  const isHost = hostId !== null && hostId === myPlayerId;
  const myPatient = patients[myPlayerId];
  const spectating = phase === 'action' && !isAsymRole && Boolean(myPatient) && myPatient.status !== 'alive';
  const specTargets = [...(myGhost ? [myPlayerId] : []), ...Object.keys(entityMeta).filter((id) => id !== myPlayerId && !entityMeta[id].gone && !entityMeta[id].corpse)];
  const ghostBlocked = Boolean(myGhost) && (myGhost.uses >= myGhost.maxUses || myGhost.cooldownMs > 0);
  const ghostMode = spectating && Boolean(myGhost) && specTargets[((specIndex % specTargets.length) + specTargets.length) % specTargets.length] === myPlayerId;
  const specId = spectating && specTargets.length ? specTargets[((specIndex % specTargets.length) + specTargets.length) % specTargets.length] : null;
  specRef.current.on = spectating;
  const visiblePlatforms = hiddenPlatforms.length ? platforms.filter((p) => !hiddenPlatforms.includes(p.id)) : platforms;
  const shakeIds = mapEvents.filter((e) => e.target && e.phase === 'warn').map((e) => e.target);
  const sx = (base, extra) => (compact ? { ...base, ...extra } : base);
  const playersOpen = panelOpen ?? phase === 'lobby';
  isAsymRoleRef.current = isAsymRole;
  const handleInteract = () => {
    if (sdRef.current) { pressMinigameRef.current(); return; }
    const entities = entitiesRef.current;
    const me = entities[myPlayerId];
    if (!me) return;
    let best = null;
    let bestDist = Infinity;
    const consider = (id, pos) => {
      const d = Math.hypot(pos.x - me.x, pos.z - me.z);
      if (d < bestDist) { bestDist = d; best = id; }
    };
    if (isAsymRole) {
      for (const [id, e] of Object.entries(entities)) {
        const pl = players.find((p) => p.id === id);
        if (id !== myPlayerId && pl && !pl.isAsymRole) consider(id, e);
      }
      handleSendAction('cure_action', {});
    } else {
      for (const [id, pos] of Object.entries(selfDamageObjects || {})) consider(id, pos);
      if (best) handleSendAction('self_damage_action', { objectId: best });
    }
  };
  pressDirRef.current = (dir) => {
    const g = sdRef.current;
    if (g && g.objectId) handleSendAction('self_damage_action', { objectId: g.objectId, dir });
  };
  pressMinigameRef.current = () => {
    const g = sdRef.current;
    if (g && g.objectId) handleSendAction('self_damage_action', { objectId: g.objectId });
  };
  const goFullscreen = () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    Promise.resolve(req.call(el)).then(() => window.screen.orientation?.lock?.('landscape')).catch(() => {});
  };
  const bar = { width: 'min(240px, 56vw)', padding: '4px 8px' };

  if (status === 'in_room') {
    return (
      <main style={styles.gameMain}>
        <div style={styles.sceneContainer}>
          <LiveScene
            store={sceneStore}
            replay={replay}
            players={players}
            myPlayerId={myPlayerId}
            waiting={phase === 'action' && isAsymRole && spawnMs > 0}
            phase={phase === 'action' && isAsymRole && spawnMs > 0 ? 'lobby' : phase}
            selfDamageObjects={phase === 'action' && isAsymRole && spawnMs > 0 ? {} : selfDamageObjects}
            zones={phase === 'action' && isAsymRole && spawnMs > 0 ? [] : zones}
            effects={effects}
            stunnedIds={stunnedIds}
            ragdollIds={ragdollIds}
            collisionObjects={phase === 'action' && isAsymRole && spawnMs > 0 ? [] : collisionObjects}
            matchHalf={matchHalf}
            sdActiveId={flojera?.sdGame?.objectId || null}
            sdTypes={sdTypes}
            platforms={phase === 'action' && !(isAsymRole && spawnMs > 0) ? visiblePlatforms : lobbyPlatforms}
            shakeIds={shakeIds}
            plankHp={plankHp}
            sendInput={handleSendInput}
            sendAction={handleSendAction}
            onPulse={handlePulse}
            hitboxes={hitboxes}
            hitboxCfg={hitboxCfg}
            followId={ghostMode ? null : specId}
            ghostMode={ghostMode}
            shiftLock={shiftLock}
            onShiftLockLost={() => setShiftLock(false)}
          />
        </div>

        <div style={sx(styles.topBar, { top: 8, left: 8, maxWidth: 'calc(100% - 276px)', flexWrap: 'wrap', padding: '4px 8px', gap: 6, zIndex: 30 })}>
          <span style={styles.dot('in_room')} />
          <span style={styles.statusText}>Sala: {roomId}</span>
          <span style={styles.roleTag(isAsymRole)}>
            {phase === 'action'
              ? isAsymRole
                ? players.find((p) => p.id === myPlayerId)?.character?.displayName || 'Curador'
                : 'Paciente'
              : 'Esperando partida'}
          </span>
          {phase === 'action' && timeRemainingMs !== null && (
            <span style={styles.timerTag(timeRemainingMs)}>{formatTime(timeRemainingMs)}</span>
          )}
          {editingName ? (
            <form onSubmit={handleSaveDisplayName} style={styles.nameEditRow}>
              <input
                style={styles.inRoomNameInput}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={30}
                autoFocus
                disabled={nameSaving}
              />
              <button
                type="submit"
                style={styles.linkButton(nameSaving || !nameInput.trim())}
                disabled={nameSaving || !nameInput.trim()}
              >
                ✓
              </button>
              <button
                type="button"
                style={styles.linkButton(nameSaving)}
                disabled={nameSaving}
                onClick={() => setEditingName(false)}
              >
                ✕
              </button>
            </form>
          ) : (
            <button type="button" style={styles.linkButton(false)} onClick={handleStartEditName}>
              cambiar nombre
            </button>
          )}
        </div>

        <div style={{ ...sx(styles.playersOverlay, { top: 52, right: 8, width: 'min(300px, calc(100% - 16px))', maxHeight: 'calc(100% - 64px)', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', scrollbarWidth: 'thin', boxSizing: 'border-box', padding: 10, zIndex: 30 }), ...(compact && !playersOpen ? { display: 'none' } : {}) }}>
          <ul style={sx(styles.playerList, { maxHeight: 'none', overflowY: 'visible' })}>
            {players.map((p) => {
              const patientInfo = patients[p.id];
              const characterTag =
                p.isAsymRole && p.character
                  ? `/ ${p.character.displayName} (${p.character.weaponName})`
                  : '';
              return (
                <li key={p.id} style={styles.playerItem}>
                  <span>
                    {p.isAsymRole ? '🩺 ' : ''}<span translate="no">{p.name}</span>{p.id === myPlayerId ? ' (tú)' : ''}
                  </span>
                  <span style={styles.playerTag}>
                    {p.id === hostId ? 'Host' : ''} {characterTag}
                    {phase === 'action' && patientInfo ? ` / HP ${fmtHp(patientInfo.hp)}/${fmtHp(patientInfo.maxHp || 120)}` : ''}
                  </span>
                  {phase === 'lobby' && isHost && !isDefaultRoom && !p.isAsymRole && (
                    <button
                      style={styles.smallButton}
                      onClick={() => handleSetAsymRole(p.id)}
                      title="Hacer Curador a este jugador"
                    >
                      Hacer Curador
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {phase === 'lobby' && isAsymRole && characters.length > 0 && (
            <div style={styles.characterPicker}>
              <p style={styles.characterPickerLabel}>Elegí tu personaje</p>
              {characters.map((c) => {
                const mine = players.find((p) => p.id === myPlayerId);
                const selected = mine?.characterId === c.id;
                return (
                  <button
                    key={c.id}
                    style={styles.characterOption(selected)}
                    onClick={() => handleSelectCharacter(c.id)}
                  >
                    {c.displayName}
                    <span style={styles.characterWeapon}>{c.weaponName}</span>
                  </button>
                );
              })}
            </div>
          )}

          {phase === 'lobby' && (
            <button type="button" style={{ ...styles.smallButton, width: '100%', padding: '8px 12px' }} onClick={() => setCosmeticsOpen(true)}>Personalizar personaje <span style={{ color: '#e0b34a', marginLeft: 6 }}>{Math.floor(normQ(desgracias.balance))} ℍ</span></button>
          )}
          {phase === 'lobby' && !isAsymRole && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 10px', border: '1px solid #3d2c33', borderRadius: 8, fontSize: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={kitPref.on} onChange={(e) => updateKitPref({ ...kitPref, on: e.target.checked })} />
                Preselección de kit
              </label>
              {kitPref.on && (
                <select value={kitPref.kit} onChange={(e) => updateKitPref({ ...kitPref, kit: e.target.value })} style={{ background: '#1b2238', color: '#e8f1f8', border: '1px solid #4a6a8a', borderRadius: 6, padding: 6 }}>
                  <option value="none">Sin kit</option>
                  <option value="loquito">Loquito de la Esquina</option>
                  <option value="hincha">Hincha Cantarín del Barrio</option>
                  <option value="cobrador">Cobrador de Combi</option>
                  <option value="random">Random</option>
                </select>
              )}
              {!kitPref.on && <span style={{ opacity: 0.65 }}>Desactivada: eliges el kit en plena partida.</span>}
            </div>
          )}

          {phase === 'lobby' && isHost && (
            <button type="button" style={{ ...styles.smallButton, width: '100%', padding: '8px 12px', borderColor: '#f2d154' }} onClick={handleStartTutorial} disabled={tutorial.launching}>
              {tutorial.launching ? 'Preparando tutorial...' : 'Tutorial (jugar contra un bot)'}
            </button>
          )}

          {phase === 'lobby' && (
            <div style={styles.mapPicker}>
              <p style={styles.characterPickerLabel}>Mapa</p>
              {isHost && !isDefaultRoom ? (
                <select
                  style={styles.mapSelect}
                  value={mapId}
                  onChange={(e) => handleSetMap(e.target.value, e.target.value === 'random' ? seedInput : undefined)}
                >
                  {maps.filter((m) => !m.id.startsWith('c_')).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.custom ? ' (personalizado)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p style={styles.mapReadOnly}>
                  {maps.find((m) => m.id === mapId)?.name || communityName[mapId] || mapId}
                </p>
              )}
              {mapId === 'random' && (isHost && !isDefaultRoom ? (
                <input
                  style={sx(styles.mapSelect, { marginTop: 6 })}
                  inputMode="numeric"
                  placeholder="Semilla (vacío: al azar)"
                  value={seedInput}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 9); setSeedInput(v); handleSetMap('random', v); }}
                />
              ) : mapSeedWanted != null ? (
                <p style={styles.mapReadOnly}>Semilla: {mapSeedWanted}</p>
              ) : null)}
              {mapId.startsWith('c_') && <p style={styles.mapReadOnly}>Mapa de la comunidad: <span translate="no">{communityName[mapId] || maps.find((m) => m.id === mapId)?.name || ''}</span></p>}
              <button type="button" style={{ ...styles.smallButton, width: '100%', marginTop: 4 }} onClick={() => setCommunityOpen(true)}>Mapas de la comunidad</button>
              {mutations.length > 0 && (
                <>
                  <p style={{ ...styles.characterPickerLabel, marginTop: 8 }}>Mutación</p>
                  {isHost && !isDefaultRoom ? (
                    <select style={styles.mapSelect} value={mutation} onChange={(e) => handleSetMutation(e.target.value)}>
                      {mutations.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  ) : (
                    <p style={styles.mapReadOnly}>{mutations.find((m) => m.id === mutation)?.name || ''}</p>
                  )}
                </>
              )}
              <Link href="/editor" style={styles.editorLink}>Crear mapa nuevo →</Link>
            </div>
          )}

          {phase === 'lobby' && isHost && !isDefaultRoom && (
            <label style={styles.botRow}>
              <span style={{ minWidth: 56 }}>Bots: {players.filter((pl) => pl.isBot).length}</span>
              <button type="button" style={{ ...styles.smallButton, width: 34, height: 34, padding: 0, fontSize: 18 }} onClick={() => handleBotCount(Math.max(0, players.filter((pl) => pl.isBot).length - 1))} aria-label="Menos bots">-</button>
              <input
                type="range"
                min={0}
                max={19}
                value={players.filter((pl) => pl.isBot).length}
                onChange={(e) => handleBotCount(Number(e.target.value))}
                style={{ flex: 1, height: 34, minWidth: 0, cursor: 'pointer', touchAction: 'none', accentColor: '#f0c26b' }}
              />
              <button type="button" style={{ ...styles.smallButton, width: 34, height: 34, padding: 0, fontSize: 18 }} onClick={() => handleBotCount(Math.min(19, players.filter((pl) => pl.isBot).length + 1))} aria-label="Más bots">+</button>
            </label>
          )}

          {phase === 'lobby' && isDefaultRoom && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 10px', border: '1px solid #3d2c33', borderRadius: 8, fontSize: 12 }}>
              <strong>Votación de la sala</strong>
              {startAt && <span style={{ color: '#f0c26b' }}>Inicio automático en {Math.max(0, Math.ceil((startAt - lobbyNow) / 1000))} s</span>}
              {[
                ['bots', 'Bots', [0, 4, 8, 12, 16].map((n) => ({ id: n, label: String(n) }))],
                ['map', 'Mapa', maps.filter((m) => !m.id.startsWith('c_')).map((m) => ({ id: m.id, label: m.name }))],
                ['mutation', 'Modificador', mutations.map((m) => ({ id: m.id, label: m.name }))],
                ['curator', 'Curador', [{ id: 'random', label: 'Al azar' }, ...players.filter((pl) => !pl.isBot).map((pl) => ({ id: pl.id, label: pl.name }))]],
              ].map(([kind, title, options]) => {
                const counts = {};
                for (const v of Object.values(votes[kind] || {})) counts[v] = (counts[v] || 0) + 1;
                const mine = (votes[kind] || {})[myPlayerId];
                return (
                  <div key={kind}>
                    <div style={{ opacity: 0.75, marginBottom: 3 }}>{title}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {options.map((o) => (
                        <button key={String(o.id)} type="button" onClick={() => handleVote(kind, o.id)} style={{ padding: '4px 8px', borderRadius: 6, border: mine === o.id ? '1px solid #f3e9a6' : '1px solid #4d3840', background: mine === o.id ? '#3d2c33' : '#241a1e', color: '#f3e8e5', fontSize: 12, cursor: 'pointer' }}>
                          {o.label}{counts[o.id] ? ` (${counts[o.id]})` : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <span style={{ opacity: 0.65 }}>Gana lo más votado. Si hay empate, se elige al azar.</span>
            </div>
          )}

          {phase === 'lobby' && isHost && (
            <button
              style={styles.button(players.length < 2)}
              onClick={handleStart}
              disabled={players.length < 2}
              title={players.length < 2 ? 'Hace falta al menos 1 Curador y 1 Paciente' : undefined}
            >
              Iniciar partida{players.length < 2 ? ' (falta 1 jugador)' : ''}
            </button>
          )}
        </div>

        {phase === 'action' && !isAsymRole && myPlayerId && patients[myPlayerId] && patients[myPlayerId].status !== 'alive' && (
          <div style={sx(styles.resolvedBanner(patients[myPlayerId].status === 'self_won'), { top: 150, fontSize: 15, maxWidth: '70%' })}>
            {patients[myPlayerId].status === 'self_won'
              ? '¡Ganaste! Lograste escapar'
              : 'Perdiste: te curaron del todo'}
          </div>
        )}

        {phase === 'action' && !isAsymRole && myPlayerId && patients[myPlayerId] && (
          <div style={sx(styles.hpBarContainer, { ...bar, bottom: 'auto', top: compact ? 40 : 80 })}>
            <div style={sx(styles.hpBarLabel, { fontSize: 10, marginBottom: 3 })}>
              Tu HP: {fmtHp(patients[myPlayerId].hp)}/{fmtHp(patients[myPlayerId].maxHp || 120)}
              {patients[myPlayerId].hp <= 20 && ' (¡cerca de ganar!)'}
              {(patients[myPlayerId].maxHp || 120) < 1e6 && patients[myPlayerId].hp >= (patients[myPlayerId].maxHp || 120) - 20 && ' (¡cerca de ser curado del todo!)'}
            </div>
            <div style={styles.hpBarTrack}>
              <div style={styles.hpBarFill(patients[myPlayerId].hp, patients[myPlayerId].maxHp || 120)} />
            </div>
          </div>
        )}

        {phase === 'action' && curatorHp && (
          <div style={sx(styles.curatorHpBar, { ...bar, top: 50 })}>
            <div style={sx(styles.hpBarLabel, { fontSize: 10, marginBottom: 3 })}>
              {compact ? 'Curador' : 'Salud del Curador'}: {Math.round(curatorHp.hp)}/{curatorHp.max}{!compact && `, pierde en 0 o en ${curatorHp.max}`}
            </div>
            <div style={styles.hpBarTrack}>
              <div style={styles.curatorHpFill(curatorHp.hp / curatorHp.max)} />
            </div>
          </div>
        )}

        {phase === 'action' && isAsymRole && spawnMs > 0 && (
          <div style={sx(styles.resolvedBanner(false), { top: 150, fontSize: 15 })}>Entras en {Math.ceil(spawnMs / 1000)}s</div>
        )}

        {tutorial.active && phase === 'action' && !isAsymRole && (() => {
          const steps = [
            ['move', 'Muévete con WASD o el joystick.'],
            ['run', 'Sigue corriendo: la barra de Flojera baja al correr.'],
            ['walk', 'Mantén Shift (o el botón Lento) para caminar sin gastar Flojera.'],
            ['pick', 'Elige una carta en el menú de cartas de arriba.'],
            ['card', 'Usa tu carta con la tecla o botón de su ranura.'],
            ['selfDamage', 'Acércate a un objeto rojo y haz clic (o pulsa E) para auto-dañarte: así ganas.'],
          ];
          const current = steps.findIndex(([k]) => !tutorial.flags[k]);
          const finished = current === -1;
          return (
            <div style={{ position: 'absolute', left: 8, top: compact ? 96 : 150, zIndex: 40, width: compact ? 'min(260px, calc(100% - 16px))' : 'min(300px, calc(100% - 16px))', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, background: 'rgba(27,29,41,0.92)', border: '1px solid #f2d154', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Tutorial</strong>
                <button type="button" style={{ ...styles.smallButton, width: 'auto', padding: '2px 8px', fontSize: 11 }} onClick={() => setTutorial((t) => ({ ...t, minimized: !t.minimized }))}>{tutorial.minimized ? 'Mostrar' : 'Ocultar'}</button>
              </div>
              {!tutorial.minimized && (
                <>
                  {steps.map(([k, text], i) => (compact && i !== current ? null : (
                    <div key={k} style={{ color: tutorial.flags[k] ? '#5fd58c' : i === current ? '#f2d154' : '#a8959a' }}>
                      {tutorial.flags[k] ? '✓' : i === current ? '→' : '-'} {text}
                    </div>
                  )))}
                  {finished && <div style={{ color: '#5fd58c' }}>Tutorial completado. Gana cada Paciente que baja su HP a 0; el Curador gana si los cura a todos. Si la partida termina, el host puede volver al lobby.</div>}
                </>
              )}
            </div>
          );
        })()}

        {phase === 'action' && <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, background: 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 45%, rgba(18,2,6,0.55) 100%), linear-gradient(0deg, rgba(180,30,20,0.16), rgba(0,0,0,0) 28%)' }} />}
        {phase === 'action' && flojera && <StatusColumn statuses={flojera.statuses} compact={compact} />}
        {phase === 'action' && flojera?.channel && <RhythmBar channelRef={channelRef} />}
        {phase === 'action' && flojera?.astral && (
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: compact ? 50 : 44, width: 84, height: 5, zIndex: 35, borderRadius: 3, background: 'rgba(18,19,26,0.7)', border: '1px solid rgba(243,233,166,0.6)', overflow: 'hidden', pointerEvents: 'none' }}>
            <div style={{ height: '100%', width: `${Math.round(flojera.astral.charge * 100)}%`, background: flojera.astral.state === 'charging' ? '#f3e9a6' : '#f2b84a' }} />
          </div>
        )}
        {phase === 'action' && matchSeed != null && <div style={{ position: 'absolute', left: 8, bottom: 8, fontSize: 11, color: '#a8959a', pointerEvents: 'none', userSelect: 'text' }}>Semilla: {matchSeed}</div>}
        {phase === 'action' && flojera?.sdGame && <SelfDamageBar gameRef={sdRef} onPress={() => pressMinigameRef.current()} onDir={(d) => pressDirRef.current(d)} />}
        {phase === 'action' && <EventLayer events={mapEvents} posRef={myPosRef} />}
        {phase === 'action' && lmsUntil > 0 && lmsInfo && (
          <LmsIntro
            patientCosmetics={players.find((p) => p.id === lmsInfo.survivorId)?.cosmetics}
            curatorCosmetics={players.find((p) => p.id === lmsInfo.curatorId)?.cosmetics}
            gimmick={lmsInfo.gimmick}
            survivorName={players.find((p) => p.id === lmsInfo.survivorId)?.name}
          />
        )}
        {phase === 'action' && lmsInfo && lmsUntil === 0 && (
          <div style={{ position: 'absolute', top: 38, left: '50%', transform: 'translateX(-50%)', zIndex: 6, pointerEvents: 'none', padding: '3px 12px', borderRadius: 8, background: 'rgba(18,19,26,0.88)', border: '1px solid #ffd166', color: '#ffd166', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
            LAST MORON STANDING / <span translate="no">{players.find((p) => p.id === lmsInfo.survivorId)?.name}</span> / {({ adrenalina: 'Adrenalina', reflejos: 'Reflejos', escudo: 'Escudo', codicia: 'Codicia' })[lmsInfo.gimmick]}
          </div>
        )}
        {phase === 'action' && lmsUntil > 0 && (
          <div style={sx(styles.resolvedBanner(false), { top: 'auto', bottom: 14, fontSize: 16, maxWidth: '80%', zIndex: 9 })}>El tiempo pasa a 1:30</div>
        )}
        {phase === 'lobby' && communityOpen && (
          <CommunityMaps
            isHost={isHost}
            currentMapId={mapId}
            onClose={() => setCommunityOpen(false)}
            onUse={(m) => { setCommunityName((prev) => ({ ...prev, [m.id]: m.name })); handleSetMap(m.id); }}
          />
        )}
        {phase === 'lobby' && <TouchControls lobby />}
        {phase === 'action' && (!spectating || ghostMode) && <TouchControls ghost={ghostMode} onReveal={() => handlePulse(0)} ghostUsed={ghostBlocked} onInteract={handleInteract} isAsymRole={isAsymRole} cardIds={hand.map((sl, i) => (flojera?.astral?.state === 'ready' && flojera.astral.slot === i ? 'astral_sphere' : sl.chosen?.id))} skillIds={mySkills.map((sk) => sk.id)} cardCooldowns={cardCooldowns} skillCooldowns={skillCooldowns} />}

        {phase === 'action' && flojera && (
          <div style={sx(styles.flojeraBarContainer, { ...bar, bottom: 'auto', top: compact ? (isAsymRole ? 40 : 64) : (isAsymRole ? 80 : 110) })}>
            <div style={sx(styles.flojeraBarLabel, { fontSize: 10, marginBottom: 3 })}>
              Flojera: {Math.round(flojera.value)}/{flojera.max}
              {flojera.locked && ' (¡exhausto, no puedes correr!)'}
              {flojera.sprinting && ' (¡sprint!)'}
              {flojera.stunned && ' (¡en Diligencia!)'}
            </div>
            <div style={styles.flojeraBarTrack}>
              <div style={styles.flojeraBarFill(flojera.value, flojera.max, flojera.locked)} />
            </div>
          </div>
        )}

        {phase === 'action' && !isAsymRole && roles.length > 0 && !myRole && hand[0] && !hand[0].chosen && (
          <div style={{ position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)', zIndex: 40, maxHeight: 'calc(100% - 64px)', overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(20,24,40,0.92)', border: '1px solid #8fc6ea', borderRadius: 10, padding: 10, width: 'min(94vw, 460px)', maxHeight: 'calc(100% - 70px)', overflow: 'auto' }}>
            <strong style={{ color: '#cfe8fa', fontSize: 14 }}>Elige tu rol</strong>
            {roles.map((r) => (
              <button key={r.id} type="button" onClick={() => handleSelectRole(r.id)} style={{ textAlign: 'left', background: '#1b2238', color: '#e8f1f8', border: '1px solid #4a6a8a', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
                <div style={{ fontWeight: 700 }}>{r.name}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{r.tagline} / {r.card?.displayName}</div>
                <div style={{ fontSize: 11, opacity: 0.65 }}>{(r.pool || []).join(' / ')}</div>
              </button>
            ))}
            <button type="button" onClick={() => handleSelectRole('none')} style={{ background: 'transparent', color: '#cfe8fa', border: '1px dashed #4a6a8a', borderRadius: 8, padding: 8, cursor: 'pointer' }}>Sin rol (elegir cartas libremente)</button>
          </div>
        )}

        {phase === 'action' && !isAsymRole && hand.length > 0 && (
          <div style={sx(styles.handContainer, { top: 50, bottom: 'auto', right: 8, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100% - 60px)', overflow: 'auto', zIndex: 30 })}>
            {hand.map((slot, i) => {
              if (!slot.chosen) {
                if (hand.findIndex((sl) => !sl.chosen) !== i) return null;
                const secondsLeft = Math.max(0, Math.ceil((draftEndsAt - Math.max(draftNow, Date.now())) / 1000));
                const picked = hand.filter((sl) => sl.chosen).length;
                return (
                  <div key={i} className="draft-overlay" style={styles.draftOverlay}>
                    <span style={styles.draftTitle}>Elige 2 ({picked}/2), {secondsLeft}s, Renovar: {rerolls}</span>
                    <div style={styles.draftRow}>
                      {slot.options.map((card, n) => (
                        <div key={card.id} className="draft-card" style={styles.draftCard(card.rarity, card.corrupt, n)}>
                          <button type="button" className="draft-face" onClick={() => handleChooseCard(i, card.id)} title={card.description} style={styles.draftFace}>
                            <SkillIcon id={card.id} size={44} />
                            <span style={styles.cardButtonName}>{card.displayName}</span>
                            {card.corrupt && <span style={styles.draftDeck}>corrupto</span>}
                            <span style={styles.keywordRow}>
                              {(card.keywords || []).slice(0, 2).map((k) => <KeywordChip key={k} id={k} />)}
                            </span>
                          </button>
                          <button type="button" disabled={rerolls <= 0} onClick={() => handleReroll(card.id)} title="Renovar esta carta" style={styles.draftReroll(rerolls > 0)}>↻</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (touch) return null;
              const cooldownUntil = cardCooldowns[i] || 0;
              const onCooldown = cooldownUntil > cardCooldownNow;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={onCooldown && !slot.chosen.spear && slot.chosen.id !== 'lanza_quijote'}
                  onClick={() => handleUseCard(i)}
                  style={styles.cardButton(onCooldown)}
                  title={slot.chosen.description}
                >
                  <SkillIcon id={flojera?.astral?.state === 'ready' && flojera.astral.slot === i ? 'astral_sphere' : slot.chosen.id} size={34} />
                  <span style={styles.skillKey}>{i + 1}</span>
                  {onCooldown && (
                    <span style={styles.skillCooldownOverlay}>{Math.ceil((cooldownUntil - cardCooldownNow) / 1000)}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {phase === 'action' && !touch && isAsymRole && mySkills.length > 0 && (
          <div style={styles.skillBar}>
            {[...mySkills.map((skill, i) => ({ id: skill.id, name: skill.name, description: skill.description, key: ['Q', 'E', 'R', 'F'][i], index: i, cooldownKey: i })),
              { id: 'golpe_aturdidor', name: 'Golpe Aturdidor', description: 'Aturde 1.2s al Paciente frente a ti (cubo corto desde la mano).', key: 'G', index: 'melee', cooldownKey: 'melee' }].map((skill) => {
              const until = skillCooldowns[skill.cooldownKey] || 0;
              const onCooldown = until > skillCooldownNow;
              return (
                <button
                  key={skill.id}
                  type="button"
                  disabled={onCooldown}
                  onClick={() => handlePulse(skill.index)}
                  style={styles.skillButton(onCooldown)}
                  title={`${skill.name}: ${skill.description}`}
                  aria-label={skill.name}
                >
                  <SkillIcon id={skill.id} size={34} />
                  <span style={styles.skillKey}>{skill.key}</span>
                  {onCooldown && (
                    <span style={styles.skillCooldownOverlay}>{Math.ceil((until - skillCooldownNow) / 1000)}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}


        <div style={{ ...sx(styles.chatOverlay, { bottom: 'auto', top: 52, left: 8, width: 'min(320px, calc(100% - 16px))', zIndex: 30 }), ...(compact && !chatOpen ? { display: 'none' } : {}) }}>
          <div style={sx(styles.chatHistory, { height: 110 })}>
            {chatMessages.length === 0 && <p style={styles.chatEmpty}>Todavía no hay mensajes.</p>}
            {chatMessages.map((m, i) => (
              <p key={i} style={styles.chatLine}>
                <span style={styles.chatAuthor(m.playerId === myPlayerId)}>
                  {m.ghost ? '(fantasma) ' : ''}{m.playerId === myPlayerId ? 'Tú' : m.playerName}:
                </span>{' '}
                <span translate="no" style={styles.chatText}>{m.text}</span>
              </p>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendChat} style={styles.chatInputRow}>
            <input
              style={styles.chatInput}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Escribe un mensaje..."
              maxLength={300}
            />
            <button style={styles.chatSendButton(!chatInput.trim())} type="submit" disabled={!chatInput.trim()}>
              Enviar
            </button>
          </form>
        </div>

        <button type="button" onClick={() => setHelpOpen(true)} style={sx(styles.helpButton, { top: 34, right: 8, width: 36, height: 36, zIndex: 30 })} title="Ayuda (H)" aria-label="Ayuda">?</button>
        <button
          type="button"
          onClick={() => updateHitboxes({ ...hitboxes, on: !hitboxes.on })}
          style={sx(styles.hitboxButton(hitboxes.on), { top: 34, right: 52, width: 'auto', minWidth: 36, padding: '0 6px', borderRadius: 18, height: 36, zIndex: 30 })}
          title="Hitboxes y ping (B)"
          aria-label="Hitboxes"
        >
          ◎{ping !== null ? <span style={{ fontSize: 10, marginLeft: 3 }}>{ping}ms</span> : null}
        </button>
        <button
          type="button"
          onClick={() => setShiftLock((on) => !on)}
          style={sx({ ...styles.hitboxButton(shiftLock), right: 328 }, { top: 8, right: 228, width: 36, height: 36, zIndex: 30 })}
          title="Shiftlock (Ctrl)"
          aria-label="Shiftlock"
        >
          ⌖
        </button>
        {shiftLock && <div style={{ position: 'absolute', left: '50%', top: '50%', width: 6, height: 6, marginLeft: -3, marginTop: -3, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', pointerEvents: 'none', zIndex: 5 }} />}
        {compact && (
          <>
            <button type="button" onClick={() => { setPanelOpen(!playersOpen); setChatOpen(false); }} style={sx(styles.helpButton, { top: 8, right: 96, width: 36, height: 36, zIndex: 30, borderColor: playersOpen ? '#f0c26b' : '#3d2c33' })} aria-label="Jugadores">☰</button>
            <button type="button" onClick={goFullscreen} style={sx(styles.helpButton, { top: 8, right: 184, width: 36, height: 36, zIndex: 30 })} aria-label="Pantalla completa">⛶</button>
            <button type="button" onClick={() => { setChatOpen(!chatOpen); setPanelOpen(false); }} style={sx(styles.helpButton, { top: 8, right: 140, width: 36, height: 36, zIndex: 30, borderColor: chatOpen ? '#f0c26b' : '#3d2c33' })} aria-label="Chat">💬</button>
          </>
        )}
        {spectating && specTargets.length > 1 && (
          <div style={{ position: 'absolute', left: '50%', bottom: 58, transform: 'translateX(-50%)', zIndex: 30, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, maxWidth: '92%' }}>
            {specTargets.map((id, i) => {
              const pl = players.find((p) => p.id === id);
              const current = ((specIndex % specTargets.length) + specTargets.length) % specTargets.length === i;
              return (
                <button key={id} type="button" onClick={() => setSpecIndex(i)} style={{ ...styles.smallButton, width: 'auto', padding: '4px 10px', fontSize: 12, borderColor: current ? '#f2d154' : pl?.isAsymRole ? '#f2a154' : '#3d2c33', background: current ? 'rgba(242,209,84,0.18)' : undefined }}>
                  {id === myPlayerId ? 'Fantasma' : <><span>{pl?.isAsymRole ? '🩺 ' : ''}</span><span translate="no">{pl?.name || id}</span></>}
                </button>
              );
            })}
          </div>
        )}
        {spectating && (
          <div style={{ position: 'absolute', left: '50%', bottom: 12, transform: 'translateX(-50%)', zIndex: 30, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 8, background: 'rgba(27, 29, 41, 0.9)', border: '1px solid #3d2c33', fontSize: 13 }}>
            <button type="button" style={{ ...styles.smallButton, width: 'auto', padding: '6px 14px', fontSize: 16 }} onClick={() => setSpecIndex((i) => i - 1)} aria-label="Anterior">{'<-'}</button>
            <button type="button" style={{ ...styles.smallButton, width: 'auto', padding: '6px 10px' }} onClick={startReplay}>Repetición</button>
            <span>{ghostMode ? 'Tu fantasma' : specId ? `Espectando: ${players.find((p) => p.id === specId)?.name || specId}` : 'Nadie a quien seguir'}</span>
            {ghostMode && (
              <button type="button" disabled={ghostBlocked} style={{ ...styles.smallButton, width: 'auto', padding: '6px 12px' }} onClick={() => handlePulse(0)}>
                {myGhost.visible ? `Visible ${Math.ceil(myGhost.visibleMs / 1000)}s` : myGhost.uses >= myGhost.maxUses ? 'Sin usos' : myGhost.cooldownMs > 0 ? `Aparecer ${Math.ceil(myGhost.cooldownMs / 1000)}s` : `Aparecer (Q) ${myGhost.maxUses - myGhost.uses}/${myGhost.maxUses}`}
              </button>
            )}
            <button type="button" style={{ ...styles.smallButton, width: 'auto', padding: '6px 14px', fontSize: 16 }} onClick={() => setSpecIndex((i) => i + 1)} aria-label="Siguiente">{'->'}</button>
          </div>
        )}
        {touch && portrait && phase === 'action' && (
          <p style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', margin: 0, padding: '10px 16px', borderRadius: 8, background: 'rgba(18,19,26,0.9)', border: '1px solid #3d2c33', fontSize: 14, zIndex: 25, textAlign: 'center', pointerEvents: 'none' }}>Gira el teléfono para jugar mejor</p>
        )}
        {helpOpen && <HelpPanel characters={characters} cards={cardCatalog} onClose={() => setHelpOpen(false)} />}

        {warn && (
          <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 60, width: 'min(420px, calc(100% - 24px))', boxSizing: 'border-box', padding: 12, borderRadius: 10, background: '#241a1e', border: '1px solid #f2a154', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span>No se puede guardar el juego como marcador ni como archivo desde aquí.</span>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" style={{ ...styles.smallButton, width: 'auto', padding: '6px 12px' }} onClick={() => setWarn(false)}>Entendido</button>
              <button type="button" style={{ ...styles.smallButton, width: 'auto', padding: '6px 12px' }} onClick={() => { try { localStorage.setItem('asym_no_warn', '1'); } catch {} setWarn(false); }}>No volver a preguntar</button>
            </div>
          </div>
        )}
        {errorMsg && (
          <p style={sx(styles.errorOverlay, { top: 48, left: 8, maxWidth: 'calc(100% - 16px)', zIndex: 35 })}>
            {errorMsg}
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              style={styles.errorDismiss}
              aria-label="Cerrar error"
            >
              ✕
            </button>
          </p>
        )}

        {!isConnected && (
          <p style={sx(styles.reconnectingOverlay, { top: 48, zIndex: 35 })}>Reconectando con el servidor...</p>
        )}

        {cosmeticsOpen && phase === 'lobby' && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setCosmeticsOpen(false)}>
            <div style={{ width: 'min(440px, calc(100% - 24px))', maxHeight: 'calc(100% - 24px)', overflowY: 'auto', boxSizing: 'border-box', padding: 14, borderRadius: 10, background: '#241a1e', border: '1px solid #3d2c33', display: 'flex', flexDirection: 'column', gap: 10 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong>Personalizar personaje</strong>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <img src="/desgracias.png" alt="Desgracias (hipercomplejos)" title="Desgracias: se miden en hipercomplejos (ℍ, cuaterniones)" width={22} height={22} />
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}><strong>{Math.floor(normQ(desgracias.balance))} ℍ</strong><span style={{ fontSize: 10, color: '#a8959a' }}>{formatQ(desgracias.balance)}</span></span>
                </span>
              </div>
              {Object.keys(ITEMS).map((slot) => (
                <div key={slot} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#a8959a' }}>{SLOT_LABELS[slot]}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button type="button" style={{ ...styles.smallButton, width: 'auto', padding: '6px 10px', borderColor: !cosmetics[slot] ? '#f0c26b' : '#3d2c33' }} onClick={() => { const next = { ...cosmetics }; delete next[slot]; updateCosmetics(next); }}>Ninguno</button>
                    {Object.entries(ITEMS[slot]).map(([id, def]) => {
                      const owned = desgracias.owned.includes(id);
                      const price = priceOf(id);
                      const affordable = normQ(desgracias.balance) >= price;
                      return (
                        <button
                          key={id}
                          type="button"
                          style={{ ...styles.smallButton, width: 'auto', padding: '6px 10px', borderColor: cosmetics[slot]?.id === id ? '#f0c26b' : owned ? '#3d2c33' : affordable ? '#f2d154' : '#3d2c33', opacity: owned || affordable ? 1 : 0.55 }}
                          onClick={() => {
                            if (!owned && !buyItem(id)) return;
                            updateCosmetics({ ...cosmetics, [slot]: { id, color: cosmetics[slot]?.color || COLORS[0] } });
                          }}
                        >
                          {def.name}{!owned && <span style={{ marginLeft: 6, color: '#f2d154' }}>{price} ℍ</span>}
                        </button>
                      );
                    })}
                  </div>
                  {cosmetics[slot] && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {COLORS.map((c) => (
                        <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => updateCosmetics({ ...cosmetics, [slot]: { ...cosmetics[slot], color: c } })} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: cosmetics[slot].color === c ? '2px solid #fff' : '1px solid #3d2c33', cursor: 'pointer', padding: 0 }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button type="button" style={{ ...styles.smallButton, width: 'auto', padding: '6px 12px', alignSelf: 'flex-end' }} onClick={() => setCosmeticsOpen(false)}>Listo</button>
            </div>
          </div>
        )}
        {replay && (
          <div style={{ position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)', zIndex: 60, display: 'flex', gap: 10, alignItems: 'center', padding: '6px 12px', borderRadius: 8, background: 'rgba(27, 29, 41, 0.92)', border: '1px solid #f2a154', fontSize: 13 }}>
            <span>Repetición</span>
            <button type="button" style={{ ...styles.smallButton, width: 'auto', padding: '4px 10px' }} onClick={() => setReplay(null)}>Saltar</button>
          </div>
        )}
        {gameOverInfo && !replay && (
          <div style={styles.gameOverOverlay}>
            <div style={styles.gameOverCard}>
              <h2 style={styles.gameOverTitle(gameOverInfo.curatorWon)}>
                {gameOverInfo.curatorWon
                  ? isAsymRole
                    ? `¡Ganaste como ${players.find((p) => p.id === myPlayerId)?.character?.displayName || 'Curador'}!`
                    : `${players.find((p) => p.isAsymRole)?.character?.displayName || 'El Curador'} ganó`
                  : isAsymRole
                    ? `Perdiste como ${players.find((p) => p.id === myPlayerId)?.character?.displayName || 'Curador'}`
                    : '¡Los Pacientes ganaron!'}
              </h2>
              {lastAward && lastAward.total > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '6px 0', fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src="/desgracias.png" alt="Desgracias" width={28} height={28} />
                    <strong>+{Math.round(normQ(awardToQ(lastAward.items)))} ℍ, {formatQ(awardToQ(lastAward.items))}</strong>
                  </div>
                  {lastAward.items.map((it) => (
                    <div key={it.label} style={{ display: 'flex', justifyContent: 'space-between', color: '#a8959a' }}><span>{it.label}</span><span>+{it.amount}{it.axis && it.axis !== 'r' ? it.axis : ''}</span></div>
                  ))}
                </div>
              )}
              <p style={styles.gameOverReason}>
                {gameOverInfo.reason === 'timeout' ? 'Se acabó el tiempo' : gameOverInfo.reason === 'curator_depleted' ? 'La salud del Curador llegó a 0' : gameOverInfo.reason === 'curator_overhealed' ? 'El Curador se curó hasta el máximo' : 'Todos los Pacientes fueron resueltos'}
              </p>
              <ul style={styles.gameOverList}>
                {Object.entries(gameOverInfo.patientResults).map(([playerId, result]) => {
                  const player = players.find((p) => p.id === playerId);
                  return (
                    <li key={playerId} style={styles.gameOverListItem}>
                      <span>{player?.name || playerId}{playerId === myPlayerId ? ' (tú)' : ''}</span>
                      <span style={styles.gameOverResultTag(result.status)}>
                        {result.status === 'eliminated' && 'Eliminado'}
                        {result.status === 'self_won' && 'Ganó'}
                        {result.status === 'timeout' && 'Sobrevivió'}
                        {' / '}{fmtHp(result.hp)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {isHost ? (
                <>
                  <button style={styles.linkButton(false)} onClick={startReplay}>Ver repetición</button>
                  <button style={styles.button(false)} onClick={handleReturnToLobby}>Volver al lobby</button>
                </>
              ) : (
                <>
                  <p style={styles.waitingForHost}>Esperando a que el host vuelva al lobby...</p>
                  <button style={styles.linkButton(false)} onClick={() => setGameOverInfo(null)}>Cerrar este cartel</button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <Wordmark />
        <header style={styles.header}>
          <span style={styles.dot(status)} />
          <span style={styles.statusText}>{statusLabel(status)}</span>
        </header>

        {status === 'checking_session' && <p style={styles.phaseLabel}>Cargando...</p>}

        {status === 'needs_login' && (
          <div style={styles.form}>
            <button
              style={styles.oauthButton('#4285F4', oauthLoading !== null)}
              onClick={() => { setOauthLoading('google'); redirectToOAuthLogin('google'); }}
              disabled={oauthLoading !== null}
            >
              {oauthLoading === 'google' ? 'Redirigiendo...' : 'Continuar con Google'}
            </button>
            <button
              style={styles.oauthButton('#5865F2', oauthLoading !== null)}
              onClick={() => { setOauthLoading('discord'); redirectToOAuthLogin('discord'); }}
              disabled={oauthLoading !== null}
            >
              {oauthLoading === 'discord' ? 'Redirigiendo...' : 'Continuar con Discord'}
            </button>
            <div style={styles.divider}>
              <span style={styles.dividerLine} />
              <span style={styles.dividerText}>o</span>
              <span style={styles.dividerLine} />
            </div>
            <form onSubmit={handleGuestLogin} style={styles.form}>
              <label style={styles.label}>
                Jugar sin cuenta
                <input
                  style={styles.input}
                  value={guestNameInput}
                  onChange={(e) => setGuestNameInput(e.target.value)}
                  placeholder="Nombre de invitado"
                  maxLength={30}
                  disabled={guestLoading}
                />
              </label>
              <button
                style={styles.button(guestLoading || !guestNameInput.trim())}
                type="submit"
                disabled={guestLoading || !guestNameInput.trim()}
              >
                {guestLoading ? 'Entrando...' : 'Entrar como invitado'}
              </button>
            </form>
          </div>
        )}

        {status === 'logged_in' && (
          <form onSubmit={handleJoin} style={styles.form}>
            {editingName ? (
              <form onSubmit={handleSaveDisplayName} style={styles.nameEditRow}>
                <input
                  style={styles.input}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Tu nombre"
                  maxLength={30}
                  autoFocus
                  disabled={nameSaving}
                />
                <button
                  type="submit"
                  style={styles.button(nameSaving || !nameInput.trim())}
                  disabled={nameSaving || !nameInput.trim()}
                >
                  {nameSaving ? '...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  style={styles.linkButton(nameSaving)}
                  disabled={nameSaving}
                  onClick={() => setEditingName(false)}
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <p style={styles.roomLabel}>
                Jugando como {displayName}{' '}
                <button type="button" style={styles.linkButton(false)} onClick={handleStartEditName}>
                  cambiar nombre
                </button>
              </p>
            )}
            {roomList.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '4px 0 8px' }}>
                {roomList.map((r) => (
                  <button key={r.id} type="button" disabled={joinLoading} onClick={() => setRoomId(r.id)} style={{ padding: '6px 10px', borderRadius: 8, border: roomId.trim().toLowerCase() === r.id ? '1px solid #f3e9a6' : '1px solid #4d3840', background: '#241a1e', color: '#f3e8e5', fontSize: 13, cursor: 'pointer' }}>
                    {r.id} ({r.players})
                  </button>
                ))}
              </div>
            )}
            <label style={styles.label}>
              Sala
              <input
                style={styles.input}
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="ID de sala"
                disabled={joinLoading}
                autoFocus
              />
            </label>
            <button
              style={styles.button(joinLoading || !roomId.trim())}
              type="submit"
              disabled={joinLoading || !roomId.trim()}
            >
              {joinLoading ? 'Uniéndose...' : 'Unirse a la sala'}
            </button>
            <button type="button" onClick={handleLogout} style={styles.linkButton(joinLoading)} disabled={joinLoading}>
              Cerrar sesión
            </button>
          </form>
        )}

        {errorMsg && (
          <p style={styles.error}>
            {errorMsg}
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              style={styles.errorDismiss}
              aria-label="Cerrar error"
            >
              ✕
            </button>
          </p>
        )}
      </div>
    </main>
  );
}

function statusLabel(status) {
  if (status === 'checking_session') return 'Verificando sesión...';
  if (status === 'needs_login') return 'Sin iniciar sesión';
  if (status === 'logged_in') return 'Conectado';
  if (status === 'in_room') return 'En sala';
  return 'Desconectado';
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const BODY_FONT = '"Bricolage Grotesque", system-ui, -apple-system, sans-serif';

function Wordmark() {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontWeight: 800, fontSize: 46, letterSpacing: '-0.035em', lineHeight: 1, color: '#f3e8e5' }}>réplica</div>
      <svg viewBox="0 0 240 28" width="100%" height="28" preserveAspectRatio="xMinYMid meet" aria-hidden="true" style={{ display: 'block', marginTop: 10, overflow: 'visible' }}>
        <path className="beat" pathLength="1" d="M0 14 H56 L63 14 L69 3 L77 25 L84 8 L89 14 H134" fill="none" stroke="#d94a52" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M134 14 H240" fill="none" stroke="#7fe08b" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 7" opacity="0.85" />
      </svg>
    </div>
  );
}

const styles = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1215',
    color: '#f3e8e5',
    fontFamily: BODY_FONT,
  },
  card: {
    width: 'min(380px, calc(100vw - 32px))',
    boxSizing: 'border-box',
    padding: 28,
    borderRadius: 12,
    background: '#241a1e',
    border: '1px solid #3d2c33',
  },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 },
  dot: (status) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background:
      status === 'needs_login' || status === 'disconnected'
        ? '#e0555f'
        : status === 'checking_session'
        ? '#a8959a'
        : '#5fd58c',
  }),
  statusText: { fontSize: 13, color: '#a8959a', letterSpacing: 0.2 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#a8959a' },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #3d2c33',
    background: '#1a1215',
    color: '#f3e8e5',
    fontSize: 14,
  },
  button: (disabled) => ({
    marginTop: 6,
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    background: '#d94a52',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'opacity 0.15s ease',
  }),
  oauthButton: (bgColor, disabled) => ({
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    background: bgColor,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'opacity 0.15s ease',
  }),
  divider: { display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' },
  dividerLine: { flex: 1, height: 1, background: '#3d2c33' },
  dividerText: { fontSize: 12, color: '#a8959a' },
  linkButton: (disabled) => ({
    background: 'none',
    border: 'none',
    color: '#a8959a',
    fontSize: 12,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    textDecoration: 'underline',
    padding: 0,
  }),
  roomLabel: { fontSize: 14, color: '#a8959a', margin: 0 },
  nameEditRow: { display: 'flex', gap: 6, alignItems: 'center' },
  inRoomNameInput: {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid #3d2c33',
    background: '#1a1215',
    color: '#f3e8e5',
    fontSize: 12,
    width: 110,
  },
  phaseLabel: { fontSize: 13, color: '#a8959a', margin: 0 },
  playerList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '38vh', overflowY: 'auto' },
  playerItem: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    padding: '8px 10px',
    borderRadius: 6,
    background: '#1a1215',
    fontSize: 14,
  },
  playerTag: { fontSize: 12, color: '#a8959a' },
  smallButton: {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid #3d2c33',
    background: '#241a1e',
    color: '#f3e8e5',
    fontSize: 11,
    cursor: 'pointer',
    width: '100%',
  },
  characterPicker: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 10,
    borderRadius: 6,
    background: '#1a1215',
  },
  characterPickerLabel: { fontSize: 12, color: '#a8959a', margin: '0 0 2px' },
  characterOption: (selected) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    padding: '8px 10px',
    borderRadius: 6,
    border: selected ? '1px solid #f2a154' : '1px solid #3d2c33',
    background: selected ? 'rgba(242, 161, 84, 0.12)' : '#241a1e',
    color: '#f3e8e5',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
  }),
  characterWeapon: { fontSize: 11, fontWeight: 400, color: '#a8959a' },
  mapPicker: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 10,
    borderRadius: 6,
    background: '#1a1215',
  },
  mapSelect: {
    padding: '7px 10px',
    borderRadius: 6,
    border: '1px solid #3d2c33',
    background: '#241a1e',
    color: '#f3e8e5',
    fontSize: 13,
  },
  mapReadOnly: { fontSize: 13, color: '#f3e8e5', margin: 0 },
  editorLink: { fontSize: 11, color: '#d94a52', textDecoration: 'none' },
  roleTag: (isAsym) => ({ fontSize: 13, fontWeight: 600, color: isAsym ? '#f2a154' : '#5fd58c', margin: 0 }),
  timerTag: (ms) => ({
    fontSize: 13,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    color: ms < 30000 ? '#e0555f' : '#f3e8e5',
    margin: 0,
  }),
  error: {
    marginTop: 14,
    fontSize: 13,
    color: '#e0555f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  errorDismiss: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: 12,
    opacity: 0.8,
    padding: '2px 4px',
    lineHeight: 1,
  },
  chatHistory: {
    height: 180,
    overflowY: 'auto',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    background: 'rgba(18, 19, 26, 0.6)',
  },
  chatEmpty: { fontSize: 12, color: '#565a6e', margin: 'auto 0', textAlign: 'center' },
  chatLine: { fontSize: 13, margin: 0, lineHeight: 1.4, wordBreak: 'break-word' },
  chatAuthor: (isMe) => ({ fontWeight: 600, color: isMe ? '#d94a52' : '#a8959a' }),
  chatText: { color: '#f3e8e5' },
  chatInputRow: { display: 'flex', gap: 8, padding: 8, borderTop: '1px solid #3d2c33', background: '#241a1e' },
  chatInput: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #3d2c33',
    background: '#1a1215',
    color: '#f3e8e5',
    fontSize: 13,
  },
  chatSendButton: (disabled) => ({
    padding: '8px 14px',
    borderRadius: 6,
    border: 'none',
    background: disabled ? '#3d2c33' : '#d94a52',
    color: disabled ? '#565a6e' : '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
  }),
  gameMain: {
    position: 'fixed',
    inset: 0,
    overflow: 'hidden',
    background: '#0a0b10',
    fontFamily: BODY_FONT,
    color: '#f3e8e5',
  },
  sceneContainer: { position: 'absolute', inset: 0, userSelect: 'none', WebkitUserSelect: 'none' },
  topBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 14px',
    borderRadius: 8,
    background: 'rgba(27, 29, 41, 0.85)',
    border: '1px solid #3d2c33',
    backdropFilter: 'blur(4px)',
  },
  playersOverlay: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 220,
    padding: 14,
    borderRadius: 8,
    background: 'rgba(27, 29, 41, 0.85)',
    border: '1px solid #3d2c33',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxHeight: 'calc(100% - 68px)',
    overflowY: 'auto',
    boxSizing: 'border-box',
    overscrollBehavior: 'contain',
    scrollbarWidth: 'thin',
  },
  chatOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 320,
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #3d2c33',
    background: 'rgba(27, 29, 41, 0.9)',
    backdropFilter: 'blur(4px)',
  },
  errorOverlay: {
    position: 'absolute',
    top: 70,
    left: 16,
    fontSize: 13,
    color: '#fff',
    background: 'rgba(224, 85, 95, 0.9)',
    padding: '8px 14px',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    maxWidth: 320,
  },
  reconnectingOverlay: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 13,
    fontWeight: 600,
    color: '#1a1215',
    background: '#f2a154',
    padding: '8px 14px',
    borderRadius: 6,
    margin: 0,
  },
  hpBarContainer: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 280,
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(27, 29, 41, 0.85)',
    border: '1px solid #3d2c33',
    backdropFilter: 'blur(4px)',
  },
  resolvedBanner: (won) => ({
    position: 'absolute',
    top: 110,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '10px 22px',
    borderRadius: 10,
    fontSize: 18,
    fontWeight: 700,
    textAlign: 'center',
    color: won ? '#5fd58c' : '#e0555f',
    background: 'rgba(18, 19, 26, 0.92)',
    border: `1px solid ${won ? '#5fd58c' : '#e0555f'}`,
  }),
  hpBarLabel: { fontSize: 12, color: '#a8959a', marginBottom: 6, textAlign: 'center' },
  curatorHpBar: {
    position: 'absolute',
    top: 64,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 320,
    padding: '8px 14px',
    borderRadius: 8,
    background: 'rgba(27, 29, 41, 0.85)',
    border: '1px solid #3d2c33',
    backdropFilter: 'blur(4px)',
  },
  curatorHpFill: (ratio) => ({
    height: '100%',
    width: `${Math.max(0, Math.min(1, ratio)) * 100}%`,
    background: ratio < 0.2 || ratio > 0.85 ? '#e0555f' : '#f2a154',
    transition: 'width 0.2s linear',
  }),
  flojeraBarContainer: {
    position: 'absolute',
    bottom: 86,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 220,
    padding: '8px 14px',
    borderRadius: 8,
    background: 'rgba(27, 29, 41, 0.85)',
    border: '1px solid #3d2c33',
    backdropFilter: 'blur(4px)',
  },
  flojeraBarLabel: { fontSize: 12, color: '#a8959a', marginBottom: 6, textAlign: 'center' },
  flojeraBarTrack: { height: 6, borderRadius: 3, background: '#1a1215', overflow: 'hidden' },
  flojeraBarFill: (value, max, locked) => ({
    height: '100%',
    width: `${Math.max(0, Math.min(1, value / max)) * 100}%`,
    background: locked ? '#e0555f' : '#d94a52',
    transition: 'width 0.15s linear',
  }),
  handContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    display: 'flex',
    gap: 8,
  },
  cardButton: (onCooldown) => ({
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: 64,
    height: 72,
    padding: 0,
    borderRadius: 10,
    border: '1px solid #3d2c33',
    background: onCooldown ? 'rgba(27, 29, 41, 0.6)' : 'rgba(95, 213, 140, 0.15)',
    color: onCooldown ? '#a8959a' : '#5fd58c',
    cursor: onCooldown ? 'default' : 'pointer',
    overflow: 'hidden',
  }),
  botRow: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#c3c5d6' },
  hitboxButton: (on) => ({
    position: 'absolute',
    top: 16,
    right: 288,
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: `1px solid ${on ? '#f0c26b' : '#3d2c33'}`,
    background: 'rgba(27, 29, 41, 0.85)',
    color: on ? '#f0c26b' : '#e8e9f0',
    fontSize: 16,
    cursor: 'pointer',
  }),
  hitboxSlider: {
    position: 'absolute',
    top: 56,
    right: 248,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '6px 10px',
    borderRadius: 8,
    background: 'rgba(27, 29, 41, 0.9)',
    border: '1px solid #3d2c33',
    fontSize: 11,
    color: '#c3c5d6',
  },
  helpButton: {
    position: 'absolute',
    top: 16,
    right: 248,
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '1px solid #3d2c33',
    background: 'rgba(27, 29, 41, 0.85)',
    color: '#e8e9f0',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
  cardButtonName: { fontSize: 13, fontWeight: 600 },
  draftSlot: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    background: 'rgba(27, 29, 41, 0.9)',
    border: '1px solid #3d2c33',
    width: 170,
  },
  draftOverlay: { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: '96vw' },
  draftRow: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  draftCard: (rarity, corrupt, n) => ({
    position: 'relative',
    width: 118,
    height: 168,
    borderRadius: 12,
    border: `2px solid ${corrupt ? '#d94fd0' : rarity === 'rare' ? '#f2a154' : rarity === 'uncommon' ? '#d94a52' : '#3d2c33'}`,
    background: 'linear-gradient(160deg, #241a20, #14151d)',
    boxShadow: '0 8px 22px rgba(0,0,0,0.55)',
    animationDelay: `${n * 90}ms`,
  }),
  draftFace: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: '100%', padding: '10px 6px', background: 'transparent', border: 'none', color: '#e8e9f0', cursor: 'pointer', borderRadius: 10, boxSizing: 'border-box', textAlign: 'center' },
  draftReroll: (on) => ({ position: 'absolute', top: 4, right: 4, width: 24, height: 24, padding: 0, background: '#1b2238', color: '#e8f1f8', border: '1px solid #4a6a8a', borderRadius: 12, cursor: on ? 'pointer' : 'default', opacity: on ? 1 : 0.35 }),
  draftTitle: { fontSize: 11, color: '#a8959a', textAlign: 'center' },
  draftOption: (rarity, corrupt) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '6px 8px',
    borderRadius: 6,
    border: `1px solid ${corrupt ? '#d94fd0' : rarity === 'rare' ? '#f2a154' : rarity === 'uncommon' ? '#d94a52' : '#3d2c33'}`,
    background: 'rgba(18, 19, 26, 0.9)',
    color: '#e8e9f0',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    boxSizing: 'border-box',
  }),
  draftHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  draftDeck: { fontSize: 9, color: '#a8959a', textTransform: 'uppercase', letterSpacing: 0.4 },
  draftDescription: { fontSize: 10, color: '#a8959a', fontWeight: 400 },
  cardButtonCooldown: { fontSize: 11, fontVariantNumeric: 'tabular-nums' },
  skillBar: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 8,
  },
  skillButton: (onCooldown) => ({
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: 64,
    height: 72,
    padding: 0,
    borderRadius: 10,
    border: '1px solid #3d2c33',
    background: onCooldown ? 'rgba(27, 29, 41, 0.6)' : 'rgba(95, 213, 140, 0.15)',
    color: onCooldown ? '#a8959a' : '#5fd58c',
    cursor: onCooldown ? 'default' : 'pointer',
    overflow: 'hidden',
  }),
  skillKey: { fontSize: 14, fontWeight: 800, lineHeight: 1, color: '#e8e9f0' },
  skillCooldownOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(15, 17, 26, 0.72)',
    fontSize: 22,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    color: '#e8e9f0',
  },
  keywordRow: { display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' },
  pulseHud: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 16px',
    borderRadius: 8,
    background: 'rgba(27, 29, 41, 0.85)',
    border: '1px solid #3d2c33',
    backdropFilter: 'blur(4px)',
  },
  pulseHudReady: { fontSize: 13, fontWeight: 600, color: '#5fd58c' },
  pulseHudCooldown: { fontSize: 13, fontWeight: 600, color: '#a8959a', fontVariantNumeric: 'tabular-nums' },
  hpBarTrack: { height: 8, borderRadius: 4, background: '#1a1215', overflow: 'hidden' },
  hpBarFill: (hp, maxHp = 120) => {
    if (maxHp > 1e6) return { height: '100%', width: '100%', background: '#54a8f2' };
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    const color = ratio < 0.5 ? '#5fd58c' : ratio < 0.85 ? '#f2a154' : '#e0555f';
    return { height: '100%', width: `${ratio * 100}%`, background: color, transition: 'width 0.2s ease, background 0.3s ease' };
  },
  actionFeedback: {
    position: 'absolute',
    top: 70,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 13,
    color: '#f3e8e5',
    background: 'rgba(84, 104, 255, 0.9)',
    padding: '6px 14px',
    borderRadius: 6,
    margin: 0,
  },
  gameOverOverlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 40,
    background: 'rgba(10, 11, 16, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(2px)',
  },
  gameOverCard: { width: 'min(380px, calc(100% - 32px))', maxHeight: '90%', overflowY: 'auto', boxSizing: 'border-box', padding: 28, borderRadius: 12, background: '#241a1e', border: '1px solid #3d2c33' },
  gameOverTitle: (curatorWon) => ({
    fontSize: 18,
    fontWeight: 700,
    color: curatorWon ? '#f2a154' : '#5fd58c',
    margin: '0 0 6px',
    textAlign: 'center',
  }),
  gameOverReason: { fontSize: 13, color: '#a8959a', textAlign: 'center', margin: '0 0 18px' },
  waitingForHost: { fontSize: 12, color: '#a8959a', textAlign: 'center', margin: '0 0 10px' },
  gameOverList: { listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 },
  gameOverListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: 6,
    background: '#1a1215',
    fontSize: 13,
  },
  gameOverResultTag: (resultStatus) => ({
    fontSize: 12,
    fontWeight: 600,
    color: resultStatus === 'self_won' ? '#5fd58c' : resultStatus === 'eliminated' ? '#e0555f' : '#a8959a',
  }),
};
