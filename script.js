import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, onSnapshot, writeBatch, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCmgXIu6snhLCYQz8b_aSGVQc99zg17MjE",
    authDomain: "onlinequiz-197c0.firebaseapp.com",
    projectId: "onlinequiz-197c0",
    storageBucket: "onlinequiz-197c0.appspot.com",
    messagingSenderId: "287222056808",
    appId: "1:287222056808:web:39ee1f2582eb55485938dd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let activeUser = "", currentQuestions = [], shuffled = [], currentIdx = 0, score = 0, timerInterval;

const show = (id) => {
    ['login-container', 'signup-container', 'menu-container', 'teacher-panel', 'admin-panel', 'quiz-container'].forEach(p => document.getElementById(p).classList.add('hide'));
    document.getElementById(id).classList.remove('hide');
};

// --- AUTH ---
document.getElementById('login-btn').onclick = async () => {
    const u = document.getElementById('username').value.trim().toLowerCase();
    const p = document.getElementById('password').value;
    if (u === "teacher" && p === "Teacher123") return show('teacher-panel');
    if (u === "admin" && p === "Admin123") { renderAdmin(); return show('admin-panel'); }
    try {
        const snap = await getDoc(doc(db, "users", u));
        if (snap.exists() && snap.data().password === p) {
            activeUser = u; document.getElementById('menu-welcome').innerText = "Student: " + u; show('menu-container');
        } else alert("Invalid Login");
    } catch(e) { alert("Error connecting to DB"); }
};

document.getElementById('go-to-signup').onclick = () => show('signup-container');
document.getElementById('back-to-login').onclick = () => show('login-container');
document.getElementById('signup-submit-btn').onclick = async () => {
    const u = document.getElementById('new-username').value.trim().toLowerCase();
    const p = document.getElementById('new-password').value;
    if (!u || !p) return alert("Fill all fields");
    await setDoc(doc(db, "users", u), { password: p });
    alert("Registered!"); show('login-container');
};

// --- TEACHER AUTO-LOAD & DELETE ---
document.getElementById('room-code-input').oninput = async (e) => {
    const code = e.target.value.trim();
    if (code.length < 1) { currentQuestions = []; renderTeacherQuestions(); return; }
    const snap = await getDoc(doc(db, "quizzes", code));
    currentQuestions = snap.exists() ? (snap.data().questions || []) : [];
    renderTeacherQuestions();
};

async function renderTeacherQuestions() {
    const list = document.getElementById('t-q-list');
    const code = document.getElementById('room-code-input').value.trim();
    list.innerHTML = currentQuestions.length ? "" : "<p style='font-size:11px; color:#999'>No questions yet.</p>";
    
    currentQuestions.forEach((q, index) => {
        const item = document.createElement('div');
        item.className = "t-q-item";
        item.innerHTML = `<span>${index + 1}. ${q.q}</span> <button class="del-btn">Delete</button>`;
        item.querySelector('.del-btn').onclick = async () => {
            currentQuestions.splice(index, 1);
            if (code) await setDoc(doc(db, "quizzes", code), { questions: currentQuestions }, { merge: true });
            renderTeacherQuestions();
        };
        list.appendChild(item);
    });
}

document.getElementById('add-choice-btn').onclick = () => {
    const row = document.createElement('div'); row.className = "choice-row";
    row.innerHTML = `<input type="checkbox" class="c-check"><input type="text" class="c-text" placeholder="Choice"><button onclick="this.parentElement.remove()" style="width:25px;background:red;padding:0">x</button>`;
    document.getElementById('choices-area').appendChild(row);
};

document.getElementById('save-q-btn').onclick = async () => {
    const code = document.getElementById('room-code-input').value.trim();
    const qText = document.getElementById('main-q-input').value.trim();
    if (!code || !qText) return alert("Enter Code and Question");
    let opts = [];
    document.querySelectorAll('.choice-row').forEach(r => {
        const t = r.querySelector('.c-text').value.trim();
        if (t) opts.push({ t, c: r.querySelector('.c-check').checked });
    });
    currentQuestions.push({ q: qText, a: opts });
    await setDoc(doc(db, "quizzes", code), { questions: currentQuestions }, { merge: true });
    document.getElementById('main-q-input').value = "";
    renderTeacherQuestions();
};

document.getElementById('toggle-live-btn').onclick = async () => {
    const code = document.getElementById('room-code-input').value.trim();
    const status = document.getElementById('room-status-text');
    const isNowLive = status.innerText === "OFFLINE";
    await setDoc(doc(db, "quizzes", code), { active: isNowLive, students: [] }, { merge: true });
    status.innerText = isNowLive ? "LIVE" : "OFFLINE";
    status.style.color = isNowLive ? "green" : "red";
    document.getElementById('toggle-live-btn').innerText = isNowLive ? "Stop" : "Go Live";
    if (isNowLive) {
        document.getElementById('student-lobby').classList.remove('hide');
        onSnapshot(doc(db, "quizzes", code), (s) => {
            const studs = s.data().students || [];
            document.getElementById('lobby-list').innerText = studs.join(", ") || "Waiting...";
        });
    }
};

// --- QUIZ ENGINE ---
document.getElementById('start-quiz-btn').onclick = async () => {
    const code = prompt("Room Code:");
    if (!code) return;
    const snap = await getDoc(doc(db, "quizzes", code));
    if (!snap.exists() || !snap.data().active) return alert("Room Offline");
    
    let students = snap.data().students || [];
    if (!students.includes(activeUser)) {
        students.push(activeUser);
        await setDoc(doc(db, "quizzes", code), { students }, { merge: true });
    }

    shuffled = (snap.data().questions || []).sort(() => Math.random() - 0.5);
    currentIdx = 0; score = 0; show('quiz-container');
    document.getElementById('post-quiz').classList.add('hide');
    startTimer(60); showQuestion();
};

function startTimer(t) {
    let left = t;
    document.getElementById('quiz-timer-bar').classList.remove('hide');
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        left--;
        document.getElementById('timer-text').innerText = left + "s";
        document.getElementById('timer-progress').style.width = (left/t*100) + "%";
        if (left <= 0) { clearInterval(timerInterval); finish(); }
    }, 1000);
}

function showQuestion() {
    const q = shuffled[currentIdx];
    document.getElementById('q-header').innerText = q.q;
    const box = document.getElementById('ans-box'); box.innerHTML = "";
    q.a.forEach(ans => {
        const b = document.createElement('button'); b.innerText = ans.t;
        b.onclick = () => {
            if (ans.c) score++;
            b.style.background = ans.c ? "#2ecc71" : "#e74c3c";
            Array.from(box.children).forEach(btn => btn.disabled = true);
            if (currentIdx < shuffled.length - 1) document.getElementById('next-btn').classList.remove('hide');
            else document.getElementById('finish-btn').classList.remove('hide');
        };
        box.appendChild(b);
    });
}

document.getElementById('next-btn').onclick = () => {
    currentIdx++; document.getElementById('next-btn').classList.add('hide'); showQuestion();
};

const finish = async () => {
    clearInterval(timerInterval);
    const pct = Math.round((score / (shuffled.length || 1)) * 100);
    const now = new Date();
    const timeStr = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');
    
    await setDoc(doc(db, "results", activeUser + "_" + Date.now()), { 
        user: activeUser, pct, date: now.toLocaleDateString(), time: timeStr, ts: Date.now() 
    });
    
    document.getElementById('q-header').innerText = "Done!";
    document.getElementById('ans-box').innerHTML = `<h3>You got ${pct}%</h3>`;
    document.getElementById('finish-btn').classList.add('hide');
    if (pct >= 80) document.getElementById('ans-box').innerHTML += `<button onclick="window.dlPdf(${pct})">Download Cert</button>`;
    document.getElementById('post-quiz').classList.remove('hide');
};
document.getElementById('finish-btn').onclick = finish;

// --- ADMIN (Score Right + Time) ---
async function renderAdmin() {
    const snap = await getDocs(collection(db, "results"));
    const grouped = {};
    snap.forEach(d => { const r = d.data(); if(!grouped[r.user]) grouped[r.user] = []; grouped[r.user].push(r); });
    const box = document.getElementById('admin-score-list'); box.innerHTML = "";
    
    Object.keys(grouped).forEach(u => {
        const best = Math.max(...grouped[u].map(x=>x.pct));
        const item = document.createElement('div'); item.className="admin-item";
        item.innerHTML = `
            <span class="admin-name">${u.toUpperCase()}</span> 
            <span class="admin-score">${best}%</span>
            <div class="tooltip">
                <strong>Full History:</strong><hr>
                ${grouped[u].map(x=>`<div>${x.date} ${x.time || ''} - ${x.pct}%</div>`).join('')}
            </div>`;
        box.appendChild(item);
    });
}

document.getElementById('export-btn').onclick = async () => {
    const snap = await getDocs(collection(db, "results"));
    const data = snap.docs.map(d => d.data());
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scores"); XLSX.writeFile(wb, "Report.xlsx");
};

window.dlPdf = (pct) => {
    document.getElementById('pdf-name').innerText = activeUser.toUpperCase();
    document.getElementById('pdf-score').innerText = pct + "%";
    document.getElementById('pdf-date').innerText = new Date().toLocaleDateString();
    const el = document.getElementById('cert-pdf'); const wrap = document.getElementById('cert-wrap');
    wrap.style.display="block"; html2pdf().from(el).set({filename:'Cert.pdf', jsPDF:{orientation:'landscape'}}).save().then(()=>wrap.style.display="none");
};
