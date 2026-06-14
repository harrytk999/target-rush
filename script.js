// 🎯 GAME CONFIGURATION & STATE
let selectedTarget = "ronaldo";
let customImgData = null;
let selectedMode = "rookie";

let score = 0;
let timeLeft = 30;
let gameRunning = false;
let timerInterval = null;
let musicPlaying = false;

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

// 🎵 AUDIO CONTROL
function initMusic() {
    if (!musicPlaying) {
        music.play().catch(e => console.log("Audio waiting for user gesture."));
        musicPlaying = true;
    }
}

// 👤 CHARACTER SELECTION LOGIC
function selectTarget(choice, tileEl) {
    selectedTarget = choice;
    console.log("Target face locked: " + choice.toUpperCase());

    const tiles = document.querySelectorAll('.target-tile');
    tiles.forEach(tile => tile.classList.remove('active'));

    if (tileEl) tileEl.classList.add('active');
}

// 📤 CUSTOM PLAYER IMAGE UPLOADER HANDLER (WITH INSTANT MENU PREVIEW LOCK)
imageUploader.addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            customImgData = event.target.result;

            // 1. Render the image instantly as the tile background so the player knows it worked!
            uploadLabel.style.backgroundImage = `url('${customImgData}')`;
            uploadText.style.display = "none"; // Hide text so the face is completely visible

            // 2. Automatically select and lock the custom option inside the active configuration state
            selectTarget("custom", uploadLabel);
        };
        reader.readAsDataURL(file);
    }
});

// ⚡ DIFFICULTY MODE SELECTION LOGIC
function selectMode(mode, buttonEl) {
    selectedMode = mode;
    console.log("Difficulty locked: " + mode.toUpperCase());

    const buttons = document.querySelectorAll('.mode-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    if (buttonEl) buttonEl.classList.add('active');
}

// 🎮 BUTTON EVENT LISTENERS
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", toMainMenu);

// 🏁 GAME LOOP FUNCTIONS
function startGame() {
    initMusic();

    menu.style.display = "none";
    gameOverScreen.style.display = "none";
    game.style.display = "block";

    score = 0;

    const currentDiff = difficulties[selectedMode];
    timeLeft = currentDiff.timeLimit;

    scoreText.textContent = score;
    timerText.textContent = timeLeft;

    gameRunning = true;

    target.style.width = currentDiff.size + "px";
    target.style.height = currentDiff.size + "px";

    if (selectedTarget === "custom" && customImgData) {
        target.src = customImgData;
    } else {
        target.src = `assets/${selectedTarget}.png`;
    }

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

// ⚡ INSTANT HIT REGISTRATION
target.addEventListener("pointerdown", (e) => {
    if (!gameRunning) return;
    e.preventDefault();

    score++;
    scoreText.textContent = score;
    moveTarget();
});

// 🎲 RANDOM COORDINATE CALCULATOR
function moveTarget() {
    const gameArea = document.getElementById("gameArea");
    const currentDiff = difficulties[selectedMode];

    const maxX = gameArea.clientWidth - currentDiff.size;
    const maxY = gameArea.clientHeight - currentDiff.size;

    const randomX = Math.random() * maxX;
    const randomY = Math.random() * maxY;

    target.style.left = randomX + "px";
    target.style.top = randomY + "px";
}

// 🛑 END ROUND RESULTS CALCULATOR
function endGame() {
    gameRunning = false;
    clearInterval(timerInterval);

    let rank = "Rookie";
    let modifier = selectedMode === "god" || selectedMode === "elite" ? 0.6 : 1.0;

    if (score >= Math.floor(8 * modifier)) rank = "Hunter";
    if (score >= Math.floor(20 * modifier)) rank = "Sharpshooter";
    if (score >= Math.floor(35 * modifier)) rank = "Elite";
    if (score >= Math.floor(50 * modifier)) rank = "Legend";

    finalScoreText.textContent = score;
    finalRankText.textContent = rank;

    game.style.display = "none";
    gameOverScreen.style.display = "block";
}

// 🛑 MID-GAME QUIT FUNCTION
function quitGame() {
    gameRunning = false;
    clearInterval(timerInterval);

    game.style.display = "none";
    menu.style.display = "block";

    console.log("Training aborted by player. Returned to menu.");
}

function toMainMenu() {
    gameOverScreen.style.display = "none";
    menu.style.display = "block";
}