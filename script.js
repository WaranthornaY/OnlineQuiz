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
    ['login-container', 'signup-container', 'menu-container', 'teacher-panel', 'admin-panel', 'quiz-container'].forEach(p => {
        document.getElementById(p).classList.add('hide');
    });
    document.getElementById(id).classList.remove('hide');
};

// --- NAVIGATION FIXES ---
document.getElementById('btn-to-signup').onclick = () => show('signup-container');
document.getElementById('back-to-login').onclick = () => show('login-container');

// --- SIGNUP LOGIC ---
document.getElementById('signup-submit-btn').onclick = async () => {
    const u = document.getElementById('new-username').value.trim().toLowerCase();
    const p = document.getElementById('new-password').value;
    if(!u || !p) return alert("Please fill all fields!");
    
    try {
        const userRef = doc(db, "users", u);
        const snap = await getDoc(userRef);
        if(snap.exists()) return alert("Username taken!");
        
        await setDoc(userRef, { password: p });
        alert("Account created, Win! Logging you in...");
        show('login-container');
    } catch(e) { alert("Database Error: Check your Rules"); }
};

// --- LOGIN LOGIC ---
document.getElementById('login-btn').onclick = async () => {
    const u = document.getElementById('username').value.trim().toLowerCase();
    const p = document.getElementById('password').value;

    if (u === "admin") {
        try {
            const adminSnap = await getDoc(doc(db, "system_config", "admin_creds"));
            if (p === adminSnap.data().pass) {
                if (await verifyUSBKey()) { renderAdmin(); show('admin-panel'); }
                else alert("USB Security Verification Failed.");
            } else alert("Invalid Admin Password.");
        } catch(e) { alert("Admin verify error. Is Firebase ready?"); }
        return;
    }

    if (u === "teacher" && p === "Teacher123") return show('teacher-panel');

    const userSnap = await getDoc(doc(db, "users", u));
    if (userSnap.exists() && userSnap.data().password === p) {
        activeUser = u;
        document.getElementById('menu-welcome').innerText = "Hello, " + u.toUpperCase();
        show('menu-container');
    } else alert("Incorrect Username or Password.");
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

// --- TEACHER LOGIC ---
document.getElementById('add-choice-btn').onclick = () => {
    const row = document.createElement('div'); row.className = "choice-row";
    row.innerHTML = `<input type="checkbox" class="c-check"><input type="text" class="c-text" placeholder="Choice"><button onclick="this.parentElement.remove()" style="width:30px;background:red;padding:0;height:30px;">x</button>`;
    document.getElementById('choices-area').appendChild(row);
};

document.getElementById('save-q-btn').onclick = async () => {
    const code = document.getElementById('room-code-input').value;
    if(!code) return alert("Enter room code first!");
    let opts = [];
    document.querySelectorAll('.choice-row').forEach(r => {
        opts.push({ t: r.querySelector('.c-text').value, c: r.querySelector('.c-check').checked });
    });
    currentQuestions.push({ q: document.getElementById('main-q-input').value, a: opts });
    await setDoc(doc(db, "quizzes", code), { questions: currentQuestions, active: false }, { merge: true });
    alert("Question saved to " + code);
};

document.getElementById('toggle-live-btn').onclick = async () => {
    const code = document.getElementById('room-code-input').value;
    const snap = await getDoc(doc(db, "quizzes", code));
    const newState = !snap.data().active;
    await setDoc(doc(db, "quizzes", code), { active: newState }, { merge: true });
    alert("Room is now " + (newState ? "ONLINE" : "OFFLINE"));
};

// --- ADMIN RENDER ---
async function renderAdmin() {
    const snap = await getDocs(collection(db, "results"));
    const box = document.getElementById('admin-score-list');
    box.innerHTML = "";
    snap.forEach(d => {
        const r = d.data();
        const div = document.createElement('div');
        div.className = "admin-item";
        div.style = "display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;";
        div.innerHTML = `<span>${r.user}</span><strong>${r.pct}%</strong>`;
        box.appendChild(div);
    });
}

document.getElementById('export-btn').onclick = () => {
    const table = document.getElementById("admin-score-list");
    const ws = XLSX.utils.table_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scores");
    XLSX.writeFile(wb, "Scores_Winnythai.xlsx");
};
