/**
 * IncidentRoot - Logic Engine (Full Version)
 * Domain: incident.f5.si
 */

let currentLvl = 0;
let cmd = "";
let cursorIdx = 0; 
let score = 0;
let history = [];
let historyIdx = -1;
let hintCount = 0;
let missCount = 0;
let startTime = 0;

// xterm.js と FitAddon の初期化
const term = new Terminal({
    cursorBlink: true,
    fontSize: 16,
    fontFamily: '"JetBrains Mono", monospace',
    theme: { background: '#000000', foreground: '#ffffff', cursor: '#58a6ff' }
});
const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);

window.onload = function() {
    const container = document.getElementById('terminal-box');
    if (!container) return;
    
    term.open(container);
    fitAddon.fit(); // 初回フィット

    // 画面リサイズ時にターミナルを再描画（スマホの回転やキーボード対応）
    window.addEventListener('resize', () => {
        fitAddon.fit();
    });

    container.addEventListener('click', () => term.focus());

    // クリップボード貼り付け
    window.addEventListener('paste', (e) => {
        if (document.activeElement.closest('#terminal-box')) {
            const text = e.clipboardData.getData('text');
            insertText(text);
        }
    });

    // 進捗の読み込み
    const savedLvl = localStorage.getItem('incident_root_lvl');
    if (savedLvl && savedLvl > 0) {
        document.getElementById('resume-btn').classList.remove('hidden');
    }
};

function startGame(isResume = false) {
    if (isResume) {
        currentLvl = parseInt(localStorage.getItem('incident_root_lvl')) || 0;
        score = parseInt(localStorage.getItem('incident_root_score')) || 0;
        document.getElementById('score').innerText = score;
    } else {
        localStorage.clear();
        score = 0;
        currentLvl = 0;
    }
    document.getElementById('start-screen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('start-screen').style.display = 'none';
        loadStage();
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
    
    // 進捗保存
    localStorage.setItem('incident_root_lvl', currentLvl);
    localStorage.setItem('incident_root_score', score);

    term.clear();
    term.writeln(`\x1b[1;33m--- LEVEL ${currentLvl + 1}: ${s.title} ---\x1b[0m`);
    term.writeln(`Mission: ${s.desc}`);
    
    missCount = 0;
    startTime = performance.now(); // タイム計測開始
    
    drawPrompt();
}

function skipStage() {
    if (confirm("Skip this incident? (No score bonus will be added)")) {
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
            if (finalCmd) {
                history.push(finalCmd);
                historyIdx = history.length;
            }
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

        case '\u001b[A': // Up (History)
            if (historyIdx > 0) { historyIdx--; replaceLine(history[historyIdx]); }
            break;

        case '\u001b[B': // Down (History)
            if (historyIdx < history.length - 1) { historyIdx++; replaceLine(history[historyIdx]); }
            else { historyIdx = history.length; replaceLine(""); }
            break;

        case '\u001b[D': // Left
            if (cursorIdx > 0) { cursorIdx--; term.write(data); }
            break;

        case '\u001b[C': // Right
            if (cursorIdx < cmd.length) { cursorIdx++; term.write(data); }
            break;

        default: // Normal Input
            if (data.charCodeAt(0) >= 32) insertText(data);
    }
});

function insertText(text) {
    const tail = cmd.slice(cursorIdx);
    cmd = cmd.slice(0, cursorIdx) + text + tail;
    term.write('\x1b[s' + text + tail + '\x1b[u'); 
    for (let i = 0; i < text.length; i++) {
        term.write('\x1b[C');
        cursorIdx++;
    }
}

function replaceLine(newCmd) {
    while (cursorIdx > 0) { term.write('\b\x1b[P'); cursorIdx--; }
    term.write('\x1b[K');
    cmd = newCmd;
    term.write(cmd);
    cursorIdx = cmd.length;
}

function processCmd(input) {
    if (input === "") return;
    const s = stagesData[currentLvl];
    
    // 正解判定 (Exact match or sudo)
    if (input === s.solution || input === "sudo " + s.solution) {
        const endTime = performance.now();
        const timeTaken = (endTime - startTime) / 1000;
        
        // タイムボーナス計算
        let timeBonus = Math.max(0, Math.floor(100 - (timeTaken * 3.33)));
        let stageScore = 100 + timeBonus;
        
        score += stageScore;
        document.getElementById('score').innerText = score;
        
        term.writeln(`\x1b[1;32m[OK] Resolved in ${timeTaken.toFixed(2)}s! (+${stageScore} pts)\x1b[0m`);
        showClear(s);
        return;
    }

    // ミス判定（自動ヒント）
    missCount++;
    if (missCount >= 3) {
        showHint(true);
    }

    const args = input.split(" ");
    const base = args[0];
    const supported = ["ls", "cat", "chmod", "chown", "rm", "kill", "killall", "apt-get", "swapon", "modprobe", "echo", "ps", "dmesg", "help", "clear", "hint"];

    if (supported.includes(base)) {
        switch (base) {
            case "ls": term.write(Object.keys(s.fs).join("  ")); break;
            case "cat": term.write(s.fs[args[1]] || `cat: ${args[1] || ""}: No such file`); break;
            case "hint": showHint(false); break;
            case "clear": term.clear(); break;
            case "help": term.write("Standard Linux commands: " + supported.join(", ")); break;
            case "ps": term.write("PID TTY          TIME CMD\r\n 124 pts/0    00:00:00 bash\r\n 562 pts/0    00:00:05 " + (s.title.includes('Process') ? 'rogue_proc' : 'systemd')); break;
            default: term.write(`Executed '${base}', but the issue persists.`); break;
        }
    } else {
        term.write(`sh: ${base}: command not found`);
    }
}

function showHint(isAuto = false) {
    const s = stagesData[currentLvl];
    hintCount++;
    document.getElementById('hint-text').innerText = s.hint;
    document.getElementById('hint-area').classList.remove('hidden');
    const prefix = isAuto ? "\x1b[1;33m[AUTO-HINT]\x1b[0m" : "\x1b[1;36m[INTEL]\x1b[0m";
    term.write(`${prefix} Analysis complete. Check the sidebar for intel.`);
}

function showClear(s) {
    document.getElementById('article-content').innerHTML = s.article;
    document.getElementById('solution-article').style.display = 'block';
    // スマホだとスクロールが重要
    setTimeout(() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }, 150);
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
    
    // スコアから逆算してクリア数を出す（スキップ判定用）
    // 実際には1ステージ最低100点なので score/100 だが、
    // currentLvlがインデックスなのでこれを使う
    let rank = "Junior Ops";

    if (currentLvl < stagesData.length) {
        rank = (currentLvl === 0) ? "Quitter" : "Freelancer";
    } else {
        if (hintCount === 0 && score > 1500) rank = "God of SRE (Perfect & Fast)";
        else if (hintCount === 0) rank = "Legendary SRE";
        else if (hintCount < 4) rank = "Senior Engineer";
        else rank = "SysAdmin";
    }

    msg.innerText = rank;
    document.getElementById('final-score').innerText = score;
    localStorage.clear(); // 完遂したらリセット
}

function shareX() {
    const rank = document.getElementById('rank-msg').innerText;
    const scoreVal = document.getElementById('final-score').innerText;
    const text = encodeURIComponent(`I am ranked as [${rank}] in IncidentRoot!\nScore: ${scoreVal}\n\nCan you solve these 10 Linux incidents?\n`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=https://incident.f5.si`);
}
