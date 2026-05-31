const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const upload = document.getElementById("upload");
const codeBox = document.getElementById("code");

const bVal = document.getElementById("bVal");
const rVal = document.getElementById("rVal");
const blurVal = document.getElementById("blurVal");

let img = null;

// -------------------------
// LEVEL
// -------------------------
const params = new URLSearchParams(window.location.search);
const level = params.get("level") || "easy";

// -------------------------
// EASY MODE TARGET = FIXED (IMPORTANT)
// -------------------------
const target =
  level === "easy"
    ? {
        brightness: 100,
        contrast: 100,
        blur: 0,
        tint: 0,
        rotation: 0,
        noise: 0
      }
    : {
        brightness: 120,
        contrast: 120,
        blur: 2,
        tint: 120,
        rotation: 0,
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