// --- STATE & ARCHITEKTUR ---
let state = {
    pool: [], activeBlock: [], currentIndex: 0,
    lives: 3, streak: 0, locked: false, userInput: ""
};

const AppDirector = {
    changeScreen(screen) {
        document.querySelectorAll('.blueprint-screen').forEach(s => s.classList.remove('active'));
        document.querySelector(`[data-screen="${screen}"]`).classList.add('active');
        document.getElementById('stats-bar').classList.toggle('hidden', screen === 'menu');
        document.getElementById('thumb-zone').classList.toggle('hidden', screen !== 'playing');
    },
    goBack() { location.reload(); } // Exorzismus
};

// --- INITIALISIERUNG ---
document.addEventListener('DOMContentLoaded', async () => {
    // 3s Startup Fade
    document.getElementById('menu-box').classList.add('startup-fade');
    setTimeout(() => document.getElementById('menu-box').classList.remove('startup-fade'), 3100);
    
    buildKeyboard();
    setupHardwareKeyboard();
    FireworksEngine.init();

    // Lade Chaos-Pool
    try {
        const res = await fetch('data.json');
        state.pool = await res.json();
    } catch (e) {
        console.error("Fehler beim Laden der data.json", e);
    }
});

// --- CORE LOOP ---
function startBlock() {
    if(state.pool.length < 5) return alert("Nicht genug Aufgaben im Pool!");
    
    // Shuffle Pool & Slice 5
    let shuffled = [...state.pool].sort(() => Math.random() - 0.5);
    state.activeBlock = shuffled.slice(0, 5);
    
    state.currentIndex = 0;
    state.lives = 3;
    state.locked = false;
    updateStats();
    AppDirector.changeScreen('playing');
    loadTask();
}

function loadTask() {
    state.userInput = "";
    state.locked = false;
    const task = state.activeBlock[state.currentIndex];
    
    document.getElementById('task-orig').innerText = `"${task.orig}"`;
    document.getElementById('task-key').innerText = task.key;
    document.getElementById('task-pre').innerText = task.pre;
    document.getElementById('task-suf').innerText = task.suf;
    document.getElementById('progress').innerText = `${state.currentIndex + 1} / 5`;
    updateInputDisplay();
}

function updateInputDisplay() {
    const display = document.getElementById('user-input-display');
    display.innerText = state.userInput === "" ? "..." : state.userInput;
}

// --- LOGIK & FEEDBACK ---
function checkAnswer() {
    if (state.locked || state.userInput.trim() === "") return;
    state.locked = true;
    
    const task = state.activeBlock[state.currentIndex];
    const normalizedInput = state.userInput.trim().toLowerCase().replace(/[.!?;]$/, "");
    const isCorrect = task.ideal.some(ans => ans.toLowerCase().replace(/[.!?;]$/, "") === normalizedInput);

    if (isCorrect) {
        state.streak++;
        updateStats();
        document.getElementById('playing-glass-box').classList.add('glow-green');
        
        setTimeout(() => {
            document.getElementById('playing-glass-box').classList.remove('glow-green');
            advanceBlock();
        }, 1200);
    } else {
        triggerPunishment(task.ideal[0]);
    }
}

function triggerPunishment(correctAnswer) {
    state.lives--;
    state.streak = 0;
    updateStats();
    
    // Phase 1: 4s Roter Flash
    const flash = document.getElementById('feedback-flash');
    flash.innerHTML = `FALSCH!<br><small style="margin-top:15px; display:block; font-weight:normal;">Lösung: ${correctAnswer}</small>`;
    flash.classList.remove('hidden');

    if (state.lives <= 0) {
        // Phase 2 & 3: Jump Scare & Reload
        setTimeout(() => {
            flash.classList.add('hidden');
            document.getElementById('game-over-screen').classList.remove('hidden');
            setTimeout(() => location.reload(), 3000); // Exorzismus
        }, 4000);
    } else {
        setTimeout(() => {
            flash.classList.add('hidden');
            advanceBlock();
        }, 4000);
    }
}

function advanceBlock() {
    state.currentIndex++;
    if (state.currentIndex >= 5) {
        // Sieg! Phase 1 & 2
        FireworksEngine.launch(true);
        setTimeout(() => {
            document.getElementById('final-streak').innerText = state.streak;
            AppDirector.changeScreen('continue');
        }, 2000);
    } else {
        loadTask();
    }
}

function updateStats() {
    document.getElementById('lives').textContent = "❤️".repeat(Math.max(0, state.lives));
    document.getElementById('streak-count').textContent = state.streak;
}

// --- TASTATUR ENGINE ---
function handleInput(char) {
    if (state.locked) return;
    if (char === 'BACKSPACE') state.userInput = state.userInput.slice(0, -1);
    else if (char === 'ENTER') checkAnswer();
    else if (state.userInput.length < 50) state.userInput += char;
    updateInputDisplay();
}

function buildKeyboard() {
    const layout = [
        ["q","w","e","r","t","y","u","i","o","p"],
        ["a","s","d","f","g","h","j","k","l"],
        ["z","x","c","v","b","n","m","'"],
        ["BACKSPACE", "SPACE", "ENTER"]
    ];
    const kb = document.getElementById('keyboard');
    layout.forEach((row, i) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = `kb-row row-${i+1}`;
        row.forEach(key => {
            const btn = document.createElement('div');
            btn.className = 'kb-key';
            btn.dataset.key = key.toLowerCase();
            if(key === 'BACKSPACE') { btn.innerHTML = '⌫'; btn.classList.add('kb-backspace'); }
            else if(key === 'ENTER') { btn.innerHTML = '↵'; btn.classList.add('kb-check'); }
            else if(key === 'SPACE') { btn.innerHTML = 'SPACE'; btn.classList.add('kb-space'); }
            else btn.innerHTML = key;
            
            // Touch & Click Logic
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); handleKeyClick(key); btn.classList.add('active-hardware'); });
            btn.addEventListener('touchend', () => btn.classList.remove('active-hardware'));
            btn.addEventListener('mousedown', () => { handleKeyClick(key); btn.classList.add('active-hardware'); });
            btn.addEventListener('mouseup', () => btn.classList.remove('active-hardware'));
            rowDiv.appendChild(btn);
        });
        kb.appendChild(rowDiv);
    });
}

function handleKeyClick(key) {
    if (key === 'SPACE') handleInput(' ');
    else handleInput(key);
}

function setupHardwareKeyboard() {
    window.addEventListener('keydown', (e) => {
        if(state.locked) return;
        const key = e.key;
        
        let targetBtn = null;
        if(key === 'Backspace') { handleInput('BACKSPACE'); targetBtn = document.querySelector('[data-key="backspace"]'); }
        else if(key === 'Enter') { handleInput('ENTER'); targetBtn = document.querySelector('[data-key="enter"]'); }
        else if(key.match(/^[a-zA-Z' ]$/)) { 
            handleInput(key === ' ' ? ' ' : key); 
            targetBtn = document.querySelector(`[data-key="${key.toLowerCase() === ' ' ? 'space' : key.toLowerCase()}"]`); 
        }

        // Visuelles Echo
        if(targetBtn) {
            targetBtn.classList.add('active-hardware');
            setTimeout(() => targetBtn.classList.remove('active-hardware'), 100);
        }
    });
}

// --- LEGO 6: FEUERWERK ENGINE ---
const FireworksEngine = {
    canvasId: 'blueprint-fireworks',
    ctx: null, particles: [], animationId: null,

    init: function() {
        const canvas = document.getElementById(this.canvasId);
        if (!canvas) return;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },
    resize: function() {
        const canvas = document.getElementById(this.canvasId);
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    },
    launch: function(isBig = true) {
        const numParticles = isBig ? 150 : 50;
        const startX = window.innerWidth / 2;
        const startY = window.innerHeight / 2;

        for (let i = 0; i < numParticles; i++) {
            this.particles.push({
                x: startX, y: startY,
                vX: (Math.random() - 0.5) * (isBig ? 20 : 12),
                vY: (Math.random() - 0.5) * (isBig ? 20 : 12),
                alpha: 1, color: `hsl(${Math.random() * 360}, 100%, 60%)`,
                size: Math.random() * 4 + 2
            });
        }
        if (!this.animationId) this.animate();
    },
    animate: function() {
        const canvas = document.getElementById(this.canvasId);
        if (!canvas || !this.ctx) return;

        this.ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.particles.forEach((p) => {
            p.x += p.vX; p.y += p.vY;
            p.vY += 0.15; p.vX *= 0.98; p.alpha -= 0.015;
            this.ctx.globalAlpha = Math.max(0, p.alpha);
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.particles = this.particles.filter(p => p.alpha > 0);
        
        if (this.particles.length > 0) {
            this.animationId = requestAnimationFrame(() => this.animate());
        } else {
            this.animationId = null;
            this.ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
};
