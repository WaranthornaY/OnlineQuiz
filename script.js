import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const show = (id) => {
    ['login-container', 'admin-panel', 'teacher-panel'].forEach(p => {
        const el = document.getElementById(p);
        if(el) el.classList.add('hide');
    });
    document.getElementById(id).classList.remove('hide');
};

document.getElementById('login-btn').onclick = async () => {
    const u = document.getElementById('username').value.trim().toLowerCase();
    const p = document.getElementById('password').value;

    if (u === "admin") {
        try {
            const adminSnap = await getDoc(doc(db, "system_config", "admin_creds"));
            if (!adminSnap.exists()) return alert("Firebase Setup Missing!");

            if (p === adminSnap.data().pass) {
                const usbVerified = await verifyUSBKey();
                if (usbVerified) {
                    renderAdmin();
                    show('admin-panel');
                } else {
                    alert("USB Key Verification Failed.");
                }
            } else {
                alert("Incorrect Admin Password.");
            }
        } catch (e) {
            alert("Connection error or Browser not supported.");
        }
        return;
    }
    if (u === "teacher" && p === "Teacher123") show('teacher-panel');
};

async function verifyUSBKey() {
    try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'USB Master Key',
                accept: {'text/plain': ['.txt']}
            }],
            multiple: false
        });
        const file = await fileHandle.getFile();
        if (file.name !== "masterkey.txt") {
            alert("Invalid Filename. Access Denied.");
            return false;
        }
        const content = await file.text();
        return content.trim() === "WINNYTHAI";
    } catch (err) {
        return false;
    }
}

async function renderAdmin() {
    const snap = await getDocs(collection(db, "results"));
    const grouped = {};
    snap.forEach(d => { 
        const r = d.data(); 
        if(!grouped[r.user]) grouped[r.user] = []; 
        grouped[r.user].push(r); 
    });

    const box = document.getElementById('admin-score-list');
    box.innerHTML = "";

    Object.keys(grouped).forEach(u => {
        const best = Math.max(...grouped[u].map(x => x.pct));
        const item = document.createElement('div');
        item.className = "admin-item";
        item.innerHTML = `
            <span class="admin-name">${u.toUpperCase()}</span>
            <span class="admin-score">${best}%</span>
            <div class="tooltip">
                <strong>History:</strong><hr>
                ${grouped[u].map(x => `<div>${x.date} ${x.time || ''}: ${x.pct}%</div>`).join('')}
            </div>`;
        box.appendChild(item);
    });
}

document.getElementById('export-btn').onclick = async () => {
    const s = await getDocs(collection(db, "results"));
    const data = s.docs.map(d => d.data());
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QuizResults");
    XLSX.writeFile(wb, "Student_Scores_Winnythai.xlsx");
};
