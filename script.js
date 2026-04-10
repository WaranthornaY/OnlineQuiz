import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// AUTH CONFIG
const teacherCreds = { user: "teacher", pass: "Teacher123" };
const adminCreds = { user: "admin", pass: "Admin123" };
let activeUser = "", currentQuestions = [], shuffled = [], currentIdx = 0, score = 0, currentRoomCode = "";

// NAVIGATION HELPER
const show = (id) => {
    ['login-container', 'signup-container', 'menu-container', 'teacher-panel', 'admin-panel', 'quiz-container'].forEach(p => document.getElementById(p).classList.add('hide'));
    document.getElementById(id).classList.remove('hide');
};

// --- AUTHENTICATION ---
document.getElementById('go-to-signup').onclick = () => show('signup-container');
document.getElementById('back-to-login').onclick = () => show('login-container');

document.getElementById('signup-submit-btn').onclick = async () => {
    const u = document.getElementById('new-username').value.trim().toLowerCase();
    const p = document.getElementById('new-password').value;
    if(!u || !p) return alert("Please fill all fields");
    try {
        await setDoc(doc(db, "users", u), { username: u, password: p });
        alert("Success! Account created."); show('login-container');
    } catch(e) { alert("Error creating account."); }
};

document.getElementById('login-btn').onclick = async () => {
    const u = document.getElementById('username').value.trim().toLowerCase();
    const p = document.getElementById('password').value;

    if (u === teacherCreds.user && p === teacherCreds.pass) return show('teacher-panel');
    if (u === adminCreds.user && p === adminCreds.pass) { renderAdminScores(); return show('admin-panel'); }

    try {
        const snap = await getDoc(doc(db, "users", u));
        if (snap.exists() && snap.data().password === p) {
            activeUser = u;
            document.getElementById('menu-welcome').innerText = `Hello, ${activeUser}`;
            show('menu-container');
        } else alert("Invalid username or password");
    } catch(e) { alert("Login failed. Check connection."); }
};

// --- TEACHER CONTROL ---
document.getElementById('room-code-input').oninput = async (e) => {
    const code = e.target.value.trim();
    if(!code) return;
    const snap = await getDoc(doc(db, "quizzes", code));
    if(snap.exists()){
        const d = snap.data();
        currentQuestions = d.questions || [];
        document.getElementById('end-session-btn').classList.toggle('hide', d.active === false);
        document.getElementById('open-session-btn').classList.toggle('hide', d.active !== false);
    } else { currentQuestions = []; }
    renderTeacherList();
};

async function updateRoomState(status) {
    const code = document.getElementById('room-code-input').value.trim();
    if(!code) return alert("Enter Room Code first");
    await updateDoc(doc(db, "quizzes", code), { active: status });
    document.getElementById('end-session-btn').classList.toggle('hide', !status);
    document.getElementById('open-session-btn').classList.toggle('hide', status);
}
document.getElementById('end-session-btn').onclick = () => updateRoomState(false);
document.getElementById('open-session-btn').onclick = () => updateRoomState(true);

document.getElementById('add-question-btn').onclick = async () => {
    const code = document.getElementById('room-code-input').value.trim();
    const q = document.getElementById('new-question').value;
    if(!code || !q) return alert("Missing Room or Question");
    currentQuestions.push({
        q, a: [
            { t: document.getElementById('ans-1').value, c: document.getElementById('check-1').checked },
            { t: document.getElementById('ans-2').value, c: document.getElementById('check-2').checked }
        ]
    });
    await setDoc(doc(db, "quizzes", code), { questions: currentQuestions, active: true }, { merge: true });
    renderTeacherList();
};

function renderTeacherList() {
    document.getElementById('teacher-question-list').innerHTML = currentQuestions.map((q, i) => `
        <li><span>${q.q}</span> <button onclick="window.delQ(${i})" style="width:30px; background:red; padding:2px;">X</button></li>
    `).join('');
}
window.delQ = async (i) => {
    currentQuestions.splice(i, 1);
    await updateDoc(doc(db, "quizzes", document.getElementById('room-code-input').value.trim()), { questions: currentQuestions });
    renderTeacherList();
};

// --- QUIZ ENGINE ---
document.getElementById('start-quiz-btn').onclick = async () => {
    const code = prompt("Enter Room Code:");
    if(!code) return;
    const snap = await getDoc(doc(db, "quizzes", code));
    if(!snap.exists()) return alert("Room not found");
    if(snap.data().active === false) return alert("Teacher has closed this room.");

    currentRoomCode = code;
    shuffled = snap.data().questions.sort(() => Math.random() - 0.5);
    currentIdx = 0; score = 0;
    
    document.getElementById('quiz-info-bar').style.display = "flex";
    document.getElementById('display-username').innerText = activeUser;
    document.getElementById('display-room').innerText = currentRoomCode;
    
    show('quiz-container'); showQuestion();
};

function showQuestion() {
    document.getElementById('next-btn').classList.add('hide');
    const q = shuffled[currentIdx];
    document.getElementById('question-header').innerText = q.q;
    const box = document.getElementById('answer-buttons'); box.innerHTML = "";
    q.a.forEach(ans => {
        const b = document.createElement('button'); b.innerText = ans.t;
        b.onclick = () => {
            if(ans.c) score++; b.style.background = ans.c ? "#27ae60" : "#e74c3c";
            Array.from(box.children).forEach(btn => btn.disabled = true);
            if(currentIdx < shuffled.length - 1) document.getElementById('next-btn').classList.remove('hide');
            else document.getElementById('finish-btn').classList.remove('hide');
        };
        box.appendChild(b);
    });
}

document.getElementById('next-btn').onclick = () => { currentIdx++; showQuestion(); };

document.getElementById('finish-btn').onclick = async () => {
    const btn = document.getElementById('finish-btn'); btn.disabled = true; btn.innerText = "Saving...";
    const pct = (score / shuffled.length) * 100;
    const passed = pct >= 80;
    const res = { user: activeUser, score, total: shuffled.length, pct, room: currentRoomCode, date: new Date().toLocaleDateString() };
    
    await setDoc(doc(db, "results", `${activeUser}_${Date.now()}`), res);
    
    const area = document.getElementById('cert-download-area');
    if(passed) {
        area.innerHTML = `<h2 style="color:green;">Congratulations! ${pct.toFixed(0)}%</h2><button onclick="window.dlCert()" style="background:#d4af37; color:black;">📥 Download Certificate</button>`;
        document.getElementById('cert-name').innerText = activeUser.toUpperCase();
        document.getElementById('cert-score').innerText = `Score: ${pct.toFixed(0)}% (${score}/${shuffled.length})`;
        document.getElementById('cert-date').innerText = res.date;
    } else {
        area.innerHTML = `<h2 style="color:red;">Score: ${pct.toFixed(0)}%</h2><p>You need 80% to earn a certificate.</p>`;
    }
    document.getElementById('history-section').classList.remove('hide');
};

window.dlCert = () => {
    const el = document.getElementById('cert-capture');
    const temp = document.getElementById('certificate-template');
    temp.style.display = "block";
    html2pdf().from(el).set({ margin:0, filename:'Cert.pdf', html2canvas:{scale:2}, jsPDF:{unit:'px', format:[900, 636], orientation:'landscape'} }).save().then(() => temp.style.display="none");
};

// --- ADMIN CONTROLS ---
async function renderAdminScores() {
    const snap = await getDocs(collection(db, "results"));
    const data = {};
    snap.forEach(d => {
        const r = d.data();
        if(!data[r.user] || r.pct > data[r.user].best.pct) data[r.user] = { best: r, all: [...(data[r.user]?.all || []), r] };
        else data[r.user].all.push(r);
    });
    document.getElementById('admin-score-list').innerHTML = Object.keys(data).map(u => `
        <div class="admin-student-card" onclick="window.tglAdmin('${u}')">
            <strong>${u.toUpperCase()}</strong> - Best: ${data[u].best.pct.toFixed(0)}%
            <div id="h-${u}" class="hide"><hr>${data[u].all.map(a => `<div>${a.date}: ${a.pct.toFixed(0)}%</div>`).join('')}</div>
        </div>
    `).join('');
}
window.tglAdmin = (u) => document.getElementById(`h-${u}`).classList.toggle('hide');

// Master Wipe Functions
async function wipeCollection(name) {
    if(!confirm(`Delete all ${name}? This is permanent!`)) return;
    const snap = await getDocs(collection(db, name));
    const batch = writeBatch(db);
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();
    alert("Wipe Complete."); location.reload();
}
document.getElementById('wipe-results-btn').onclick = () => wipeCollection("results");
document.getElementById('wipe-users-btn').onclick = () => wipeCollection("users");
