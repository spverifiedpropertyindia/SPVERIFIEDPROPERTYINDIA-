import { db } from "./firebase.js";
import { listenUser, logout } from "./auth.js";

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const ADMIN_EMAIL = "raazsahu1000@gmail.com";

// DOM
const logoutBtn = document.getElementById("logoutBtn");

// Counters
const kycCount = document.getElementById("kycCount");
const propPendingCount = document.getElementById("propPendingCount");
const propApprovedCount = document.getElementById("propApprovedCount");

// Lists
const kycList = document.getElementById("kycList");
const pendingProps = document.getElementById("pendingProps");
const approvedProps = document.getElementById("approvedProps");
const paymentList = document.getElementById("paymentList");

// Form
const form = document.getElementById("form");

// Tabs
const tabButtons = document.querySelectorAll(".tabBtn");
const tabs = ["kycTab","paymentTab","propertyTab","approvedTab","addTab"];

tabButtons.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    tabButtons.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    const target = btn.dataset.tab;
    tabs.forEach(t=> document.getElementById(t).classList.add("hidden"));
    document.getElementById(target).classList.remove("hidden");
  });
});

// Logout
logoutBtn.onclick = async ()=>{
  await logout();
  location.href="index.html";
};

// Admin Guard
listenUser((user)=>{
  if(!user){
    alert("Login required!");
    location.href="login.html";
    return;
  }
  if(user.email !== ADMIN_EMAIL){
    alert("Access denied! Only admin allowed.");
    location.href="index.html";
    return;
  }
});

// ===== KYC =====
function kycCard(k){
  return `
  <div class="card">
    <div class="p">
      <div class="badge">KYC PENDING</div>
      <h3>${k.fullName || "User"}</h3>
      <p class="small"><b>Phone:</b> ${k.phone || ""}</p>
      <p class="small"><b>ID:</b> ${k.idType || ""} - ${k.idNumber || ""}</p>
      <p class="small"><b>Address:</b> ${k.address || ""}</p>

      <div class="actionRow">
        <button class="btn" onclick="approveKYC('${k.uid}')">Approve</button>
        <button class="btnRed" onclick="rejectKYC('${k.uid}')">Reject</button>
      </div>
    </div>
  </div>`;
}

async function loadKYC(){
  kycList.innerHTML = "Loading...";
  const q = query(collection(db,"kyc"), where("status","==","PENDING"));
  const snap = await getDocs(q);

  let html = "";
  let count = 0;
  snap.forEach((d)=>{ count++; html += kycCard(d.data()); });

  kycCount.innerText = count;
  kycList.innerHTML = html || "<p>No KYC pending ✅</p>";
}

window.approveKYC = async (uid)=>{
  await updateDoc(doc(db,"kyc",uid), { status:"APPROVED" });
  await updateDoc(doc(db,"users",uid), { kycStatus:"APPROVED" });
  loadKYC();
};

window.rejectKYC = async (uid)=>{
  await updateDoc(doc(db,"kyc",uid), { status:"REJECTED" });
  await updateDoc(doc(db,"users",uid), { kycStatus:"REJECTED" });
  loadKYC();
};

// ===== PROPERTIES =====
function mapBtn(p){
  if(!p.gps?.lat || !p.gps?.lng) return "";
  return `<a class="btn2" target="_blank" href="https://www.google.com/maps?q=${p.gps.lat},${p.gps.lng}">📍 Open Map</a>`;
}

function propCard(id,p,statusLabel){
  return `
  <div class="card">
    <img src="${p.image || 'https://picsum.photos/500/300'}" />
    <div class="p">
      <div class="badge">${statusLabel}</div>
      <h3>${p.title || ""}</h3>
      <div class="price">₹ ${p.price || ""}</div>
      <p class="small">${p.city || ""} • ${p.state || ""} • ${p.type || ""}</p>
      <p class="small"><b>Address:</b> ${p.locationAddress || ""}</p>

      <div class="actionRow">
        ${statusLabel==="PENDING"
          ? `<button class="btn" onclick="approveProp('${id}')">Approve</button>
             <button class="btnRed" onclick="rejectProp('${id}')">Reject</button>`
          : `<button class="btn2" onclick="deleteProp('${id}')">Delete</button>`
        }
        ${mapBtn(p)}
      </div>
    </div>
  </div>`;
}

async function loadPendingProps(){
  pendingProps.innerHTML = "Loading...";
  const q = query(collection(db,"properties"), where("status","==","PENDING"), orderBy("createdAt","desc"), limit(50));
  const snap = await getDocs(q);

  let html = "";
  let count = 0;
  snap.forEach((d)=>{ count++; html += propCard(d.id, d.data(), "PENDING"); });

  propPendingCount.innerText = count;
  pendingProps.innerHTML = html || "<p>No pending properties ✅</p>";
}

async function loadApprovedProps(){
  approvedProps.innerHTML = "Loading...";
  const q = query(collection(db,"properties"), where("status","==","APPROVED"), orderBy("createdAt","desc"), limit(50));
  const snap = await getDocs(q);

  let html = "";
  let count = 0;
  snap.forEach((d)=>{ count++; html += propCard(d.id, d.data(), "APPROVED"); });

  propApprovedCount.innerText = count;
  approvedProps.innerHTML = html || "<p>No approved properties.</p>";
}

window.approveProp = async (id)=>{
  await updateDoc(doc(db,"properties",id), { status:"APPROVED", liveStatus:"LIVE" });
  loadPendingProps(); loadApprovedProps();
};

window.rejectProp = async (id)=>{
  await updateDoc(doc(db,"properties",id), { status:"REJECTED", liveStatus:"EXPIRED" });
  loadPendingProps();
};

window.deleteProp = async (id)=>{
  if(confirm("Delete this property?")){
    await deleteDoc(doc(db,"properties",id));
    loadApprovedProps();
  }
};

// ===== PAYMENTS =====
function planDays(plan){
  if(plan==="BASIC") return 28;
  if(plan==="STANDARD") return 56;
  if(plan==="PREMIUM") return 84;
  return 28;
}

function payCard(id,p){
  return `
  <div class="card">
    <div class="p">
      <div class="badge">PAYMENT PENDING</div>
      <h3>${p.plan} Plan</h3>
      <p class="small"><b>User:</b> ${p.email}</p>
      <p class="small"><b>Role:</b> ${p.role}</p>
      <p class="small"><b>Amount:</b> ₹${p.amount}</p>
      <p class="small"><b>UTR:</b> ${p.utr}</p>

      <div class="actionRow">
        <button class="btn" onclick="approvePayment('${id}','${p.uid}','${p.role}','${p.plan}')">Approve</button>
        <button class="btnRed" onclick="rejectPayment('${id}')">Reject</button>
      </div>
    </div>
  </div>`;
}

async function loadPayments(){
  paymentList.innerHTML = "Loading...";
  const q = query(collection(db,"payments"), where("status","==","PENDING"), orderBy("createdAt","desc"), limit(50));
  const snap = await getDocs(q);

  let html = "";
  snap.forEach((d)=> html += payCard(d.id, d.data()));
  paymentList.innerHTML = html || "<p>No pending payments ✅</p>";
}

window.rejectPayment = async (paymentId)=>{
  await updateDoc(doc(db,"payments",paymentId), { status:"REJECTED" });
  loadPayments();
};

window.approvePayment = async (paymentId, uid, role, plan)=>{
  await updateDoc(doc(db,"payments",paymentId), { status:"APPROVED" });

  const days = planDays(plan);
  const now = new Date();
  const end = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

  await updateDoc(doc(db,"users",uid), {
    role: role,
    activePlan: plan,
    planStatus: "ACTIVE",
    planStartAt: serverTimestamp(),
    planEndAt: end,
    monthlyListingsUsed: 0,
    monthlyResetAt: serverTimestamp()
  });

  const pq = query(collection(db,"properties"), where("uid","==",uid));
  const psnap = await getDocs(pq);
  for(const d of psnap.docs){
    const pr = d.data();
    if(pr.status === "APPROVED"){
      await updateDoc(doc(db,"properties",d.id), { liveStatus:"LIVE", liveUntil: end });
    }
  }

  alert("✅ Plan Activated + Properties LIVE!");
  loadPayments(); loadApprovedProps();
};

// ===== ADMIN ADD PROPERTY =====
if(form){
  form.onsubmit = async (e)=>{
    e.preventDefault();

    const data = {
      title: title.value,
      city: city.value,
      state: state.value || "",
      type: type.value,
      price: price.value,
      image: image.value || "",
      description: description.value,
      ownerName: ownerName.value,
      ownerPhone: ownerPhone.value,

      status: "PENDING",
      liveStatus: "EXPIRED",
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db,"properties"), data);
    alert("✅ Property Added! (PENDING)");
    form.reset();
    loadPendingProps();
  };
}

// INIT
loadKYC();
loadPayments();
loadPendingProps();
loadApprovedProps();
