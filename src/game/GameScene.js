import Phaser from 'phaser';
import { MAPS } from './maps';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('school-pass-panic');
    this.players = new Map();
    this.moveState = { x: 0, y: 0 };
    this.room = null;
  }

  init(data) {
    this.socket = data.socket;
    this.myId = data.myId;
    this.getState = data.getState;
    this.getMove = data.getMove;
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2f');
    this.createTextures();

    this.physics.world.setBounds(0, 0, 2000, 1200);

    this.time.addEvent({ delay: 50, loop: true, callback: () => this.tickNetwork() });
  }

  tickNetwork() {
    const state = this.getState();
    if (!state?.gameState) return;
    const room = state.gameState;
    if (room.id !== this.room?.id) {
      this.renderMap(room.mapId);
      this.room = room;
    }
    this.syncPlayers(room.players);
    this.drawTimerBall(room);

    const input = this.getMove();
    this.socket.emit('player:move', input);
  }

  createTextures() {
    const g = this.add.graphics();
    g.fillStyle(0x6a8ef6, 1).fillCircle(16, 16, 16).generateTexture('avatar', 32, 32).clear();
    g.fillStyle(0xff9f43, 1).fillCircle(10, 10, 10).generateTexture('ball', 20, 20).clear();
    g.fillStyle(0xff4d6d, 1).fillCircle(30, 30, 30).generateTexture('poof', 60, 60).destroy();
  }

  renderMap(mapId) {
    const map = MAPS[mapId] || MAPS.classroom;
    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBounds(0, 0, map.width, map.height);

    this.mapGroup?.destroy(true);
    this.mapGroup = this.add.group();

    const bg = this.add.rectangle(map.width / 2, map.height / 2, map.width, map.height, map.color);
    this.mapGroup.add(bg);

    map.obstacles.forEach((o) => {
      const desk = this.add.rectangle(o.x, o.y, o.w, o.h, 0x556b7f).setStrokeStyle(3, 0xffffff);
      this.mapGroup.add(desk);
    });
  }

  syncPlayers(players) {
    const seen = new Set();
    Object.values(players).forEach((p) => {
      seen.add(p.id);
      let sprite = this.players.get(p.id);
      if (!sprite) {
        const body = this.add.image(p.x, p.y, 'avatar');
        const label = this.add.text(p.x, p.y - 28, p.nickname, { fontSize: '14px', color: '#fff' }).setOrigin(0.5);
        sprite = { body, label };
        this.players.set(p.id, sprite);
      }
      sprite.body.setPosition(p.x, p.y).setTint(p.alive ? 0xffffff : 0x555555);
      sprite.label.setPosition(p.x, p.y - 28).setColor(p.alive ? '#ffffff' : '#909090');

      if (p.id === this.myId) this.cameras.main.centerOn(p.x, p.y);
    });

    [...this.players.keys()].forEach((id) => {
      if (!seen.has(id)) {
        const s = this.players.get(id);
        s.body.destroy();
        s.label.destroy();
        this.players.delete(id);
      }
    });
  }

  drawTimerBall(room) {
    this.ballSprite?.destroy();
    if (!room.ballHolderId || !room.players[room.ballHolderId]) return;
    const holder = room.players[room.ballHolderId];
    this.ballSprite = this.add.image(holder.x + 22, holder.y - 24, 'ball');
  }
}
