/**
 * IncidentRoot - Logic Engine
 * Features: Time Attack (ms), Auto-Hint on 3 Misses, Progress Save, and more.
 */

let currentLvl = 0;
let cmd = "";
let cursorIdx = 0; 
let score = 0;
let history = [];
let historyIdx = -1;
let hintCount = 0;
let missCount = 0; // ミスカウント用
let startTime = 0; // レベル開始時間

const term = new Terminal({
    cursorBlink: true,
    fontSize: 16,
    fontFamily: '"JetBrains Mono", monospace',
    theme: { background: '#000000', foreground: '#ffffff', cursor: '#58a6ff' }
});

window.onload = function() {
    const container = document.getElementById('terminal-box');
    if (!container) return;
    term.open(container);
    container.addEventListener('click', () => term.focus());
    window.addEventListener('paste', (e) => {
        if (document.activeElement.closest('#terminal-box')) {
            const text = e.clipboardData.getData('text');
            insertText(text);
        }
    });

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
    
    missCount = 0; // ミスリセット
    startTime = performance.now(); // タイム計測開始 (ms)
    
    drawPrompt();
}

function skipStage() {
    if (confirm("Skip this incident? (Score will not increase)")) {
        nextStage();
    }
}

function drawPrompt() {
    term.write(`\r\n\x1b[1;32mroot@incident-root\x1b[0m:# `);
    cmd = ""; cursorIdx = 0;
}

term.onData(data => {
    switch (data) {
        case '\r': 
            term.write('\r\n');
            const finalCmd = cmd.trim();
            if (finalCmd) { history.push(finalCmd); historyIdx = history.length; }
            processCmd(finalCmd);
            if (document.getElementById('solution-article').style.display !== 'block') drawPrompt();
            break;
        case '\u007F': 
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
    
    // 正解判定
    if (input === s.solution || input === "sudo " + s.solution) {
        const endTime = performance.now();
        const timeTaken = (endTime - startTime) / 1000; // 秒に変換
        
        // スコア計算: 基本100点 + タイムボーナス(最大100点、30秒で0点になる計算)
        let timeBonus = Math.max(0, Math.floor(100 - (timeTaken * 3.33)));
        let stageScore = 100 + timeBonus;
        
        score += stageScore;
        document.getElementById('score').innerText = score;
        
        term.writeln(`\x1b[1;32m[OK] Resolved in ${timeTaken.toFixed(2)}s! (+${stageScore} pts)\x1b[0m`);
        showClear(s);
        return;
    }

    // ミス判定 (コマンドが存在しない、または解決しなかった場合)
    missCount++;
    if (missCount >= 3) {
        showHint(true); // 自動ヒント
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
    term.write(`${prefix} Hint revealed in the sidebar.`);
}

function showClear(s) {
    document.getElementById('article-content').innerHTML = s.article;
    document.getElementById('solution-article').style.display = 'block';
    setTimeout(() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }, 150);
}

function nextStage() {
    currentLvl++;
    if (currentLvl < stagesData.length) loadStage();
    else showResult();
}

function showResult() {
    const screen = document.getElementById('result-screen');
    const msg = document.getElementById('rank-msg');
    screen.style.display = 'flex';
    
    const clearedCount = score / 100; // ※ボーナスがあるため目安
    let rank = "Junior Ops";

    // ランク判定 (全問クリアが前提)
    if (currentLvl < stagesData.length) {
        rank = "Freelancer";
    } else {
        if (hintCount === 0 && score > 1500) rank = "God of SRE (Perfect & Fast)";
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
    const text = encodeURIComponent(`I am ranked as [${rank}] in IncidentRoot!\nScore: ${scoreVal}\n\nThink you can fix Linux incidents faster?\n`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=http://incident.f5.si`);
}
