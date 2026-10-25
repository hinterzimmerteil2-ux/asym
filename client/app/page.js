'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
import SkillIcon from '../components/SkillIcon';
import HelpPanel from '../components/HelpPanel';
import StatusColumn from '../components/StatusColumn';
import RhythmBar from '../components/RhythmBar';
import TouchControls from '../components/TouchControls';
import { KEYWORDS } from '../lib/keywords';

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

export default function LobbyPage() {
  const connRef = useRef(null);
  const chatEndRef = useRef(null);
  const [status, setStatus] = useState('checking_session');
  const [sessionToken, setSessionToken] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [guestNameInput, setGuestNameInput] = useState('');
  const [roomId, setRoomId] = useState('');
  const [players, setPlayers] = useState([]);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [isAsymRole, setIsAsymRole] = useState(false);
  const [phase, setPhase] = useState('lobby');
  const [compact, setCompact] = useState(false);
  const [touch, setTouch] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [specIndex, setSpecIndex] = useState(0);
  const [shiftLock, setShiftLock] = useState(false);
  const [warn, setWarn] = useState(false);
  const [hitboxCfg, setHitboxCfg] = useState({ half: 0.4, height: 1.8, interact: 1.2 });
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
  const [entities, setEntities] = useState({});
  const [selfDamageObjects, setSelfDamageObjects] = useState({});
  const [zones, setZones] = useState([]);
  const [curatorHp, setCuratorHp] = useState(null);
  const [effects, setEffects] = useState([]);
  const [stunnedIds, setStunnedIds] = useState([]);
  const [ragdollIds, setRagdollIds] = useState([]);
  const [channelNow, setChannelNow] = useState(0);
  const channelRef = useRef(null);
  const entitiesRef = useRef({});
  const effectCounterRef = useRef(0);
  const [collisionObjects, setCollisionObjects] = useState([]);
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
  const [hitboxes, setHitboxes] = useState({ on: false, opacity: 0.8 });
  const [maps, setMaps] = useState([]);
  const [mapId, setMapId] = useState('default');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [skillCooldowns, setSkillCooldowns] = useState({});
  const [skillCooldownNow, setSkillCooldownNow] = useState(0);
  const [flojera, setFlojera] = useState(null);
  const [hand, setHand] = useState([]);
  const [cardCooldowns, setCardCooldowns] = useState({});
  const [cardCooldownNow, setCardCooldownNow] = useState(0);
  const [draftEndsAt, setDraftEndsAt] = useState(0);
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
            setMapId(payload.mapId || 'default');
            break;
          case 'room_update':
            setPlayers(payload.players);
            if (payload.hostId !== undefined) setHostId(payload.hostId);
            if (payload.mapId !== undefined) setMapId(payload.mapId);
            break;
          case 'chat_broadcast':
            setChatMessages((prev) => [...prev, payload]);
            break;
          case 'state_snapshot':
            setEntities(payload.entities || {});
            setSelfDamageObjects(payload.selfDamageObjects || {});
            setZones(payload.zones || []);
            setCuratorHp(payload.curator || null);
            setSpawnMs(payload.spawnMs || 0);
            entitiesRef.current = payload.entities || {};
            setStunnedIds(Object.entries(payload.flojera || {}).filter(([, v]) => v.stunned).map(([id]) => id));
            setRagdollIds(Object.entries(payload.flojera || {}).filter(([, v]) => v.ragdoll).map(([id]) => id));
            channelRef.current = payload.flojera?.[myPlayerIdRef.current]?.channel ? { ...payload.flojera[myPlayerIdRef.current].channel, at: performance.now() } : null;
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
            setLastActionFeedback(
              type === 'cure_result'
                ? `Curaste a un Paciente (HP: ${payload.newHp})`
                : `Te hiciste daño (HP: ${payload.newHp})`
            );
            break;
          case 'curator_pulse_result': {
            const caster = entitiesRef.current[payload.playerId];
            if (caster) {
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
            setCardCooldowns({});
            break;
          case 'card_chosen':
            setHand((prev) => prev.map((slot, i) => (i === payload.slot ? { ...slot, chosen: payload.card } : slot)));
            break;
          case 'card_result': {
            const caster = entitiesRef.current[payload.playerId];
            if (caster) {
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
          case 'game_over':
            setGameOverInfo(payload);
            break;
          case 'game_started':
            setPhase(payload.phase);
            setCollisionObjects(payload.collisionObjects || []);
            setPlatforms(payload.platforms || []);
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
  // activo — pulseCooldownUntil es un timestamp fijo, necesitamos un
  // "ahora" que avance para poder mostrar la cuenta regresiva.
  useEffect(() => {
    const anyActive = Object.values(skillCooldowns).some((until) => until > Date.now());
    if (!anyActive) return;
    const interval = setInterval(() => setSkillCooldownNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, [skillCooldowns]);

  useEffect(() => {
    if (draftEndsAt <= Date.now()) return;
    const interval = setInterval(() => setDraftNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [draftEndsAt]);

  useEffect(() => {
    const anyActive = Object.values(cardCooldowns).some((until) => until > Date.now());
    if (!anyActive) return;
    const interval = setInterval(() => setCardCooldownNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, [cardCooldowns]);

  // Antes un error se quedaba pegado en pantalla para siempre hasta la
  // próxima acción — ahora se auto-oculta (salvo que el usuario ya lo haya
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
    const room = Math.min(target, current + (10 - players.length));
    for (let i = current; i < room; i++) connRef.current?.send('add_bot', {});
    for (let i = current; i > target; i--) connRef.current?.send('remove_bot', {});
  }

  function handleStart() {
    connRef.current?.send('start_game', {});
  }

  function handleSetAsymRole(targetPlayerId) {
    connRef.current?.send('set_asym_role', { targetPlayerId });
  }

  function handleSelectCharacter(characterId) {
    connRef.current?.send('select_character', { characterId });
  }

  function handleSetMap(newMapId) {
    connRef.current?.send('set_map', { mapId: newMapId });
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
      // el nombre se actualice ahí mismo sin tener que reconectar —
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

  const handleSendInput = useCallback((input) => {
    connRef.current?.send('player_input', { input });
  }, []);

  const handleSendAction = useCallback((type, payload) => {
    connRef.current?.send(type, payload);
  }, []);

  const mySkills = players.find((p) => p.id === myPlayerId)?.character?.skills || [];

  const handlePulse = useCallback((skill) => {
    // Validamos en el cliente solo para no spamear el servidor con un
    // mensaje que de todos modos va a rechazar — la validación real
    // (rol, cooldown, fase) vive en Room.applyCuratorPulse.
    if (!isAsymRole || phase !== 'action') return;
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
      if (e.code === 'KeyH') setHelpOpen((open) => !open);
      else if ((e.code === 'ControlLeft' || e.code === 'ControlRight') && !e.repeat) setShiftLock((on) => !on);
      else if (e.code === 'KeyB') setHitboxes((prev) => ({ ...prev, on: !prev.on }));
      else if (e.code === 'Escape') setHelpOpen(false);
      else if (e.code === 'KeyE') {
        const ch = channelRef.current;
        if (ch) handleUseCard(ch.slot ?? 0);
      }
      else if (specRef.current.on && (e.code === 'ArrowRight' || e.code === 'BracketRight')) setSpecIndex((i) => i + 1);
      else if (specRef.current.on && (e.code === 'ArrowLeft' || e.code === 'BracketLeft')) setSpecIndex((i) => i - 1);
      else if (e.code === 'Digit1') handleUseCard(0);
      else if (e.code === 'Digit2') handleUseCard(1);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUseCard]);

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
  const specTargets = Object.keys(entities).filter((id) => id !== myPlayerId && !entities[id].gone && !entities[id].corpse);
  const specId = spectating && specTargets.length ? specTargets[((specIndex % specTargets.length) + specTargets.length) % specTargets.length] : null;
  specRef.current.on = spectating;
  const sx = (base, extra) => (compact ? { ...base, ...extra } : base);
  const playersOpen = panelOpen ?? phase === 'lobby';
  const handleInteract = () => {
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
      if (best) handleSendAction('cure_action', { targetPlayerId: best });
    } else {
      for (const [id, pos] of Object.entries(selfDamageObjects || {})) consider(id, pos);
      if (best) handleSendAction('self_damage_action', { objectId: best });
    }
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
          <GameScene
            entities={entities}
            players={players}
            myPlayerId={myPlayerId}
            phase={phase}
            selfDamageObjects={selfDamageObjects}
            zones={zones}
            effects={effects}
            stunnedIds={stunnedIds}
            ragdollIds={ragdollIds}
            collisionObjects={collisionObjects}
            platforms={platforms}
            sendInput={handleSendInput}
            sendAction={handleSendAction}
            onPulse={handlePulse}
            hitboxes={hitboxes}
            hitboxCfg={hitboxCfg}
            followId={specId}
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

        <div style={{ ...sx(styles.playersOverlay, { top: 52, right: 8, width: 'min(300px, calc(100% - 16px))', maxHeight: 'calc(100% - 64px)', overflowY: 'auto', boxSizing: 'border-box', padding: 10, zIndex: 30 }), ...(compact && !playersOpen ? { display: 'none' } : {}) }}>
          <ul style={sx(styles.playerList, { maxHeight: 130 })}>
            {players.map((p) => {
              const patientInfo = patients[p.id];
              const characterTag =
                p.isAsymRole && p.character
                  ? `· ${p.character.displayName} (${p.character.weaponName})`
                  : '';
              return (
                <li key={p.id} style={styles.playerItem}>
                  <span>
                    {p.isAsymRole ? '🩺 ' : ''}{p.name}{p.id === myPlayerId ? ' (tú)' : ''}
                  </span>
                  <span style={styles.playerTag}>
                    {p.id === hostId ? 'Host' : ''} {characterTag}
                    {phase === 'action' && patientInfo ? ` · HP ${Math.round(patientInfo.hp)}/${patientInfo.maxHp || 120}` : ''}
                  </span>
                  {phase === 'lobby' && isHost && !p.isAsymRole && (
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
            <div style={styles.mapPicker}>
              <p style={styles.characterPickerLabel}>Mapa</p>
              {isHost ? (
                <select
                  style={styles.mapSelect}
                  value={mapId}
                  onChange={(e) => handleSetMap(e.target.value)}
                >
                  {maps.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.custom ? ' (personalizado)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p style={styles.mapReadOnly}>
                  {maps.find((m) => m.id === mapId)?.name || mapId}
                </p>
              )}
              <Link href="/editor" style={styles.editorLink}>Crear mapa nuevo →</Link>
            </div>
          )}

          {phase === 'lobby' && isHost && (
            <label style={styles.botRow}>
              <span>Bots: {players.filter((pl) => pl.isBot).length}</span>
              <input
                type="range"
                min={0}
                max={9}
                value={players.filter((pl) => pl.isBot).length}
                onChange={(e) => handleBotCount(Number(e.target.value))}
                style={{ flex: 1 }}
              />
            </label>
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
          <div style={sx(styles.hpBarContainer, { ...bar, bottom: 'auto', top: 80 })}>
            <div style={sx(styles.hpBarLabel, { fontSize: 10, marginBottom: 3 })}>
              Tu HP: {Math.round(patients[myPlayerId].hp)}/{patients[myPlayerId].maxHp || 120}
              {patients[myPlayerId].hp <= 20 && ' (¡cerca de ganar!)'}
              {patients[myPlayerId].hp >= (patients[myPlayerId].maxHp || 120) - 20 && ' (¡cerca de ser curado del todo!)'}
            </div>
            <div style={styles.hpBarTrack}>
              <div style={styles.hpBarFill(patients[myPlayerId].hp, patients[myPlayerId].maxHp || 120)} />
            </div>
          </div>
        )}

        {phase === 'action' && curatorHp && (
          <div style={sx(styles.curatorHpBar, { ...bar, top: 50 })}>
            <div style={sx(styles.hpBarLabel, { fontSize: 10, marginBottom: 3 })}>
              {compact ? 'Curador' : 'Salud del Curador'}: {Math.round(curatorHp.hp)}/{curatorHp.max}{!compact && ` · pierde en 0 o en ${curatorHp.max}`}
            </div>
            <div style={styles.hpBarTrack}>
              <div style={styles.curatorHpFill(curatorHp.hp / curatorHp.max)} />
            </div>
          </div>
        )}

        {phase === 'action' && isAsymRole && spawnMs > 0 && (
          <div style={sx(styles.resolvedBanner(false), { top: 150, fontSize: 15 })}>Entras en {Math.ceil(spawnMs / 1000)}s</div>
        )}

        {phase === 'action' && flojera && <StatusColumn statuses={flojera.statuses} compact={compact} />}
        {phase === 'action' && flojera?.channel && <RhythmBar channelRef={channelRef} />}
        {phase === 'action' && !spectating && <TouchControls onInteract={handleInteract} isAsymRole={isAsymRole} cardCooldowns={cardCooldowns} skillCooldowns={skillCooldowns} />}

        {phase === 'action' && flojera && (
          <div style={sx(styles.flojeraBarContainer, { ...bar, bottom: 'auto', top: isAsymRole ? 80 : 110 })}>
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

        {phase === 'action' && !isAsymRole && hand.length > 0 && (
          <div style={sx(styles.handContainer, { top: 50, bottom: 'auto', right: 8, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100% - 60px)', overflow: 'auto', zIndex: 30 })}>
            {hand.map((slot, i) => {
              if (!slot.chosen && slot.options.length === 0) {
                return (
                  <div key={i} style={sx(styles.draftSlot, { width: 130, padding: 6 })}>
                    <span style={styles.draftTitle}>Slot {i + 1} · elige primero el anterior</span>
                  </div>
                );
              }
              if (!slot.chosen) {
                const secondsLeft = Math.max(0, Math.ceil((draftEndsAt - Math.max(draftNow, Date.now())) / 1000));
                return (
                  <div key={i} style={sx(styles.draftSlot, { width: 130, padding: 6 })}>
                    <span style={styles.draftTitle}>Slot {i + 1} · elige ({secondsLeft}s)</span>
                    {slot.options.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handleChooseCard(i, card.id)}
                        style={styles.draftOption(card.rarity, card.corrupt)}
                        title={card.description}
                      >
                        <span style={styles.draftHeader}><SkillIcon id={card.id} size={26} /><span style={styles.cardButtonName}>{card.displayName}</span></span>
                        {card.deck && !compact && <span style={styles.draftDeck}>Mazo {card.deck}{card.corrupt ? ' · corrupto' : ''}</span>}
                        {!compact && <span style={styles.draftDescription}>{card.description}</span>}
                        <span style={styles.keywordRow}>
                          {(card.keywords || []).slice(0, 2).map((k) => <KeywordChip key={k} id={k} />)}
                        </span>
                      </button>
                    ))}
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
                  disabled={onCooldown}
                  onClick={() => handleUseCard(i)}
                  style={styles.cardButton(onCooldown)}
                  title={slot.chosen.description}
                >
                  <SkillIcon id={slot.chosen.id} size={34} />
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
                  {m.playerId === myPlayerId ? 'Tú' : m.playerName}:
                </span>{' '}
                <span style={styles.chatText}>{m.text}</span>
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

        <button type="button" onClick={() => setHelpOpen(true)} style={sx(styles.helpButton, { top: 8, right: 8, width: 36, height: 36, zIndex: 30 })} title="Ayuda (H)" aria-label="Ayuda">?</button>
        <button
          type="button"
          onClick={() => updateHitboxes({ ...hitboxes, on: !hitboxes.on })}
          style={sx(styles.hitboxButton(hitboxes.on), { top: 8, right: 52, width: 36, height: 36, zIndex: 30 })}
          title="Hitboxes (B)"
          aria-label="Hitboxes"
        >
          ◎
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
            <button type="button" onClick={() => { setPanelOpen(!playersOpen); setChatOpen(false); }} style={sx(styles.helpButton, { top: 8, right: 96, width: 36, height: 36, zIndex: 30, borderColor: playersOpen ? '#54d1f2' : '#2a2d3d' })} aria-label="Jugadores">☰</button>
            <button type="button" onClick={goFullscreen} style={sx(styles.helpButton, { top: 8, right: 184, width: 36, height: 36, zIndex: 30 })} aria-label="Pantalla completa">⛶</button>
            <button type="button" onClick={() => { setChatOpen(!chatOpen); setPanelOpen(false); }} style={sx(styles.helpButton, { top: 8, right: 140, width: 36, height: 36, zIndex: 30, borderColor: chatOpen ? '#54d1f2' : '#2a2d3d' })} aria-label="Chat">💬</button>
          </>
        )}
        {spectating && (
          <div style={{ position: 'absolute', left: '50%', bottom: 12, transform: 'translateX(-50%)', zIndex: 30, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 8, background: 'rgba(27, 29, 41, 0.9)', border: '1px solid #2a2d3d', fontSize: 13 }}>
            <button type="button" style={{ ...styles.smallButton, width: 'auto', padding: '6px 14px', fontSize: 16 }} onClick={() => setSpecIndex((i) => i - 1)} aria-label="Anterior">{'<-'}</button>
            <span>{specId ? `Espectando: ${players.find((p) => p.id === specId)?.name || specId}` : 'Nadie a quien seguir'}</span>
            <button type="button" style={{ ...styles.smallButton, width: 'auto', padding: '6px 14px', fontSize: 16 }} onClick={() => setSpecIndex((i) => i + 1)} aria-label="Siguiente">{'->'}</button>
          </div>
        )}
        {touch && portrait && phase === 'action' && (
          <p style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', margin: 0, padding: '10px 16px', borderRadius: 8, background: 'rgba(18,19,26,0.9)', border: '1px solid #2a2d3d', fontSize: 14, zIndex: 25, textAlign: 'center', pointerEvents: 'none' }}>Gira el teléfono para jugar mejor</p>
        )}
        {helpOpen && <HelpPanel characters={characters} cards={cardCatalog} onClose={() => setHelpOpen(false)} />}

        {warn && (
          <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 60, width: 'min(420px, calc(100% - 24px))', boxSizing: 'border-box', padding: 12, borderRadius: 10, background: '#1b1d29', border: '1px solid #f2a154', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
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

        {gameOverInfo && (
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
                        {' · '}{Math.round(result.hp)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {isHost ? (
                <button style={styles.button(false)} onClick={handleReturnToLobby}>Volver al lobby</button>
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

const styles = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#12131a',
    color: '#e8e8ef',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    width: 'min(380px, calc(100vw - 32px))',
    boxSizing: 'border-box',
    padding: 28,
    borderRadius: 12,
    background: '#1b1d29',
    border: '1px solid #2a2d3d',
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
        ? '#8a8da3'
        : '#5fd58c',
  }),
  statusText: { fontSize: 13, color: '#8a8da3', letterSpacing: 0.2 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#8a8da3' },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #2a2d3d',
    background: '#12131a',
    color: '#e8e8ef',
    fontSize: 14,
  },
  button: (disabled) => ({
    marginTop: 6,
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    background: '#5468ff',
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
  dividerLine: { flex: 1, height: 1, background: '#2a2d3d' },
  dividerText: { fontSize: 12, color: '#8a8da3' },
  linkButton: (disabled) => ({
    background: 'none',
    border: 'none',
    color: '#8a8da3',
    fontSize: 12,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    textDecoration: 'underline',
    padding: 0,
  }),
  roomLabel: { fontSize: 14, color: '#8a8da3', margin: 0 },
  nameEditRow: { display: 'flex', gap: 6, alignItems: 'center' },
  inRoomNameInput: {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid #2a2d3d',
    background: '#12131a',
    color: '#e8e8ef',
    fontSize: 12,
    width: 110,
  },
  phaseLabel: { fontSize: 13, color: '#8a8da3', margin: 0 },
  playerList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '38vh', overflowY: 'auto' },
  playerItem: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    padding: '8px 10px',
    borderRadius: 6,
    background: '#12131a',
    fontSize: 14,
  },
  playerTag: { fontSize: 12, color: '#8a8da3' },
  smallButton: {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid #2a2d3d',
    background: '#1b1d29',
    color: '#e8e8ef',
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
    background: '#12131a',
  },
  characterPickerLabel: { fontSize: 12, color: '#8a8da3', margin: '0 0 2px' },
  characterOption: (selected) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    padding: '8px 10px',
    borderRadius: 6,
    border: selected ? '1px solid #f2a154' : '1px solid #2a2d3d',
    background: selected ? 'rgba(242, 161, 84, 0.12)' : '#1b1d29',
    color: '#e8e8ef',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
  }),
  characterWeapon: { fontSize: 11, fontWeight: 400, color: '#8a8da3' },
  mapPicker: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 10,
    borderRadius: 6,
    background: '#12131a',
  },
  mapSelect: {
    padding: '7px 10px',
    borderRadius: 6,
    border: '1px solid #2a2d3d',
    background: '#1b1d29',
    color: '#e8e8ef',
    fontSize: 13,
  },
  mapReadOnly: { fontSize: 13, color: '#e8e8ef', margin: 0 },
  editorLink: { fontSize: 11, color: '#5468ff', textDecoration: 'none' },
  roleTag: (isAsym) => ({ fontSize: 13, fontWeight: 600, color: isAsym ? '#f2a154' : '#5fd58c', margin: 0 }),
  timerTag: (ms) => ({
    fontSize: 13,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    color: ms < 30000 ? '#e0555f' : '#e8e8ef',
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
  chatAuthor: (isMe) => ({ fontWeight: 600, color: isMe ? '#5468ff' : '#8a8da3' }),
  chatText: { color: '#e8e8ef' },
  chatInputRow: { display: 'flex', gap: 8, padding: 8, borderTop: '1px solid #2a2d3d', background: '#1b1d29' },
  chatInput: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #2a2d3d',
    background: '#12131a',
    color: '#e8e8ef',
    fontSize: 13,
  },
  chatSendButton: (disabled) => ({
    padding: '8px 14px',
    borderRadius: 6,
    border: 'none',
    background: disabled ? '#2a2d3d' : '#5468ff',
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
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#e8e8ef',
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
    border: '1px solid #2a2d3d',
    backdropFilter: 'blur(4px)',
  },
  playersOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 220,
    padding: 14,
    borderRadius: 8,
    background: 'rgba(27, 29, 41, 0.85)',
    border: '1px solid #2a2d3d',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  chatOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 320,
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #2a2d3d',
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
    color: '#12131a',
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
    border: '1px solid #2a2d3d',
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
  hpBarLabel: { fontSize: 12, color: '#8a8da3', marginBottom: 6, textAlign: 'center' },
  curatorHpBar: {
    position: 'absolute',
    top: 64,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 320,
    padding: '8px 14px',
    borderRadius: 8,
    background: 'rgba(27, 29, 41, 0.85)',
    border: '1px solid #2a2d3d',
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
    border: '1px solid #2a2d3d',
    backdropFilter: 'blur(4px)',
  },
  flojeraBarLabel: { fontSize: 12, color: '#8a8da3', marginBottom: 6, textAlign: 'center' },
  flojeraBarTrack: { height: 6, borderRadius: 3, background: '#12131a', overflow: 'hidden' },
  flojeraBarFill: (value, max, locked) => ({
    height: '100%',
    width: `${Math.max(0, Math.min(1, value / max)) * 100}%`,
    background: locked ? '#e0555f' : '#5468ff',
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
    border: '1px solid #2a2d3d',
    background: onCooldown ? 'rgba(27, 29, 41, 0.6)' : 'rgba(95, 213, 140, 0.15)',
    color: onCooldown ? '#8a8da3' : '#5fd58c',
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
    border: `1px solid ${on ? '#54d1f2' : '#2a2d3d'}`,
    background: 'rgba(27, 29, 41, 0.85)',
    color: on ? '#54d1f2' : '#e8e9f0',
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
    border: '1px solid #2a2d3d',
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
    border: '1px solid #2a2d3d',
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
    border: '1px solid #2a2d3d',
    width: 170,
  },
  draftTitle: { fontSize: 11, color: '#8a8da3', textAlign: 'center' },
  draftOption: (rarity, corrupt) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '6px 8px',
    borderRadius: 6,
    border: `1px solid ${corrupt ? '#d94fd0' : rarity === 'rare' ? '#f2a154' : rarity === 'uncommon' ? '#5468ff' : '#2a2d3d'}`,
    background: 'rgba(18, 19, 26, 0.9)',
    color: '#e8e9f0',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    boxSizing: 'border-box',
  }),
  draftHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  draftDeck: { fontSize: 9, color: '#8a8da3', textTransform: 'uppercase', letterSpacing: 0.4 },
  draftDescription: { fontSize: 10, color: '#8a8da3', fontWeight: 400 },
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
    border: '1px solid #2a2d3d',
    background: onCooldown ? 'rgba(27, 29, 41, 0.6)' : 'rgba(95, 213, 140, 0.15)',
    color: onCooldown ? '#8a8da3' : '#5fd58c',
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
    border: '1px solid #2a2d3d',
    backdropFilter: 'blur(4px)',
  },
  pulseHudReady: { fontSize: 13, fontWeight: 600, color: '#5fd58c' },
  pulseHudCooldown: { fontSize: 13, fontWeight: 600, color: '#8a8da3', fontVariantNumeric: 'tabular-nums' },
  hpBarTrack: { height: 8, borderRadius: 4, background: '#12131a', overflow: 'hidden' },
  hpBarFill: (hp, maxHp = 120) => {
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
    color: '#e8e8ef',
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
  gameOverCard: { width: 'min(380px, calc(100% - 32px))', maxHeight: '90%', overflowY: 'auto', boxSizing: 'border-box', padding: 28, borderRadius: 12, background: '#1b1d29', border: '1px solid #2a2d3d' },
  gameOverTitle: (curatorWon) => ({
    fontSize: 18,
    fontWeight: 700,
    color: curatorWon ? '#f2a154' : '#5fd58c',
    margin: '0 0 6px',
    textAlign: 'center',
  }),
  gameOverReason: { fontSize: 13, color: '#8a8da3', textAlign: 'center', margin: '0 0 18px' },
  waitingForHost: { fontSize: 12, color: '#8a8da3', textAlign: 'center', margin: '0 0 10px' },
  gameOverList: { listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 },
  gameOverListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: 6,
    background: '#12131a',
    fontSize: 13,
  },
  gameOverResultTag: (resultStatus) => ({
    fontSize: 12,
    fontWeight: 600,
    color: resultStatus === 'self_won' ? '#5fd58c' : resultStatus === 'eliminated' ? '#e0555f' : '#8a8da3',
  }),
};
