export const MAPS = {
  classroom: {
    id: 'classroom',
    name: '교실',
    width: 1600,
    height: 900,
    color: 0xf7e9b0,
    obstacles: [
      { x: 380, y: 240, w: 180, h: 80 },
      { x: 620, y: 240, w: 180, h: 80 },
      { x: 860, y: 240, w: 180, h: 80 },
      { x: 500, y: 520, w: 280, h: 90 }
    ]
  },
  hallway: {
    id: 'hallway',
    name: '복도',
    width: 1800,
    height: 800,
    color: 0xb9dcff,
    obstacles: [
      { x: 430, y: 220, w: 110, h: 280 },
      { x: 900, y: 420, w: 110, h: 280 },
      { x: 1370, y: 220, w: 110, h: 280 }
    ]
  },
  playground: {
    id: 'playground',
    name: '운동장',
    width: 1800,
    height: 1000,
    color: 0xb9efb3,
    obstacles: [
      { x: 650, y: 360, w: 240, h: 130 },
      { x: 1150, y: 650, w: 240, h: 130 }
    ]
  }
};
