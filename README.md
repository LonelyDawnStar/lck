# School Pass Panic

학교를 배경으로 한 온라인 멀티플레이 타이머 공 패스 게임입니다.

## 기술 스택
- React + Vite
- Phaser.js (2D 탑다운)
- Socket.IO (실시간 멀티)
- Node.js + Express (게임 서버)

## 파일 구조

```bash
.
├── server/
│   └── index.js            # 멀티플레이 서버 및 룸/라운드 로직
├── src/
│   ├── game/
│   │   ├── GameScene.js    # Phaser 씬 (맵/플레이어 렌더링)
│   │   └── maps.js         # 교실/복도/운동장 맵 설정
│   ├── App.jsx             # 닉네임, 룸 생성/참가, HUD, 조이스틱 UI
│   ├── main.jsx            # React 엔트리
│   └── styles.css          # 픽셀아트 느낌 UI 스타일
├── index.html
├── package.json
└── README.md
```

## 실행 방법

```bash
npm install
npm run server    # 터미널 1 (http://localhost:3001)
npm run dev       # 터미널 2 (http://localhost:5173)
```

## 게임 규칙
- 최대 8명
- 타이머 공 보유자가 제한시간(기본 12초) 내 다른 플레이어에게 패스
- 패스는 일정 거리 안에서만 가능
- 타이머 0초가 되면 보유자 탈락 + “뿅!” 코믹 연출
- 마지막 생존자가 승리

## 포함된 핵심 기능
- 닉네임 입력
- 방 만들기/참가
- 랜덤 학교 맵 3개 (교실/복도/운동장)
- 모바일/태블릿 터치 조이스틱
- 패스 버튼
- 라운드 종료 후 순위 표시
- 폭력 연출 없는 코믹 콘셉트
