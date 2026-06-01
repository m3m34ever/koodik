const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const upload = document.getElementById("upload");
const codeBox = document.getElementById("code");
const scoreDisplay = document.getElementById("scoreDisplay");

let img = null;

const params = new URLSearchParams(window.location.search);
const level = params.get("level") || "easy";

// -------------------------
// HELPERS
// -------------------------
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function irand(min, max) {
  return Math.round(rand(min, max));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// -------------------------
// ORIGINAL STATE (CLEAN IMAGE)
// -------------------------
const original = {
  brightness: 100,
  contrast: 100,
  blur: 0,
  tint: 0,
  rotation: 0,
  perspectiveX: 0,
  perspectiveY: 0,
  sliceCount: 1,
  sliceOffset: 0,
  waveStrength: 0,
  chaosFactor: 1,
  interlace: 0,
  saturate: 100, hue: 0, pixelate: 0
};

// -------------------------
// HIDDEN TRUTH (baked into image, never shown to player)
// -------------------------
let truth;

if (level === "easy") {
  truth = {
    brightness: rand(70, 130), contrast: rand(70, 130),
    blur: rand(0, 3), tint: rand(-40, 40),
    rotation: 0, perspectiveX: 0, perspectiveY: 0,
    sliceCount: 1, sliceOffset: 0, waveStrength: 0, chaosFactor: 1, interlace: 0,
    saturate: 100, hue: 0, pixelate: 0
  };
} else {
  truth = {
    brightness: rand(60, 140), contrast: rand(60, 140),   // multiplicative — leave as rand
    blur: irand(0, 4), tint: irand(-60, 60),
    rotation: irand(-8, 8),
    perspectiveX: irand(-60, 60), perspectiveY: irand(-60, 60),
    sliceCount: Math.floor(rand(3, 9)),
    sliceOffset: irand(-30, 30),
    waveStrength: irand(0, 30),
    chaosFactor: rand(0.7, 1.5),                            // not scored — leave as rand
    interlace: irand(8, 30),
    saturate: rand(40, 160),                                // multiplicative — leave as rand
    hue: irand(-60, 60),
    pixelate: irand(3, 12)
  };

}

const target = original;

// what the player edits — neutral = "no correction"
let settings = {
  brightness: 100, contrast: 100, blur: 0, tint: 0,
  rotation: 0, perspectiveX: 0, perspectiveY: 0,
  sliceOffset: 0, waveStrength: 0, interlace: 0,
  saturate: 100, hue: 0, pixelate: 0
};

// NET = truth combined with the player's correction.
// This is what gets drawn AND scored.
function net() {
  return {
    brightness: truth.brightness * settings.brightness / 100,
    contrast:   truth.contrast   * settings.contrast   / 100,
    blur:       Math.max(0, truth.blur + settings.blur),
    tint:       truth.tint + settings.tint,
    rotation:   truth.rotation + settings.rotation,
    perspectiveX: truth.perspectiveX + settings.perspectiveX,
    perspectiveY: truth.perspectiveY + settings.perspectiveY,
    sliceOffset:  truth.sliceOffset + settings.sliceOffset,
    waveStrength: truth.waveStrength + settings.waveStrength,
    sliceCount: truth.sliceCount,
    chaosFactor: truth.chaosFactor,
    interlace: truth.interlace + settings.interlace,
    saturate: truth.saturate * settings.saturate / 100,
    hue: truth.hue + settings.hue,
    pixelate: truth.pixelate + settings.pixelate
  };
}


// -------------------------
// CODE UI
// -------------------------
function setCode() {
  if (level === "easy") {
    codeBox.value =
`// EASY MODE
brightness = ${settings.brightness}
contrast = ${settings.contrast}
blur = ${settings.blur}
tint = ${settings.tint}
`;
  } else {
    codeBox.value =
`// HARD MODE SYSTEM
brightness = ${settings.brightness}
contrast = ${settings.contrast}
blur = ${settings.blur}
tint = ${settings.tint}
rotation = ${settings.rotation}
perspectiveX = ${settings.perspectiveX}
perspectiveY = ${settings.perspectiveY}
sliceOffset = ${settings.sliceOffset}
waveStrength = ${settings.waveStrength}
interlace = ${settings.interlace}
saturate = ${settings.saturate}
hue = ${settings.hue}
pixelate = ${settings.pixelate}
`;
  }
}

setCode();

// -------------------------
// SAFE PARSER
// -------------------------
function parseCode() {
  const lines = codeBox.value.split("\n");

  let user = { ...settings };

  const extract = (key, line) => {
    const m = line.toLowerCase().replace(/\s/g, "").match(new RegExp(key + "=(.*)"));
    if (!m) return null;
    const v = parseFloat(m[1]);
    return isNaN(v) ? null : v;
  };

  for (let line of lines) {
    const b = extract("brightness", line);
    const c = extract("contrast", line);
    const bl = extract("blur", line);
    const t = extract("tint", line);

    const r = extract("rotation", line);
    const px = extract("perspectivex", line);
    const py = extract("perspectivey", line);

    const so = extract("sliceoffset", line);

    const ws = extract("wavestrength", line);
    const il = extract("interlace", line);
    const sa = extract("saturate", line);
    const h = extract("hue", line);
    const p = extract("pixelate", line);

    if (b !== null) user.brightness = b;
    if (c !== null) user.contrast = c;
    if (bl !== null) user.blur = bl;
    if (t !== null) user.tint = t;
    if (sa !== null) user.saturate = sa;
    if (h !== null) user.hue = h;
    if (p !== null) user.pixelate = p;

    if (level !== "easy") {
      if (r !== null) user.rotation = r;
      if (px !== null) user.perspectiveX = px;
      if (py !== null) user.perspectiveY = py;

      if (so !== null) user.sliceOffset = so;
      if (ws !== null) user.waveStrength = ws;
      if (il !== null) user.interlace = il;
    }
  }

  settings = {
    brightness: clamp(user.brightness, 0, 200),
    contrast: clamp(user.contrast, 0, 200),
    blur: clamp(user.blur, -10, 10),   // allow negative to cancel hidden blur
    tint: clamp(user.tint, -200, 200),
    rotation: user.rotation,
    perspectiveX: user.perspectiveX,
    perspectiveY: user.perspectiveY,
    sliceOffset: user.sliceOffset,
    waveStrength: user.waveStrength,
    interlace: user.interlace,
    saturate: clamp(user.saturate, 0, 300),
    hue: user.hue,
    pixelate: clamp(user.pixelate, -50, 50)
  };

}

// -------------------------
// SCORE
// -------------------------
function getScore() {
  const s = net();
  const d = (a, b) => Math.abs(a - b);

  const terms = [
    [s.brightness, target.brightness, 1],
    [s.contrast,   target.contrast,   1],
    [s.blur,       target.blur,       2],
    [s.tint,       target.tint,       1],
    [s.rotation,   target.rotation,   2],
    [s.perspectiveX, target.perspectiveX, 1],
    [s.perspectiveY, target.perspectiveY, 1],
    [s.sliceOffset,  target.sliceOffset,  1],
    [s.waveStrength, target.waveStrength, 1.5],
    [s.interlace,    target.interlace,    1.5],
    [s.saturate,     target.saturate,     1],
    [s.hue,          target.hue,          1],
    [s.pixelate,     target.pixelate,     1.5],
  ];

  let error = 0;
  for (const [val, tgt, w] of terms) error += d(val, tgt) * w;

  const tolerance = terms.length * 0.5;   // ~0.25 slack per knob → grows as you add params
  if (error < tolerance) return 100;
  return Math.max(0, Math.round(100 - error));
}

// -------------------------
// UPLOAD
// -------------------------
upload.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = ev => {
    img = new Image();
    img.src = ev.target.result;
    img.onload = () => draw();
  };

  reader.readAsDataURL(file);
});

// -------------------------
// DRAW
// -------------------------
function draw() {
  
  if (!img) return;

  const s = net();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cw = canvas.width;
  const ch = canvas.height;

  const ratio = img.width / img.height;

  let w = cw;
  let h = cw / ratio;

  if (h > ch) {
    h = ch;
    w = ch * ratio;
  }

  const x = (cw - w) / 2;
  const y = (ch - h) / 2;

  ctx.save();

  ctx.translate(cw / 2, ch / 2);
  ctx.rotate(s.rotation * Math.PI / 180);
  ctx.translate(-cw / 2, -ch / 2);


  ctx.transform(
    1,
    s.perspectiveY / 1000,
    s.perspectiveX / 1000,
    1,
    0,
    0
  );

  ctx.filter = `
    brightness(${s.brightness}%)
    contrast(${s.contrast}%)
    blur(${s.blur}px)
    saturate(${s.saturate}%)
    hue-rotate(${s.hue}deg)
  `;

  ctx.drawImage(img, x, y, w, h);

  if (s.pixelate > 1) {
    const pw = Math.max(1, Math.floor(w / s.pixelate));
    const ph = Math.max(1, Math.floor(h / s.pixelate));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, pw, ph);          // shrink
    ctx.drawImage(canvas, x, y, pw, ph, x, y, w, h); // blow back up
    ctx.imageSmoothingEnabled = true;
  }

  // -------------------------
  // FIXED TINT (REAL VISUAL EFFECT)
  // -------------------------
  if (s.tint !== 0) {
    ctx.save();

    const alpha = Math.min(0.6, Math.abs(s.tint) / 200);
    ctx.globalAlpha = alpha;

    if (s.tint > 0) {
      ctx.fillStyle = "rgb(255, 80, 80)";
    } else {
      ctx.fillStyle = "rgb(80, 120, 255)";
    }

    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // -------------------------
  // INTERLACING (torn scanlines)
  // -------------------------
  if (s.interlace !== 0) {
    ctx.globalAlpha = 1;
    const lineH = 3;                       // band thickness in px
    for (let yy = 0; yy < h; yy += lineH * 2) {
      // map this canvas band back to the image's pixel space
      const srcY = (yy / h) * img.height;
      const srcH = (lineH / h) * img.height;
      ctx.drawImage(
        img,
        0, srcY, img.width, srcH,          // source band (full width)
        x + s.interlace, y + yy, w, lineH  // dest, shifted sideways
      );
    }
  }

  // -------------------------
  // HARD MODE DISTORTION ONLY
  // -------------------------
  if (level !== "easy") {
    const slices = s.sliceCount;
    const sliceH = h / slices;

    ctx.globalAlpha = 0.6;

    for (let i = 0; i < slices; i++) {
      const offset =
        s.sliceOffset *
        Math.sin(i * s.chaosFactor);

      const wave =
        Math.sin(i * 0.5) * s.waveStrength;

      ctx.drawImage(
        img,
        x,
        y + i * sliceH,
        w,
        sliceH,
        x + offset,
        y + i * sliceH + wave,
        w,
        sliceH
      );
    }
  }

  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.filter = "none";

  const score = getScore();
  scoreDisplay.textContent = "RESTAUREERIMISE SKOOR: " + score + "%";
}

// -------------------------
// LOOP
// -------------------------
function loop() {
  parseCode();
  draw();
  requestAnimationFrame(loop);
}

loop();