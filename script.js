
// 🎯 GAME CONFIGURATION & STATE
let selectedTarget = "ronaldo";
let customImgData = null;
let selectedMode = "rookie";

let score = 0;
let timeLeft = 30;
let gameRunning = false;
let timerInterval = null;
let musicPlaying = false;

// 🔥 COMBO & STATS
let comboStreak = 0;
let maxCombo = 0;
let totalClicks = 0;
let totalHits = 0;

// 🎯 CROSSHAIR STATE
let selectedCrosshair = "default";
let crosshairColor = "#ff4757";

// ===================================================
// 🔊 SOUND EFFECTS
// We use AudioContext to generate sounds procedurally
// so you don't need extra audio files.
// Your existing click.mp3 and hit.mp3 still work too.
// ===================================================
const clickSound = new Audio('assets/click.mp3');
const hitSound = new Audio('assets/hit.mp3');
clickSound.volume = 0.4;
hitSound.volume = 0.5;

// Procedural sound generator (fallback / extra sounds)
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
}

// Miss sound — short low thud
function playMissSound() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    } catch(e) {}
}

// Combo sound — ascending beep
function playComboSound(streak) {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "square";
        const baseFreq = 400 + Math.min(streak * 30, 600);
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
    } catch(e) {}
}

// Game over sound — descending tone
function playGameOverSound() {
    try {
        const ctx = getAudioCtx();
        [0, 0.2, 0.4].forEach((offset, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(300 - i * 80, ctx.currentTime + offset);
            gain.gain.setValueAtTime(0.2, ctx.currentTime + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.18);
            osc.start(ctx.currentTime + offset);
            osc.stop(ctx.currentTime + offset + 0.18);
        });
    } catch(e) {}
}

const difficulties = {
    rookie: { size: 120, timeLimit: 30 },
    ranger: { size: 85,  timeLimit: 25 },
    elite:  { size: 55,  timeLimit: 20 },
    god:    { size: 30,  timeLimit: 15 }
};

// 🖥️ HTML ELEMENT SELECTORS
const menu = document.getElementById("menu");
const game = document.getElementById("game");
const gameOverScreen = document.getElementById("gameOver");

const scoreText = document.getElementById("score");
const timerText = document.getElementById("timer");
const finalScoreText = document.getElementById("finalScore");
const finalRankText = document.getElementById("finalRank");

const target = document.getElementById("target");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const music = document.getElementById("music");
const imageUploader = document.getElementById("imageUploader");
const uploadLabel = document.getElementById("uploadLabel");
const uploadText = document.getElementById("uploadText");
const gameArea = document.getElementById("gameArea");

// ===================================================
// 🏆 LEADERBOARD SYSTEM
// Stores top 5 runs with score, rank, mode, accuracy
// ===================================================
const LEADERBOARD_KEY = "targetRush_leaderboard";

function getLeaderboard() {
    try {
        return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
    } catch(e) {
        return [];
    }
}

function saveToLeaderboard(entry) {
    let lb = getLeaderboard();
    lb.push(entry);
    lb.sort((a, b) => b.score - a.score);
    lb = lb.slice(0, 5); // keep top 5
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(lb));
}

function renderLeaderboard(listEl) {
    if (!listEl) return;
    const lb = getLeaderboard();

    if (lb.length === 0) {
        listEl.innerHTML = '<p style="font-size:10px; color:#666;">No scores yet. Play a round!</p>';
        return;
    }

    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
    listEl.innerHTML = lb.map((entry, i) => `
        <div class="lb-row">
            <span class="lb-medal">${medals[i]}</span>
            <span class="lb-score">${entry.score} pts</span>
            <span class="lb-meta">${entry.rank} · ${entry.mode.toUpperCase()} · ${entry.acc}% acc</span>
        </div>
    `).join("");
}

function updateLeaderboards() {
    renderLeaderboard(document.getElementById("leaderboardList"));
    renderLeaderboard(document.getElementById("leaderboardListOver"));
}

// Load leaderboard on startup
setTimeout(updateLeaderboards, 100);

// ===================================================
// 🎯 CROSSHAIR SYSTEM
// ===================================================
const crosshairSVGs = {
    default: (color) => `<path d='M14 0h4v6h-4zM14 26h4v6h-4zM0 14h6v4H0zM26 14h6v4h-6z' fill='${color}'/><circle cx='16' cy='16' r='2' fill='${color}'/>`,
    dot:     (color) => `<circle cx='16' cy='16' r='4' fill='${color}'/>`,
    circle:  (color) => `<circle cx='16' cy='16' r='10' fill='none' stroke='${color}' stroke-width='2.5'/><circle cx='16' cy='16' r='2' fill='${color}'/>`,
    cross:   (color) => `<line x1='16' y1='2' x2='16' y2='30' stroke='${color}' stroke-width='2'/><line x1='2' y1='16' x2='30' y2='16' stroke='${color}' stroke-width='2'/>`,
    gap:     (color) => `<line x1='16' y1='2' x2='16' y2='11' stroke='${color}' stroke-width='2.5'/><line x1='16' y1='21' x2='16' y2='30' stroke='${color}' stroke-width='2.5'/><line x1='2' y1='16' x2='11' y2='16' stroke='${color}' stroke-width='2.5'/><line x1='21' y1='16' x2='30' y2='16' stroke='${color}' stroke-width='2.5'/><circle cx='16' cy='16' r='2' fill='${color}'/>`,
    x:       (color) => `<line x1='4' y1='4' x2='28' y2='28' stroke='${color}' stroke-width='2.5'/><line x1='28' y1='4' x2='4' y2='28' stroke='${color}' stroke-width='2.5'/>`
};

function buildCursorSVG(type, color) {
    const inner = crosshairSVGs[type] ? crosshairSVGs[type](color) : crosshairSVGs.default(color);
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E${encodeURIComponent(inner)}%3C/svg%3E`;
}

function applyCrosshairToGameArea() {
    const url = buildCursorSVG(selectedCrosshair, crosshairColor);
    if (gameArea) {
        gameArea.style.cursor = `url("${url}") 16 16, crosshair`;
    }
}

function selectCrosshair(type, tileEl) {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
    selectedCrosshair = type;

    document.querySelectorAll('.crosshair-tile').forEach(t => t.classList.remove('active'));
    if (tileEl) tileEl.classList.add('active');

    applyCrosshairToGameArea();
}

function setCrosshairColor(color, swatchEl) {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
    crosshairColor = color;

    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    if (swatchEl) swatchEl.classList.add('active');

    // Update crosshair preview tiles with new color
    document.querySelectorAll('.crosshair-tile svg').forEach((svg, i) => {
        const types = ['default','dot','circle','cross','gap','x'];
        svg.innerHTML = crosshairSVGs[types[i]] ? crosshairSVGs[types[i]](color) : '';
    });

    applyCrosshairToGameArea();
}

// Apply default crosshair on load
applyCrosshairToGameArea();

// 🎵 AUDIO CONTROL
function initMusic() {
    if (!musicPlaying) {
        music.volume = 0.05;
        music.play().catch(e => console.log("Audio waiting for user gesture."));
        musicPlaying = true;
    }
}

// 👤 CHARACTER SELECTION
function selectTarget(choice, tileEl) {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
    selectedTarget = choice;
    document.querySelectorAll('.target-tile').forEach(tile => tile.classList.remove('active'));
    if (tileEl) tileEl.classList.add('active');
}

// 📤 CUSTOM IMAGE UPLOADER
imageUploader.addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            customImgData = event.target.result;
            uploadLabel.style.backgroundImage = `url('${customImgData}')`;
            uploadText.style.display = "none";
            selectTarget("custom", uploadLabel);
        };
        reader.readAsDataURL(file);
    }
});

// ⚡ DIFFICULTY SELECTION
function selectMode(mode, buttonEl) {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
    selectedMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    if (buttonEl) buttonEl.classList.add('active');
}

// 🎮 BUTTON LISTENERS
startBtn.addEventListener("click", () => {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
    startGame();
});

restartBtn.addEventListener("click", () => {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
    toMainMenu();
});

// Miss detector
if (gameArea) {
    gameArea.addEventListener("mousedown", (e) => {
        if (!gameRunning) return;
        if (e.target === gameArea) {
            totalClicks++;
            comboStreak = 0;
            playMissSound();
            updateUiFeedback();
        }
    });
}

function updateUiFeedback() {
    let comboDisplay = document.getElementById("comboDisplay");
    if (!comboDisplay) {
        comboDisplay = document.createElement("div");
        comboDisplay.id = "comboDisplay";
        comboDisplay.style.position = "absolute";
        comboDisplay.style.top = "20px";
        comboDisplay.style.right = "20px";
        comboDisplay.style.fontSize = "24px";
        comboDisplay.style.color = "#FF4500";
        comboDisplay.style.fontWeight = "bold";
        comboDisplay.style.fontFamily = "'Press Start 2P', cursive";
        comboDisplay.style.pointerEvents = "none";
        game.appendChild(comboDisplay);
    }

    if (comboStreak >= 3) {
        comboDisplay.textContent = `🔥 STREAK: ${comboStreak}x`;
        comboDisplay.style.transform = `scale(${1 + Math.min(comboStreak * 0.05, 0.5)})`;
    } else {
        comboDisplay.textContent = "";
    }
}

// 🏁 START GAME
function startGame() {
    initMusic();

    menu.style.display = "none";
    gameOverScreen.style.display = "none";
    game.style.display = "block";

    score = 0;
    comboStreak = 0;
    maxCombo = 0;
    totalClicks = 0;
    totalHits = 0;

    const currentDiff = difficulties[selectedMode];
    timeLeft = currentDiff.timeLimit;

    scoreText.textContent = score;
    timerText.textContent = timeLeft;
    updateUiFeedback();

    gameRunning = true;

    target.style.width = currentDiff.size + "px";
    target.style.height = currentDiff.size + "px";
    target.style.transition = "transform 0.1s ease";

    if (selectedTarget === "custom" && customImgData) {
        target.src = customImgData;
    } else {
        target.src = `assets/${selectedTarget}.png`;
    }

    // Apply the chosen crosshair
    applyCrosshairToGameArea();

    moveTarget();

    timerInterval = setInterval(() => {
        timeLeft--;
        timerText.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            endGame();
        }
    }, 1000);
}

// ⚡ HIT REGISTRATION
target.addEventListener("pointerdown", (e) => {
    if (!gameRunning) return;
    e.preventDefault();
    e.stopPropagation();

    hitSound.currentTime = 0;
    hitSound.play().catch(() => {});

    totalClicks++;
    totalHits++;
    comboStreak++;

    if (comboStreak > maxCombo) maxCombo = comboStreak;

    // Play combo sound on milestones
    if (comboStreak >= 3) playComboSound(comboStreak);

    let pointGain = 1;
    if (comboStreak >= 15) pointGain = 4;
    else if (comboStreak >= 10) pointGain = 3;
    else if (comboStreak >= 5) pointGain = 2;

    score += pointGain;
    scoreText.textContent = score;

    spawnHitParticle(e.clientX, e.clientY, pointGain);

    target.style.transform = "scale(0.4)";
    setTimeout(() => {
        target.style.transform = "scale(1)";
        moveTarget();
    }, 60);
});

function spawnHitParticle(x, y, points) {
    const particle = document.createElement("div");
    particle.textContent = comboStreak >= 5 ? `🔥 +${points}` : `+${points}`;
    particle.style.position = "fixed";
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.color = comboStreak >= 5 ? "#FFD700" : "#00FF00";
    particle.style.fontSize = "26px";
    particle.style.fontWeight = "bold";
    particle.style.fontFamily = "'Press Start 2P', cursive";
    particle.style.pointerEvents = "none";
    particle.style.transition = "all 0.6s cubic-bezier(0.18, 0.89, 0.32, 1.28)";
    particle.style.zIndex = "9999";
    document.body.appendChild(particle);
    requestAnimationFrame(() => {
        particle.style.transform = "translateY(-60px) scale(1.3)";
        particle.style.opacity = "0";
    });
    setTimeout(() => particle.remove(), 600);
}

// 🎲 MOVE TARGET
function moveTarget() {
    const currentDiff = difficulties[selectedMode];
    const maxX = gameArea.clientWidth - currentDiff.size;
    const maxY = gameArea.clientHeight - currentDiff.size;
    target.style.left = Math.random() * maxX + "px";
    target.style.top = Math.random() * maxY + "px";
    updateUiFeedback();
}

// 🛑 END GAME
function endGame() {
    gameRunning = false;
    clearInterval(timerInterval);

    playGameOverSound();

    let acc = totalClicks > 0 ? Math.round((totalHits / totalClicks) * 100) : 100;

    let rank = "Rookie";
    let modifier = selectedMode === "god" || selectedMode === "elite" ? 0.6 : 1.0;
    if (score >= Math.floor(8  * modifier)) rank = "Hunter";
    if (score >= Math.floor(20 * modifier)) rank = "Sharpshooter";
    if (score >= Math.floor(35 * modifier)) rank = "Elite";
    if (score >= Math.floor(50 * modifier)) rank = "Legend";

    // Save to leaderboard
    saveToLeaderboard({
        score,
        rank,
        mode: selectedMode,
        acc,
        maxCombo,
        date: new Date().toLocaleDateString()
    });

    finalScoreText.innerHTML = `${score}<br><span style="font-size:16px;color:#aaa;">🔥 MAX COMBO: ${maxCombo}x | 🎯 ACCURACY: ${acc}%</span>`;
    finalRankText.textContent = rank;

    game.style.display = "none";
    gameOverScreen.style.display = "block";

    updateLeaderboards();
}

// 🛑 QUIT MID-GAME
function quitGame() {
    gameRunning = false;
    clearInterval(timerInterval);
    game.style.display = "none";
    menu.style.display = "block";
    updateLeaderboards();
}

function toMainMenu() {
    gameOverScreen.style.display = "none";
    menu.style.display = "block";
    updateLeaderboards();
}
function toggleMusic() {
    const btn = document.getElementById("musicBtn");
    if (music.paused) {
        music.play().catch(() => {});
        btn.textContent = "🔊 MUSIC";
    } else {
        music.pause();
        btn.textContent = "🔇 MUSIC";
    }
}
