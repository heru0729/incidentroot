/**
 * IncidentRoot - Logic Engine
 * Features: Terminal Emulation, History, Hint, Result Tracking, Clipboard Support
 */

let currentLvl = 0;
let cmd = "";
let score = 0;
let history = [];
let historyIdx = -1;
let hintCount = 0;

// 1. Terminal Instance Initializing
const term = new Terminal({
    cursorBlink: true,
    fontSize: 16,
    fontFamily: '"JetBrains Mono", "Courier New", monospace',
    theme: { 
        background: '#000000', 
        foreground: '#ffffff',
        cursor: '#58a6ff',
        selectionBackground: 'rgba(88, 166, 255, 0.3)'
    }
});

// 2. Lifecycle Handlers
window.onload = function() {
    const container = document.getElementById('terminal-box');
    if (!container) return;

    term.open(container);
    
    // Auto-focus on terminal when clicking the box
    container.addEventListener('click', () => term.focus());

    // --- Clipboard Support ---
    // Handle Browser-level Paste Event
    window.addEventListener('paste', (e) => {
        if (document.activeElement.closest('#terminal-box')) {
            const text = e.clipboardData.getData('text');
            handleInputString(text);
        }
    });

    // Check if stagesData is loaded from data/stages.js
    if (typeof stagesData === 'undefined') {
        term.writeln("\x1b[1;31mError: stagesData not found. Make sure data/stages.js is loaded.\x1b[0m");
    }
};

// Start Button logic
function startGame() {
    const startScreen = document.getElementById('start-screen');
    startScreen.style.opacity = '0';
    setTimeout(() => {
        startScreen.style.display = 'none';
        loadStage();
        term.focus();
    }, 500);
}

// 3. Stage Controller
function loadStage() {
    const s = stagesData[currentLvl];
    document.getElementById('lvl-idx').innerText = currentLvl + 1;
    document.getElementById('stg-title').innerText = s.title;
    document.getElementById('stg-desc').innerText = s.desc;
    document.getElementById('solution-article').style.display = 'none';
    document.getElementById('hint-area').classList.add('hidden');
    
    term.clear();
    term.writeln(`\x1b[1;33m--- LEVEL ${currentLvl + 1}: ${s.title} ---\x1b[0m`);
    term.writeln(`Mission: ${s.desc}`);
    drawPrompt();
}

function drawPrompt() {
    term.write(`\r\n\x1b[1;32mroot@incident-root\x1b[0m:# `);
}

// 4. Input Handlers
term.onData(data => {
    switch (data) {
        case '\r': // Enter
            const input = cmd.trim();
            if (input) {
                history.push(input);
                historyIdx = history.length;
            }
            processCmd(input);
            cmd = "";
            if (document.getElementById('solution-article').style.display !== 'block') {
                drawPrompt();
            }
            break;

        case '\u007F': // Backspace
            if (cmd.length > 0) {
                cmd = cmd.slice(0, -1);
                term.write('\b \b');
            }
            break;

        case '\u001b[A': // Up Arrow (History)
            if (historyIdx > 0) {
                historyIdx--;
                replaceCurrentLine(history[historyIdx]);
            }
            break;

        case '\u001b[B': // Down Arrow (History)
            if (historyIdx < history.length - 1) {
                historyIdx++;
                replaceCurrentLine(history[historyIdx]);
            } else {
                historyIdx = history.length;
                replaceCurrentLine("");
            }
            break;

        default: // Normal Character Input
            // Ignore control characters like Esc
            if (data.charCodeAt(0) >= 32) {
                handleInputString(data);
            }
    }
});

// Helper for single char or pasted string
function handleInputString(str) {
    cmd += str;
    term.write(str);
}

// Helper to replace line for History (Up/Down)
function replaceCurrentLine(newCmd) {
    for (let i = 0; i < cmd.length; i++) {
        term.write('\b \b');
    }
    cmd = newCmd;
    term.write(cmd);
}

// 5. Command Logic
function processCmd(input) {
    term.write("\r\n");
    const s = stagesData[currentLvl];

    // Check Solution (Support both direct and sudo)
    if (input === s.solution || input === "sudo " + s.solution) {
        score += 100;
        document.getElementById('score').innerText = score;
        term.writeln("\x1b[1;32m[OK] Resolution Confirmed.\x1b[0m");
        showClear(s);
        return;
    }

    const args = input.split(" ");
    const baseCmd = args[0];

    switch (baseCmd) {
        case "ls":
            if (s.fs) term.write(Object.keys(s.fs).join("  "));
            break;
        case "cat":
            const file = args[1];
            if (s.fs && s.fs[file]) {
                term.write(s.fs[file]);
            } else {
                term.write(`cat: ${file || ""}: No such file or directory`);
            }
            break;
        case "hint":
            hintCount++;
            document.getElementById('hint-text').innerText = s.hint;
            document.getElementById('hint-area').classList.remove('hidden');
            term.write("\x1b[1;36mHint revealed in sidebar.\x1b[0m");
            break;
        case "help":
            term.write("Available commands: ls, cat [file], hint, clear");
            break;
        case "clear":
            term.clear();
            break;
        case "":
            break;
        default:
            term.write(`sh: ${baseCmd}: command not found`);
    }
}

// 6. UI & Navigation
function showClear(s) {
    const article = document.getElementById('solution-article');
    document.getElementById('article-content').innerHTML = s.article;
    article.style.display = 'block';
    
    // Auto scroll to article
    setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
}

function nextStage() {
    currentLvl++;
    if (currentLvl < stagesData.length) {
        loadStage();
    } else {
        showResult();
    }
}

function showResult() {
    const screen = document.getElementById('result-screen');
    const msg = document.getElementById('rank-msg');
    screen.style.display = 'flex';
    
    // Rank Logic
    let rank = "Junior Ops";
    if (hintCount === 0) rank = "Legendary SRE";
    else if (hintCount < 3) rank = "Senior Engineer";
    else if (hintCount < 6) rank = "System Administrator";

    msg.innerText = rank;
    document.getElementById('final-score').innerText = score;
}

function shareX() {
    const rank = document.getElementById('rank-msg').innerText;
    const text = encodeURIComponent(`IncidentRootをクリアしました！\nランク: ${rank}\nスコア: ${score}\n#IncidentRoot #Linux #エンジニアゲーム`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`);
}