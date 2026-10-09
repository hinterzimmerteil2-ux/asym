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
} from '../lib/session';
import GameScene from '../components/GameScene';

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
  const [errorMsg, setErrorMsg] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [entities, setEntities] = useState({});
  const [selfDamageObjects, setSelfDamageObjects] = useState({});
  const [collisionObjects, setCollisionObjects] = useState([]);
  const [patients, setPatients] = useState({});
  const [timeRemainingMs, setTimeRemainingMs] = useState(null);
  const [lastActionFeedback, setLastActionFeedback] = useState(null);
  const [gameOverInfo, setGameOverInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hostId, setHostId] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [maps, setMaps] = useState([]);
  const [mapId, setMapId] = useState('default');

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
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { sessionTokenRef.current = sessionToken; }, [sessionToken]);

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
            setStatus('in_room');
            setMyPlayerId(payload.playerId);
            setIsAsymRole(payload.isAsymRole);
            setPlayers(payload.players);
            setChatMessages(payload.chatHistory || []);
            setHostId(payload.hostId ?? null);
            setCharacters(payload.characters || []);
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
            setPatients(payload.patients || {});
            setTimeRemainingMs(payload.timeRemainingMs ?? null);
            break;
          case 'cure_result':
          case 'self_damage_result':
            setLastActionFeedback(
              type === 'cure_result'
                ? `Curaste a un Paciente (HP: ${payload.newHp})`
                : `Te hiciste daño (HP: ${payload.newHp})`
            );
            break;
          case 'game_over':
            setGameOverInfo(payload);
            break;
          case 'game_started':
            setPhase(payload.phase);
            setCollisionObjects(payload.collisionObjects || []);
            break;
          case 'room_full':
            setErrorMsg('La sala está llena.');
            break;
          case 'phase_change':
            setPhase(payload.newPhase);
            break;
          case 'error':
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
    setRoomId(trimmedRoomId);
    connRef.current?.send('join_room', { roomId: trimmedRoomId, token: sessionToken });
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

  function handleLogout() {
    clearSession();
    connRef.current?.close();
    setSessionToken(null);
    setDisplayName(null);
    setStatus('needs_login');
  }

  const isHost = hostId !== null && hostId === myPlayerId;

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
            collisionObjects={collisionObjects}
            sendInput={handleSendInput}
            sendAction={handleSendAction}
          />
        </div>

        <div style={styles.topBar}>
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
        </div>

        <div style={styles.playersOverlay}>
          <ul style={styles.playerList}>
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
                    {phase === 'action' && patientInfo ? ` · HP ${patientInfo.hp}/120` : ''}
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
            <button
              style={styles.button}
              onClick={handleStart}
              disabled={players.length < 2}
              title={players.length < 2 ? 'Hace falta al menos 1 Curador y 1 Paciente' : undefined}
            >
              Iniciar partida{players.length < 2 ? ' (falta 1 jugador)' : ''}
            </button>
          )}
        </div>

        {phase === 'action' && !isAsymRole && myPlayerId && patients[myPlayerId] && (
          <div style={styles.hpBarContainer}>
            <div style={styles.hpBarLabel}>
              Tu HP: {patients[myPlayerId].hp}/120
              {patients[myPlayerId].hp <= 20 && ' (¡cerca de ganar!)'}
              {patients[myPlayerId].hp >= 100 && ' (¡cerca de ser curado del todo!)'}
            </div>
            <div style={styles.hpBarTrack}>
              <div style={styles.hpBarFill(patients[myPlayerId].hp)} />
            </div>
          </div>
        )}

        {lastActionFeedback && <p style={styles.actionFeedback}>{lastActionFeedback}</p>}

        <div style={styles.chatOverlay}>
          <div style={styles.chatHistory}>
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

        <p style={styles.controlsHint}>
          {phase === 'action'
            ? isAsymRole
              ? `WASD para moverte · Click en un Paciente para curarlo con tu ${players.find((p) => p.id === myPlayerId)?.character?.weaponName || 'arma'}`
              : 'WASD para moverte · Espacio para saltar · Click en un objeto rojo para auto-dañarte'
            : 'WASD para moverte · Espacio para saltar · Arrastrá para rotar cámara'}
        </p>

        {errorMsg && <p style={styles.errorOverlay}>{errorMsg}</p>}

        {!isConnected && (
          <p style={styles.reconnectingOverlay}>Reconectando con el servidor...</p>
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
                {gameOverInfo.reason === 'timeout' ? 'Se acabó el tiempo' : 'Todos los Pacientes fueron resueltos'}
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
                        {' · '}{result.hp}/120
                      </span>
                    </li>
                  );
                })}
              </ul>
              <button style={styles.button} onClick={() => setGameOverInfo(null)}>Cerrar</button>
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
            <button style={styles.oauthButton('#4285F4')} onClick={() => redirectToOAuthLogin('google')}>
              Continuar con Google
            </button>
            <button style={styles.oauthButton('#5865F2')} onClick={() => redirectToOAuthLogin('discord')}>
              Continuar con Discord
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
                />
              </label>
              <button style={styles.button} type="submit" disabled={guestLoading || !guestNameInput.trim()}>
                {guestLoading ? 'Entrando...' : 'Entrar como invitado'}
              </button>
            </form>
          </div>
        )}

        {status === 'logged_in' && (
          <form onSubmit={handleJoin} style={styles.form}>
            <p style={styles.roomLabel}>Jugando como {displayName}</p>
            <label style={styles.label}>
              Sala
              <input
                style={styles.input}
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="ID de sala"
              />
            </label>
            <button style={styles.button} type="submit">Unirse a la sala</button>
            <button type="button" onClick={handleLogout} style={styles.linkButton}>Cerrar sesión</button>
          </form>
        )}

        {errorMsg && <p style={styles.error}>{errorMsg}</p>}
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
    width: 380,
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
  button: {
    marginTop: 6,
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    background: '#5468ff',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  oauthButton: (bgColor) => ({
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    background: bgColor,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  }),
  divider: { display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' },
  dividerLine: { flex: 1, height: 1, background: '#2a2d3d' },
  dividerText: { fontSize: 12, color: '#8a8da3' },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#8a8da3',
    fontSize: 12,
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
  },
  roomLabel: { fontSize: 14, color: '#8a8da3', margin: 0 },
  phaseLabel: { fontSize: 13, color: '#8a8da3', margin: 0 },
  playerList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 },
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
  error: { marginTop: 14, fontSize: 13, color: '#e0555f' },
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
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: '#0a0b10',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#e8e8ef',
  },
  sceneContainer: { position: 'absolute', inset: 0 },
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
  controlsHint: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    fontSize: 12,
    color: '#8a8da3',
    background: 'rgba(27, 29, 41, 0.7)',
    padding: '6px 12px',
    borderRadius: 6,
    margin: 0,
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
  hpBarLabel: { fontSize: 12, color: '#8a8da3', marginBottom: 6, textAlign: 'center' },
  hpBarTrack: { height: 8, borderRadius: 4, background: '#12131a', overflow: 'hidden' },
  hpBarFill: (hp) => {
    const ratio = Math.max(0, Math.min(1, hp / 120));
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
    background: 'rgba(10, 11, 16, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(2px)',
  },
  gameOverCard: { width: 380, padding: 28, borderRadius: 12, background: '#1b1d29', border: '1px solid #2a2d3d' },
  gameOverTitle: (curatorWon) => ({
    fontSize: 18,
    fontWeight: 700,
    color: curatorWon ? '#f2a154' : '#5fd58c',
    margin: '0 0 6px',
    textAlign: 'center',
  }),
  gameOverReason: { fontSize: 13, color: '#8a8da3', textAlign: 'center', margin: '0 0 18px' },
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
