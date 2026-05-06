import { useMemo, useState, useEffect } from 'react';

const PHASES = [
  'Spring Regular Season',
  'MSI',
  'Summer Regular Season',
  'EWC',
  'WORLDS',
];

const REWARDS = {
  'Spring Regular Season': { budget: 8, fanbase: 8 },
  MSI: { budget: 15, fanbase: 20, starBoost: 2 },
  'Summer Regular Season': { budget: 10, fanbase: 10 },
  EWC: { budget: 12, fanbase: 15 },
  WORLDS: { budget: 30, fanbase: 40, allStarBoost: 2, legacy: 1 },
};

const LOCAL_KEY = 'lck-manager-v2';
const POSITIONS = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];

const createPlayer = (id, name, position, team, overall, tier, academy = false) => ({
  id,
  nickname: name,
  position,
  tier,
  team,
  overall,
  form: 70,
  morale: 70,
  fatigue: academy ? 20 : 35,
  loyalty: 70,
  marketValue: Math.round(overall * 0.12 + (tier === 'S' ? 4 : tier === 'A' ? 2 : 1)),
  contractYears: academy ? 3 : 2,
  annualSalary: academy ? 0.6 : Math.round((overall * 0.08 + 0.8) * 10) / 10,
  buyout: academy ? 1.2 : Math.round((overall * 0.13 + 2) * 10) / 10,
  starPower: tier === 'S' ? 85 : 65,
  isAcademy: academy,
  isTransferListed: false,
  injuryRisk: 10,
  resting: false,
  injuredGames: 0,
  potential: academy ? overall + 8 : overall + 2,
});

const initialState = () => {
  const teams = ['T1', 'GEN', 'HLE', 'DK', 'KT'];
  const pool = [];
  let id = 1;
  teams.forEach((team, idx) => {
    POSITIONS.forEach((p, pIdx) => pool.push(createPlayer(id++, `${team}-${p}`, p, team, 72 + idx + pIdx, idx < 2 ? 'S' : 'A')));
  });
  const academy = POSITIONS.map((p, i) => createPlayer(id++, `ACA-${p}-${i + 1}`, p, 'ACADEMY', 62 + i, 'B', true));
  const freeAgents = POSITIONS.map((p, i) => createPlayer(id++, `FA-${p}-${i + 1}`, p, 'FA', 68 + i, 'A'));

  return {
    budget: 35,
    fanbase: 30,
    legacyPoints: 0,
    teamChemistry: 70,
    winStreak: 0,
    lossStreak: 0,
    phaseIndex: 0,
    matchInPhase: 0,
    teams,
    players: [...pool, ...academy, ...freeAgents],
    userTeam: 'T1',
    events: ['시뮬레이터 시작: 예산 35억으로 구단 운영을 시작합니다.'],
    standings: Object.fromEntries(teams.map((t) => [t, { w: 0, l: 0 }])),
    tab: 'roster',
  };
};

const formatMoney = (v) => `${v.toFixed(1)}억`;

export default function App() {
  const [game, setGame] = useState(() => {
    const saved = localStorage.getItem(LOCAL_KEY);
    return saved ? JSON.parse(saved) : initialState();
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(game));
  }, [game]);

  const userPlayers = useMemo(() => game.players.filter((p) => p.team === game.userTeam && !p.isAcademy), [game]);
  const academyPlayers = useMemo(() => game.players.filter((p) => p.isAcademy), [game]);
  const transferTargets = useMemo(() => game.players.filter((p) => p.team !== game.userTeam && !p.isAcademy), [game]);

  const log = (msg) => [msg, ...game.events].slice(0, 120);

  const nextMatch = () => {
    setGame((prev) => {
      const next = structuredClone(prev);
      const phase = PHASES[next.phaseIndex];
      const mustRank = phase === 'MSI' || phase === 'WORLDS';
      if (mustRank && next.standings[next.userTeam].w < 3) {
        next.events = [`${phase} 진출 실패: 정규리그 성적 부족`, ...next.events];
        next.phaseIndex += 1;
        next.matchInPhase = 0;
        return next;
      }

      const starters = next.players.filter((p) => p.team === next.userTeam && !p.isAcademy && !p.resting && p.injuredGames === 0);
      if (starters.length < 5) {
        next.events = ['게임 오버: 주전 5명 구성 실패', ...next.events];
        return next;
      }
      const power = starters.slice(0, 5).reduce((acc, p) => acc + p.overall + (p.form - 70) * 0.2 + (p.morale - 70) * 0.15 - Math.max(0, p.fatigue - 75) * 0.3, 0) + (next.teamChemistry - 70) * 0.8;
      const enemyPower = 380 + Math.random() * 25 + next.phaseIndex * 4;
      const win = power > enemyPower;

      starters.slice(0, 5).forEach((p) => {
        p.fatigue = Math.min(100, p.fatigue + 8);
        p.resting = false;
        if (p.fatigue >= 90) p.injuryRisk = Math.min(95, p.injuryRisk + 15);
      });

      if (win) {
        next.standings[next.userTeam].w += 1;
        next.winStreak += 1;
        next.lossStreak = 0;
      } else {
        next.standings[next.userTeam].l += 1;
        next.winStreak = 0;
        next.lossStreak += 1;
      }
      next.matchInPhase += 1;
      next.events = [`[${phase}] ${win ? '승리' : '패배'} (팀파워 ${power.toFixed(1)})`, ...next.events];

      randomEvent(next, phase, win);

      if (next.matchInPhase >= 5) {
        if (next.standings[next.userTeam].w >= 3 && REWARDS[phase]) {
          const reward = REWARDS[phase];
          next.budget += reward.budget;
          next.fanbase += reward.fanbase;
          if (reward.starBoost) starters.forEach((p) => (p.starPower += reward.starBoost));
          if (reward.allStarBoost) next.players.filter((p) => p.team === next.userTeam).forEach((p) => (p.starPower += reward.allStarBoost));
          next.legacyPoints += reward.legacy || 0;
          next.events = [`${phase} 우승! 보상 획득`, ...next.events];
        }
        settleSeason(next);
        next.phaseIndex += 1;
        next.matchInPhase = 0;
      }
      return next;
    });
  };

  const settleSeason = (state) => {
    state.players.filter((p) => p.team === state.userTeam).forEach((p) => {
      state.budget -= p.annualSalary;
      p.contractYears = Math.max(0, p.contractYears - 1);
      if (p.contractYears === 0) p.team = 'FA';
      if (p.injuredGames > 0) p.injuredGames -= 1;
    });
    if (state.budget < 0 || state.fanbase <= 0) state.events = ['게임 오버: 재정/팬덤 붕괴', ...state.events];
  };

  const signPlayer = (id) => {
    setGame((prev) => {
      const next = structuredClone(prev);
      const p = next.players.find((x) => x.id === id);
      const fee = p.team === 'FA' ? p.annualSalary : p.buyout + p.annualSalary * p.contractYears * 0.4;
      if (next.budget < fee) {
        next.events = [`영입 실패: 예산 부족 (${formatMoney(fee)} 필요)`, ...next.events];
        return next;
      }
      next.budget -= fee;
      p.team = next.userTeam;
      p.contractYears = Math.max(2, p.contractYears);
      p.isAcademy = false;
      next.events = [`${p.nickname} 영입 완료 (${formatMoney(fee)})`, ...next.events];
      return next;
    });
  };

  const restPlayer = (id) => setGame((prev) => ({ ...prev, players: prev.players.map((p) => (p.id === id ? { ...p, fatigue: Math.max(0, p.fatigue - 25), resting: true } : p)), events: [`선수 휴식 적용`, ...prev.events] }));

  const callup = (id) => setGame((prev) => ({ ...prev, players: prev.players.map((p) => (p.id === id ? { ...p, team: prev.userTeam, isAcademy: false, annualSalary: 0.4 } : p)), budget: prev.budget - 0.5, events: ['아카데미 콜업 완료 (-0.5억)', ...prev.events] }));

  const randomEvent = (state, phase, win) => {
    const roll = Math.random();
    const team = state.players.filter((p) => p.team === state.userTeam);
    if (roll < 0.1) {
      team.slice(0, 2).forEach((p) => (p.morale -= 8));
      state.teamChemistry -= 4;
      state.events = ['이벤트: 팀 내 불화 발생', ...state.events];
    } else if (roll < 0.2 && state.lossStreak >= 2) {
      team.filter((p) => p.position === 'MID' || p.position === 'JGL').forEach((p) => (p.morale -= 6));
      state.events = ['이벤트: 팀원 분열', ...state.events];
    } else if (roll < 0.3) {
      const tired = team.find((p) => p.fatigue > 80);
      if (tired) tired.loyalty -= 5;
      state.events = ['이벤트: 선수 휴식 요청', ...state.events];
    } else if (roll < 0.4) {
      const star = team.sort((a, b) => b.starPower - a.starPower)[0];
      if (star) star.loyalty -= 8;
      state.events = ['이벤트: 스타 선수 이적설', ...state.events];
    } else if (roll < 0.5) {
      const rookie = state.players.find((p) => p.isAcademy);
      if (rookie) rookie.overall += 2;
      state.events = ['이벤트: 루키 급성장', ...state.events];
    } else if (roll < 0.6) {
      team.filter((p) => p.position === 'SUP' || p.position === 'ADC').forEach((p) => (p.form -= 4));
      state.events = ['이벤트: 메타 적응 실패', ...state.events];
    } else if (roll < 0.7 && win && state.winStreak >= 2) {
      team.forEach((p) => {
        p.form += 3;
        p.morale += 4;
      });
      state.events = ['이벤트: 팀 케미 상승', ...state.events];
    } else if (roll < 0.8) {
      const risk = team.find((p) => p.fatigue >= 90);
      if (risk) risk.injuredGames = 2;
      state.events = ['이벤트: 부상 위험', ...state.events];
    } else if (roll < 0.9 && (phase === 'MSI' || phase === 'EWC' || phase === 'WORLDS') && win) {
      state.fanbase += 6;
      state.budget += 4;
      state.events = ['이벤트: 팬덤 폭발', ...state.events];
    } else {
      state.budget += 3;
      state.events = ['이벤트: 스폰서 계약 체결', ...state.events];
    }
  };

  const currentPhase = PHASES[game.phaseIndex] || '시즌 종료';

  return (
    <div className="app">
      <h1>LCK Manager Simulator: Deep Club Mode</h1>
      <div className="header-grid">
        <div>예산: {formatMoney(game.budget)}</div><div>팬덤: {game.fanbase}</div><div>레거시: {game.legacyPoints}</div>
        <div>시즌 단계: {currentPhase}</div><div>진행 경기: {game.matchInPhase + 1}/5</div><div>팀 분위기: {game.teamChemistry}</div>
      </div>
      <button className="primary" onClick={nextMatch}>다음 경기</button>

      <div className="tabs">{['roster','market','trade','academy','contracts','events'].map((t)=><button key={t} onClick={()=>setGame({...game,tab:t})}>{t}</button>)}</div>

      {game.tab==='roster' && <div className="card-grid">{userPlayers.map((p)=><PlayerCard key={p.id} p={p} onRest={restPlayer} />)}</div>}
      {game.tab==='market' && <div className="card-grid">{transferTargets.slice(0,10).map((p)=><MarketCard key={p.id} p={p} budget={game.budget} onSign={signPlayer} />)}</div>}
      {game.tab==='trade' && <div className="panel">트레이드: 간소화 버전(시장가 차액 계산) - 선수 카드에서 marketValue 비교 후 영입/방출 판단.</div>}
      {game.tab==='academy' && <div className="card-grid">{academyPlayers.map((p)=><div key={p.id} className="card"><b>{p.nickname}</b><p>{p.position} OVR {p.overall} POT {p.potential}</p><button onClick={()=>callup(p.id)}>콜업 (-0.5억)</button></div>)}</div>}
      {game.tab==='contracts' && <div className="card-grid">{userPlayers.map((p)=><div key={p.id} className="card"><b>{p.nickname}</b><p>{p.contractYears}년 / 연봉 {formatMoney(p.annualSalary)} / 바이아웃 {formatMoney(p.buyout)}</p></div>)}</div>}
      {game.tab==='events' && <ul className="log">{game.events.map((e,i)=><li key={i}>{e}</li>)}</ul>}
    </div>
  );
}

function PlayerCard({ p, onRest }) {
  const danger = p.fatigue >= 90 ? 'danger' : p.fatigue >= 80 ? 'warn' : '';
  return <div className={`card ${danger}`}>
    <h3>{p.nickname} ({p.position})</h3>
    <p>Tier {p.tier} | Team {p.team}</p><p>OVR {p.overall} | Form {p.form}</p>
    <p>Morale {p.morale} | Fatigue {p.fatigue}</p>
    <p>Contract {p.contractYears}Y | Salary {p.annualSalary}억</p>
    <p>Buyout {p.buyout}억 | MV {p.marketValue}억</p>
    {p.resting ? <small>휴식중(다음 경기 불가)</small> : <button onClick={() => onRest(p.id)}>휴식</button>}
  </div>;
}

function MarketCard({ p, onSign, budget }) {
  const fee = p.team === 'FA' ? p.annualSalary : p.buyout + p.annualSalary * p.contractYears * 0.4;
  return <div className="card"><h3>{p.nickname}</h3><p>{p.team} | {p.position} | Tier {p.tier}</p>
  <p>이적료: {fee.toFixed(1)}억</p><button disabled={budget<fee} onClick={()=>onSign(p.id)}>영입</button></div>;
}
