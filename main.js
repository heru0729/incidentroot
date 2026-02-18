let currentLvl = 0;
let cmd = "";
let cursorIdx = 0; 
let score = 0;
let history = [];
let historyIdx = -1;
let hintCount = 0;
let missCount = 0;
let startTime = 0;
let timerInterval = null;
let hasSkipped = false;

const term = new Terminal({
    cursorBlink: true, fontSize: 16, fontFamily: '"JetBrains Mono", monospace',
    theme: { background: '#000000', foreground: '#ffffff', cursor: '#58a6ff' }
});
const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);

window.onload = function() {
    const container = document.getElementById('terminal-box');
    term.open(container);
    fitAddon.fit();
    window.addEventListener('resize', () => fitAddon.fit());
    container.addEventListener('click', () => term.focus());

    const savedLvl = localStorage.getItem('incident_root_lvl');
    if (savedLvl && savedLvl > 0) document.getElementById('resume-btn').classList.remove('hidden');
};

function startGame(isResume = false) {
    if (isResume) {
        currentLvl = parseInt(localStorage.getItem('incident_root_lvl')) || 0;
        score = parseInt(localStorage.getItem('incident_root_score')) || 0;
        hasSkipped = localStorage.getItem('incident_root_skipped') === 'true';
    } else {
        localStorage.clear();
        score = 0; currentLvl = 0; hasSkipped = false; hintCount = 0;
    }
    document.getElementById('start-screen').style.display = 'none';
    loadStage();
}

function loadStage() {
    if (currentLvl >= stagesData.length) { showResult(); return; }
    const s = stagesData[currentLvl];
    document.getElementById('lvl-idx').innerText = currentLvl + 1;
    document.getElementById('stg-title').innerText = s.title;
    document.getElementById('stg-desc').innerText = s.desc;
    document.getElementById('solution-article').style.display = 'none';
    document.getElementById('hint-area').classList.add('hidden');
    
    localStorage.setItem('incident_root_lvl', currentLvl);
    localStorage.setItem('incident_root_score', score);
    localStorage.setItem('incident_root_skipped', hasSkipped);

    term.clear();
    term.writeln(`\x1b[1;33m--- LEVEL ${currentLvl + 1}: ${s.title} ---\x1b[0m`);
    
    missCount = 0;
    startTime = performance.now();
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const now = (performance.now() - startTime) / 1000;
        document.getElementById('timer').innerText = now.toFixed(1);
    }, 100);

    drawPrompt();
    term.focus();
}

function skipStage() {
    if (confirm("Skip this incident? (High Rank will be disabled)")) {
        hasSkipped = true;
        clearInterval(timerInterval);
        nextStage();
    }
}

function drawPrompt() {
    term.write(`\r\n\x1b[1;32mroot@incident-root\x1b[0m:# `);
    cmd = ""; cursorIdx = 0;
}

term.onData(data => {
    switch (data) {
        case '\r': // Enter
            term.write('\r\n');
            const finalCmd = cmd.trim();
            if (finalCmd) { history.push(finalCmd); historyIdx = history.length; }
            processCmd(finalCmd);
            if (document.getElementById('solution-article').style.display !== 'block') drawPrompt();
            break;
        case '\u007F': // Backspace
            if (cursorIdx > 0) {
                cmd = cmd.slice(0, cursorIdx - 1) + cmd.slice(cursorIdx);
                cursorIdx--;
                term.write('\b\x1b[P');
            }
            break;
        case '\u001b[A': if (historyIdx > 0) { historyIdx--; replaceLine(history[historyIdx]); } break;
        case '\u001b[B': if (historyIdx < history.length - 1) { historyIdx++; replaceLine(history[historyIdx]); } else { historyIdx = history.length; replaceLine(""); } break;
        case '\u001b[D': if (cursorIdx > 0) { cursorIdx--; term.write(data); } break;
        case '\u001b[C': if (cursorIdx < cmd.length) { cursorIdx++; term.write(data); } break;
        default: if (data.charCodeAt(0) >= 32) insertText(data);
    }
});

function insertText(text) {
    const tail = cmd.slice(cursorIdx);
    cmd = cmd.slice(0, cursorIdx) + text + tail;
    term.write('\x1b[s' + text + tail + '\x1b[u'); 
    for (let i = 0; i < text.length; i++) { term.write('\x1b[C'); cursorIdx++; }
}

function replaceLine(newCmd) {
    while (cursorIdx > 0) { term.write('\b\x1b[P'); cursorIdx--; }
    term.write('\x1b[K'); cmd = newCmd; term.write(cmd); cursorIdx = cmd.length;
}

function processCmd(input) {
    if (input === "") return;
    const s = stagesData[currentLvl];
    if (input === s.solution || input === "sudo " + s.solution) {
        clearInterval(timerInterval);
        const endTime = performance.now();
        const timeTaken = (endTime - startTime) / 1000;
        let timeBonus = Math.max(0, Math.floor(100 - (timeTaken * 2)));
        let stageScore = 100 + timeBonus;
        score += stageScore;
        document.getElementById('score').innerText = score;
        term.writeln(`\x1b[1;32m[OK] Resolved in ${timeTaken.toFixed(2)}s! (+${stageScore} pts)\x1b[0m`);
        showClear(s);
        return;
    }
    missCount++;
    if (missCount >= 3) showHint(true);
    const args = input.split(" ");
    const base = args[0];
    const supported = ["ls", "cat", "chmod", "chown", "rm", "kill", "killall", "apt-get", "swapon", "modprobe", "echo", "ps", "dmesg", "help", "clear", "hint"];
    if (supported.includes(base)) {
        switch (base) {
            case "ls": term.write(Object.keys(s.fs).join("  ")); break;
            case "cat": term.write(s.fs[args[1]] || `cat: ${args[1] || ""}: No such file`); break;
            case "hint": showHint(false); break;
            case "clear": term.clear(); break;
            case "help": term.write("Commands: " + supported.join(", ")); break;
            case "ps": term.write("PID TTY TIME CMD\r\n 562 pts/0 00:00:05 " + (s.title.includes('Process') ? 'rogue_proc' : 'systemd')); break;
            default: term.write(`Executed '${base}', but issue remains.`); break;
        }
    } else { term.write(`sh: ${base}: command not found`); }
}

function showHint(isAuto = false) {
    const s = stagesData[currentLvl];
    if (!isAuto) hintCount++;
    document.getElementById('hint-text').innerText = s.hint;
    document.getElementById('hint-area').classList.remove('hidden');
    term.write(`\r\n\x1b[1;36m[INTEL] Hint revealed.\x1b[0m`);
}

function showClear(s) {
    document.getElementById('article-content').innerHTML = s.article;
    document.getElementById('solution-article').style.display = 'block';
}

function nextStage() {
    currentLvl++;
    loadStage();
}

function showResult() {
    clearInterval(timerInterval);
    const screen = document.getElementById('result-screen');
    const msg = document.getElementById('rank-msg');
    screen.style.display = 'flex';
    let rank = "Junior Ops";
    if (currentLvl < stagesData.length || hasSkipped) {
        rank = (score > 800) ? "Senior Technician" : "Field Engineer";
    } else {
        if (hintCount === 0 && score > 1600) rank = "God of SRE";
        else if (hintCount === 0) rank = "Legendary SRE";
        else if (hintCount < 4) rank = "Senior Engineer";
        else rank = "SysAdmin";
    }
    msg.innerText = rank;
    document.getElementById('final-score').innerText = score;
    localStorage.clear();
}

function shareX() {
    const rank = document.getElementById('rank-msg').innerText;
    const scoreVal = document.getElementById('final-score').innerText;
    const text = encodeURIComponent(`I am ranked as [${rank}] in IncidentRoot!\nScore: ${scoreVal}\n\nCan you solve 10 critical Linux incidents?\n#IncidentRoot #Linux`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=https://incident.f5.si`);
}
