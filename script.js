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
  chaosFactor: 1
};

// -------------------------
// SEED (DISTORTED START STATE)
// -------------------------
let seed;

if (level === "easy") {
  seed = {
    brightness: original.brightness + rand(-30, 30),
    contrast: original.contrast + rand(-30, 30),
    blur: rand(0, 3),
    tint: rand(-40, 40),

    rotation: 0,
    perspectiveX: 0,
    perspectiveY: 0,
    sliceCount: 1,
    sliceOffset: 0,
    waveStrength: 0,
    chaosFactor: 1
  };
} else {
  seed = {
    brightness: original.brightness + rand(-30, 30),
    contrast: original.contrast + rand(-30, 30),
    blur: rand(0, 4),
    tint: rand(-40, 40),

    rotation: rand(-8, 8),
    perspectiveX: rand(-60, 60),
    perspectiveY: rand(-60, 60),

    sliceCount: Math.floor(rand(3, 10)),
    sliceOffset: rand(-30, 30),

    waveStrength: rand(0, 30),
    chaosFactor: rand(0.7, 1.5)
  };
}

const target = original;
let settings = { ...seed };

// -------------------------
// CODE UI
// -------------------------
function setCode() {
  if (level === "easy") {
    codeBox.value =
`// EASY MODE
brightness = ${Math.round(seed.brightness)}
contrast = ${Math.round(seed.contrast)}
blur = ${Math.round(seed.blur)}
tint = ${Math.round(seed.tint)}
`;
  } else {
    codeBox.value =
`// HARD MODE SYSTEM
brightness = ${Math.round(seed.brightness)}
contrast = ${Math.round(seed.contrast)}
blur = ${Math.round(seed.blur)}
tint = ${Math.round(seed.tint)}
rotation = ${Math.round(seed.rotation)}
perspectiveX = ${Math.round(seed.perspectiveX)}
perspectiveY = ${Math.round(seed.perspectiveY)}
sliceCount = ${Math.round(seed.sliceCount)}
sliceOffset = ${Math.round(seed.sliceOffset)}
waveStrength = ${Math.round(seed.waveStrength)}
chaosFactor = ${seed.chaosFactor.toFixed(2)}
`;
  }
}

setCode();

// -------------------------
// SAFE PARSER
// -------------------------
function parseCode() {
  const lines = codeBox.value.split("\n");

  let user = { ...seed };

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

    const sc = extract("slicecount", line);
    const so = extract("sliceoffset", line);

    const ws = extract("wavestrength", line);
    const cf = extract("chaosfactor", line);

    if (b !== null) user.brightness = b;
    if (c !== null) user.contrast = c;
    if (bl !== null) user.blur = bl;
    if (t !== null) user.tint = t;

    if (level !== "easy") {
      if (r !== null) user.rotation = r;
      if (px !== null) user.perspectiveX = px;
      if (py !== null) user.perspectiveY = py;

      if (sc !== null) user.sliceCount = sc;
      if (so !== null) user.sliceOffset = so;

      if (ws !== null) user.waveStrength = ws;
      if (cf !== null) user.chaosFactor = cf;
    }
  }

  settings = {
    brightness: clamp(user.brightness, 0, 200),
    contrast: clamp(user.contrast, 0, 200),
    blur: clamp(user.blur, 0, 10),
    tint: clamp(user.tint, -200, 200),

    rotation: user.rotation,
    perspectiveX: user.perspectiveX,
    perspectiveY: user.perspectiveY,

    sliceCount: user.sliceCount,
    sliceOffset: user.sliceOffset,

    waveStrength: user.waveStrength,
    chaosFactor: user.chaosFactor
  };
}

// -------------------------
// SCORE
// -------------------------
function getScore() {
  const d = (a, b) => Math.abs(a - b);

  let error = 0;

  error += d(settings.brightness, target.brightness);
  error += d(settings.contrast, target.contrast);
  error += d(settings.blur, target.blur) * 2;
  error += d(settings.tint, target.tint);

  error += d(settings.rotation, target.rotation) * 2;
  error += d(settings.perspectiveX, target.perspectiveX);
  error += d(settings.perspectiveY, target.perspectiveY);

  error += d(settings.sliceCount, target.sliceCount) * 3;
  error += d(settings.sliceOffset, target.sliceOffset);
  error += d(settings.waveStrength, target.waveStrength) * 1.5;

  error += d(settings.chaosFactor, target.chaosFactor) * 20;

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

  ctx.transform(
    1,
    settings.perspectiveY / 1000,
    settings.perspectiveX / 1000,
    1,
    0,
    0
  );

  ctx.filter = `
    brightness(${settings.brightness}%)
    contrast(${settings.contrast}%)
    blur(${settings.blur}px)
  `;

  ctx.drawImage(img, x, y, w, h);

  // -------------------------
  // FIXED TINT (REAL VISUAL EFFECT)
  // -------------------------
  if (settings.tint !== 0) {
    ctx.save();

    const alpha = Math.min(0.6, Math.abs(settings.tint) / 200);
    ctx.globalAlpha = alpha;

    if (settings.tint > 0) {
      ctx.fillStyle = "rgb(255, 80, 80)";
    } else {
      ctx.fillStyle = "rgb(80, 120, 255)";
    }

    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // -------------------------
  // HARD MODE DISTORTION ONLY
  // -------------------------
  if (level !== "easy") {
    const slices = settings.sliceCount;
    const sliceH = h / slices;

    ctx.globalAlpha = 0.6;

    for (let i = 0; i < slices; i++) {
      const offset =
        settings.sliceOffset *
        Math.sin(i * settings.chaosFactor);

      const wave =
        Math.sin(i * 0.5) * settings.waveStrength;

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