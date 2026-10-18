// Mobile menu toggle
(function () {
  var btn = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  if (btn && links) {
    btn.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
})();

// Home page: side view of a black hole in a "spacetime" mesh with a small body on a
// circular orbit around it (an extreme-mass-ratio inspiral, EMRI, frozen at fixed radius).
// The orbiting body drives the dominant l = m = 2 gravitational wave, a two-armed spiral
// rotating with the orbit at twice the orbital frequency:
//   h(r, phi, t) = A sqrt(R/r) cos(2*Omega*(t - (r - R)/c) - 2*phi)
// The sheet height is  y = well(r) + dimple(at the small body) + h.
(function () {
  var cv = document.getElementById('bh');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- physics / geometry (world units) ----
  var L = 11, NL = 45, NP = 110;          // half-size of sheet, grid lines per direction, points per line
  var R = 2.4, Omega = 1.9, c = 2.0, amp = 0.2;         // orbit radius, orbital angular speed, wave speed
  var wellDepth = 1.8, wellCore = 0.8, bhR = 0.55;
  var dimDepth = 0.45, dimCore = 0.32, coR = 0.16;        // small body's own dimple and size
  // ---- camera ----
  var pitch = 0.36, dist = 14, Fk = 2.6, lift = 0.16;
  var sp = Math.sin(pitch), cp = Math.cos(pitch);
  var camY = dist * sp, camZ = -dist * cp;

  var W, H, dpr, accent = [31, 95, 139], hot = [181, 82, 43];

  function hex(v) {
    v = v.trim().replace('#', '');
    if (v.length === 3) v = v.replace(/./g, '$&$&');
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
  }
  function readColors() {
    try {
      var cs = getComputedStyle(document.documentElement);
      accent = hex(cs.getPropertyValue('--accent')); hot = hex(cs.getPropertyValue('--highlight'));
    } catch (e) {}
  }
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }

  function well(r) { return -wellDepth / Math.sqrt(1 + (r / wellCore) * (r / wellCore)); }
  function wave(x, z, t) {
    var r = Math.sqrt(x * x + z * z);
    // switch on smoothly across the orbit (near zone inside it stays quiet)
    var s = (r - 0.6 * R) / (0.6 * R);
    if (s <= 0) return 0;
    var taper = s >= 1 ? 1 : s * s * (3 - 2 * s);
    var phi = Math.atan2(z, x);
    return amp * taper * Math.sqrt(R / Math.max(r, R)) * Math.cos(2 * Omega * (t - (r - R) / c) - 2 * phi);
  }
  function bodyPos(t) { var a = Omega * t; return [R * Math.cos(a), R * Math.sin(a)]; }
  function dimple(x, z, b) {
    var dx = x - b[0], dz = z - b[1];
    return -dimDepth / Math.sqrt(1 + (dx * dx + dz * dz) / (dimCore * dimCore));
  }
  // project world point -> [sx, sy, depth]
  function proj(x, y, z) {
    var dy = y - camY, dz = z - camZ;
    var yc = dy * cp + dz * sp, zc = -dy * sp + dz * cp;
    var f = Fk * H / zc;
    return [W / 2 + x * f, H * (0.5 - lift) - yc * f, zc];
  }
  function edgeFade(x, z) {
    var e = Math.max(Math.abs(x), Math.abs(z)) / L;          // 0 centre .. 1 edge
    var a = 1 - Math.pow(e, 4);
    return a < 0 ? 0 : a;
  }
  function sphere(C, Rpx, glowA) {
    var g = ctx.createRadialGradient(C[0], C[1], Rpx * 0.95, C[0], C[1], Rpx * 1.7);
    g.addColorStop(0, 'rgba(' + accent.join(',') + ',' + glowA + ')');
    g.addColorStop(1, 'rgba(' + accent.join(',') + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C[0], C[1], Rpx * 1.7, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#05070a'; ctx.beginPath(); ctx.arc(C[0], C[1], Rpx, 0, 2 * Math.PI); ctx.fill();
  }

  var NB = 10;                                              // alpha buckets
  var paths = [];
  function frame(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var b = bodyPos(t);
    for (var p = 0; p < 2; p++) { paths[p] = []; for (var s = 0; s < 2; s++) { paths[p][s] = []; for (var k = 0; k < NB; k++) paths[p][s][k] = new Path2D(); } }
    var step = 2 * L / (NL - 1), dq = 2 * L / (NP - 1);
    for (var dir = 0; dir < 2; dir++) {
      for (var i = 0; i < NL; i++) {
        var fixed = -L + i * step, prev = null;
        for (var j = 0; j < NP; j++) {
          var q = -L + j * dq;
          var x = dir ? fixed : q, z = dir ? q : fixed;
          var r = Math.sqrt(x * x + z * z), hv = wave(x, z, t);
          var P = proj(x, well(r) + dimple(x, z, b) + hv, z);
          P.push(hv, edgeFade(x, z), z);
          if (prev) {
            var hm = 0.5 * (P[3] + prev[3]);
            var depthA = Math.min(1, 11 / (0.5 * (P[2] + prev[2])));        // fade with distance
            var a = (0.26 + 1.9 * Math.abs(hm)) * depthA * Math.min(P[4], prev[4]);
            if (a > 0.01) {
              var bkt = Math.min(NB - 1, Math.floor(a * NB));
              var pass = (0.5 * (P[5] + prev[5]) > 0) ? 0 : 1;           // z > 0: behind the hole
              var path = paths[pass][hm > 0.08 ? 1 : 0][bkt];
              path.moveTo(prev[0], prev[1]); path.lineTo(P[0], P[1]);
            }
          }
          prev = P;
        }
      }
    }
    ctx.lineWidth = 1.1;
    function draw(pass) {
      for (var s = 0; s < 2; s++) {
        var col = s ? hot : accent;
        for (var k = 0; k < NB; k++) {
          ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + ((k + 0.5) / NB).toFixed(2) + ')';
          ctx.stroke(paths[pass][s][k]);
        }
      }
    }
    // faint orbit track
    ctx.beginPath();
    for (var m = 0; m <= 96; m++) {
      var ang = 2 * Math.PI * m / 96, ox = R * Math.cos(ang), oz = R * Math.sin(ang);
      var O = proj(ox, well(R) + coR, oz);
      if (m) ctx.lineTo(O[0], O[1]); else ctx.moveTo(O[0], O[1]);
    }
    ctx.strokeStyle = 'rgba(' + hot.join(',') + ',0.35)'; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);

    draw(0);
    var hole = proj(0, well(0) + bhR * 1.1, 0), holeR = bhR * Fk * H / hole[2];
    var B = proj(b[0], well(R) + dimple(b[0], b[1], b) + coR, b[1]), BR = Math.max(2.5, coR * Fk * H / B[2]);
    var behind = b[1] > 0;
    if (behind) { sphere(B, BR, 0.35); sphere(hole, holeR, 0.45); }
    else { sphere(hole, holeR, 0.45); }
    draw(1);
    if (!behind) sphere(B, BR, 0.35);
  }

  readColors(); resize();
  var t0 = null, visible = true, still = 0.6;
  function loop(ts) {
    if (t0 === null) t0 = ts;
    if (visible) frame((ts - t0) / 1000);
    requestAnimationFrame(loop);
  }
  window.addEventListener('resize', function () { resize(); if (reduce) frame(still); });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onScheme = function () { readColors(); if (reduce) frame(still); };
    if (mq.addEventListener) mq.addEventListener('change', onScheme); else if (mq.addListener) mq.addListener(onScheme);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
  }
  if (reduce) frame(still); else requestAnimationFrame(loop);
})();
