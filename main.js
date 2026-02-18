/**
 * IncidentRoot - Main Logic Engine
 * Domain: incident.f5.si
 */

let currentLvl = 0;
let cmd = "";
let cursorIdx = 0; // Current cursor position within the cmd string
let score = 0;
let history = [];
let historyIdx = -1;
let hintCount = 0;

// Initialize Terminal
const term = new Terminal({
    cursorBlink: true,
    fontSize: 16,
    fontFamily: '"JetBrains Mono", monospace',
    theme: { 
        background: '#000000', 
        foreground: '#ffffff',
        cursor: '#58a6ff' 
    }
});

window.onload = function() {
    const container = document.getElementById('terminal-box');
    if (!container) return;
    term.open(container);
    container.addEventListener('click', () => term.focus());

    // Clipboard Support
    window.addEventListener('paste', (e) => {
        if (document.activeElement.closest('#terminal-box')) {
            const text = e.clipboardData.getData('text');
            insertText(text);
        }
    });

    if (typeof stagesData !== 'undefined') loadStage();
};

function startGame() {
    document.getElementById('start-screen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('start-screen').style.display = 'none';
        term.focus();
    }, 500);
}

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
    cmd = "";
    cursorIdx = 0;
}

// Input Handling with Arrow Key support
term.onData(data => {
    switch (data) {
        case '\r': // Enter
            term.write('\r\n');
            const finalCmd = cmd.trim();
            if (finalCmd) {
                history.push(finalCmd);
                historyIdx = history.length;
            }
            processCmd(finalCmd);
            if (document.getElementById('solution-article').style.display !== 'block') drawPrompt();
            break;

        case '\u007F': // Backspace
            if (cursorIdx > 0) {
                // Remove character at cursorIdx - 1
                cmd = cmd.slice(0, cursorIdx - 1) + cmd.slice(cursorIdx);
                cursorIdx--;
                term.write('\b\x1b[P'); // Move back and delete character
            }
            break;

        case '\u001b[A': // Up Arrow (History)
            if (historyIdx > 0) {
                historyIdx--;
                replaceLine(history[historyIdx]);
            }
            break;

        case '\u001b[B': // Down Arrow (History)
            if (historyIdx < history.length - 1) {
                historyIdx++;
                replaceLine(history[historyIdx]);
            } else {
                historyIdx = history.length;
                replaceLine("");
            }
            break;

        case '\u001b[D': // Left Arrow
            if (cursorIdx > 0) {
                cursorIdx--;
                term.write(data);
            }
            break;

        case '\u001b[C': // Right Arrow
            if (cursorIdx < cmd.length) {
                cursorIdx++;
                term.write(data);
            }
            break;

        default: // Normal Character Input
            if (data.charCodeAt(0) >= 32) {
                insertText(data);
            }
    }
});

/**
 * Inserts text at the current cursor position and updates display
 */
function insertText(text) {
    const tail = cmd.slice(cursorIdx);
    cmd = cmd.slice(0, cursorIdx) + text + tail;
    
    term.write('\x1b[s'); // Save cursor position
    term.write(text + tail); // Write new text and remaining tail
    term.write('\x1b[u'); // Restore cursor position
    
    // Move cursor forward by text length
    for (let i = 0; i < text.length; i++) {
        term.write('\x1b[C');
        cursorIdx++;
    }
}

/**
 * Replaces the entire current line (used for history)
 */
function replaceLine(newCmd) {
    // Clear line from current cursor to start
    while (cursorIdx > 0) {
        term.write('\b\x1b[P');
        cursorIdx--;
    }
    // Ensure rest of line is clear
    term.write('\x1b[K'); 
    cmd = newCmd;
    term.write(cmd);
    cursorIdx = cmd.length;
}

function processCmd(input) {
    const s = stagesData[currentLvl];
    
    // Exact match or sudo match
    if (input === s.solution || input === "sudo " + s.solution) {
        score += 100;
        document.getElementById('score').innerText = score;
        term.writeln("\x1b[1;32m[OK] System Status: STABLE\x1b[0m");
        showClear(s);
        return;
    }

    const args = input.split(" ");
    switch (args[0]) {
        case "ls":
            term.write(Object.keys(s.fs).join("  "));
            break;
        case "cat":
            term.write(s.fs[args[1]] || `cat: ${args[1] || ""}: No such file`);
            break;
        case "hint":
            hintCount++;
            document.getElementById('hint-text').innerText = s.hint;
            document.getElementById('hint-area').classList.remove('hidden');
            term.write("\x1b[1;36m[SYSTEM] Hint provided in the intelligence panel.\x1b[0m");
            break;
        case "clear":
            term.clear();
            break;
        case "help":
            term.write("Available: ls, cat [file], hint, clear");
            break;
        case "":
            break;
        default:
            term.write(`sh: ${args[0]}: command not found`);
    }
}

function showClear(s) {
    document.getElementById('article-content').innerHTML = s.article;
    document.getElementById('solution-article').style.display = 'block';
    setTimeout(() => { 
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); 
    }, 150);
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
    
    let rank = "Junior Ops";
    if (hintCount === 0) rank = "Legendary SRE";
    else if (hintCount < 3) rank = "Senior Engineer";
    else if (hintCount < 6) rank = "SysAdmin";

    msg.innerText = rank;
    document.getElementById('final-score').innerText = score;
}

// Twitter (X) Share function in English
function shareX() {
    const rank = document.getElementById('rank-msg').innerText;
    const scoreVal = document.getElementById('final-score').innerText;
    const text = encodeURIComponent(
        `I just cleared IncidentRoot!\n` +
        `Rank: ${rank}\n` +
        `Final Score: ${scoreVal}\n\n` +
        `Can you resolve all 10 Linux incidents?\n`
    );
    const url = encodeURIComponent("http://incident.f5.si");
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`);
}
