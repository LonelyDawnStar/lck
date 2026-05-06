import { useEffect, useMemo, useRef, useState } from 'react';
import Phaser from 'phaser';
import { io } from 'socket.io-client';
import { GameScene } from './game/GameScene';

const SERVER = 'http://localhost:3001';

export default function App() {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [move, setMove] = useState({ x: 0, y: 0 });
  const socketRef = useRef(null);
  const gameRef = useRef(null);
  const gameContainerRef = useRef(null);

  const me = useMemo(() => gameState?.players?.[socketRef.current?.id], [gameState]);

  useEffect(() => {
    const socket = io(SERVER);
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('room:update', setGameState);
    socket.on('round:end', ({ rankings }) => setRankings(rankings));

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!connected || !gameContainerRef.current || gameRef.current || !socketRef.current?.id) return;
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: gameContainerRef.current,
      width: gameContainerRef.current.clientWidth,
      height: 520,
      physics: { default: 'arcade' },
      scene: [GameScene]
    });
    gameRef.current.scene.start('school-pass-panic', {
      socket: socketRef.current,
      myId: socketRef.current.id,
      getState: () => ({ gameState }),
      getMove: () => move
    });

    return () => gameRef.current?.destroy(true);
  }, [connected]);

  const createRoom = () => socketRef.current.emit('room:create', { nickname });
  const joinRoom = () => socketRef.current.emit('room:join', { nickname, roomCode });
  const passBall = () => socketRef.current.emit('ball:pass');

  return (
    <div className="app pixel">
      <h1>🎒 School Pass Panic</h1>
      <p>타이머 공을 넘기고 끝까지 살아남으세요! (최대 8명)</p>
      <section className="panel">
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임" maxLength={12} />
        <button onClick={createRoom} disabled={!nickname}>방 만들기</button>
        <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="방 코드" maxLength={5} />
        <button onClick={joinRoom} disabled={!nickname || !roomCode}>방 참가</button>
      </section>

      <section className="hud">
        <div>상태: {connected ? '연결됨' : '연결 끊김'}</div>
        <div>맵: {gameState?.mapId ?? '-'}</div>
        <div>남은 시간: {gameState?.timer ?? '-'}</div>
        <button className="pass" onClick={passBall} disabled={!me?.alive}>패스! 🏐</button>
      </section>

      <div ref={gameContainerRef} className="game" />

      <div className="joystick">
        <button onTouchStart={() => setMove({ x: -1, y: 0 })} onTouchEnd={() => setMove({ x: 0, y: 0 })}>◀</button>
        <button onTouchStart={() => setMove({ x: 1, y: 0 })} onTouchEnd={() => setMove({ x: 0, y: 0 })}>▶</button>
        <button onTouchStart={() => setMove({ x: 0, y: -1 })} onTouchEnd={() => setMove({ x: 0, y: 0 })}>▲</button>
        <button onTouchStart={() => setMove({ x: 0, y: 1 })} onTouchEnd={() => setMove({ x: 0, y: 0 })}>▼</button>
      </div>

      {rankings.length > 0 && (
        <div className="panel">
          <h2>라운드 순위</h2>
          {rankings.map((r, i) => <div key={r.id}>{i + 1}위 - {r.nickname}</div>)}
        </div>
      )}
    </div>
  );
}
