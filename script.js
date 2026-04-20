import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- NAVIGATION ---
document.getElementById('go-to-signup').onclick = () => show('signup-container');
document.getElementById('back-to-login').onclick = () => show('login-container');

// --- SIGNUP LOGIC (Add New Student) ---
document.getElementById('signup-submit-btn').onclick = async () => {
    const u = document.getElementById('new-username').value.trim().toLowerCase();
    const p = document.getElementById('new-password').value;
    if(!u || !p) return alert("Fill all fields");
    await setDoc(doc(db, "users", u), { password: p });
    alert("Account created! You can now login.");
    show('login-container');
};

// --- LOGIN LOGIC ---
document.getElementById('login-btn').onclick = async () => {
    const u = document.getElementById('username').value.trim().toLowerCase();
    const p = document.getElementById('password').value;

    if (u === "admin") {
        const adminSnap = await getDoc(doc(db, "system_config", "admin_creds"));
        if (p === adminSnap.data().pass) {
            if (await verifyUSBKey()) { renderAdmin(); show('admin-panel'); }
        } else alert("Wrong Admin Pass");
        return;
    }

    if (u === "teacher" && p === "Teacher123") return show('teacher-panel');

    const userSnap = await getDoc(doc(db, "users", u));
    if (userSnap.exists() && userSnap.data().password === p) {
        activeUser = u;
        document.getElementById('menu-welcome').innerText = "Welcome, " + u;
        show('menu-container');
    } else alert("Invalid Login");
};

// --- USB KEY LOGIC ---
async function verifyUSBKey() {
    try {
        const [handle] = await window.showOpenFilePicker({ types: [{ description: 'Key', accept: {'text/plain':['.txt']} }] });
        const file = await handle.getFile();
        const content = await file.text();
        return file.name === "masterkey.txt" && content.trim() === "WINNYTHAI";
    } catch (e) { return false; }
}

// --- QUIZ ENGINE ---
document.getElementById('start-quiz-btn').onclick = async () => {
    const code = prompt("Enter Room Code:");
    const snap = await getDoc(doc(db, "quizzes", code));
    if(!snap.exists() || !snap.data().active) return alert("Room Offline");
    shuffled = snap.data().questions.sort(() => Math.random() - 0.5);
    currentIdx = 0; score = 0; show('quiz-container'); startTimer(60); showQuestion();
};

function startTimer(t) {
    let left = t;
    timerInterval = setInterval(() => {
        left--; document.getElementById('timer-progress').style.width = (left/t*100) + "%";
        if(left <= 0) finishQuiz();
    }, 1000);
}

function showQuestion() {
    const q = shuffled[currentIdx];
    document.getElementById('q-header').innerText = q.q;
    const box = document.getElementById('ans-box'); box.innerHTML = "";
    q.a.forEach(ans => {
        const b = document.createElement('button'); b.innerText = ans.t;
        b.onclick = () => {
            if(ans.c) score++;
            Array.from(box.children).forEach(btn => btn.disabled = true);
            if(currentIdx < shuffled.length - 1) document.getElementById('next-btn').classList.remove('hide');
            else document.getElementById('finish-btn').classList.remove('hide');
        };
        box.appendChild(b);
    });
}

const finishQuiz = async () => {
    clearInterval(timerInterval);
    const pct = Math.round((score/shuffled.length)*100);
    const now = new Date();
    await setDoc(doc(db, "results", activeUser + "_" + Date.now()), { 
        user: activeUser, pct, date: now.toLocaleDateString(), time: now.toLocaleTimeString() 
    });
    alert("Quiz Finished! Your Score: " + pct + "%");
    location.reload();
};

document.getElementById('next-btn').onclick = () => {
    currentIdx++; document.getElementById('next-btn').classList.add('hide'); showQuestion();
};
document.getElementById('finish-btn').onclick = finishQuiz;

// --- TEACHER LOGIC ---
document.getElementById('add-choice-btn').onclick = () => {
    const row = document.createElement('div'); row.className = "choice-row";
    row.innerHTML = `<input type="checkbox" class="c-check"><input type="text" class="c-text" placeholder="Choice"><button onclick="this.parentElement.remove()" style="width:30px;background:red">x</button>`;
    document.getElementById('choices-area').appendChild(row);
};

document.getElementById('save-q-btn').onclick = async () => {
    const code = document.getElementById('room-code-input').value;
    let opts = [];
    document.querySelectorAll('.choice-row').forEach(r => {
        opts.push({ t: r.querySelector('.c-text').value, c: r.querySelector('.c-check').checked });
    });
    currentQuestions.push({ q: document.getElementById('main-q-input').value, a: opts });
    await setDoc(doc(db, "quizzes", code), { questions: currentQuestions }, { merge: true });
    alert("Question Saved!");
};

// --- ADMIN DASHBOARD ---
async function renderAdmin() {
    const snap = await getDocs(collection(db, "results"));
    const grouped = {};
    snap.forEach(d => { 
        const r = d.data(); if(!grouped[r.user]) grouped[r.user] = []; grouped[r.user].push(r); 
    });
    const box = document.getElementById('admin-score-list'); box.innerHTML = "";
    Object.keys(grouped).forEach(u => {
        const best = Math.max(...grouped[u].map(x => x.pct));
        const item = document.createElement('div'); item.className = "admin-item";
        item.innerHTML = `<span class="admin-name">${u}</span><span class="admin-score">${best}%</span>`;
        box.appendChild(item);
    });
}
