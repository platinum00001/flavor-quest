/* Flavor Quest – Avatar Studio (round 3).
   Take or upload a photo, crop it, and optionally turn it into an illustrated
   Syren Harbour-style badge. Everything runs on the phone in a <canvas>:
   nothing is uploaded anywhere. Exposes window.FQStudio. */
(function () {
  'use strict';
  const OUT = 256;              // stored avatar size (px)
  const NAVY = '#141825';
  // Tones sampled from the Syren Harbour logo (see palette.json) plus in-between steps
  const PALETTE = [
    '#141825', '#2c313b', '#4a4950', '#4f5d72', '#61636c', '#7d8ea3', '#909ead', '#a9b8c6', '#c0cdd4', '#dde4ea', '#f4f4f9', // navy → slate → cloud
    '#3a2622', '#5c3d33', '#7e574b', '#a8755f', '#c4927b', '#dcb39b', '#efd3c1',                                              // bronze skin tones
    '#2a3734', '#41514e', '#6f8a6a',                                                                                           // palm greens
    '#7a3b3f', '#b8506f', '#d6a933'                                                                                            // lip rose, sweet rose, brass
  ];

  const $ = (s, el) => (el || document).querySelector(s);
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  // ---- colour helpers (sRGB → CIE Lab) ----
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const fLab = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  function lab(r, g, b) {
    const R = lin(r), G = lin(g), B = lin(b);
    const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const fx = fLab(x), fy = fLab(y), fz = fLab(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  const PAL = PALETTE.map(h => { const c = hex(h); return { rgb: c, lab: lab(c[0], c[1], c[2]) }; });

  // ---- Kuwahara filter (summed-area tables) → flat painted regions with crisp edges ----
  function kuwahara(img, w, h, r) {
    const src = img.data, n = w * h;
    const W = w + 1, sat = k => new Float64Array(W * (h + 1));
    const sR = sat(), sG = sat(), sB = sat(), sL = sat(), sL2 = sat();
    for (let y = 0; y < h; y++) {
      let aR = 0, aG = 0, aB = 0, aL = 0, aL2 = 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, R = src[i], G = src[i + 1], B = src[i + 2], L = 0.299 * R + 0.587 * G + 0.114 * B;
        aR += R; aG += G; aB += B; aL += L; aL2 += L * L;
        const o = (y + 1) * W + x + 1, u = y * W + x + 1;
        sR[o] = sR[u] + aR; sG[o] = sG[u] + aG; sB[o] = sB[u] + aB; sL[o] = sL[u] + aL; sL2[o] = sL2[u] + aL2;
      }
    }
    const box = (t, x0, y0, x1, y1) => t[(y1 + 1) * W + x1 + 1] - t[y0 * W + x1 + 1] - t[(y1 + 1) * W + x0] + t[y0 * W + x0];
    const out = new ImageData(w, h), d = out.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let best = Infinity, bx0 = 0, by0 = 0, bx1 = 0, by1 = 0, bc = 1;
      for (let q = 0; q < 4; q++) {
        const x0 = Math.max(0, q & 1 ? x : x - r), x1 = Math.min(w - 1, q & 1 ? x + r : x);
        const y0 = Math.max(0, q & 2 ? y : y - r), y1 = Math.min(h - 1, q & 2 ? y + r : y);
        const c = (x1 - x0 + 1) * (y1 - y0 + 1), m = box(sL, x0, y0, x1, y1) / c, v = box(sL2, x0, y0, x1, y1) / c - m * m;
        if (v < best) { best = v; bx0 = x0; by0 = y0; bx1 = x1; by1 = y1; bc = c; }
      }
      const i = (y * w + x) * 4;
      d[i] = box(sR, bx0, by0, bx1, by1) / bc; d[i + 1] = box(sG, bx0, by0, bx1, by1) / bc; d[i + 2] = box(sB, bx0, by0, bx1, by1) / bc; d[i + 3] = 255;
    }
    void n; return out;
  }

  // Lab → sRGB
  const gam = c => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.max(0, Math.min(255, v * 255)); };
  function rgbOf(L, a, b) {
    const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
    const inv = t => t * t * t > 0.008856 ? t * t * t : (t - 16 / 116) / 7.787;
    const X = inv(fx) * 0.95047, Y = inv(fy), Z = inv(fz) * 1.08883;
    return [gam(X * 3.2406 - Y * 1.5372 - Z * 0.4986), gam(-X * 0.9689 + Y * 1.8758 + Z * 0.0415), gam(X * 0.0557 - Y * 0.2040 + Z * 1.0570)];
  }
  const NAVY_LAB = lab(20, 24, 37), CLOUD_LAB = lab(244, 244, 249), STEEL_LAB = lab(144, 158, 173), BRONZE_LAB = lab(196, 146, 123);

  // ---- Stylize: paint-smooth → posterize tones (keeping hue) → Syren colour grade → navy ink outlines ----
  function stylize(srcCanvas) {
    const w = srcCanvas.width, h = srcCanvas.height;
    const ctx = srcCanvas.getContext('2d');
    let im = ctx.getImageData(0, 0, w, h);
    im = kuwahara(im, w, h, 3);
    im = kuwahara(im, w, h, 3);
    const sm = im.data;
    // luminance (lightly blurred) for the ink lines
    const L = new Float32Array(w * h), Lb = new Float32Array(w * h);
    for (let p = 0, i = 0; p < w * h; p++, i += 4) L[p] = 0.299 * sm[i] + 0.587 * sm[i + 1] + 0.114 * sm[i + 2];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const p = y * w + x; Lb[p] = (4 * L[p] + 2 * (L[p - 1] + L[p + 1] + L[p - w] + L[p + w]) + L[p - w - 1] + L[p - w + 1] + L[p + w - 1] + L[p + w + 1]) / 16; }
    const mag = new Float32Array(w * h);
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      const p = y * w + x;
      const gx = -Lb[p - w - 1] - 2 * Lb[p - 1] - Lb[p + w - 1] + Lb[p - w + 1] + 2 * Lb[p + 1] + Lb[p + w + 1];
      const gy = -Lb[p - w - 1] - 2 * Lb[p - w] - Lb[p - w + 1] + Lb[p + w - 1] + 2 * Lb[p + w] + Lb[p + w + 1];
      mag[p] = Math.hypot(gx, gy);
    }
    const sorted = Array.from(mag).sort((a, b) => a - b);
    const t = Math.max(50, sorted[Math.floor(sorted.length * 0.9)]);
    const out = ctx.createImageData(w, h), o = out.data;
    const cache = new Map();
    const nk = hex(NAVY), STEP = 14;
    const mix = (A, B, k) => [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k];
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      const R = sm[i], G = sm[i + 1], B = sm[i + 2];
      const key = (R >> 2) << 12 | (G >> 2) << 6 | (B >> 2);
      let c = cache.get(key);
      if (!c) {
        let [l, a, b] = lab(R, G, B);
        // posterize lightness into flat illustrated bands (soft-edged)
        const q = Math.round(l / STEP) * STEP; l = Math.min(100, (q * 0.75 + l * 0.25) * 1.04 + 2);
        // keep hue, calm the chroma, warm skin toward bronze, cool the rest toward steel blue
        const warm = Math.max(0, Math.min(1, (b + a * 0.5) / 30));
        a *= 0.78; b *= 0.78;
        let lab2 = [l, a, b];
        lab2 = mix(lab2, [l, BRONZE_LAB[1], BRONZE_LAB[2]], 0.28 * warm);
        lab2 = mix(lab2, [l, STEEL_LAB[1], STEEL_LAB[2]], 0.35 * (1 - warm));
        const tt = l / 100;
        lab2 = mix(lab2, NAVY_LAB, 0.25 * Math.pow(1 - tt, 2.2));     // shadows sink into navy
        lab2 = mix(lab2, CLOUD_LAB, 0.25 * Math.pow(tt, 3));          // highlights go cloud-white
        c = rgbOf(lab2[0], lab2[1], lab2[2]);
        cache.set(key, c);
      }
      const a = Math.max(0, Math.min(1, (mag[p] - t) / (t * 0.8))) * 0.9;
      o[i] = c[0] * (1 - a) + nk[0] * a; o[i + 1] = c[1] * (1 - a) + nk[1] * a; o[i + 2] = c[2] * (1 - a) + nk[2] * a; o[i + 3] = 255;
    }
    const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
    c2.getContext('2d').putImageData(out, 0, 0);
    return c2;
  }

  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const toData = (c, type, q) => { const u = c.toDataURL(type, q); return u.indexOf('data:' + type) === 0 ? u : c.toDataURL('image/png'); };
  const FONT = '"Playfair Display", Georgia, "Times New Roman", serif';

  // ---- Oval badge with rope frame and a ribbon carrying the player's name (like the Syren Harbour logo) ----
  async function composeBadge(artURL, name) {
    try { if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load('900 40px "Playfair Display"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* fall back to Georgia */ }
    const art = await loadImg(artURL);
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    const cx = 256, cy = 222, rx = 178, ry = 212;
    const oval = (k) => { x.beginPath(); x.ellipse(cx, cy, rx + k, ry + k, 0, 0, Math.PI * 2); };
    // soft cloud halo
    oval(16); x.fillStyle = 'rgba(244,244,249,.96)'; x.fill();
    // portrait
    x.save(); oval(0); x.clip();
    const side = ry * 2; x.drawImage(art, cx - side / 2, cy - ry, side, side);
    const g = x.createLinearGradient(0, cy + ry * 0.35, 0, cy + ry); g.addColorStop(0, 'rgba(20,24,37,0)'); g.addColorStop(1, 'rgba(20,24,37,.28)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.restore();
    // navy frame + rope
    oval(0); x.lineWidth = 20; x.strokeStyle = NAVY; x.stroke();
    oval(0); x.lineWidth = 11; x.strokeStyle = '#909ead'; x.setLineDash([9, 5]); x.stroke(); x.setLineDash([]);
    oval(-12); x.lineWidth = 2.5; x.strokeStyle = '#f4f4f9'; x.stroke();
    oval(12); x.lineWidth = 2.5; x.strokeStyle = NAVY; x.stroke();
    // ribbon
    const y0 = 372, hgt = 64, L0 = 44, R0 = 468, sag = 16;
    const tail = (dir) => {
      const ex = dir < 0 ? L0 : R0, ox = ex + dir * 34;
      x.beginPath(); x.moveTo(ex, y0 + 18); x.lineTo(ox, y0 + 18); x.lineTo(ox - dir * 12, y0 + 18 + hgt / 2); x.lineTo(ox, y0 + 18 + hgt); x.lineTo(ex, y0 + 18 + hgt); x.closePath();
      x.fillStyle = '#7d8ea3'; x.fill(); x.lineWidth = 5; x.strokeStyle = NAVY; x.stroke();
    };
    tail(-1); tail(1);
    x.beginPath(); x.moveTo(L0, y0); x.quadraticCurveTo(cx, y0 + sag, R0, y0); x.lineTo(R0, y0 + hgt); x.quadraticCurveTo(cx, y0 + hgt + sag, L0, y0 + hgt); x.closePath();
    const rg = x.createLinearGradient(0, y0, 0, y0 + hgt); rg.addColorStop(0, '#dde4ea'); rg.addColorStop(1, '#a9b8c6');
    x.fillStyle = rg; x.fill(); x.lineWidth = 6; x.strokeStyle = NAVY; x.stroke();
    x.beginPath(); x.moveTo(L0 + 10, y0 + 8); x.quadraticCurveTo(cx, y0 + 8 + sag, R0 - 10, y0 + 8); x.lineWidth = 2; x.strokeStyle = 'rgba(20,24,37,.45)'; x.stroke();
    // name
    const label = String(name || 'Flavor Explorer').toUpperCase().slice(0, 24);
    let fs = 46; x.font = `900 ${fs}px ${FONT}`;
    while (x.measureText(label).width > 380 && fs > 18) { fs -= 2; x.font = `900 ${fs}px ${FONT}`; }
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = NAVY;
    x.fillText(label, cx, y0 + hgt / 2 + sag / 2 + 2);
    // sub-label
    x.font = `italic 700 22px ${FONT}`;
    x.lineWidth = 6; x.strokeStyle = '#f4f4f9'; x.strokeText('Flavor Quest · Cape Cod', cx, y0 + hgt + sag + 22);
    x.fillStyle = NAVY; x.fillText('Flavor Quest · Cape Cod', cx, y0 + hgt + sag + 22);
    const o = document.createElement('canvas'); o.width = o.height = OUT;
    const ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(c, 0, 0, OUT, OUT);
    return toData(o, 'image/webp', 0.86);
  }

  async function makeArt(origURL) {
    const img = await loadImg(origURL);
    const W = 384, c = document.createElement('canvas'); c.width = c.height = W;
    const cx = c.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(img, 0, 0, W, W);
    const art = stylize(c);
    const o = document.createElement('canvas'); o.width = o.height = OUT;
    const ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(art, 0, 0, OUT, OUT);
    return o.toDataURL('image/jpeg', 0.86);
  }

  // ---- Studio overlay: crop → original or stylized ----
  function open(opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const file = opts.file;
      const wrap = document.createElement('div');
      wrap.className = 'studio'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true');
      wrap.innerHTML = `<div class="studio-card">
        <div class="studio-head"><h2>Your photo avatar</h2><button class="sheet-close" id="avCancel" aria-label="Cancel">✕</button></div>
        <p class="privacy">🔒 Your photo stays on your phone. Nothing is uploaded.</p>
        <div id="avStage"><div class="cropper" id="avCrop"><img id="avImg" alt="" draggable="false"><div class="crop-ring"></div></div>
          <label class="zoom">🔍<input type="range" id="avZoom" min="1" max="4" step="0.01" value="1" aria-label="Zoom"></label>
          <p class="hint" style="text-align:center">Drag to move · pinch or slide to zoom</p>
          <button class="btn block" id="avCropDone">Use this crop →</button></div>
      </div>`;
      document.body.appendChild(wrap);
      document.body.style.overflow = 'hidden';
      const done = v => { wrap.remove(); if (!document.querySelector('#sheet:not([hidden])')) document.body.style.overflow = ''; resolve(v); };
      $('#avCancel', wrap).onclick = () => done(null);
      const rd = new FileReader();
      rd.onload = async () => {
        let img;
        try { img = await loadImg(rd.result); } catch (e) { alert('Sorry, that image could not be opened.'); return done(null); }
        const box = $('#avCrop', wrap), el = $('#avImg', wrap), zoom = $('#avZoom', wrap);
        el.src = rd.result;
        const V = () => box.clientWidth;
        const iw = img.naturalWidth, ih = img.naturalHeight;
        let z = 1, cx = iw / 2, cy = ih / 2;
        const scale = () => V() / Math.min(iw, ih) * z;
        const clamp = () => { const half = V() / scale() / 2; cx = Math.max(half, Math.min(iw - half, cx)); cy = Math.max(half, Math.min(ih - half, cy)); };
        const draw = () => { clamp(); const s = scale(); el.style.width = iw * s + 'px'; el.style.height = ih * s + 'px'; el.style.transform = `translate(${V() / 2 - cx * s}px,${V() / 2 - cy * s}px)`; };
        draw();
        const pts = new Map(); let pinch0 = 0, z0 = 1;
        box.onpointerdown = e => { box.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); z0 = z; } };
        box.onpointermove = e => {
          if (!pts.has(e.pointerId)) return;
          const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
          if (pts.size === 2) { const [a, b] = [...pts.values()]; z = Math.max(1, Math.min(4, z0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / (pinch0 || 1))); zoom.value = z; }
          else { const s = scale(); cx -= (e.clientX - prev[0]) / s; cy -= (e.clientY - prev[1]) / s; }
          draw();
        };
        box.onpointerup = box.onpointercancel = e => { pts.delete(e.pointerId); };
        box.onwheel = e => { e.preventDefault(); z = Math.max(1, Math.min(4, z * (e.deltaY < 0 ? 1.08 : 0.92))); zoom.value = z; draw(); };
        zoom.oninput = () => { z = +zoom.value; draw(); };
        $('#avCropDone', wrap).onclick = () => {
          const s = scale(), side = V() / s;
          const c = document.createElement('canvas'); c.width = c.height = OUT;
          const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.fillStyle = '#fff'; x.fillRect(0, 0, OUT, OUT);
          x.drawImage(img, cx - side / 2, cy - side / 2, side, side, 0, 0, OUT, OUT);
          const orig = c.toDataURL('image/jpeg', 0.8);
          showChoice(orig);
        };
      };
      rd.onerror = () => done(null);
      rd.readAsDataURL(file);

      function showChoice(orig) {
        const photo = { orig, art: '', badge: '', use: 'orig' };
        const stage = $('#avStage', wrap);
        const paint = () => {
          stage.innerHTML = `<div class="av-choices">
              <button class="av-choice ${photo.use === 'orig' ? 'sel' : ''}" id="avPickOrig"><span class="avatar img xl"><img src="${photo.orig}" alt="Original photo"></span><b>Original photo</b></button>
              <button class="av-choice ${photo.use === 'art' ? 'sel' : ''}" id="avPickArt" ${photo.badge ? '' : 'disabled'}>${photo.badge ? `<span class="avatar img badge xl"><img src="${photo.badge}" alt="Syren-style avatar"></span>` : '<span class="avatar xl art-empty">🧜‍♀️</span>'}<b>Syren-style avatar</b></button>
            </div>
            ${photo.badge ? '<p class="hint" style="text-align:center">Tap the one you want.</p>' : `<button class="btn coral block" id="avMakeArt">✨ Make it an avatar</button><p class="hint" style="text-align:center">Turns your photo into an illustrated portrait in the Syren Harbour colors, framed with your name.</p>`}
            <button class="btn block" id="avSave" style="margin-top:12px">Save avatar</button>
            <button class="btn ghost block" id="avRedo" style="margin-top:10px">Choose a different photo</button>`;
          const mk = $('#avMakeArt', stage);
          if (mk) mk.onclick = async () => {
            mk.disabled = true; mk.innerHTML = '<span class="spinner"></span> Painting your portrait…';
            await new Promise(r => setTimeout(r, 30));
            try {
              photo.art = await makeArt(photo.orig);
              photo.badge = await composeBadge(photo.art, typeof opts.name === 'function' ? opts.name() : opts.name);
              photo.use = 'art';
            } catch (e) { console.error(e); alert('Sorry, the avatar could not be made on this device.'); }
            paint();
          };
          $('#avPickOrig', stage).onclick = () => { photo.use = 'orig'; paint(); };
          $('#avPickArt', stage).onclick = () => { if (photo.badge) { photo.use = 'art'; paint(); } };
          $('#avSave', stage).onclick = () => done(Object.assign(photo, { created: Date.now() }));
          $('#avRedo', stage).onclick = () => done({ redo: true });
        };
        paint();
      }
    });
  }

  window.FQStudio = { open, composeBadge, makeArt, stylize, PALETTE };
})();
