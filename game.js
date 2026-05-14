const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const storyText = document.querySelector("#storyText");
const soundButton = document.querySelector("#soundButton");
const narrationButton = document.querySelector("#narrationButton");
const prevSceneButton = document.querySelector("#prevSceneButton");
const playPauseButton = document.querySelector("#playPauseButton");
const nextSceneButton = document.querySelector("#nextSceneButton");
const speedButton = document.querySelector("#speedButton");
const goButton = document.querySelector("#goButton");
const jumpButton = document.querySelector("#jumpButton");
const twirlButton = document.querySelector("#twirlButton");
const rocketButton = document.querySelector("#rocketButton");
const trainButton = document.querySelector("#trainButton");
const craneButton = document.querySelector("#craneButton");
const towTruckButton = document.querySelector("#towTruckButton");
const adventureButton = document.querySelector("#adventureButton");

const W = canvas.width;
const H = canvas.height;
const GROUND = 438;
/** Pixel radius of car/train rover wheels; roll angle ≈ path distance / this. */
const WHEEL_R = 15;
const NARRATION_MANIFEST_URL = "audio/narration/manifest.json";
const speechNarrationSupported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

const scenes = [
  {
    text: "On the moon, the cars climb onto the rocket ships. Ready, steady...",
    sky: "moon",
    duration: 6200,
  },
  {
    text: "Moon gravity zoom! The cars jump super high off the rockets!",
    sky: "moon",
    duration: 6600,
  },
  {
    text: "Down, down, soft moon bounce! The cars land in the moon dust.",
    sky: "moon",
    duration: 6200,
  },
  {
    text: "Boing! The cars jump onto the moon train.",
    sky: "moon",
    duration: 6200,
  },
  {
    text: "The moon train goes through a moon tunnel. Space bats flap flap flap!",
    sky: "moonTunnel",
    duration: 7200,
  },
  {
    text: "The train stops at the moon station. Rocket drivers are waiting!",
    sky: "moonStation",
    duration: 6200,
  },
  {
    text: "The rocket drivers zoom over the moon craters!",
    sky: "moon",
    duration: 6500,
  },
  {
    text: "Around the moon they go: twirl, twirl, twirl!",
    sky: "moon",
    duration: 7000,
  },
  {
    text: "The rocket drivers visit stripey moon domes and bouncy moon hills.",
    sky: "moon",
    duration: 6800,
  },
  {
    text: "They look everywhere for moon food. Is it behind the moon rocks?",
    sky: "moon",
    duration: 6800,
  },
  {
    text: "Vroom! The rocket drivers ride moon race cars.",
    sky: "moon",
    duration: 6600,
  },
  {
    text: "Toy garage pause! Ramp lights blink blink on the sparkly moon playground.",
    sky: "moon",
    duration: 6800,
  },
  {
    text: "Pop goes the ramp! Toy cars bounce-burst out in a giggly sparkly whoosh!",
    sky: "moon",
    duration: 7200,
  },
  {
    text: "Moon dance party! Wiggle, bounce, spin!",
    sky: "moon",
    duration: 6800,
  },
  {
    text: "Yum yum yum. Everybody eats moon food together.",
    sky: "moon",
    duration: 6600,
  },
  {
    text: "Back to Earth. Passengers hop on for the next adventure.",
    sky: "earth",
    duration: 6500,
  },
  {
    text: "Back to the moon! They plan their day and do silly twirlies.",
    sky: "moon",
    duration: 7200,
  },
  {
    text: "Jump down from the rocket... big moon bounce! Safe in the moon dust.",
    sky: "moon",
    duration: 6500,
  },
  {
    text: "Moon birthday time! Otto's moon cake sparkles with safe candle stars.",
    sky: "moon",
    duration: 7200,
  },
  {
    text: "The moon crane gently lifts the cars with a soft star sling.",
    sky: "moon",
    duration: 7000,
  },
  {
    text: "Crane helper moves rockets and passengers to the birthday train. Beep beep!",
    sky: "moonStation",
    duration: 7600,
  },
  {
    text: "A friendly moon robot checks the wheels and waves passengers aboard for cake.",
    sky: "moonStation",
    duration: 7400,
  },
  {
    text: "Honk honk! A friendly moon tow truck gently lifts the woozy car, then scoots the tipped rocket back onto its soft pad. Helpers high-five!",
    sky: "moon",
    duration: 7800,
  },
];

const speedModes = [
  { label: "Slow", value: 0.7 },
  { label: "Cozy", value: 1 },
  { label: "Zoom", value: 1.35 },
];

const state = {
  scene: 0,
  sceneStartedAt: performance.now(),
  paused: false,
  pausedAt: 0,
  speedIndex: 1,
  zoomUntil: 0,
  jumpUntil: 0,
  twirlUntil: 0,
  rocketUntil: 0,
  trainUntil: 0,
  craneUntil: 0,
  towUntil: 0,
  adventureUntil: 0,
  soundOn: false,
  audio: null,
  narrationOn: false,
  speechNarrationSupported,
  staticNarration: null,
  activeNarrationAudio: null,
  missingStaticNarration: new Set(),
  /** When narration is on, auto-advance waits for scene line to finish (see narrationAdvancePending). */
  narrationAdvanceSeq: 0,
  narrationAdvancePending: false,
  stars: makeStars(72),
  confetti: [],
};

const actionPhrases = {
  zoom: ["Zoom zoom!", "Fast car time!", "Vroom vroom!"],
  jump: ["Boing boing!", "Big bouncy jump!", "Up we go!"],
  twirl: ["Spinny twirl!", "Round and round!", "Silly twirlies!"],
  rocket: ["Rocket blast!", "Whoosh to the moon!", "Big rocket fire!"],
  train: ["Chugga chugga!", "All aboard!", "Train goes toot toot!"],
  crane: ["Crane lift!", "Up, up, gentle crane!", "Soft sling delivery!"],
  tow: ["Tow truck helper!", "Gentle lift, slow roll!", "Moon tow to the rescue!"],
  adventure: ["Adventure time!", "Confetti blast!", "Let's zoom together!"],
};

function makeStars(count) {
  return Array.from({ length: count }, (_, i) => ({
    x: (i * 137) % W,
    y: 20 + ((i * 73) % 300),
    r: 1 + (i % 3),
  }));
}

function getAnimationNow() {
  return state.paused ? state.pausedAt : performance.now();
}

function getSpeed() {
  return speedModes[state.speedIndex].value;
}

function getSceneAge(now) {
  const baseNow = state.paused ? state.pausedAt : now;
  return (baseNow - state.sceneStartedAt) * getSpeed();
}

function resetSceneClock(now = performance.now()) {
  const baseNow = state.paused ? state.pausedAt || now : now;
  state.sceneStartedAt = baseNow;
}

function showScene(index) {
  state.scene = (index + scenes.length) % scenes.length;
  resetSceneClock();
  ping(360, 0.08);
  narrateScene();
}

function nextScene() {
  showScene(state.scene + 1);
}

function previousScene() {
  showScene(state.scene - 1);
}

function updatePauseButton() {
  playPauseButton.textContent = state.paused ? "Play" : "Pause";
  playPauseButton.setAttribute("aria-pressed", String(state.paused));
}

function togglePause() {
  const now = performance.now();
  state.paused = !state.paused;

  if (state.paused) {
    state.pausedAt = now;
    if (state.activeNarrationAudio) state.activeNarrationAudio.pause();
    if (state.speechNarrationSupported) window.speechSynthesis.pause();
  } else {
    state.sceneStartedAt += now - state.pausedAt;
    state.pausedAt = 0;
    if (state.narrationOn && state.activeNarrationAudio) {
      state.activeNarrationAudio.play().catch(() => {});
    }
    if (state.narrationOn && state.speechNarrationSupported) window.speechSynthesis.resume();
  }

  updatePauseButton();
  pressButton(playPauseButton);
  ping(state.paused ? 220 : 440, 0.08);
}

function cycleSpeed() {
  const now = performance.now();
  const age = getSceneAge(now);
  state.speedIndex = (state.speedIndex + 1) % speedModes.length;
  const baseNow = state.paused ? state.pausedAt : now;
  state.sceneStartedAt = baseNow - age / getSpeed();
  speedButton.textContent = `Speed: ${speedModes[state.speedIndex].label}`;
  pressButton(speedButton);
  ping(620 + state.speedIndex * 120, 0.08);
}

function triggerZoom() {
  state.zoomUntil = getAnimationNow() + 1600;
  pressButton(goButton);
  ping(420, 0.08);
  speakAction("zoom");
}

function triggerJump() {
  state.jumpUntil = getAnimationNow() + 1400;
  pressButton(jumpButton);
  ping(520, 0.09);
  speakAction("jump");
}

function triggerTwirl() {
  state.twirlUntil = getAnimationNow() + 1900;
  pressButton(twirlButton);
  ping(760, 0.08);
  speakAction("twirl");
}

function triggerRocket() {
  state.rocketUntil = getAnimationNow() + 1800;
  pressButton(rocketButton);
  ping(1040, 0.09);
  speakAction("rocket");
}

function triggerTrain() {
  state.trainUntil = getAnimationNow() + 1800;
  pressButton(trainButton);
  ping(300, 0.12);
  speakAction("train");
}

function triggerCrane() {
  state.craneUntil = getAnimationNow() + 2200;
  pressButton(craneButton);
  ping(560, 0.1);
  speakAction("crane");
}

function triggerTow() {
  state.towUntil = getAnimationNow() + 2200;
  pressButton(towTruckButton);
  ping(480, 0.1);
  speakAction("tow");
}

function triggerAdventure() {
  state.adventureUntil = getAnimationNow() + 2300;
  state.confetti = Array.from({ length: 45 }, (_, i) => ({
    x: 60 + ((i * 47) % 840),
    y: 70 + ((i * 31) % 180),
    vx: -1.5 + (i % 7) * 0.5,
    vy: 1 + (i % 5) * 0.35,
    color: ["#ff6b6b", "#ffe66d", "#4ecdc4", "#7a5cff", "#ff9f1c"][i % 5],
  }));
  pressButton(adventureButton);
  ping(900, 0.1);
  speakAction("adventure");
}

function pressButton(button) {
  button.classList.add("is-pressed");
  setTimeout(() => button.classList.remove("is-pressed"), 170);
}

function setupSound() {
  if (!state.audio) {
    state.audio = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function ping(freq, length) {
  if (!state.soundOn) return;
  setupSound();
  const now = state.audio.currentTime;
  const oscillator = state.audio.createOscillator();
  const gain = state.audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, now + length);
  oscillator.connect(gain).connect(state.audio.destination);
  oscillator.start(now);
  oscillator.stop(now + length + 0.02);
}

function setupNarration() {
  loadStaticNarration();

  if (!state.speechNarrationSupported && typeof Audio === "undefined") {
    narrationButton.textContent = "Narration Unavailable";
    narrationButton.disabled = true;
    narrationButton.setAttribute("aria-pressed", "false");
    return;
  }

  if (!state.speechNarrationSupported) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}

async function loadStaticNarration() {
  if (typeof fetch !== "function") return;

  try {
    const response = await fetch(NARRATION_MANIFEST_URL, { cache: "no-cache" });
    if (!response.ok) return;

    const manifest = await response.json();
    if (!manifest || !Array.isArray(manifest.scenes) || !manifest.actions) return;
    state.staticNarration = manifest;
  } catch {
    // Recorded narration is optional; SpeechSynthesis remains the fallback.
  }
}

function chooseNarrationVoice() {
  if (!state.speechNarrationSupported) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.lang.startsWith("en") && voice.localService)
    || voices.find((voice) => voice.lang.startsWith("en"))
    || voices[0]
    || null;
}

function completeSceneAdvanceGate(seq) {
  if (seq === state.narrationAdvanceSeq && state.narrationAdvancePending) {
    state.narrationAdvancePending = false;
  }
}

function beginSceneAdvanceGate() {
  state.narrationAdvanceSeq += 1;
  const seq = state.narrationAdvanceSeq;
  state.narrationAdvancePending = true;
  return seq;
}

function stopNarration() {
  state.narrationAdvanceSeq += 1;
  state.narrationAdvancePending = false;
  if (state.activeNarrationAudio) {
    state.activeNarrationAudio.pause();
    state.activeNarrationAudio.currentTime = 0;
    state.activeNarrationAudio = null;
  }
  if (state.speechNarrationSupported) window.speechSynthesis.cancel();
}

function playStaticNarration(source, onFallback, gateSeq) {
  if (!source || typeof Audio === "undefined" || state.missingStaticNarration.has(source)) return false;

  const narrationAudio = new Audio(source);
  state.activeNarrationAudio = narrationAudio;

  const fallbackOnce = () => {
    if (state.activeNarrationAudio !== narrationAudio || !state.narrationOn) return;
    state.missingStaticNarration.add(source);
    state.activeNarrationAudio = null;
    onFallback();
  };

  narrationAudio.addEventListener("ended", () => {
    if (state.activeNarrationAudio === narrationAudio) state.activeNarrationAudio = null;
    if (gateSeq != null) completeSceneAdvanceGate(gateSeq);
  }, { once: true });
  narrationAudio.addEventListener("error", fallbackOnce, { once: true });

  narrationAudio.play().catch(fallbackOnce);
  return true;
}

function speakWithSpeechSynthesis(text, { pitch = 1.25, rate = 0.9, gateSeq = null } = {}) {
  if (!state.speechNarrationSupported || !text) {
    if (gateSeq != null) completeSceneAdvanceGate(gateSeq);
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = chooseNarrationVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || "en-US";
  utterance.pitch = pitch;
  utterance.rate = rate;
  utterance.volume = 1;
  if (gateSeq != null) {
    utterance.onend = () => completeSceneAdvanceGate(gateSeq);
    utterance.onerror = () => completeSceneAdvanceGate(gateSeq);
  }
  window.speechSynthesis.speak(utterance);
}

function speak(text, { interrupt = true, pitch = 1.25, rate = 0.9, staticSource = null, advanceGate = false } = {}) {
  if (!state.narrationOn || !text) return;

  if (interrupt) stopNarration();
  const gateSeq = advanceGate ? beginSceneAdvanceGate() : null;
  const fallback = () => speakWithSpeechSynthesis(text, { pitch, rate, gateSeq });
  if (staticSource && playStaticNarration(staticSource, fallback, gateSeq)) return;
  fallback();
}

function getSceneNarrationSource() {
  return state.staticNarration?.scenes?.[state.scene] || null;
}

function getActionNarrationSource(kind, phraseIndex) {
  return state.staticNarration?.actions?.[kind]?.[phraseIndex] || null;
}

function narrateScene() {
  speak(scenes[state.scene].text, {
    interrupt: true,
    pitch: 1.18,
    rate: 0.88,
    staticSource: getSceneNarrationSource(),
    advanceGate: true,
  });
}

function speakAction(kind) {
  const phrases = actionPhrases[kind];
  if (!phrases) return;
  const phraseIndex = Math.floor(Math.random() * phrases.length);
  const phrase = phrases[phraseIndex];
  speak(phrase, {
    interrupt: true,
    pitch: 1.35,
    rate: 0.98,
    staticSource: getActionNarrationSource(kind, phraseIndex),
  });
}

soundButton.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  soundButton.textContent = state.soundOn ? "Sound On" : "Sound Off";
  soundButton.setAttribute("aria-pressed", String(state.soundOn));
  if (state.soundOn) {
    setupSound();
    ping(660, 0.1);
  }
});

narrationButton.addEventListener("click", () => {
  if (!state.speechNarrationSupported && typeof Audio === "undefined") return;
  state.narrationOn = !state.narrationOn;
  narrationButton.textContent = state.narrationOn ? "Narration On" : "Narration Off";
  narrationButton.setAttribute("aria-pressed", String(state.narrationOn));

  if (state.narrationOn) {
    if (state.speechNarrationSupported) window.speechSynthesis.resume();
    narrateScene();
  } else {
    stopNarration();
  }
});

prevSceneButton.addEventListener("click", () => {
  pressButton(prevSceneButton);
  previousScene();
});
playPauseButton.addEventListener("click", togglePause);
nextSceneButton.addEventListener("click", () => {
  pressButton(nextSceneButton);
  nextScene();
});
speedButton.addEventListener("click", cycleSpeed);
goButton.addEventListener("click", triggerZoom);
jumpButton.addEventListener("click", triggerJump);
twirlButton.addEventListener("click", triggerTwirl);
rocketButton.addEventListener("click", triggerRocket);
trainButton.addEventListener("click", triggerTrain);
craneButton.addEventListener("click", triggerCrane);
towTruckButton.addEventListener("click", triggerTow);
adventureButton.addEventListener("click", triggerAdventure);
canvas.addEventListener("pointerdown", triggerJump);

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    triggerJump();
  }
  if (event.key.toLowerCase() === "t") triggerTwirl();
  if (event.key.toLowerCase() === "z") triggerZoom();
  if (event.key.toLowerCase() === "r") triggerRocket();
  if (event.key.toLowerCase() === "c") triggerTrain();
  if (event.key.toLowerCase() === "l") triggerCrane();
  if (event.key.toLowerCase() === "w") triggerTow();
  if (event.key.toLowerCase() === "p") togglePause();
  if (event.key === "ArrowLeft") previousScene();
  if (event.key === "ArrowRight") nextScene();
  if (event.key.toLowerCase() === "g") nextScene();
});

setupNarration();
updatePauseButton();

function loop(now) {
  const renderNow = state.paused ? state.pausedAt : now;
  let scene = scenes[state.scene];
  let age = getSceneAge(now);
  const narrationBlocksAdvance = state.narrationOn && state.narrationAdvancePending;
  if (!state.paused && age > scene.duration && !narrationBlocksAdvance) {
    nextScene();
    scene = scenes[state.scene];
    age = 0;
  }

  const progress = Math.min(age / scene.duration, 1);
  storyText.textContent = scene.text;
  draw(renderNow, progress, scene);
  requestAnimationFrame(loop);
}

function draw(now, progress, scene) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(scene.sky, now);
  drawScene(now, progress);
  drawAdventure(now);
}

function drawBackground(kind, now) {
  if (kind === "space" || kind === "moon" || kind === "moonTunnel" || kind === "moonStation") {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#07133f");
    gradient.addColorStop(1, kind !== "space" ? "#354070" : "#2b155d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    drawStars(now);
    if (kind !== "space") {
      drawMoonGround();
      drawEarth(820, 100, 42);
      drawMoonScenery(now);
      if (kind === "moonTunnel") drawMoonTunnel(now);
      if (kind === "moonStation") drawMoonStation();
    } else {
      drawPlanet(780, 88, 52, "#f8d35a", "#de8e28");
      drawPlanet(160, 120, 34, "#79d4ff", "#2a7fd2");
      drawMoon(620, 230, 46);
    }
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, kind === "tunnel" ? "#313f75" : "#79cbff");
  gradient.addColorStop(0.62, kind === "tunnel" ? "#596699" : "#c9f3ff");
  gradient.addColorStop(0.63, "#76d96c");
  gradient.addColorStop(1, "#41af4c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  drawSun(92, 82);
  drawCloud(250 + Math.sin(now / 1400) * 16, 88);
  drawCloud(710 - Math.sin(now / 1700) * 20, 138);

  if (kind === "tunnel") drawTunnel(now);
  if (kind === "station") drawStation();
}

function drawScene(now, progress) {
  const sceneIndex = state.scene;
  const scene = scenes[sceneIndex];
  const onMoon = scene.sky === "moon" || scene.sky === "moonTunnel" || scene.sky === "moonStation";
  const jumpBoost = Math.max(0, state.jumpUntil - now) / 1400;
  const twirlBoost = Math.max(0, state.twirlUntil - now) / 1900;
  const extraJump = Math.sin(jumpBoost * Math.PI) * (onMoon ? 165 : 90);
  const spin = twirlBoost > 0 ? (1 - twirlBoost) * Math.PI * 8 : 0;

  if (sceneIndex <= 2) {
    const moonArc = onMoon ? 1.35 : 1;
    const rocketY = sceneIndex === 1 ? 388 - progress * 220 : 360;
    drawRocket(620, rocketY, -0.12 + spin, "#ff5757");
    drawRocket(760, rocketY + 24, 0.08 - spin * 0.7, "#6c63ff");

    const arc = Math.sin(progress * Math.PI);
    const carX = sceneIndex === 0 ? 260 + progress * 180 : 430 + progress * 310;
    const carY = sceneIndex === 1 ? 358 - arc * 250 * moonArc - extraJump : GROUND - 58 - arc * 120 * moonArc - extraJump;
    drawCar(carX, carY, "#ff9f1c", spin, carPathWheelRoll(carX, carY));
    drawCar(carX - 120, carY + 44, "#34c759", -spin * 0.7, carPathWheelRoll(carX - 120, carY + 44));
    return;
  }

  if (sceneIndex === 3) {
    const trainX = 110 + progress * 430;
    drawTrain(trainX, GROUND - 82, now);
    const carY = GROUND - 80 - Math.sin(progress * Math.PI) * 260 - extraJump;
    {
      const c1x = 150 + progress * 430;
      const c2x = 70 + progress * 440;
      drawCar(c1x, carY, "#ff9f1c", spin, carPathWheelRoll(c1x, carY));
      drawCar(c2x, carY + 32, "#34c759", -spin, carPathWheelRoll(c2x, carY + 32));
    }
    return;
  }

  if (sceneIndex === 4) {
    drawTrain(90 + progress * 520, GROUND - 82, now);
    drawBat(400, 180 + Math.sin(now / 160) * 18, now);
    drawBat(530, 145 + Math.sin(now / 130) * 16, now + 40);
    drawBat(650, 210 + Math.sin(now / 180) * 20, now + 80);
    drawRocket(720, 330 + Math.sin(now / 120) * 8, 0.2 + spin, "#ff5757", true);
    return;
  }

  if (sceneIndex === 5) {
    drawTrain(430, GROUND - 82, now);
    drawRocketDriver(160, GROUND - 82, "#ff5757");
    drawRocketDriver(245, GROUND - 82, "#6c63ff");
    drawRocket(780, GROUND - 80, -0.22 + spin, "#ff5757");
    drawRocket(850, GROUND - 72, 0.12 - spin, "#6c63ff");
    return;
  }

  if (sceneIndex === 6) {
    drawMoon(695, 220, 76);
    drawRocket(280 + progress * 390, 410 - progress * 220 - extraJump, -0.72 + spin, "#ff5757");
    drawRocketDriver(215 + progress * 390, 382 - progress * 220, "#ff5757");
    return;
  }

  if (sceneIndex === 7) {
    const angle = progress * Math.PI * 2.4 + spin;
    drawMoonOrbitCourse(angle);
    drawRocket(480 + Math.cos(angle) * 230, 255 + Math.sin(angle) * 115, angle + Math.PI / 2, "#ff5757");
    {
      const cx = 460 + Math.cos(angle + 1.3) * 180;
      const cy = 260 + Math.sin(angle + 1.3) * 95;
      const orbitRoll = angle * 10.6;
      drawCar(cx, cy, "#34c759", angle, orbitRoll);
    }
    return;
  }

  if (sceneIndex === 8) {
    drawPlanetVisit(progress, spin);
    return;
  }

  if (sceneIndex === 9) {
    drawMoonFoodSearch(now, progress);
    return;
  }

  if (sceneIndex === 10) {
    drawMoonRace(now, progress, spin);
    return;
  }

  if (sceneIndex === 11) {
    drawMoonToyGaragePeek(now, progress);
    return;
  }

  if (sceneIndex === 12) {
    drawMoonToyGarageBurst(now, progress, spin, extraJump);
    return;
  }

  if (sceneIndex === 13) {
    drawMoonDanceParty(now, spin);
    return;
  }

  if (sceneIndex === 14) {
    drawMoonFoodPicnic(now);
    return;
  }

  if (sceneIndex === 15) {
    drawEarth(720, 220, 95);
    drawRocket(690 - progress * 350, 185 + progress * 230, 0.65 + spin, "#6c63ff");
    drawPassengers(155, GROUND - 52, now);
    drawRocket(300, GROUND - 80, -0.08, "#ff5757");
    return;
  }

  if (sceneIndex === 16) {
    drawMoonCommandCenter(now);
    drawRocket(480 + Math.sin(progress * Math.PI * 4) * 170, 270 + Math.cos(progress * Math.PI * 3) * 100, spin + progress * 8, "#ff5757");
    drawPlanBoard(86, 82);
    return;
  }

  if (sceneIndex === 18) {
    drawMoonBirthdayParty(now, progress, spin);
    return;
  }

  if (sceneIndex === 19) {
    drawMoonCraneScene(now, progress, "cars", spin);
    return;
  }

  if (sceneIndex === 20) {
    drawMoonCraneScene(now, progress, "birthdayTrain", spin);
    return;
  }

  if (sceneIndex === 21) {
    drawMoonRobotHelperScene(now, progress, spin);
    return;
  }

  if (sceneIndex === 22) {
    drawMoonTowRescueScene(now, progress, spin);
    return;
  }

  const carY = 150 + progress * 270 - Math.sin(progress * Math.PI * 4) * 42 - extraJump;
  const carXEnd = 280 + progress * 360;
  drawRocket(650 - progress * 190, 160 + progress * 260, 0.2 + spin, "#ff5757");
  drawCar(carXEnd, carY, "#ff9f1c", spin, carPathWheelRoll(carXEnd, carY));
  drawTrain(90, GROUND - 82, now);
}

const TOY_GARAGE_CX = 502;
const TOY_GARAGE_RAMP_TOP_Y = 386;

function drawMoonToyGaragePeek(now, progress) {
  const door = Math.pow(Math.min(progress, 1), 1.28) * 0.56;
  drawMoonToyGarageFacades(now, door);
  drawMoonToyGarageRamp();
  ctx.save();
  ctx.translate(TOY_GARAGE_CX - 58, TOY_GARAGE_RAMP_TOP_Y + 8);
  drawCar(-18, -6, "#ff5757", 0);
  drawCar(74, -2, "#34c759", 0.08);
  drawCar(154, -8, "#6c63ff", -0.05);
  ctx.restore();
}

function drawMoonToyGarageBurst(now, progress, spin, extraJump) {
  const slam = Math.min(1, progress * 9);
  const door = 0.94 + slam * 0.06 + Math.sin(slam * Math.PI * 4) * 0.045 * Math.max(0, 1 - slam);
  drawMoonToyGarageFacades(now, door);
  drawMoonToyGarageRamp();
  const burstEase = Math.min(1, Math.max(0, (progress - 0.06) / 0.94));

  const bursts = [];
  [[-72, "#ff5757"], [0, "#34c759"], [72, "#6c63ff"]].forEach(([sx, color], i) => {
    const stagger = burstEase > i * 0.08 ? burstEase : 0;
    if (stagger <= 0) return;
    const t = Math.min(1, (stagger - i * 0.08) / (1 - i * 0.08));
    const px = TOY_GARAGE_CX + sx * (1 - t * 0.12) + t * (200 + i * 66);
    const bounce = Math.sin(t * Math.PI);
    const py = TOY_GARAGE_RAMP_TOP_Y + t * (80 + i * 18) + t * bounce * -(175 + i * 16) + (1 - t) * 10 - extraJump * 0.45;
    const rot = spin * 0.38 + bounce * (0.75 + i * 0.1);
    bursts.push({ px, py, bounce, rot, color, i, t });
  });
  bursts.forEach(({ px, py, t }) => {
    if (t > 0.1) drawToyBurstTrail(px - 12, py, t * t);
  });
  bursts.forEach(({ px, py, bounce, rot, color, i, t }) => {
    if (t > 0.06) drawZoomLines(px - 102, py - 10, t * t);
    drawCar(px, py, color, rot, carPathWheelRoll(px, py));
    if (t > 0.5) {
      ctx.save();
      ctx.globalAlpha = 0.44 + bounce * 0.32;
      drawOrbitSparkle(px + 52 + Math.sin(now / 100 + i) * 22, py - 74 - bounce * 34, "#ffffff", 0.35 + t * 0.26);
      drawOrbitSparkle(px + 6, py - 118 - bounce * 42, "#ffe66d", 0.34 + bounce * 0.2);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  });
}

function drawMoonToyGarageRamp() {
  ctx.save();
  ctx.fillStyle = "#f5b74a";
  ctx.beginPath();
  ctx.moveTo(TOY_GARAGE_CX - 132, TOY_GARAGE_RAMP_TOP_Y - 4);
  ctx.lineTo(TOY_GARAGE_CX + 132, TOY_GARAGE_RAMP_TOP_Y - 4);
  ctx.lineTo(TOY_GARAGE_CX + 212, GROUND + 14);
  ctx.lineTo(TOY_GARAGE_CX - 212, GROUND + 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(230, 120, 50, 0.45)";
  for (let stripe = -5; stripe <= 5; stripe += 2) {
    ctx.fillRect(
      TOY_GARAGE_CX + stripe * 17 - 86,
      TOY_GARAGE_RAMP_TOP_Y + stripe * 2,
      8,
      GROUND + 36 - TOY_GARAGE_RAMP_TOP_Y,
    );
  }
  ctx.restore();
}

function drawMoonToyGarageFacades(now, doorOpen) {
  ctx.save();
  const gx = TOY_GARAGE_CX - 180;
  const gy = TOY_GARAGE_RAMP_TOP_Y - 198;
  const gw = 360;
  const facadeBottom = TOY_GARAGE_RAMP_TOP_Y - 44;
  const gh = facadeBottom - (gy + 46);

  const shade = ctx.createLinearGradient(gx, gy, gx + gw * 1.05, gy + gh);
  shade.addColorStop(0, "#6b5cff");
  shade.addColorStop(0.5, "#4a92d9");
  shade.addColorStop(1, "#2e6bb5");
  ctx.fillStyle = shade;
  roundedRect(gx + 38, gy + 44, gw - 76, gh, 28);

  ctx.fillStyle = "#9f7dff";
  ctx.beginPath();
  ctx.moveTo(gx + 18, gy + 68);
  ctx.lineTo(gx + gw / 2, gy - 6);
  ctx.lineTo(gx + gw - 18, gy + 68);
  ctx.lineTo(gx + gw - 34, gy + 84);
  ctx.lineTo(gx + 34, gy + 84);
  ctx.closePath();
  ctx.fill();

  const plateY = gy + gh + 24;
  for (let r = -1; r <= 1; r += 1) {
    const blink = Math.sin(now / (280 + r * 60)) > 0.15;
    ctx.fillStyle = "rgba(255, 232, 120, 0.88)";
    roundedRect(gx + 108 + r * 26, plateY + 12, 12, 10, 3);
    ctx.fillStyle = blink ? "#fff6a9" : "rgba(255, 246, 180, 0.45)";
    ctx.beginPath();
    ctx.arc(gx + 132 + r * 148, plateY + 26, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  const doorY = gy + gh + 8;
  const doorH = 96;
  const doorW = 76;
  const separation = Math.min(1, doorOpen) * 58;
  ctx.fillStyle = "#ffeef6";
  roundedRect(TOY_GARAGE_CX - doorW - separation, doorY, doorW, doorH, 16);
  ctx.strokeStyle = "rgba(24, 58, 134, 0.35)";
  ctx.lineWidth = 4;
  ctx.strokeRect(TOY_GARAGE_CX - doorW - separation + 3, doorY + 3, doorW - 6, doorH - 6);
  ctx.fillStyle = "#ffeef6";
  roundedRect(TOY_GARAGE_CX + separation, doorY, doorW, doorH, 16);
  ctx.strokeRect(TOY_GARAGE_CX + separation + 3, doorY + 3, doorW - 6, doorH - 6);

  ctx.fillStyle = "#1a2d72";
  roundedRect(
    TOY_GARAGE_CX - doorW + 18 - separation * 0.5,
    doorY + doorH - 34,
    (doorW * 2 - 36) + separation,
    18,
    8,
  );

  ctx.font = "bold 26px Comic Sans MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#dff6ff";
  roundedRect(gx + 72, gy + 102, gw - 144, 40, 12);
  ctx.fillStyle = "#183a86";
  ctx.fillText("PLAY GARAGE", TOY_GARAGE_CX, gy + 129);

  ctx.restore();
}

function drawToyBurstTrail(x, y, strength) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = `rgba(216, 247, 255, ${0.25 + strength * 0.45})`;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  [-32, -8, 16].forEach((ox, i) => {
    ctx.beginPath();
    ctx.moveTo(ox + 24, i * -5);
    ctx.lineTo(ox + 24 + 38 * strength, i * -5 - strength * (14 + i * 5));
    ctx.stroke();
  });
  ctx.restore();
}

function drawSun(x, y) {
  ctx.fillStyle = "#ffe66d";
  ctx.beginPath();
  ctx.arc(x, y, 48, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloud(x, y) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  roundedRect(x - 76, y, 160, 44, 22);
  circle(x - 34, y, 36);
  circle(x + 24, y - 12, 46);
  circle(x + 66, y + 4, 32);
}

function drawStars(now) {
  ctx.fillStyle = "white";
  state.stars.forEach((star, i) => {
    const twinkle = 0.55 + Math.sin(now / 280 + i) * 0.35;
    ctx.globalAlpha = twinkle;
    circle(star.x, star.y, star.r);
  });
  ctx.globalAlpha = 1;
}

/** Roll radians from world path (forward motion); blends horizontal + climb onto rocket. */
function carPathWheelRoll(worldX, worldY) {
  return (worldX + (GROUND - worldY) * 0.38) / WHEEL_R;
}

function idleWheelWobble(now, x = 0, y = 0) {
  return Math.sin(now / 2680 + x * 0.017 + y * 0.013) * 0.09;
}

function drawCar(x, y, color, rotation = 0, pathWheelRoll) {
  const now = getAnimationNow();
  const zoomBoost = Math.max(0, state.zoomUntil - now) / 1600;
  const wheelRoll = typeof pathWheelRoll === "number" ? pathWheelRoll : idleWheelWobble(now, x, y);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(1 + zoomBoost * 0.14, 1);
  if (zoomBoost > 0) drawZoomLines(-102, -10, zoomBoost);
  ctx.fillStyle = color;
  roundedRect(-54, -20, 108, 38, 14);
  ctx.fillStyle = "#ffffff";
  roundedRect(-20, -44, 56, 30, 12);
  ctx.fillStyle = "#183a86";
  roundedRect(-12, -37, 20, 18, 6);
  roundedRect(14, -37, 16, 18, 6);
  drawWheel(-32, 20, wheelRoll);
  drawWheel(32, 20, wheelRoll);
  ctx.restore();
}

function drawZoomLines(x, y, boost) {
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 + boost * 0.45})`;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  [0, 18, 36].forEach((offset) => {
    ctx.beginPath();
    ctx.moveTo(x - offset, y + offset * 0.35);
    ctx.lineTo(x + 36 - offset, y + offset * 0.35);
    ctx.stroke();
  });
  ctx.lineCap = "butt";
}

function drawWheel(x, y, roll = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(roll);
  ctx.fillStyle = "#24324f";
  ctx.beginPath();
  ctx.arc(0, 0, WHEEL_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4a5f8c";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, -(WHEEL_R - 3));
    ctx.stroke();
    ctx.rotate(Math.PI / 2);
  }
  ctx.lineCap = "butt";
  ctx.fillStyle = "#d9e4ff";
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRocket(x, y, rotation, color, scared = false) {
  const now = getAnimationNow();
  const rocketBoost = Math.max(0, state.rocketUntil - now) / 1800;
  ctx.save();
  ctx.translate(x, y);
  ctx.translate(Math.sin(now / 45) * rocketBoost * 7, Math.cos(now / 52) * rocketBoost * 7);
  ctx.rotate(rotation);
  ctx.fillStyle = color;
  roundedRect(-24, -76, 48, 112, 24);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, -112);
  ctx.lineTo(-24, -62);
  ctx.lineTo(24, -62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#85d9ff";
  circle(0, -40, 14);
  ctx.fillStyle = "#ffc44d";
  ctx.beginPath();
  ctx.moveTo(-18, 35);
  ctx.lineTo(-34, 62);
  ctx.lineTo(-7, 48);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(18, 35);
  ctx.lineTo(34, 62);
  ctx.lineTo(7, 48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = scared ? "#67dc73" : "#ffcf4a";
  ctx.beginPath();
  ctx.moveTo(-16, 36);
  ctx.lineTo(0, 88 + rocketBoost * 44 + Math.sin(now / 80) * (10 + rocketBoost * 12));
  ctx.lineTo(16, 36);
  ctx.closePath();
  ctx.fill();
  if (rocketBoost > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + rocketBoost * 0.4})`;
    circle(0, 92 + rocketBoost * 28, 12 + rocketBoost * 12);
  }
  if (scared) drawScaredFace(0, -40);
  ctx.restore();
}

function drawScaredFace(x, y) {
  ctx.fillStyle = "#183a86";
  circle(x - 5, y - 2, 2);
  circle(x + 5, y - 2, 2);
  ctx.beginPath();
  ctx.arc(x, y + 7, 5, 0, Math.PI, true);
  ctx.strokeStyle = "#183a86";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawTrain(x, y, now) {
  const trainBoost = Math.max(0, state.trainUntil - now) / 1800;
  const trainWheelRoll = x / WHEEL_R;
  ctx.save();
  ctx.translate(x, y - Math.sin(now / 70) * trainBoost * 7);
  ctx.fillStyle = "#293b8f";
  roundedRect(0, 10, 155, 58, 12);
  ctx.fillStyle = "#e84855";
  roundedRect(145, -10, 95, 78, 14);
  ctx.fillStyle = "#ffe66d";
  roundedRect(170, 4, 34, 28, 6);
  ctx.fillStyle = "#6ec8ff";
  roundedRect(26, 24, 38, 24, 6);
  roundedRect(82, 24, 38, 24, 6);
  ctx.fillStyle = "#222b45";
  roundedRect(210, -42, 22, 36, 4);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + Math.sin(now / 220) * 0.2})`;
  circle(222, -62, 18);
  circle(238, -82, 13);
  if (trainBoost > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + trainBoost * 0.45})`;
    circle(254 + Math.sin(now / 80) * 8, -102, 16 + trainBoost * 10);
    circle(284 + Math.cos(now / 90) * 10, -122, 12 + trainBoost * 8);
    ctx.strokeStyle = `rgba(255, 230, 109, ${0.3 + trainBoost * 0.45})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-20, 70);
    ctx.lineTo(-74, 70);
    ctx.stroke();
  }
  [35, 100, 175, 220].forEach((wheelX) => drawWheel(wheelX, 75, trainWheelRoll));
  ctx.restore();
}

function drawTunnel(now) {
  ctx.fillStyle = "#5a4d47";
  roundedRect(282, 210, 430, 246, 36);
  ctx.fillStyle = "#1e2447";
  ctx.beginPath();
  ctx.arc(497, 456, 160, Math.PI, 0);
  ctx.lineTo(657, 456);
  ctx.lineTo(337, 456);
  ctx.closePath();
  ctx.fill();
  drawBat(360, 250 + Math.sin(now / 160) * 10, now);
  drawBat(604, 280 + Math.sin(now / 180) * 12, now + 20);
}

function drawMoonTunnel(now) {
  drawMoonRock(305, 428, 92);
  drawMoonRock(690, 430, 96);
  ctx.fillStyle = "#817a8d";
  roundedRect(266, 196, 470, 260, 42);
  ctx.fillStyle = "#151a3f";
  ctx.beginPath();
  ctx.arc(501, 456, 178, Math.PI, 0);
  ctx.lineTo(679, 456);
  ctx.lineTo(323, 456);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(216, 247, 255, 0.7)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(501, 456, 146, Math.PI, 0);
  ctx.stroke();
  drawBat(360, 248 + Math.sin(now / 160) * 10, now);
  drawBat(604, 280 + Math.sin(now / 180) * 12, now + 20);
  drawMoonCrystal(760, 392, 0.9);
}

function drawBat(x, y, now) {
  const flap = Math.sin(now / 80) * 15;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#21172d";
  circle(0, 4, 12);
  ctx.beginPath();
  ctx.moveTo(-4, 2);
  ctx.quadraticCurveTo(-35, -22 - flap, -60, 4);
  ctx.quadraticCurveTo(-34, -2 + flap, -8, 15);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, 2);
  ctx.quadraticCurveTo(35, -22 - flap, 60, 4);
  ctx.quadraticCurveTo(34, -2 + flap, 8, 15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  circle(-4, 0, 2);
  circle(4, 0, 2);
  ctx.restore();
}

function drawStation() {
  ctx.fillStyle = "#ffd36e";
  roundedRect(68, 260, 250, 176, 12);
  ctx.fillStyle = "#c4563f";
  ctx.beginPath();
  ctx.moveTo(48, 260);
  ctx.lineTo(194, 166);
  ctx.lineTo(340, 260);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#183a86";
  roundedRect(130, 306, 48, 130, 8);
  roundedRect(218, 305, 58, 44, 8);
  ctx.fillStyle = "#fff";
  roundedRect(107, 226, 174, 40, 16);
  ctx.fillStyle = "#183a86";
  ctx.font = "bold 24px Comic Sans MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("STATION", 194, 254);
}

function drawMoonStation() {
  ctx.fillStyle = "rgba(216, 247, 255, 0.82)";
  ctx.beginPath();
  ctx.arc(194, 306, 126, Math.PI, 0);
  ctx.lineTo(320, 430);
  ctx.lineTo(68, 430);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = "#7a5cff";
  roundedRect(96, 324, 196, 82, 16);
  ctx.fillStyle = "#183a86";
  roundedRect(172, 348, 44, 58, 10);
  ctx.fillStyle = "#fff";
  roundedRect(106, 248, 176, 40, 16);
  ctx.fillStyle = "#183a86";
  ctx.font = "bold 23px Comic Sans MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MOON STOP", 194, 276);
  drawAntenna(300, 250);
}

function drawRocketDriver(x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  roundedRect(-16, -46, 32, 52, 12);
  ctx.fillStyle = "#ffd2a6";
  circle(0, -58, 18);
  ctx.fillStyle = "#ffffff";
  roundedRect(-18, -78, 36, 18, 8);
  ctx.fillStyle = "#183a86";
  circle(-6, -60, 2);
  circle(7, -60, 2);
  ctx.beginPath();
  ctx.arc(0, -54, 7, 0, Math.PI);
  ctx.strokeStyle = "#183a86";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawMoon(x, y, r) {
  ctx.fillStyle = "#e9e1c8";
  circle(x, y, r);
  ctx.fillStyle = "rgba(122, 112, 92, 0.25)";
  circle(x - r * 0.3, y - r * 0.22, r * 0.15);
  circle(x + r * 0.25, y + r * 0.18, r * 0.2);
  circle(x - r * 0.02, y + r * 0.34, r * 0.11);
}

function drawPlanet(x, y, r, color, ringColor) {
  ctx.fillStyle = ringColor;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.25);
  roundedRect(-r * 1.6, -r * 0.18, r * 3.2, r * 0.36, r * 0.18);
  ctx.restore();
  ctx.fillStyle = color;
  circle(x, y, r);
}

function drawEarth(x, y, r) {
  ctx.fillStyle = "#1f8be8";
  circle(x, y, r);
  ctx.fillStyle = "#59d66d";
  roundedRect(x - 55, y - 36, 72, 38, 18);
  roundedRect(x + 2, y + 18, 66, 34, 16);
  roundedRect(x - 72, y + 26, 44, 24, 12);
}

function drawSolarSystem(angle) {
  ctx.save();
  ctx.translate(480, 270);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 3;
  [70, 130, 190, 250].forEach((r) => {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.fillStyle = "#ffe66d";
  circle(0, 0, 42);
  [
    [70, 0.9, "#a3a3a3", 13],
    [130, 1.4, "#4ecdc4", 18],
    [190, 2.1, "#ff9f1c", 22],
    [250, 2.8, "#c084fc", 20],
  ].forEach(([orbit, speed, color, size], i) => {
    const a = angle * speed + i;
    ctx.fillStyle = color;
    circle(Math.cos(a) * orbit, Math.sin(a) * orbit, size);
  });
  ctx.restore();
}

function drawMoonGround() {
  ctx.fillStyle = "#c9c3b4";
  ctx.beginPath();
  ctx.ellipse(W / 2, 500, 650, 165, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(98, 90, 75, 0.22)";
  circle(170, 445, 28);
  circle(360, 494, 18);
  circle(650, 452, 34);
  circle(810, 492, 20);
}

function drawMoonScenery(now) {
  drawMoonBase(95, 384);
  drawMoonCrystal(760, 402, 0.75);
  drawMoonCrystal(825, 416, 0.55);
  drawMoonRover(610 + Math.sin(now / 1400) * 28, 420, now);
  drawMoonFlag(465, 374);
}

function drawMoonBase(x, y) {
  ctx.fillStyle = "rgba(216, 247, 255, 0.78)";
  ctx.beginPath();
  ctx.arc(x + 52, y + 10, 56, Math.PI, 0);
  ctx.lineTo(x + 108, y + 48);
  ctx.lineTo(x - 4, y + 48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  roundedRect(x + 18, y + 16, 68, 18, 9);
  ctx.fillStyle = "#7a5cff";
  circle(x + 52, y + 24, 8);
}

function drawMoonCrystal(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#8ff7ff";
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.lineTo(24, -4);
  ctx.lineTo(8, 34);
  ctx.lineTo(-22, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(8, -4);
  ctx.lineTo(-4, 18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMoonRover(x, y, now) {
  const roverRoll = x / WHEEL_R + idleWheelWobble(now, x, y) * 0.35;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#ffe66d";
  roundedRect(-46, -28, 92, 34, 10);
  ctx.fillStyle = "#85d9ff";
  roundedRect(-12, -56, 44, 34, 12);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(34, -52);
  ctx.lineTo(62, -78);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  circle(66, -82, 8);
  drawWheel(-28, 12, roverRoll);
  drawWheel(30, 12, roverRoll);
  ctx.restore();
}

function towTruckHookWorld(truckX, truckY, hookDrop, facing = 1) {
  const boom = 78 + hookDrop * 34;
  const hookLocalX = 92 + boom * 0.42;
  const hookLocalY = -128 - hookDrop * 36;
  return {
    hx: truckX + facing * hookLocalX,
    hy: truckY + hookLocalY,
  };
}

function drawTowTruck(x, y, now, options = {}) {
  const {
    facing = 1,
    hookDrop = 0.35,
    spin = 0,
  } = options;
  const towBoost = Math.max(0, state.towUntil - now) / 2200;
  const wiggle = Math.sin(now / 95) * (2 + towBoost * 5);
  const boom = 78 + hookDrop * 34;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin * 0.1);
  ctx.scale(facing, 1);
  ctx.translate(wiggle * 0.22, 0);

  drawWheel(-68, 10);
  drawWheel(-14, 10);
  drawWheel(56, 10);

  ctx.fillStyle = "#6ec8ff";
  roundedRect(-38, -66, 134, 52, 14);
  ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
  roundedRect(-24, -58, 108, 12, 6);

  ctx.fillStyle = "#ffe082";
  roundedRect(-118, -74, 84, 70, 18);
  ctx.fillStyle = "rgba(110, 200, 255, 0.55)";
  roundedRect(-102, -58, 52, 34, 10);
  ctx.fillStyle = "#183a86";
  circle(-88, -42, 3);
  circle(-72, -42, 3);
  ctx.strokeStyle = "#183a86";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(-80, -34, 8, 0.12 * Math.PI, 0.88 * Math.PI);
  ctx.stroke();

  ctx.save();
  ctx.translate(18, -92);
  drawOrbitSparkle(0, 0, "#ffffff", 0.34);
  ctx.restore();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(74, -54);
  ctx.lineTo(84 + boom * 0.22, -118 - hookDrop * 26);
  ctx.lineTo(92 + boom * 0.42, -128 - hookDrop * 36);
  ctx.stroke();

  ctx.fillStyle = "#ffd54f";
  circle(92 + boom * 0.42, -128 - hookDrop * 36, 8);

  ctx.fillStyle = "#ffb3c1";
  roundedRect(-126, -12, 18, 14, 6);

  ctx.restore();
}

function drawTowCable(x1, y1, x2, y2, sag = 0.35) {
  ctx.save();
  ctx.strokeStyle = "rgba(216, 247, 255, 0.92)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 + sag * 42;
  ctx.quadraticCurveTo(midX, midY, x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawMoonFlag(x, y) {
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y - 76);
  ctx.lineTo(x, y + 28);
  ctx.stroke();
  ctx.fillStyle = "#ff5757";
  roundedRect(x, y - 76, 78, 38, 5);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 17px Comic Sans MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("OTTO", x + 39, y - 51);
}

function drawPlanetVisit(progress, spin) {
  drawMoonDome(185, 330, 92, "#ffb3d1", true);
  drawMoonDome(510, 326, 78, "#6ee7b7", false);
  drawBouncyMoonHill(760, 386, 110, progress);
  drawRocket(160 + progress * 610, 390 - Math.sin(progress * Math.PI) * 240, -0.35 + spin, "#ff5757");
  drawRocketDriver(255, 370 + Math.sin(progress * Math.PI * 3) * 18, "#ff5757");
  drawRocketDriver(655, 354 + Math.cos(progress * Math.PI * 3) * 18, "#6c63ff");
}

function drawMoonDome(x, y, size, color, stripes) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size, Math.PI, 0);
  ctx.lineTo(x + size, y + 48);
  ctx.lineTo(x - size, y + 48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
  ctx.beginPath();
  ctx.arc(x, y, size * 0.72, Math.PI, 0);
  ctx.lineTo(x + size * 0.72, y + 26);
  ctx.lineTo(x - size * 0.72, y + 26);
  ctx.closePath();
  ctx.fill();
  if (!stripes) return;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8;
  [-38, 0, 38].forEach((offset) => {
    ctx.beginPath();
    ctx.moveTo(x + offset, y - size + 22);
    ctx.lineTo(x + offset, y + 42);
    ctx.stroke();
  });
}

function drawBouncyMoonHill(x, y, size, progress) {
  ctx.fillStyle = "#f8d35a";
  ctx.beginPath();
  ctx.ellipse(x, y, size, size * 0.42, 0, Math.PI, 0);
  ctx.lineTo(x + size, y + 46);
  ctx.lineTo(x - size, y + 46);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#de8e28";
  ctx.lineWidth = 10;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    const wave = Math.sin(progress * Math.PI * 4 + i) * 8;
    ctx.moveTo(x + i * 36, y + 30);
    ctx.quadraticCurveTo(x + i * 36 + 22, y - 18 + wave, x + i * 36 + 44, y + 30);
    ctx.stroke();
  }
}

function drawMoonOrbitCourse(angle) {
  ctx.save();
  ctx.translate(480, 268);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
  ctx.lineWidth = 3;
  [85, 150, 215].forEach((r) => {
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.48, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  drawMoon(0, 0, 58);
  [
    [85, 1.1, "#8ff7ff", 0.75],
    [150, 1.6, "#ff8bd1", 0.6],
    [215, 2.1, "#ffe66d", 0.7],
  ].forEach(([orbit, speed, color, scale], i) => {
    const a = angle * speed + i * 1.7;
    drawOrbitSparkle(Math.cos(a) * orbit, Math.sin(a) * orbit * 0.48, color, scale);
  });
  ctx.restore();
}

function drawOrbitSparkle(x, y, color, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(7, -7);
  ctx.lineTo(24, 0);
  ctx.lineTo(7, 7);
  ctx.lineTo(0, 24);
  ctx.lineTo(-7, 7);
  ctx.lineTo(-24, 0);
  ctx.lineTo(-7, -7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMoonCommandCenter(now) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
  roundedRect(560, 300, 230, 108, 28);
  ctx.fillStyle = "#183a86";
  ctx.font = "bold 22px Comic Sans MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Moon Mission", 675, 336);
  ctx.fillStyle = "#4ecdc4";
  roundedRect(594, 356, 52, 26, 10);
  ctx.fillStyle = "#ff9f1c";
  roundedRect(666, 356, 52, 26, 10);
  ctx.fillStyle = "#ff5757";
  circle(744, 368, 14 + Math.sin(now / 160) * 3);
  drawAntenna(805, 292);
}

function drawAntenna(x, y) {
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y + 54);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 28, y - 28);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 28, y - 28);
  ctx.stroke();
  ctx.fillStyle = "#ffe66d";
  circle(x, y - 4, 8);
}

function drawMoonFoodSearch(now, progress) {
  drawMoonRock(160, 390, 74);
  drawMoonRock(420, 422, 54);
  drawMoonRock(720, 386, 68);
  drawRocketDriver(250 + Math.sin(now / 380) * 42, 398, "#ff5757");
  drawRocketDriver(550 + Math.cos(now / 420) * 52, 400, "#6c63ff");
  drawMagnifier(305 + progress * 270, 322 + Math.sin(progress * Math.PI * 4) * 26);
  drawMoonFood(742, 330, 1);
  drawMoonFood(610, 410, 0.75);
}

function drawMoonRace(now, progress, spin) {
  drawRaceFlag(820, 298);
  const r1x = 120 + progress * 680;
  const r1y = 376 + Math.sin(now / 90) * 4;
  const r2x = 80 + progress * 600;
  const r2y = 430 + Math.cos(now / 100) * 4;
  drawMoonRaceCar(r1x, r1y, "#ff9f1c", spin, carPathWheelRoll(r1x, r1y));
  drawMoonRaceCar(r2x, r2y, "#34c759", -spin, carPathWheelRoll(r2x, r2y));
  drawRocketDriver(165 + progress * 680, 352, "#ff5757");
  drawRocketDriver(122 + progress * 600, 406, "#6c63ff");
  drawTowTruck(848, GROUND - 64, now, { facing: -1, hookDrop: 0.22, spin: spin * 0.03 });
}

function drawMoonDanceParty(now, spin) {
  drawDiscoMoon(480, 116, now);
  [
    [250, 386, "#ff5757"],
    [380, 394, "#6c63ff"],
    [545, 386, "#34c759"],
    [680, 398, "#ff9f1c"],
  ].forEach(([x, y, color], i) => {
    drawRocketDriver(x, y + Math.sin(now / 120 + i) * 24, color);
  });
  drawMusicNote(170, 210 + Math.sin(now / 150) * 20, "#ffe66d", spin);
  drawMusicNote(760, 220 + Math.cos(now / 150) * 20, "#ff8bd1", -spin);
  drawMusicNote(625, 150 + Math.sin(now / 130) * 18, "#8ff7ff", spin * 0.6);
}

function drawMoonFoodPicnic(now) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
  roundedRect(280, 352, 400, 82, 26);
  drawMoonFood(340, 372 + Math.sin(now / 180) * 4, 1.1);
  drawMoonFood(450, 370 + Math.cos(now / 190) * 4, 1);
  drawMoonFood(560, 374 + Math.sin(now / 210) * 4, 1.2);
  drawRocketDriver(218, 394, "#ff5757");
  drawRocketDriver(735, 394, "#6c63ff");
  drawRocket(475, 300, -0.05, "#ff5757");
}

function drawMoonBirthdayParty(now, progress, spin) {
  drawMoonBirthdayBanner(480, 94, now);
  drawBirthdayCake(480, 350, now);
  drawBirthdayBalloons(205, 248, now);
  drawBirthdayBalloons(762, 250, now + 260);
  drawMoonCrane(110, 405, 360, 250 + Math.sin(now / 260) * 8, now);
  drawCraneHook(360, 250 + Math.sin(now / 260) * 8, 356, "#ffe66d");
  drawCar(286, 410 + Math.sin(now / 170) * 6, "#ff9f1c", spin * 0.4);
  drawRocket(680, 380 + Math.cos(now / 190) * 8, -0.12 + spin * 0.3, "#ff5757");
  drawPassengers(594, 418, now);
  drawMusicNote(138, 190 + Math.sin(now / 150) * 20, "#8ff7ff", spin);
  drawMusicNote(818, 180 + Math.cos(now / 160) * 18, "#ff8bd1", -spin);
  if (progress > 0.55) drawBirthdaySparkles(now);
}

function drawMoonCraneScene(now, progress, cargo, spin) {
  const hookX = cargo === "cars" ? 310 + progress * 340 : 645 - Math.sin(progress * Math.PI) * 220;
  const hookY = cargo === "cars" ? 250 - Math.sin(progress * Math.PI) * 76 : 236 + Math.cos(progress * Math.PI) * 38;
  const craneX = cargo === "cars" ? 88 : 132;
  drawMoonCrane(craneX, 408, hookX, hookY, now);

  if (cargo === "cars") {
    drawCraneHook(hookX, hookY, hookY + 88, "#8ff7ff");
    drawCar(hookX, hookY + 120, "#ff9f1c", spin * 0.35, carPathWheelRoll(hookX, hookY + 120));
    drawCar(150, 416, "#34c759", 0);
    drawRocket(760, 382, -0.18, "#6c63ff");
    drawMoonCraneLandingPad(680, 424, "car spot");
    drawTowTruck(802, GROUND - 66, now, { facing: -1, hookDrop: 0.28, spin: spin * 0.05 });
    return;
  }

  drawBirthdayCake(198, 366, now);
  drawTrain(500, GROUND - 82, now);
  drawCraneHook(hookX, hookY, hookY + 110, "#ffd1e7");
  drawRocket(hookX, hookY + 134, -0.08 + spin * 0.25, "#ff5757");
  drawPassengerPod(382 + Math.sin(now / 230) * 16, 342, now);
  drawPassengers(610, 410, now);
  drawBirthdayBalloons(800, 245, now);
}

function drawMoonRobotHelperScene(now, progress, spin) {
  const robotX = 244 + Math.sin(progress * Math.PI) * 210;
  const robotY = 392 + Math.sin(now / 180) * 4;
  drawBirthdayCake(170, 370, now);
  drawTrain(490, GROUND - 82, now);
  drawMoonRaceCar(680, 418, "#34c759", spin * 0.25);
  drawPassengers(572, 410, now);
  drawPassengerPod(370, 334 + Math.sin(now / 210) * 8, now);
  drawFriendlyRobot(robotX, robotY, now, true);
  drawRobotCheckPanel(236, 204, now);
  drawMusicNote(810, 196 + Math.sin(now / 150) * 18, "#8ff7ff", -spin);
  if (progress > 0.5) drawOrbitSparkle(730, 314 + Math.sin(now / 140) * 16, "#ffe66d", 0.5);
}

function drawMoonTowRescueScene(now, progress, spin) {
  drawMoonRock(276, 434, 70);
  drawMoonRock(690, 428, 58);

  const arrive = Math.min(1, Math.max(0, (progress - 0.08) / 0.52));
  const tuck = Math.min(1, Math.max(0, (progress - 0.55) / 0.45));
  const carTilt = 0.26 * (1 - tuck * 0.92) + Math.sin(now / 220) * 0.02;
  const carBaseX = 518 + tuck * 54;
  const carLift = tuck * 46;
  const carY = 404 - carLift;

  ctx.save();
  ctx.translate(carBaseX, carY);
  ctx.rotate(carTilt + spin * 0.06);
  drawCar(0, 0, "#ff9f1c", 0);
  ctx.restore();

  if (tuck < 0.55) {
    drawOrbitSparkle(carBaseX - 52, carY - 58, "#8ff7ff", 0.34);
    drawOrbitSparkle(carBaseX + 56, carY - 48, "#ffe66d", 0.3);
  }

  const rocketTip = Math.min(1, Math.max(0, (progress - 0.38) / 0.62));
  const rocketFall = (1 - rocketTip) * 0.42;
  const rocketY = 418 + rocketFall * 40 + Math.sin(now / 260) * 3 - rocketTip * 18;
  drawRocket(728, rocketY, -0.52 + rocketTip * 0.38 + spin * 0.08, "#6c63ff");

  const truckX = 86 + arrive * 270;
  const truckY = GROUND - 68;
  const hookDrop = 0.68 - tuck * 0.62;
  drawTowTruck(truckX, truckY, now, { hookDrop, spin: spin * 0.04 });

  const { hx: boomAnchorX, hy: boomAnchorY } = towTruckHookWorld(truckX, truckY, hookDrop, 1);
  const hookX = carBaseX - 6;
  const hookY = carY - 42 - carLift * 0.35;
  if (arrive > 0.18) drawTowCable(boomAnchorX, boomAnchorY, hookX, hookY, (1 - tuck) * 0.85);

  drawMoonCraneLandingPad(720, 428, "soft pad");
  if (tuck > 0.78) drawOrbitSparkle(600, 196 + Math.sin(now / 150) * 12, "#ffffff", 0.42);
}

function drawFriendlyRobot(x, y, now, waving = false) {
  const wave = waving ? Math.sin(now / 120) * 0.45 : 0;
  ctx.save();
  ctx.translate(x, y);

  ctx.strokeStyle = "#d8f7ff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-18, -86);
  ctx.lineTo(-32, -116);
  ctx.moveTo(18, -86);
  ctx.lineTo(32, -116);
  ctx.stroke();
  ctx.fillStyle = "#ffe66d";
  circle(-34, -120, 7);
  circle(34, -120, 7);

  ctx.fillStyle = "#d8f7ff";
  roundedRect(-42, -88, 84, 58, 18);
  ctx.fillStyle = "#183a86";
  circle(-16, -62, 5);
  circle(16, -62, 5);
  ctx.strokeStyle = "#183a86";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, -56, 14, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = "#8ff7ff";
  roundedRect(-34, -26, 68, 64, 18);
  ctx.fillStyle = "#ffffff";
  roundedRect(-20, -8, 40, 18, 8);
  ctx.fillStyle = "#34c759";
  circle(-10, 1, 5);
  ctx.fillStyle = "#ff9f1c";
  circle(10, 1, 5);

  ctx.strokeStyle = "#d8f7ff";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-34, -8);
  ctx.lineTo(-62, 18);
  ctx.moveTo(34, -8);
  ctx.lineTo(62, -30 + wave * 24);
  ctx.stroke();
  ctx.fillStyle = "#ffe66d";
  circle(-66, 22, 10);
  circle(66, -34 + wave * 24, 10);
  ctx.lineCap = "butt";

  const robotWheelRoll = idleWheelWobble(now, x, y);
  drawWheel(-22, 48, robotWheelRoll);
  drawWheel(22, 48, robotWheelRoll);
  ctx.restore();
}

function drawRobotCheckPanel(x, y, now) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  roundedRect(x - 116, y - 42, 232, 122, 20);
  ctx.fillStyle = "#183a86";
  ctx.font = "bold 22px Comic Sans MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Robot checks", x, y - 8);
  ctx.font = "bold 19px Comic Sans MS, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("wheels", x - 68, y + 28);
  ctx.fillText("passengers", x - 68, y + 58);
  drawCheckMark(x + 64, y + 24, now);
  drawCheckMark(x + 64, y + 54, now + 260);
}

function drawCheckMark(x, y, now) {
  ctx.strokeStyle = "#34c759";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 18, y - 2);
  ctx.lineTo(x - 6, y + 12);
  ctx.lineTo(x + 20, y - 16 + Math.sin(now / 160) * 3);
  ctx.stroke();
  ctx.lineCap = "butt";
}

function drawMoonCrane(x, y, hookX, hookY, now) {
  const craneBoost = Math.max(0, state.craneUntil - now) / 2200;
  const wiggle = Math.sin(now / 95) * (2 + craneBoost * 5);
  ctx.save();
  ctx.translate(wiggle, 0);
  ctx.strokeStyle = "#ffe66d";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, 190);
  ctx.lineTo(hookX, hookY - 58);
  ctx.stroke();
  ctx.strokeStyle = "#ff9f1c";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x + 34, y);
  ctx.lineTo(x, 190);
  ctx.moveTo(x + 70, y);
  ctx.lineTo(x, 260);
  ctx.stroke();
  ctx.fillStyle = "#12a6a6";
  roundedRect(x - 38, y - 18, 118, 44, 16);
  const craneWheelRoll = idleWheelWobble(now, x + hookX * 0.04, y) * 0.65;
  drawWheel(x - 14, y + 28, craneWheelRoll);
  drawWheel(x + 54, y + 28, craneWheelRoll);
  ctx.restore();
}

function drawCraneHook(x, y, slingY, slingColor) {
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y - 58);
  ctx.lineTo(x, slingY - 42);
  ctx.stroke();
  ctx.strokeStyle = slingColor;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x - 58, slingY - 22);
  ctx.quadraticCurveTo(x, slingY + 24, x + 58, slingY - 22);
  ctx.stroke();
  ctx.fillStyle = "#ff5757";
  ctx.beginPath();
  ctx.arc(x, slingY - 44, 18, 0.1 * Math.PI, 1.45 * Math.PI);
  ctx.stroke();
}

function drawBirthdayCake(x, y, now) {
  ctx.fillStyle = "#ffd1e7";
  roundedRect(x - 108, y - 34, 216, 58, 18);
  ctx.fillStyle = "#ff8bd1";
  roundedRect(x - 90, y - 74, 180, 54, 18);
  ctx.fillStyle = "#ffffff";
  roundedRect(x - 92, y - 76, 184, 16, 8);
  ctx.fillStyle = "#8ff7ff";
  [-54, 0, 54].forEach((offset) => roundedRect(x + offset - 7, y - 118, 14, 42, 6));
  ctx.fillStyle = "#ffe66d";
  [-54, 0, 54].forEach((offset, i) => {
    const flame = 8 + Math.sin(now / 140 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(x + offset, y - 137 - flame);
    ctx.lineTo(x + offset - 9, y - 118);
    ctx.lineTo(x + offset + 9, y - 118);
    ctx.closePath();
    ctx.fill();
  });
  ctx.fillStyle = "#183a86";
  ctx.font = "bold 24px Comic Sans MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("OTTO", x, y + 4);
}

function drawMoonBirthdayBanner(x, y, now) {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 270, y - 18);
  ctx.quadraticCurveTo(x, y + 28 + Math.sin(now / 260) * 8, x + 270, y - 18);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  roundedRect(x - 212, y - 16, 424, 58, 22);
  ctx.fillStyle = "#183a86";
  ctx.font = "bold 30px Comic Sans MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MOON BIRTHDAY", x, y + 22);
}

function drawBirthdayBalloons(x, y, now) {
  ["#ff5757", "#8ff7ff", "#ffe66d"].forEach((color, i) => {
    const bx = x + (i - 1) * 34;
    const by = y + Math.sin(now / 210 + i) * 10;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx, by + 30);
    ctx.quadraticCurveTo(bx - 12, by + 72, x, y + 108);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(bx, by, 22, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBirthdaySparkles(now) {
  ["#ffe66d", "#8ff7ff", "#ff8bd1", "#ffffff"].forEach((color, i) => {
    drawOrbitSparkle(330 + i * 96, 180 + Math.sin(now / 120 + i) * 26, color, 0.45);
  });
}

function drawMoonCraneLandingPad(x, y, label) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  roundedRect(x - 82, y - 28, 164, 54, 20);
  ctx.fillStyle = "#183a86";
  ctx.font = "bold 20px Comic Sans MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 8);
}

function drawPassengerPod(x, y, now) {
  ctx.fillStyle = "rgba(216, 247, 255, 0.86)";
  roundedRect(x - 62, y - 42, 124, 70, 24);
  ctx.fillStyle = "#183a86";
  roundedRect(x - 38, y - 24, 28, 24, 8);
  roundedRect(x + 10, y - 24, 28, 24, 8);
  drawPassengers(x - 44, y + 36, now);
}

function drawMoonRock(x, y, size) {
  ctx.fillStyle = "#9f9889";
  ctx.beginPath();
  ctx.ellipse(x, y, size, size * 0.55, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(75, 68, 58, 0.22)";
  circle(x - size * 0.28, y - size * 0.1, size * 0.16);
  circle(x + size * 0.2, y + size * 0.08, size * 0.12);
}

function drawMagnifier(x, y) {
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 18, y + 18);
  ctx.lineTo(x + 45, y + 45);
  ctx.stroke();
}

function drawMoonFood(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#d8f7ff";
  circle(0, 0, 24);
  ctx.fillStyle = "#b788ff";
  circle(-8, -5, 5);
  circle(7, 4, 4);
  circle(2, -13, 3);
  ctx.fillStyle = "#ffe66d";
  roundedRect(-32, 18, 64, 12, 6);
  ctx.restore();
}

function drawMoonRaceCar(x, y, color, rotation, pathWheelRoll) {
  drawCar(x, y, color, rotation, pathWheelRoll);
  ctx.save();
  ctx.translate(x + 58, y - 36);
  ctx.fillStyle = "#ffffff";
  roundedRect(0, 0, 28, 24, 8);
  ctx.fillStyle = "#ff5757";
  circle(20, 4, 6);
  ctx.restore();
}

function drawRaceFlag(x, y) {
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 120);
  ctx.stroke();
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#ffffff" : "#183a86";
      ctx.fillRect(x + col * 18, y + row * 18, 18, 18);
    }
  }
}

function drawDiscoMoon(x, y, now) {
  ctx.fillStyle = "#e9e1c8";
  circle(x, y, 42);
  ctx.strokeStyle = `rgba(255, 230, 109, ${0.55 + Math.sin(now / 140) * 0.25})`;
  ctx.lineWidth = 5;
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2 + now / 900;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * 55, y + Math.sin(angle) * 55);
    ctx.lineTo(x + Math.cos(angle) * 118, y + Math.sin(angle) * 118);
    ctx.stroke();
  }
}

function drawMusicNote(x, y, color, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = color;
  roundedRect(0, -54, 10, 62, 4);
  roundedRect(8, -54, 34, 10, 5);
  circle(-4, 10, 14);
  circle(34, 2, 14);
  ctx.restore();
}

function drawPassengers(x, y, now) {
  ["#ff6b6b", "#34c759", "#6c63ff", "#ff9f1c"].forEach((color, i) => {
    const px = x + i * 45;
    const hop = Math.sin(now / 170 + i) * 8;
    ctx.fillStyle = color;
    roundedRect(px - 10, y - 28 + hop, 20, 30, 8);
    ctx.fillStyle = "#ffd2a6";
    circle(px, y - 40 + hop, 12);
  });
}

function drawPlanBoard(x, y) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  roundedRect(x, y, 230, 152, 22);
  ctx.fillStyle = "#183a86";
  ctx.font = "bold 24px Comic Sans MS, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Today's plan", x + 24, y + 40);
  ctx.font = "bold 21px Comic Sans MS, sans-serif";
  ctx.fillText("1. Zoom", x + 28, y + 78);
  ctx.fillText("2. Twirl", x + 28, y + 110);
  ctx.fillText("3. Snack", x + 28, y + 142);
}

function drawAdventure(now) {
  if (state.adventureUntil <= now) return;
  state.confetti.forEach((bit) => {
    bit.x += bit.vx;
    bit.y += bit.vy;
    ctx.fillStyle = bit.color;
    ctx.save();
    ctx.translate(bit.x, bit.y);
    ctx.rotate(now / 180 + bit.x);
    roundedRect(-7, -5, 14, 10, 3);
    ctx.restore();
  });
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function circle(x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

requestAnimationFrame(loop);
