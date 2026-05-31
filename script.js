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
  scoreDisplay.textContent = "RESTORATION SCORE: " + score + "%";
}

// -------------------------
// LOOP
// -------------------------
function loop() {
  parseCode();
  draw();
  requestAnimationFrame(loop);
}

loop();  waveStrength: 0,
  chaosFactor: 1
};

// -------------------------
// SEED (DIFFERENT BY LEVEL)
// -------------------------
let seed;

if (level === "easy") {
  seed = {
    // ONLY COLOR DISTORTION
    brightness: original.brightness + rand(-30, 30),
    contrast: original.contrast + rand(-30, 30),
    blur: rand(0, 3),
    tint: rand(-40, 40),

    // NO GEOMETRY IN EASY MODE
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
    // FULL DISTORTION
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
// CODE UI (STRICT RULE)
// -------------------------
function setCode() {
  if (level === "easy") {
    codeBox.value =
`// EASY MODE (ONLY COLOR)
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

    // HARD ONLY EFFECTS (ignored in easy mode)
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
    tint: clamp(user.tint, 0, 200),

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
// SCORE (UNCHANGED BUT WORKS)
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

  // HARD ONLY VISUAL DISTORTION
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
  scoreDisplay.textContent = "RESTORATION SCORE: " + score + "%";
}

// -------------------------
// LOOP
// -------------------------
function loop() {
  parseCode();
  draw();
  requestAnimationFrame(loop);
}

loop();        rotation: 0,
        noise: 3
      };

// -------------------------
// RANDOM START STATE (ONLY FOR HARD VISUAL VARIATION)
// -------------------------
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

const seed = {
  brightness: target.brightness + rand(-10, 10),
  contrast: target.contrast + rand(-10, 10),
  blur: target.blur + rand(-1, 1),
  tint: target.tint + rand(-20, 20),
  rotation: target.rotation + rand(-2, 2),
  noise: target.noise
};

// -------------------------
// INITIAL CODE
// -------------------------
if (level === "easy") {
  codeBox.value =
`// EASY MODE
// Adjust values to restore image

brightness = ${Math.round(seed.brightness)}
contrast = ${Math.round(seed.contrast)}
blur = ${Math.round(seed.blur)}
tint = ${Math.round(seed.tint)}
`;
} else {
  codeBox.value =
`// HARD MODE
// System reconstruction required

core.brightness = ${Math.round(seed.brightness)}
core.contrast = ${Math.round(seed.contrast)}
filter.blur = ${Math.round(seed.blur)}
color.tint = ${Math.round(seed.tint)}
transform.rotation = ${Math.round(seed.rotation)}
noise = ${Math.round(seed.noise)}
`;
}

// -------------------------
// STATE
// -------------------------
let settings = { ...seed };

// -------------------------
// SCORE FUNCTION (FIXED)
// -------------------------
function getScore() {
  const d = (a, b) => Math.abs(a - b);

  // 🟢 EASY MODE = SIMPLE & INTUITIVE
  if (level === "easy") {
    const error =
      d(settings.brightness, target.brightness) +
      d(settings.contrast, target.contrast) +
      d(settings.blur, target.blur) * 2 +
      d(settings.tint, target.tint);

    return Math.max(0, Math.round(100 - error));
  }

  // 🔴 HARD MODE = WEIGHTED SYSTEM
  const error =
    d(settings.brightness, target.brightness) +
    d(settings.contrast, target.contrast) +
    d(settings.blur, target.blur) * 4 +
    d(settings.tint, target.tint) +
    d(settings.rotation, target.rotation) * 2;

  return Math.max(0, Math.round(100 - error));
}

// -------------------------
// IMAGE UPLOAD
// -------------------------
upload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (event) {
    img = new Image();
    img.src = event.target.result;
    img.onload = draw;
  };

  reader.readAsDataURL(file);
});

// -------------------------
// PARSER
// -------------------------
function parseCode() {
  const lines = codeBox.value.split("\n");

  let user = {
    brightness: seed.brightness,
    contrast: seed.contrast,
    blur: seed.blur,
    tint: seed.tint,
    rotation: seed.rotation,
    noise: seed.noise
  };

  lines.forEach(line => {
    const l = line.replace(/\s/g, "").toLowerCase();

    if (l.includes("brightness=")) user.brightness = Number(l.split("=")[1]);
    if (l.includes("contrast=")) user.contrast = Number(l.split("=")[1]);
    if (l.includes("blur=")) user.blur = Number(l.split("=")[1]);
    if (l.includes("tint=")) user.tint = Number(l.split("=")[1]);
    if (l.includes("rotation=")) user.rotation = Number(l.split("=")[1]);
    if (l.includes("noise=")) user.noise = Number(l.split("=")[1]);
  });

  // -------------------------
  // EASY MODE (DIRECT CONTROL)
  // -------------------------
  if (level === "easy") {
    settings = {
      brightness: user.brightness,
      contrast: user.contrast,
      blur: user.blur,
      tint: user.tint,
      rotation: 0,
      noise: 0
    };
  }

  // -------------------------
  // HARD MODE (NONLINEAR SYSTEM)
  // -------------------------
  else {
    const n = user.noise;

    settings.brightness =
      user.contrast -
      Math.pow(n, 2) * 2 +
      20 * Math.sin(user.rotation);

    settings.contrast =
      user.contrast +
      Math.log(user.blur + 1) * 15 -
      Math.abs(user.rotation) * 2;

    settings.tint =
      user.tint +
      30 * Math.sin(user.rotation * 0.6);

    settings.blur = user.blur;
    settings.rotation = user.rotation;
    settings.noise = n;

    // clamp
    settings.brightness = Math.max(40, Math.min(180, settings.brightness));
    settings.contrast = Math.max(40, Math.min(180, settings.contrast));
    settings.tint = Math.max(0, Math.min(255, settings.tint));
  }
}

// -------------------------
// DRAW (STABLE VISUAL SYSTEM)
// -------------------------
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f2f2f2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!img) {
    ctx.fillStyle = "#000";
    ctx.font = "16px Arial";
    ctx.fillText("Lae üles pilt", 20, 40);
    return;
  }

  const canvasRatio = canvas.width / canvas.height;
  const imgRatio = img.width / img.height;

  let w, h;

  if (imgRatio > canvasRatio) {
    w = canvas.width;
    h = canvas.width / imgRatio;
  } else {
    h = canvas.height;
    w = canvas.height * imgRatio;
  }

  const x = -w / 2;
  const y = -h / 2;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);

  if (level === "hard") {
    ctx.rotate(settings.rotation * Math.PI / 180);
  }

  ctx.filter = `
    brightness(${settings.brightness}%)
    contrast(${settings.contrast}%)
    blur(${settings.blur}px)
  `;

  ctx.drawImage(img, x, y, w, h);

  ctx.filter = "none";

  // controlled corruption overlay
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "lime";
  ctx.fillRect(x, y, w, h);

  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "magenta";
  ctx.fillRect(x, y, w, h);

  ctx.globalAlpha = 1;

  ctx.restore();

  // noise (hard only)
  if (level === "hard") {
    for (let i = 0; i < settings.noise * 120; i++) {
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        2,
        2
      );
    }
  }

  // UI
  const score = getScore();

  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.fillText("Restoration score: " + score + "%", 20, 30);

  bVal.textContent = "brightness: " + Math.round(settings.brightness);
  rVal.textContent = "tint: " + Math.round(settings.tint);
  blurVal.textContent = "blur: " + settings.blur;
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
