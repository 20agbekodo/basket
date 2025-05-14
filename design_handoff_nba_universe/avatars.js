/* Pixel-art player silhouettes — deterministic per player.
   Returns a data URL; charming 90s pixel bust on a neon court backdrop.
   window.makeAvatar(player, size) and window.makeAvatarFromSeed(seed, size). */
(function () {
  const cache = {};
  const NEON = ['#7b2ff7', '#00e0c7', '#ff2d9b', '#eaff2b', '#ff7a18', '#3b5cff', '#00e37d'];
  const SKIN = ['#c98a52', '#a86b3c', '#e0b088', '#8a5328', '#d99a66', '#f0c9a0'];
  const HAIR = ['#1a1208', '#2b1d10', '#0d0d0d', '#3a2a14', '#101010'];

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }

  function px(ctx, x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }

  function draw(seed, size) {
    const h = hash(seed);
    const G = 32;                       // logical grid
    const c = document.createElement('canvas');
    c.width = c.height = G;
    const ctx = c.getContext('2d');

    const bgA = NEON[h % NEON.length];
    const bgB = NEON[(h >>> 3) % NEON.length];
    const jersey = NEON[(h >>> 6) % NEON.length];
    const jersey2 = '#ffffff';
    const skin = SKIN[(h >>> 9) % SKIN.length];
    const hair = HAIR[(h >>> 12) % HAIR.length];

    // backdrop: diagonal neon split + court arc
    const g = ctx.createLinearGradient(0, 0, G, G);
    g.addColorStop(0, bgA); g.addColorStop(1, bgB);
    ctx.fillStyle = g; ctx.fillRect(0, 0, G, G);
    ctx.globalAlpha = 0.22; px(ctx, 0, 0, G, G, '#000'); ctx.globalAlpha = 1;
    // court arc
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(G / 2, G + 4, 11, Math.PI, 0); ctx.stroke();

    // shoulders / jersey
    px(ctx, 6, 23, 20, 12, jersey);
    px(ctx, 9, 21, 14, 4, jersey);
    // jersey collar + stripe
    px(ctx, 13, 21, 6, 3, jersey2);
    px(ctx, 15, 24, 2, 9, jersey2);
    // neck
    px(ctx, 14, 18, 4, 5, skin);
    // head
    px(ctx, 11, 8, 10, 11, skin);
    px(ctx, 10, 10, 1, 7, skin);
    px(ctx, 21, 10, 1, 7, skin);
    // hair
    px(ctx, 10, 6, 12, 4, hair);
    px(ctx, 10, 8, 2, 3, hair);
    px(ctx, 20, 8, 2, 3, hair);
    // eyes
    px(ctx, 13, 12, 2, 2, '#1a1010');
    px(ctx, 17, 12, 2, 2, '#1a1010');
    // jersey number-ish marks
    px(ctx, 11, 27, 2, 4, jersey2);
    px(ctx, 19, 27, 2, 4, jersey2);

    // upscale, pixelated
    const out = document.createElement('canvas');
    out.width = out.height = size;
    const o = out.getContext('2d');
    o.imageSmoothingEnabled = false;
    o.drawImage(c, 0, 0, size, size);
    return out.toDataURL();
  }

  window.makeAvatarFromSeed = function (seed, size) {
    const key = seed + '@' + (size || 144);
    if (!cache[key]) cache[key] = draw(seed, size || 144);
    return cache[key];
  };
  window.makeAvatar = function (player, size) {
    return window.makeAvatarFromSeed(player.name + player.team, size);
  };
})();
