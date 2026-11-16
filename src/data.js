// Echipele si jucatorii. Atribute 0-100: spd=viteza, sho=sut, pas=pase, dri=control/dribling, def=deposedare (la portar: reflexe)
// t = nuanta pielii (0,1,2), h = culoarea parului (optional)
// s = frizura: short, buzz, bald, long, bun, afro (optional, implicit short); b = barba (optional)

export const TEAMS = [
  {
    name: 'ALBAȘTRII', short: 'ALB', color: 0x1f5fd6, shorts: 0xffffff, socks: 0x1f5fd6, gk: 0xf2c200,
    players: [
      { name: 'Courtois',   num: 1,  spd: 50, sho: 30, pas: 70, dri: 40, def: 90, t: 0, h: 0x3a2a1c, b: 1 },
      { name: 'Carvajal',   num: 2,  spd: 80, sho: 60, pas: 78, dri: 76, def: 84, t: 0, b: 1 },
      { name: 'Rüdiger',    num: 22, spd: 84, sho: 50, pas: 70, dri: 66, def: 88, t: 2, s: 'buzz', b: 1 },
      { name: 'Van Dijk',   num: 4,  spd: 80, sho: 60, pas: 74, dri: 70, def: 91, t: 1, s: 'buzz', b: 1 },
      { name: 'Davies',     num: 19, spd: 95, sho: 60, pas: 76, dri: 82, def: 78, t: 2, s: 'buzz' },
      { name: 'De Bruyne',  num: 17, spd: 72, sho: 88, pas: 95, dri: 86, def: 62, t: 0, h: 0xc9853a },
      { name: 'Rodri',      num: 16, spd: 66, sho: 78, pas: 88, dri: 82, def: 88, t: 0, h: 0x3a2a1c, b: 1 },
      { name: 'Bellingham', num: 5,  spd: 80, sho: 86, pas: 86, dri: 88, def: 78, t: 1, s: 'buzz' },
      { name: 'Messi',      num: 10, spd: 80, sho: 92, pas: 93, dri: 96, def: 35, t: 0, h: 0x4a3423, b: 1 },
      { name: 'Haaland',    num: 9,  spd: 90, sho: 95, pas: 68, dri: 80, def: 45, t: 0, h: 0xe0c070, s: 'bun' },
      { name: 'Mbappé',     num: 7,  spd: 97, sho: 92, pas: 82, dri: 93, def: 36, t: 2, s: 'bald' },
    ],
    // rezerve (gk: 1 = portar de rezerva)
    bench: [
      { name: 'Ter Stegen', num: 13, spd: 50, sho: 30, pas: 82, dri: 45, def: 88, t: 0, h: 0xc9a060, gk: 1 },
      { name: 'Koundé',     num: 23, spd: 85, sho: 50, pas: 76, dri: 76, def: 85, t: 2, s: 'afro' },
      { name: 'Musiala',    num: 14, spd: 84, sho: 82, pas: 84, dri: 92, def: 55, t: 0, h: 0x4a3423 },
      { name: 'Foden',      num: 47, spd: 82, sho: 85, pas: 86, dri: 90, def: 55, t: 0, h: 0x8a6a3a, s: 'buzz' },
      { name: 'Kane',       num: 18, spd: 70, sho: 93, pas: 85, dri: 82, def: 47, t: 0, h: 0x8a6a3a },
      { name: 'Yamal',      num: 27, spd: 88, sho: 80, pas: 82, dri: 91, def: 35, t: 1, s: 'afro' },
    ],
  },
  {
    name: 'ROȘIII', short: 'ROS', color: 0xd62828, shorts: 0x111111, socks: 0xd62828, gk: 0x2bb673,
    players: [
      { name: 'Alisson',    num: 1,  spd: 50, sho: 30, pas: 75, dri: 45, def: 90, t: 0, h: 0x4a3423, b: 1 },
      { name: 'Hakimi',     num: 2,  spd: 93, sho: 72, pas: 80, dri: 82, def: 78, t: 1 },
      { name: 'Rúben Dias', num: 3,  spd: 66, sho: 40, pas: 68, dri: 66, def: 90, t: 0, b: 1 },
      { name: 'Saliba',     num: 12, spd: 82, sho: 40, pas: 72, dri: 70, def: 89, t: 2, s: 'buzz' },
      { name: 'Theo',       num: 19, spd: 93, sho: 72, pas: 76, dri: 80, def: 78, t: 0, b: 1 },
      { name: 'Modrić',     num: 10, spd: 72, sho: 76, pas: 91, dri: 89, def: 70, t: 0, h: 0xb89a5a, s: 'long' },
      { name: 'Kimmich',    num: 6,  spd: 70, sho: 74, pas: 90, dri: 84, def: 82, t: 0, h: 0x6b4a2a },
      { name: 'Pedri',      num: 8,  spd: 74, sho: 72, pas: 88, dri: 90, def: 68, t: 0 },
      { name: 'Salah',      num: 11, spd: 90, sho: 90, pas: 82, dri: 89, def: 45, t: 1, s: 'afro', b: 1 },
      { name: 'Ronaldo',    num: 7,  spd: 80, sho: 93, pas: 78, dri: 84, def: 35, t: 0 },
      { name: 'Vinícius',   num: 20, spd: 96, sho: 86, pas: 80, dri: 94, def: 30, t: 2, s: 'afro' },
    ],
    bench: [
      { name: 'Donnarumma', num: 99, spd: 50, sho: 30, pas: 70, dri: 40, def: 89, t: 0, gk: 1 },
      { name: 'Araujo',     num: 4,  spd: 80, sho: 55, pas: 66, dri: 68, def: 86, t: 1, b: 1 },
      { name: 'Valverde',   num: 15, spd: 88, sho: 84, pas: 84, dri: 84, def: 78, t: 0, h: 0x6b4a2a, b: 1 },
      { name: 'Saka',       num: 77, spd: 88, sho: 82, pas: 84, dri: 88, def: 55, t: 2, s: 'buzz' },
      { name: 'Lewandowski', num: 9, spd: 75, sho: 93, pas: 80, dri: 85, def: 40, t: 0, h: 0x6b4a2a },
      { name: 'Rodrygo',    num: 21, spd: 88, sho: 82, pas: 80, dri: 88, def: 35, t: 2, s: 'buzz' },
    ],
  },
];

// Formatie 4-3-3, in "cadrul propriu" al echipei: poarta proprie e la x = -52.5, atacul spre +x.
export const FORMATION = [
  { role: 'G', x: -50, z: 0 },
  { role: 'D', x: -30, z: 22 },
  { role: 'D', x: -34, z: 8 },
  { role: 'D', x: -34, z: -8 },
  { role: 'D', x: -30, z: -22 },
  { role: 'M', x: -8,  z: 14 },
  { role: 'M', x: -14, z: 0 },
  { role: 'M', x: -8,  z: -14 },
  { role: 'A', x: 12,  z: 24 },
  { role: 'A', x: 16,  z: 0 },
  { role: 'A', x: 12,  z: -24 },
];

export const SKIN = [0xf0c8a0, 0xc68e5e, 0x7a4a2a];
