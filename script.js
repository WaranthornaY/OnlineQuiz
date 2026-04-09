const students = { "student1": "Student_1", "student2": "Student_2", "student3": "Student_3" };
const adminCreds = { "user": "admin", "pass": "Admin123456" };
const teacherCreds = { "user": "teacher", "pass": "Teacher123456" };
const PASS_RATE = 0.7;

let defaultQuestions = [{ q: "10 + 10?", a: [{ t: "20", c: true }, { t: "10", c: false }] }];
let shuffled, currentIdx, score, activeUser;

function hideAll() {
    ['login-container', 'menu-container', 'teacher-panel', 'admin-panel', 'quiz-container'].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).classList.add('hide');
    });
    document.getElementById('certificate-template').style.display = 'none';
}

// LOGIN
document.getElementById('login-btn').onclick = () => {
    const user = document.getElementById('username').value, pass = document.getElementById('password').value;
    if (user === teacherCreds.user && pass === teacherCreds.pass) { hideAll(); document.getElementById('teacher-panel').classList.remove('hide'); renderTeacherQuestions(); }
    else if (user === adminCreds.user && pass === adminCreds.pass) { hideAll(); document.getElementById('admin-panel').classList.remove('hide'); renderAdminScores(); }
    else if (students[user] && students[user] === pass) { activeUser = user; hideAll(); document.getElementById('menu-container').classList.remove('hide'); document.getElementById('menu-welcome').innerText = `Hello, ${activeUser}`; }
    else document.getElementById('error-msg').classList.remove('hide');
};

// TEACHER
document.getElementById('add-question-btn').onclick = () => {
    const q = document.getElementById('new-question').value, a1 = document.getElementById('ans-1').value, a2 = document.getElementById('ans-2').value;
    const c1 = document.getElementById('check-1').checked, c2 = document.getElementById('check-2').checked;
    if (!q || !a1 || !a2 || (!c1 && !c2)) return alert("Fill all!");
    let custom = JSON.parse(localStorage.getItem('custom_questions')) || [...defaultQuestions];
    custom.push({ q, a: [{ t: a1, c: c1 }, { t: a2, c: c2 }] });
    localStorage.setItem('custom_questions', JSON.stringify(custom)); renderTeacherQuestions();
};

function renderTeacherQuestions() {
    const list = document.getElementById('teacher-question-list');
    let data = JSON.parse(localStorage.getItem('custom_questions')) || defaultQuestions;
    list.innerHTML = data.map((item, i) => `<li>${item.q} <button onclick="delQ(${i})" style="color:red; background:none;">[X]</button></li>`).join('');
}
window.delQ = (i) => {
    let data = JSON.parse(localStorage.getItem('custom_questions')) || defaultQuestions;
    data.splice(i, 1); localStorage.setItem('custom_questions', JSON.stringify(data)); renderTeacherQuestions();
};

// ADMIN
function renderAdminScores() {
    const list = document.getElementById('admin-score-list'); list.innerHTML = "";
    let data = JSON.parse(localStorage.getItem('quiz_scores')) || [];
    const groups = {};
    data.forEach((item, index) => {
        if (!groups[item.user]) groups[item.user] = { best: item, bestIdx: index, all: [] };
        groups[item.user].all.push(item);
        if (item.score > groups[item.user].best.score) { groups[item.user].best = item; groups[item.user].bestIdx = index; }
    });
    Object.keys(groups).forEach(user => {
        const g = groups[user];
        const historyHTML = g.all.map(s => `<div>${s.date}: ${s.score}/${s.total}</div>`).join('');
        list.innerHTML += `<li class="admin-row"><div class="tooltip-wrap"><b>${user}</b>: <span contenteditable="true" class="edit-score" id="edit-${g.bestIdx}">${g.best.score}</span>/${g.best.total}<div class="admin-tooltip">${historyHTML}</div></div>
            <div><button onclick="saveEdit(${g.bestIdx})" style="background:#28a745; font-size:10px;">Save</button><button onclick="delScore(${g.bestIdx})" style="color:red; background:none; font-size:10px;">Del</button></div></li>`;
    });
}
window.saveEdit = (i) => {
    let data = JSON.parse(localStorage.getItem('quiz_scores'));
    data[i].score = parseInt(document.getElementById(`edit-${i}`).innerText) || 0;
    localStorage.setItem('quiz_scores', JSON.stringify(data)); renderAdminScores();
};
window.delScore = (i) => {
    let data = JSON.parse(localStorage.getItem('quiz_scores'));
    data.splice(i, 1); localStorage.setItem('quiz_scores', JSON.stringify(data)); renderAdminScores();
};
document.getElementById('delete-all-btn').onclick = () => { if(prompt("Admin Pass:") === adminCreds.pass) { localStorage.removeItem('quiz_scores'); renderAdminScores(); } };

// QUIZ
document.getElementById('start-quiz-btn').onclick = () => { hideAll(); document.getElementById('quiz-container').classList.remove('hide'); startQuiz(); };
document.getElementById('view-scores-btn').onclick = () => { hideAll(); document.getElementById('quiz-container').classList.remove('hide'); showUserHistory(); };
document.getElementById('back-to-menu').onclick = () => { hideAll(); document.getElementById('menu-container').classList.remove('hide'); };

function startQuiz() {
    shuffled = (JSON.parse(localStorage.getItem('custom_questions')) || defaultQuestions).sort(() => Math.random() - 0.5);
    currentIdx = 0; score = 0;
    document.getElementById('history-section').classList.add('hide');
    showQuestion();
}

function showQuestion() {
    document.getElementById('next-btn').classList.add('hide');
    document.getElementById('finish-btn').classList.add('hide');
    document.getElementById('answer-buttons').innerHTML = "";
    let q = shuffled[currentIdx];
    document.getElementById('question-header').innerText = q.q;
    q.a.forEach(ans => {
        const btn = document.createElement('button'); btn.innerText = ans.t;
        btn.onclick = () => {
            btn.style.backgroundColor = ans.c ? "#90ee90" : "#ffcccb"; if (ans.c) score++;
            Array.from(document.getElementById('answer-buttons').children).forEach(b => b.disabled = true);
            if (shuffled.length > currentIdx + 1) document.getElementById('next-btn').classList.remove('hide');
            else document.getElementById('finish-btn').classList.remove('hide');
        };
        document.getElementById('answer-buttons').appendChild(btn);
    });
}
document.getElementById('next-btn').onclick = () => { currentIdx++; showQuestion(); };

document.getElementById('finish-btn').onclick = () => {
    document.getElementById('finish-btn').classList.add('hide');
    let history = JSON.parse(localStorage.getItem('quiz_scores')) || [];
    history.push({ user: activeUser, score, total: shuffled.length, date: new Date().toLocaleDateString() });
    localStorage.setItem('quiz_scores', JSON.stringify(history)); showUserHistory();
};

function showUserHistory() {
    const list = document.getElementById('user-score-list'), dl = document.getElementById('cert-download-area');
    list.innerHTML = ""; dl.innerHTML = "";
    let data = (JSON.parse(localStorage.getItem('quiz_scores')) || []).filter(i => i.user === activeUser);
    data.forEach(i => {
        const pass = (i.score/i.total) >= PASS_RATE;
        list.innerHTML += `<li>${i.date}: ${i.score}/${i.total} ${pass ? '✅' : '❌'} ${pass ? `<button onclick='previewCert(${JSON.stringify(i)})' class='small-btn' style='background:#d4af37; color:black;'>View Cert</button>` : ""}</li>`;
    });
    document.getElementById('history-section').classList.remove('hide');
}

window.previewCert = (data) => {
    const el = document.getElementById('certificate-template');
    document.getElementById('cert-name').innerText = activeUser.toUpperCase();
    document.getElementById('cert-score').innerText = `Score: ${data.score} / ${data.total}`;
    document.getElementById('cert-date').innerText = data.date;
    el.style.display = 'block';
    document.getElementById('cert-download-area').innerHTML = `<button class='cert-btn' onclick='downloadPDF("${activeUser}")'>📥 Download PDF Now</button>`;
};

window.downloadPDF = (name) => {
    const el = document.getElementById('cert-capture');
    const opt = { 
        margin: 0, 
        filename: `${name}_Cert.pdf`, 
        jsPDF: { orientation: 'landscape', format: 'a4' }, 
        html2canvas: { 
            scale: 3, 
            useCORS: true, 
            allowTaint: true 
        } 
    };
    html2pdf().from(el).set(opt).save();
};
