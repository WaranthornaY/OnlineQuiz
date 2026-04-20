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

// --- UNIVERSAL NAVIGATION FUNCTION ---
function show(id) {
    const screens = ['login-container', 'signup-container', 'menu-container', 'admin-panel', 'teacher-panel'];
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.add('hide');
    });
    const target = document.getElementById(id);
    if (target) target.classList.remove('hide');
}

// --- BUTTONS SETUP ---
document.getElementById('btn-to-signup').onclick = () => show('signup-container');
document.getElementById('back-to-login').onclick = () => show('login-container');

// --- SIGNUP LOGIC ---
document.getElementById('signup-submit-btn').onclick = async () => {
    const u = document.getElementById('new-username').value.trim().toLowerCase();
    const p = document.getElementById('new-password').value;

    if (!u || !p) return alert("Enter details");

    try {
        const userRef = doc(db, "users", u);
        const snap = await getDoc(userRef);
        if (snap.exists()) return alert("User already exists!");

        await setDoc(userRef, { password: p });
        alert("Success! Now login.");
        show('login-container');
    } catch (e) {
        alert("Database error. Check your Firebase Rules.");
    }
};

// --- LOGIN LOGIC ---
document.getElementById('login-btn').onclick = async () => {
    const u = document.getElementById('username').value.trim().toLowerCase();
    const p = document.getElementById('password').value;

    if (u === "admin") {
        const adminSnap = await getDoc(doc(db, "system_config", "admin_creds"));
        if (p === adminSnap.data().pass) {
            if (await verifyUSB()) {
                renderAdmin();
                show('admin-panel');
            } else alert("USB Key Required");
        } else alert("Wrong Pass");
        return;
    }

    if (u === "teacher" && p === "Teacher123") return show('teacher-panel');

    const userSnap = await getDoc(doc(db, "users", u));
    if (userSnap.exists() && userSnap.data().password === p) {
        document.getElementById('menu-welcome').innerText = "Hi, " + u;
        show('menu-container');
    } else alert("Invalid Login");
};

// --- USB KEY CHECK ---
async function verifyUSB() {
    try {
        const [handle] = await window.showOpenFilePicker();
        const file = await handle.getFile();
        const text = await file.text();
        return file.name === "masterkey.txt" && text.trim() === "WINNYTHAI";
    } catch (e) { return false; }
}

// --- ADMIN RENDER ---
async function renderAdmin() {
    const snap = await getDocs(collection(db, "results"));
    const list = document.getElementById('admin-score-list');
    list.innerHTML = "";
    snap.forEach(d => {
        const r = d.data();
        list.innerHTML += `<div class="admin-item"><span>${r.user}</span><strong>${r.pct}%</strong></div>`;
    });
}
