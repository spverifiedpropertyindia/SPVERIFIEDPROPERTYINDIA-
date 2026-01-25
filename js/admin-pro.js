import { db } from "./firebase.js";
import { listenUser, logout } from "./auth.js";

import {
  collection, addDoc,
  query, where, orderBy, limit,
  getDocs,
  doc, updateDoc, deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const ADMIN_EMAIL = "raazsahu1000@gmail.com";

const logoutBtn = document.getElementById("logoutBtn");
const kycCount = document.getElementById("kycCount");
const propPendingCount = document.getElementById("propPendingCount");
const propApprovedCount = document.getElementById("propApprovedCount");

const kycList = document.getElementById("kycList");
const paymentList = document.getElementById("paymentList");
const pendingProps = document.getElementById("pendingProps");
const approvedProps = document.getElementById("approvedProps");

const tabButtons = document.querySelectorAll(".tabBtn");
const tabs = ["kycTab","paymentTab","propertyTab","approvedTab","addTab"];

const form = document.getElementById("form");
const adminSearch = document.getElementById("adminSearch");
const adminTypeFilter = document.getElementById("adminTypeFilter");

function safe(v){ return (v ?? "").toString(); }

function viewDocBtn(url, label){
  if(!url) return "";
  return `<a class="btn2" href="${url}" target="_blank">👁 View ${label}</a>`;
}
function downloadDocBtn(url, label){
  if(!url) return "";
  return `<button class="btn2" onclick="downloadDoc('${url}','${label}')">⬇️ Download ${label}</button>`;
}
window.downloadDoc = (url, label)=>{
  const a = document.createElement("a");
  a.href = url;
  a.download = `${label}.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

tabButtons.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    tabButtons.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.tab;
    tabs.forEach(t=> document.getElementById(t).classList.add("hidden"));
    document.getElementById(target).classList.remove("hidden");
  });
});

if(logoutBtn){
  logoutBtn.onclick = async ()=>{
    await logout();
    location.href="index.html";
  };
}

listenUser((user)=>{
  if(!user){
    alert("Login required ✅");
    location.href="login.html";
    return;
  }
  if(user.email !== ADMIN_EMAIL){
    alert("Access denied ❌ Only Admin allowed");
    location.href="index.html";
    return;
  }
});

function kycCard(k){
  const aadhaarPhoto = k.aadhaarPhotoUrl || k.aadhaarPhoto || "";
  const panPhoto = k.panPhotoUrl || k.panPhoto || "";
  return `
  <div class="card">
    <div class="p">
      <div class="badge">KYC ${safe(k.status)}</div>
      <h3>${safe(k.fullName) || "User"}</h3>
      <p class="small"><b>Email:</b> ${safe(k.email)}</p>
      <p class="small"><b>Aadhaar:</b> ${safe(k.aadhaar)}</p>
      <p class="small"><b>PAN:</b> ${safe(k.pan)}</p>

      <div class="actionRow" style="margin-top:10px;">
        ${viewDocBtn(aadhaarPhoto, "Aadhaar")}
        ${downloadDocBtn(aadhaarPhoto, "Aadhaar")}
      </div>
      <div class="actionRow" style="margin-top:10px;">
        ${viewDocBtn(panPhoto, "PAN")}
        ${downloadDocBtn(panPhoto, "PAN")}
      </div>

      <div class="actionRow" style="margin-top:12px;">
        <button class="btn" onclick="approveKYC('${k.uid}')">✅ Approve</button>
        <button class="btnRed" onclick="rejectKYC('${k.uid}')">❌ Reject</button>
      </div>
    </div>
  </div>`;
}

async function loadKYC(){
  if(!kycList) return;
  kycList.innerHTML = "Loading...";
  const q = query(collection(db,"kyc"), where("status","==","PENDING"));
  const snap = await getDocs(q);

  let html = "";
  let count = 0;
  snap.forEach((d)=>{
    count++;
    html += kycCard(d.data());
  });

  if(kycCount) kycCount.innerText = count;
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

async function loadPendingProps(){
  if(!pendingProps) return;
  pendingProps.innerHTML = "Loading...";

  const q = query(
    collection(db,"properties"),
    where("status","==","PENDING"),
    orderBy("createdAt","desc"),
    limit(50)
  );

  const snap = await getDocs(q);

  let html = "";
  let count = 0;

  snap.forEach((d)=>{
    const p = d.data();

    const queryText = (adminSearch?.value || "").toLowerCase().trim();
    const typeFilter = (adminTypeFilter?.value || "").trim();

    if(queryText){
      const t = (p.title || "").toLowerCase();
      const c = (p.city || "").toLowerCase();
      if(!t.includes(queryText) && !c.includes(queryText)) return;
    }
    if(typeFilter && p.type !== typeFilter) return;

    count++;
    html += `
      <div class="card">
        <img src="${p.image || 'https://picsum.photos/500/300'}" />
        <div class="p">
          <div class="badge">PENDING</div>
          <h3>${safe(p.title)}</h3>
          <div class="price">₹ ${safe(p.price)}</div>
          <p class="small">${safe(p.city)} • ${safe(p.state)} • ${safe(p.type)}</p>
          <div class="actionRow">
            <button class="btn" onclick="approveProp('${d.id}')">✅ Approve</button>
            <button class="btnRed" onclick="rejectProp('${d.id}')">❌ Reject</button>
          </div>
        </div>
      </div>
    `;
  });

  if(propPendingCount) propPendingCount.innerText = count;
  pendingProps.innerHTML = html || "<p>No pending properties ✅</p>";
}

async function loadApprovedProps(){
  if(!approvedProps) return;
  approvedProps.innerHTML = "Loading...";

  const q = query(
    collection(db,"properties"),
    where("status","==","APPROVED"),
    orderBy("createdAt","desc"),
    limit(50)
  );
  const snap = await getDocs(q);

  let html = "";
  let count = 0;

  snap.forEach((d)=>{
    const p = d.data();
    count++;
    html += `
      <div class="card">
        <img src="${p.image || 'https://picsum.photos/500/300'}" />
        <div class="p">
          <div class="badge">APPROVED</div>
          <h3>${safe(p.title)}</h3>
          <div class="price">₹ ${safe(p.price)}</div>
          <p class="small">${safe(p.city)} • ${safe(p.state)} • ${safe(p.type)}</p>
          <div class="actionRow">
            <button class="btn2" onclick="deleteProp('${d.id}')">🗑 Delete</button>
          </div>
        </div>
      </div>
    `;
  });

  if(propApprovedCount) propApprovedCount.innerText = count;
  approvedProps.innerHTML = html || "<p>No approved properties.</p>";
}

window.approveProp = async (id)=>{
  await updateDoc(doc(db,"properties",id), { status:"APPROVED", liveStatus:"LIVE" });
  loadPendingProps();
  loadApprovedProps();
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

async function loadPayments(){
  if(!paymentList) return;
  paymentList.innerHTML = "Loading...";

  const q = query(
    collection(db,"payments"),
    where("status","==","PENDING"),
    orderBy("createdAt","desc"),
    limit(50)
  );
  const snap = await getDocs(q);

  let html = "";
  snap.forEach((d)=>{
    const p = d.data();
    html += `
      <div class="card">
        <div class="p">
          <div class="badge">PAYMENT PENDING</div>
          <h3>${safe(p.plan)} Plan</h3>
          <p class="small"><b>User:</b> ${safe(p.email)}</p>
          <p class="small"><b>Amount:</b> ₹${safe(p.amount)}</p>
          <p class="small"><b>UTR:</b> ${safe(p.utr)}</p>
          <div class="actionRow">
            <button class="btn" onclick="approvePayment('${d.id}','${p.uid}','${p.role}','${p.plan}')">✅ Approve</button>
            <button class="btnRed" onclick="rejectPayment('${d.id}')">❌ Reject</button>
          </div>
        </div>
      </div>
    `;
  });

  paymentList.innerHTML = html || "<p>No pending payments ✅</p>";
}

window.rejectPayment = async (paymentId)=>{
  await updateDoc(doc(db,"payments",paymentId), { status:"REJECTED" });
  loadPayments();
};

function planDays(plan){
  if(plan==="BASIC") return 28;
  if(plan==="STANDARD") return 56;
  if(plan==="PREMIUM") return 84;
  return 28;
}

window.approvePayment = async (paymentId, uid, role, plan)=>{
  await updateDoc(doc(db,"payments",paymentId), { status:"APPROVED" });

  const days = planDays(plan);
  const now = new Date();
  const end = new Date(now.getTime() + days*24*60*60*1000);

  await updateDoc(doc(db,"users",uid), {
    role,
    activePlan: plan,
    planStatus: "ACTIVE",
    planStartAt: serverTimestamp(),
    planEndAt: end,
    monthlyListingsUsed: 0,
    monthlyResetAt: serverTimestamp()
  });

  alert("✅ Plan Activated!");
  loadPayments();
};

if(form){
  form.onsubmit = async (e)=>{
    e.preventDefault();
    await addDoc(collection(db,"properties"), {
      title: title.value,
      city: city.value,
      state: state.value || "",
      type: type.value,
      price: price.value,
      image: image.value || "",
      description: description.value,
      ownerName: ownerName.value || "",
      ownerPhone: ownerPhone.value || "",
      status: "PENDING",
      liveStatus: "EXPIRED",
      createdAt: serverTimestamp()
    });
    alert("✅ Property Added!");
    form.reset();
    loadPendingProps();
  };
}

if(adminSearch) adminSearch.addEventListener("input", loadPendingProps);
if(adminTypeFilter) adminTypeFilter.addEventListener("change", loadPendingProps);

loadKYC();
loadPayments();
loadPendingProps();
loadApprovedProps();
