import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. DATABASE CONFIGURATION
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

// 2. GLOBAL STATE
let activeU = "";
let quizPool = [];
let qIdx = 0;
let score = 0;
let teacherPool = [];
let clock;

// 3. CORE UTILITIES
const nav = (id) => {
    document.querySelectorAll('.container > div').forEach(d => d.classList.add('hide'));
    document.getElementById(id).classList.remove('hide');
};

// USB Security Logic
async function verifyUSB() {
    try {
        const [handle] = await window.showOpenFilePicker();
        const file = await handle.getFile();
        const content = await file.text();
        return file.name === "masterkey.txt" && content.trim() === "WINNYTHAI";
    } catch(e) { 
        alert("USB Masterkey is required for this action."); 
        return false; 
    }
}

// 4. AUTHENTICATION
document.getElementById('btn-login').onclick = async () => {
    const u = document.getElementById('login-u').value.trim().toLowerCase();
    const p = document.getElementById('login-p').value;

    // Admin Access
    if(u === 'admin'){
        const adm = await getDoc(doc(db, "system_config", "admin_creds"));
        if(p === adm.data().pass && await verifyUSB()){ 
            renderAdmin(); 
            nav('scr-admin'); 
        }
        return;
    }

    // Teacher Access
    if(u === 'teacher' && p === 'Teacher123') return nav('scr-teacher');

    // Student Access
    const snap = await getDoc(doc(db, "users", u));
    if(snap.exists() && snap.data().pass === p){
        activeU = u;
        document.getElementById('hi-user').innerText = "Hello, " + u;
        loadHistory(u);
        nav('scr-menu');
    } else {
        alert("Login Denied: Check username or password.");
    }
};

// 5. STUDENT DASHBOARD & HISTORY
async function loadHistory(u) {
    const box = document.getElementById('history-list');
    box.innerHTML = "<small>Loading records...</small>";
    const snap = await getDocs(collection(db, "results"));
    box.innerHTML = "";
    
    snap.forEach(d => {
        const r = d.data();
        if(r.user === u) {
            const item = document.createElement('div');
            item.className = "history-item";
            const canCert = r.pct >= 80;
            item.innerHTML = `
                <div>
                    <b>${r.pct}%</b> <small>${r.date}</small><br>
                    ${canCert ? `<button class="btn-warn" style="width:auto; padding:3px 8px; font-size:10px; margin-top:5px;" onclick="window.genCert('${r.user}','${r.pct}','${r.date}')">Download Certificate</button>` : ''}
                </div>
                <span class="badge" style="background:${r.pct>=50?'#dcfce7':'#fee2e2'}">${r.pct>=50?'PASS':'FAIL'}</span>
            `;
            box.appendChild(item);
        }
    });
}

// 6. QUIZ ENGINE
document.getElementById('btn-join').onclick = async () => {
    const c = document.getElementById('room-code').value;
    const snap = await getDoc(doc(db, "quizzes", c));
    if(!snap.exists() || !snap.data().active) return alert("This Room is currently closed.");
    
    quizPool = snap.data().questions;
    qIdx = 0; 
    score = 0;
    nav('scr-quiz'); 
    startClock(snap.data().timeLimit * 60); 
    renderQuiz();
};

function renderQuiz() {
    if(qIdx >= quizPool.length) return endQuiz();
    const it = quizPool[qIdx];
    document.getElementById('q-text').innerText = it.q;
    const box = document.getElementById('q-options');
    box.innerHTML = "";
    
    it.opts.forEach(o => {
        const b = document.createElement('button');
        b.className = "opt-btn";
        b.innerText = o.text;
        b.onclick = () => { 
            if(o.cor) score++; 
            qIdx++; 
            renderQuiz(); 
        };
        box.appendChild(b);
    });
}

async function endQuiz() {
    clearInterval(clock);
    const p = Math.round((score/quizPool.length)*100);
    const d = new Date();
    await setDoc(doc(db, "results", activeU+"_"+Date.now()), { 
        user: activeU, 
        pct: p, 
        date: d.toLocaleDateString(), 
        time: d.toLocaleTimeString() 
    });
    alert("Quiz Completed. Your Score: " + p + "%");
    location.reload();
}

// 7. TEACHER CONTROLS
document.getElementById('t-load').onclick = async () => {
    const c = document.getElementById('t-room').value;
    const snap = await getDoc(doc(db, "quizzes", c));
    teacherPool = snap.exists() ? snap.data().questions : [];
    renderTeacherList();
};

document.getElementById('t-save-q').onclick = () => {
    const q = document.getElementById('new-q').value;
    const opts = Array.from(document.querySelectorAll('#t-choices > div')).map(div => ({
        text: div.querySelector('.c-txt').value, 
        cor: div.querySelector('.is-cor').checked
    }));
    teacherPool.push({q, opts});
    renderTeacherList();
};

function renderTeacherList() {
    const p = document.getElementById('t-preview');
    p.innerHTML = "";
    teacherPool.forEach((it, i) => {
        const card = document.createElement('div');
        card.className = "q-card";
        card.innerHTML = `<b>${i+1}. ${it.q}</b> <button onclick="window.delQ(${i})" style="float:right; color:red; border:none; background:none;">Remove</button>`;
        p.appendChild(card);
    });
}

// 8. ADMIN MASTER FUNCTIONS (Globally Scoped)
window.renderAdmin = async () => {
    // Render Account Management
    const uBox = document.getElementById('adm-users');
    uBox.innerHTML = "";
    const uSnap = await getDocs(collection(db, "users"));
    uSnap.forEach(d => {
        uBox.innerHTML += `
            <div style="display:flex; justify-content:space-between; margin:5px 0; border-bottom:1px solid #eee;">
                <span>👤 ${d.id}</span> 
                <button class="btn-dan" style="width:auto; padding:2px 8px; font-size:10px;" onclick="window.wipeU('${d.id}')">Wipe Account</button>
            </div>`;
    });

    // Render Score Management
    const sBox = document.getElementById('adm-scores');
    sBox.innerHTML = "";
    const sSnap = await getDocs(collection(db, "results"));
    sSnap.forEach(d => {
        const r = d.data();
        sBox.innerHTML += `
            <div class="q-card">
                <div style="display:flex; justify-content:space-between;">
                    <b>${r.user}</b> <span>${r.pct}%</span>
                </div>
                <small>${r.date} | ${r.time}</small>
                <button onclick="window.delS('${d.id}')" style="display:block; color:red; border:none; background:none; font-size:11px; margin-top:5px; cursor:pointer;">Delete Score Only</button>
            </div>`;
    });
};

window.wipeU = async (u) => {
    if(confirm(`Wipe student [${u}] and all their history?`) && await verifyUSB()){
        await deleteDoc(doc(db, "users", u));
        const s = await getDocs(collection(db, "results"));
        s.forEach(async (d) => { 
            if(d.data().user === u) await deleteDoc(doc(db, "results", d.id)); 
        });
        alert("Account and records deleted.");
        window.renderAdmin();
    }
};

window.genCert = (name, score, date) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    // Background & Border
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,800,600);
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 20; ctx.strokeRect(20,20,760,560);
    
    // Content
    ctx.textAlign = 'center'; ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 40px serif'; ctx.fillText('CERTIFICATE OF ACHIEVEMENT', 400, 150);
    ctx.font = '20px sans-serif'; ctx.fillText('This certifies that', 400, 220);
    ctx.font = 'bold 50px serif'; ctx.fillStyle = '#2563eb'; ctx.fillText(name.toUpperCase(), 400, 300);
    ctx.fillStyle = '#1e293b'; ctx.font = '20px sans-serif'; ctx.fillText('Passed with a score of '+score+'%', 400, 380);
    ctx.font = '14px sans-serif'; ctx.fillText('Verified by OnlineQuiz on '+date, 400, 500);
    
    // Download
    const link = document.createElement('a');
    link.download = `Certificate_${name}.png`;
    link.href = canvas.toDataURL();
    link.click();
};

// Global Timer Function
function startClock(seconds) {
    let t = seconds;
    clock = setInterval(() => {
        let m = Math.floor(t/60), sec = t%60;
        document.getElementById('q-timer').innerText = `${m}:${sec<10?'0':''}${sec}`;
        if(t <= 0){ clearInterval(clock); endQuiz(); }
        t--;
    }, 1000);
}
