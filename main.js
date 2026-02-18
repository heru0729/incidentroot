/**
 * IncidentRoot - Logic Engine
 * Domain: incident.f5.si
 */

let currentLvl = 0;
let cmd = "";
let cursorIdx = 0; 
let score = 0;
let history = [];
let historyIdx = -1;
let hintCount = 0;

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
        case '\u001b[A': 
            if (historyIdx > 0) { historyIdx--; replaceLine(history[historyIdx]); }
            break;
        case '\u001b[B': 
            if (historyIdx < history.length - 1) { historyIdx++; replaceLine(history[historyIdx]); }
            else { historyIdx = history.length; replaceLine(""); }
            break;
        case '\u001b[D': 
            if (cursorIdx > 0) { cursorIdx--; term.write(data); }
            break;
        case '\u001b[C': 
            if (cursorIdx < cmd.length) { cursorIdx++; term.write(data); }
            break;
        default:
            if (data.charCodeAt(0) >= 32) { insertText(data); }
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
    term.write('\x1b[K'); 
    cmd = newCmd;
    term.write(cmd);
    cursorIdx = cmd.length;
}

// 判定ロジック
function processCmd(input) {
    const s = stagesData[currentLvl];
    
    // 正解判定 (完全一致 or sudo付き)
    if (input === s.solution || input === "sudo " + s.solution) {
        score += 100;
        document.getElementById('score').innerText = score;
        term.writeln("\x1b[1;32m[OK] Task completed successfully.\x1b[0m");
        showClear(s);
        return;
    }

    const args = input.split(" ");
    const base = args[0];

    // 各レベルのクリアに必要なコマンドを網羅
    switch (base) {
        case "ls":
            term.write(Object.keys(s.fs).join("  "));
            break;
        case "cat":
            term.write(s.fs[args[1]] || `cat: ${args[1] || ""}: No such file`);
            break;
        case "chmod":
        case "chown":
        case "kill":
        case "killall":
        case "rm":
        case "apt-get":
        case "swapon":
        case "modprobe":
        case "echo":
            // これらは正解（s.solution）以外で打たれた場合、
            // 「実行はされたが解決はしていない」という体裁にする
            term.write(`Applied ${base} but the issue persists...`);
            break;
        case "hint":
            hintCount++;
            document.getElementById('hint-text').innerText = s.hint;
            document.getElementById('hint-area').classList.remove('hidden');
            term.write("\x1b[1;36m[INTEL] Hint revealed.\x1b[0m");
            break;
        case "help":
            term.write("Standard Linux commands are available (ls, cat, chmod, kill, etc.)");
            break;
        case "clear":
            term.clear();
            break;
        case "":
            break;
        default:
            term.write(`sh: ${base}: command not found`);
    }
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
    let rank = "Junior Ops";
    if (hintCount === 0) rank = "Legendary SRE";
    else if (hintCount < 3) rank = "Senior Engineer";
    else if (hintCount < 6) rank = "SysAdmin";
    msg.innerText = rank;
    document.getElementById('final-score').innerText = score;
}

function shareX() {
    const rank = document.getElementById('rank-msg').innerText;
    const scoreVal = document.getElementById('final-score').innerText;
    const text = encodeURIComponent(`I just cleared IncidentRoot!\nRank: ${rank}\nScore: ${scoreVal}\n\nCan you resolve all 10 Linux incidents?\n`);
    const url = encodeURIComponent("http://incident.f5.si");
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`);
}
