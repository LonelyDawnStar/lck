import { useEffect, useMemo, useState } from 'react';

const LOCAL_KEY = 'lck-manager-v3';
const POSITIONS = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
const PHASES = ['Spring Regular Season', 'MSI', 'Summer Regular Season', 'EWC', 'WORLDS'];

const REWARDS = {
  'Spring Regular Season': { budget: 8, fanbase: 8 },
  MSI: { budget: 15, fanbase: 20, starBoost: 1 },
  'Summer Regular Season': { budget: 10, fanbase: 10 },
  EWC: { budget: 12, fanbase: 15 },
  WORLDS: { budget: 30, fanbase: 40, allStarBoost: 2, legacy: 1 },
};

const TEAM_NAMES = ['T1', 'GEN', 'HLE', 'DK', 'KT'];
const NAMES = {
  TOP: ['Zephyr', 'Summit', 'Hawk', 'Rune', 'Ares', 'Boram'],
  JGL: ['Onyx', 'Viper', 'Storm', 'Pulse', 'Milo', 'Canyon'],
  MID: ['Nova', 'Ori', 'Fate', 'Blaze', 'Yuki', 'Loki'],
  ADC: ['Arrow', 'Ghost', 'Aero', 'Jett', 'Rex', 'Dean'],
  SUP: ['Core', 'Anchor', 'Mint', 'Beryl', 'Lime', 'Nami'],
};

const money = (v) => `${v.toFixed(1)}억`;

const mk = (id, nickname, position, team, ovr, tier, isAcademy = false) => ({
  id,
  nickname,
  position,
  tier,
  team,
  overall: ovr,
  form: 70,
  morale: 70,
  fatigue: isAcademy ? 15 : 35,
  loyalty: 70,
  marketValue: Math.round(ovr * 0.12 + (tier === 'S' ? 4 : tier === 'A' ? 2 : 1)),
  contractYears: isAcademy ? 3 : 2,
  annualSalary: isAcademy ? 0.5 : Math.round((ovr * 0.075 + 0.9) * 10) / 10,
  buyout: isAcademy ? 1.0 : Math.round((ovr * 0.12 + 2) * 10) / 10,
  starPower: tier === 'S' ? 85 : 60,
  isAcademy,
  isTransferListed: false,
  injuryRisk: 10,
  injuredGames: 0,
  resting: false,
  potential: isAcademy ? ovr + 10 : ovr + 2,
});

const generateUniverse = () => {
  const players = [];
  let id = 1;
  TEAM_NAMES.forEach((team, tdx) => {
    POSITIONS.forEach((pos, pdx) => players.push(mk(id++, `${team}-${NAMES[pos][tdx]}`, pos, team, 72 + tdx + pdx, tdx < 2 ? 'S' : 'A')));
  });
  POSITIONS.forEach((pos, idx) => players.push(mk(id++, `ACA-${NAMES[pos][idx + 1]}`, pos, 'ACADEMY', 60 + idx, 'B', true)));
  POSITIONS.forEach((pos, idx) => players.push(mk(id++, `FA-${NAMES[pos][idx + 2]}`, pos, 'FA', 66 + idx, 'A')));
  return players;
};

const createGame = (teamName) => ({
  hasStarted: true,
  teamName,
  budget: 35,
  fanbase: 20,
  legacy: 0,
  teamChemistry: 65,
  phaseIndex: 0,
  matchInPhase: 0,
  winStreak: 0,
  lossStreak: 0,
  standings: Object.fromEntries(TEAM_NAMES.concat(teamName).map((t) => [t, { w: 0, l: 0 }])),
  players: generateUniverse(),
  lineUp: { TOP: null, JGL: null, MID: null, ADC: null, SUP: null },
  events: ['새 구단 창단! 선수단 없이 시작합니다.'],
  tab: 'overview',
  minigame: null,
});

export default function App() {
  const [state, setState] = useState(() => {
    const saved = localStorage.getItem(LOCAL_KEY);
    return saved ? JSON.parse(saved) : { hasStarted: false, teamNameInput: '' };
  });

  useEffect(() => localStorage.setItem(LOCAL_KEY, JSON.stringify(state)), [state]);

  if (!state.hasStarted) {
    return (
      <div className="app">
        <h1>LCK Manager Simulator</h1>
        <div className="panel">
          <h2>구단명 설정</h2>
          <input className="name-input" value={state.teamNameInput || ''} placeholder="예: DRX Next" onChange={(e) => setState({ ...state, teamNameInput: e.target.value })} />
          <button className="primary" onClick={() => state.teamNameInput?.trim() && setState(createGame(state.teamNameInput.trim()))}>게임 시작</button>
        </div>
        <UniverseRosterPreview />
      </div>
    );
  }

  const userPlayers = state.players.filter((p) => p.team === state.teamName);
  const market = state.players.filter((p) => p.team !== state.teamName && !p.isAcademy);
  const academy = state.players.filter((p) => p.isAcademy);

  const readyLineup = POSITIONS.every((pos) => state.lineUp[pos]);

  const assignLineup = (pos, id) => setState((s) => ({ ...s, lineUp: { ...s.lineUp, [pos]: id } }));

  const sign = (id) => setState((s) => {
    const n = structuredClone(s);
    const p = n.players.find((x) => x.id === id);
    const fee = p.team === 'FA' ? p.annualSalary : p.buyout + p.annualSalary * p.contractYears * 0.4;
    if (n.budget < fee) return { ...s, events: [`영입 실패: ${money(fee)} 필요`, ...s.events] };
    n.budget -= fee;
    p.team = n.teamName;
    n.events.unshift(`${p.nickname} 영입 완료 (${money(fee)})`);
    return n;
  });

  const callup = (id) => setState((s) => {
    if (s.budget < 0.5) return { ...s, events: ['콜업 실패: 예산 부족', ...s.events] };
    const n = structuredClone(s);
    const p = n.players.find((x) => x.id === id);
    p.team = n.teamName;
    p.isAcademy = false;
    n.budget -= 0.5;
    n.events.unshift(`${p.nickname} 콜업 완료`);
    return n;
  });

  const rest = (id) => setState((s) => ({ ...s, players: s.players.map((p) => (p.id === id ? { ...p, resting: true, fatigue: Math.max(0, p.fatigue - 25) } : p)), events: ['휴식 처리 완료', ...s.events] }));

  const prepareMinigame = () => {
    if (!readyLineup) return setState((s) => ({ ...s, events: ['경기 시작 실패: 5인 라인업을 먼저 설정하세요', ...s.events] }));
    setState((s) => ({ ...s, minigame: { phase: PHASES[s.phaseIndex], score: 0, round: 1, target: 3 } }));
  };

  const playRound = (choice) => setState((s) => {
    const n = structuredClone(s);
    const mg = n.minigame;
    if (!mg) return s;
    const map = { attack: 0.42, objective: 0.36, safe: 0.28 };
    const baseChance = map[choice] + lineupPowerBonus(n);
    const success = Math.random() < baseChance;
    mg.score += success ? 1 : 0;
    mg.round += 1;
    n.events.unshift(`미니게임: ${choice} ${success ? '성공' : '실패'}`);
    if (mg.round > 5) resolveMatch(n);
    return n;
  });

  const resolveMatch = (n) => {
    const win = n.minigame.score >= n.minigame.target;
    const phase = PHASES[n.phaseIndex];
    const lineup = POSITIONS.map((p) => n.players.find((x) => x.id === n.lineUp[p])).filter(Boolean);
    lineup.forEach((p) => {
      p.fatigue = Math.min(100, p.fatigue + 10);
      if (p.resting) p.resting = false;
      if (p.fatigue >= 90 && Math.random() < 0.2) p.injuredGames = 2;
    });
    n.standings[n.teamName][win ? 'w' : 'l'] += 1;
    n.events.unshift(`[${phase}] ${win ? '승리' : '패배'} / 미니게임 점수 ${n.minigame.score}`);
    n.matchInPhase += 1;
    n.winStreak = win ? n.winStreak + 1 : 0;
    n.lossStreak = win ? 0 : n.lossStreak + 1;
    randomEvent(n, phase, win);
    if (n.matchInPhase >= 5) advancePhase(n, phase);
    n.minigame = null;
  };

  const lineupPowerBonus = (n) => {
    const lineup = POSITIONS.map((p) => n.players.find((x) => x.id === n.lineUp[p])).filter(Boolean);
    const power = lineup.reduce((a, p) => a + p.overall + (p.form - 70) * 0.2 + (p.morale - 70) * 0.15 - Math.max(0, p.fatigue - 80) * 0.25, 0);
    return Math.min(0.25, Math.max(-0.1, (power - 370) / 800));
  };

  const advancePhase = (n, phase) => {
    if ((phase === 'MSI' || phase === 'WORLDS') && n.standings[n.teamName].w < 3) n.events.unshift(`${phase} 진출 실패`);
    if (n.standings[n.teamName].w >= 3 && REWARDS[phase]) {
      const r = REWARDS[phase];
      n.budget += r.budget;
      n.fanbase += r.fanbase;
      n.legacy += r.legacy || 0;
    }
    settleContracts(n);
    n.phaseIndex += 1;
    n.matchInPhase = 0;
  };

  const settleContracts = (n) => {
    n.players.filter((p) => p.team === n.teamName).forEach((p) => {
      n.budget -= p.annualSalary;
      p.contractYears = Math.max(0, p.contractYears - 1);
      if (p.contractYears === 0) p.team = 'FA';
      if (p.injuredGames > 0) p.injuredGames -= 1;
    });
    if (n.budget < 0 || n.fanbase <= 0) n.events.unshift('게임 오버: 재정 또는 팬덤 붕괴');
  };

  return (
    <div className="app">
      <h1>{state.teamName} Manager</h1>
      <div className="header-grid">
        <div>예산 {money(state.budget)}</div><div>팬덤 {state.fanbase}</div><div>시즌 {PHASES[state.phaseIndex] || '종료'}</div>
        <div>경기 {state.matchInPhase + 1}/5</div><div>케미 {state.teamChemistry}</div><div>레거시 {state.legacy}</div>
      </div>
      <div className="tabs">{['overview', 'roster', 'market', 'academy', 'contracts', 'events'].map((t) => <button key={t} onClick={() => setState({ ...state, tab: t })}>{t}</button>)}</div>

      {state.tab === 'overview' && <div className="panel"><h3>라인업 구성</h3>{POSITIONS.map((pos) => <div key={pos} className="line"><b>{pos}</b><select value={state.lineUp[pos] || ''} onChange={(e) => assignLineup(pos, Number(e.target.value) || null)}><option value="">선택</option>{userPlayers.filter((p) => p.position === pos && p.injuredGames === 0 && !p.resting).map((p) => <option key={p.id} value={p.id}>{p.nickname} (OVR {p.overall})</option>)}</select></div>)}<button className="primary" onClick={prepareMinigame}>다음 경기(미니게임 시작)</button></div>}
      {state.minigame && <div className="panel"><h3>{state.minigame.phase} 미니게임 {state.minigame.round}/5</h3><p>3회 이상 성공하면 승리합니다.</p><div className="actions"><button onClick={() => playRound('attack')}>공격 콜</button><button onClick={() => playRound('objective')}>오브젝트 콜</button><button onClick={() => playRound('safe')}>안정 운영</button></div></div>}

      {state.tab === 'roster' && <div className="card-grid">{userPlayers.map((p) => <div key={p.id} className={`card ${p.fatigue >= 90 ? 'danger' : p.fatigue >= 80 ? 'warn' : ''}`}><h3>{p.nickname}</h3><p>{p.position} | {p.tier} | {p.team}</p><p>OVR {p.overall} FORM {p.form}</p><p>MORALE {p.morale} FATIGUE {p.fatigue}</p><p>계약 {p.contractYears}년 / 연봉 {money(p.annualSalary)}</p><button onClick={() => rest(p.id)}>휴식</button></div>)}</div>}
      {state.tab === 'market' && <div className="card-grid">{market.map((p) => <div key={p.id} className="card"><h3>{p.nickname}</h3><p>{p.team} {p.position} Tier {p.tier}</p><p>Fee {money(p.team === 'FA' ? p.annualSalary : p.buyout + p.annualSalary * p.contractYears * 0.4)}</p><button onClick={() => sign(p.id)}>영입</button></div>)}</div>}
      {state.tab === 'academy' && <div className="card-grid">{academy.map((p) => <div key={p.id} className="card"><h3>{p.nickname}</h3><p>{p.position} OVR {p.overall} POT {p.potential}</p><button onClick={() => callup(p.id)}>콜업 (-0.5억)</button></div>)}</div>}
      {state.tab === 'contracts' && <div className="card-grid">{userPlayers.map((p) => <div className="card" key={p.id}><h3>{p.nickname}</h3><p>{p.contractYears}년 / {money(p.annualSalary)} / 바이아웃 {money(p.buyout)}</p></div>)}</div>}
      {state.tab === 'events' && <ul className="log">{state.events.map((e, i) => <li key={i}>{e}</li>)}</ul>}
      <TeamRosterTable players={state.players} myTeam={state.teamName} />
    </div>
  );
}

function UniverseRosterPreview() {
  const players = useMemo(generateUniverse, []);
  return <TeamRosterTable players={players} />;
}

function TeamRosterTable({ players, myTeam }) {
  const teams = Array.from(new Set(players.map((p) => p.team))).filter((t) => t !== 'FA' && t !== 'ACADEMY');
  return <div className="panel"><h3>팀별 로스터 {myTeam ? '(내 팀 포함)' : ''}</h3>{teams.map((team) => <div key={team}><b>{team}</b><p>{players.filter((p) => p.team === team).map((p) => `${p.position}:${p.nickname}`).join(' / ')}</p></div>)}<b>FA</b><p>{players.filter((p) => p.team === 'FA').map((p) => `${p.position}:${p.nickname}`).join(' / ')}</p><b>ACADEMY</b><p>{players.filter((p) => p.team === 'ACADEMY').map((p) => `${p.position}:${p.nickname}`).join(' / ')}</p></div>;
}

function randomEvent(n, phase, win) {
  const roll = Math.random();
  const squad = n.players.filter((p) => p.team === n.teamName);
  if (roll < 0.1) {
    squad.slice(0, 2).forEach((p) => (p.morale -= 8));
    n.teamChemistry -= 5;
    n.events.unshift('이벤트: 팀 내 불화');
  } else if (roll < 0.2 && n.lossStreak >= 2) {
    squad.filter((p) => ['MID', 'JGL'].includes(p.position)).forEach((p) => (p.morale -= 6));
    n.events.unshift('이벤트: 팀원 분열');
  } else if (roll < 0.3) {
    const tired = squad.find((p) => p.fatigue > 80);
    if (tired) {
      tired.loyalty -= 5;
      n.events.unshift(`이벤트: ${tired.nickname} 휴식 요청`);
    }
  } else if (roll < 0.4) {
    const star = [...squad].sort((a, b) => b.starPower - a.starPower)[0];
    if (star) star.loyalty -= 8;
    n.events.unshift('이벤트: 스타 선수 이적설');
  } else if (roll < 0.5) {
    const rookie = n.players.find((p) => p.isAcademy);
    if (rookie) rookie.overall += 2;
    n.events.unshift('이벤트: 루키 급성장');
  } else if (roll < 0.6) {
    squad.filter((p) => p.position === 'SUP' || p.position === 'ADC').forEach((p) => (p.form -= 4));
    n.events.unshift('이벤트: 메타 적응 실패');
  } else if (roll < 0.7 && win && n.winStreak >= 2) {
    squad.forEach((p) => { p.form += 3; p.morale += 4; });
    n.events.unshift('이벤트: 팀 케미 상승');
  } else if (roll < 0.8) {
    const risk = squad.find((p) => p.fatigue >= 90);
    if (risk) risk.injuredGames = 2;
    n.events.unshift('이벤트: 부상 위험');
  } else if (roll < 0.9 && ['MSI', 'EWC', 'WORLDS'].includes(phase) && win) {
    n.fanbase += 6;
    n.budget += 4;
    n.events.unshift('이벤트: 팬덤 폭발');
  } else {
    n.budget += 3;
    n.events.unshift('이벤트: 스폰서 계약');
  }
}
