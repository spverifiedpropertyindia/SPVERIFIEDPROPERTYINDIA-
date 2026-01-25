import { db } from "./firebase.js";
import { listenUser, logoutUser } from "./auth.js";

import {
  collection, query, orderBy, onSnapshot,
  doc, getDoc, updateDoc, setDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const ADMIN_EMAIL = "raazsahu1000@gmail.com";

// ✅ Tabs
const tabBtns = document.querySelectorAll(".tabBtn");
const tabs = ["kycTab", "paymentTab", "propertyTab", "approvedTab", "addTab"];

tabBtns.forEach(btn=>{
  btn.onclick = ()=>{
    tabBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    const tabId = btn.dataset.tab;
    tabs.forEach(t=>{
      const el = document.getElementById(t);
      if(el){
        el.classList.add("hidden");
      }
    });

    const activeTab = document.getElementById(tabId);
    if(activeTab){
      activeTab.classList.remove("hidden");
    }
  };
});

// ✅ Logout
const logoutBtn = document.getElementById("logoutBtn");
if(logoutBtn){
  logoutBtn.onclick = async ()=>{
    await logoutUser();
    location.href = "login.html";
  };
}

// ✅ Stat counts
const kycCount = document.getElementById("kycCount");
const propPendingCount = document.getElementById("propPendingCount");
const propApprovedCount = document.getElementById("propApprovedCount");

// ✅ Lists
const kycList = document.getElementById("kycList");
const paymentList = document.getElementById("paymentList");
const pendingProps = document.getElementById("pendingProps");
const approvedProps = document.getElementById("approvedProps");

// ✅ Property Filters
const adminSearch = document.getElementById("adminSearch");
const adminTypeFilter = document.getElementById("adminTypeFilter");

// ✅ PLAN VALIDITY
const PLAN_DAYS = {
  BASIC: 28,
  STANDARD: 56,
  PREMIUM: 84
};

function addDaysToDate(dateObj, days){
  const d = new Date(dateObj);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d){
  try{
    return new Date(d).toLocaleDateString("en-IN");
  }catch(e){
    return "";
  }
}

// ✅ Protect Admin Page
listenUser(async (u)=>{
  if(!u){
    alert("Login required!");
    location.href = "login.html";
    return;
  }

  if(u.email !== ADMIN_EMAIL){
    alert("Access denied! Admin only.");
    location.href = "dashboard.html";
    return;
  }

  // ✅ Load All Admin Data
  loadKYCPending();
  loadPaymentsPending();
  loadProperties();
  initAddPropertyForm();
});

// ----------------------------------------
// ✅ KYC REQUESTS
// ----------------------------------------
function loadKYCPending(){
  const q = query(collection(db, "kyc"), orderBy("createdAt", "desc"));

  onSnapshot(q, async (snap)=>{
    let pending = 0;
    kycList.innerHTML = "";

    snap.forEach((docSnap)=>{
      const d = docSnap.data();

      if(d.status === "PENDING"){
        pending++;

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <h3>👤 ${d.fullName || "No Name"}</h3>
          <p class="small"><b>Phone:</b> ${d.phone || ""}</p>
          <p class="small"><b>Address:</b> ${d.address || ""}</p>
          <p class="small"><b>ID Type:</b> ${d.idType || ""}</p>
          <p class="small"><b>ID Number:</b> ${d.idNumber || ""}</p>
          <p class="small"><b>Status:</b> ${d.status}</p>

          <div style="display:flex;gap:8px;margin-top:10px;">
            <button class="btn" style="flex:1;" data-approve>Approve</button>
            <button class="btn2" style="flex:1;" data-reject>Reject</button>
          </div>
        `;

        card.querySelector("[data-approve]").onclick = async ()=>{
          await approveKYC(docSnap.id);
        };

        card.querySelector("[data-reject]").onclick = async ()=>{
          await rejectKYC(docSnap.id);
        };

        kycList.appendChild(card);
      }
    });

    if(kycCount) kycCount.innerText = pending;

    if(pending === 0){
      kycList.innerHTML = `<p class="small">✅ No pending KYC requests.</p>`;
    }
  });
}

async function approveKYC(uid){
  if(!confirm("Approve this KYC?")) return;

  // ✅ Update KYC collection
  await updateDoc(doc(db, "kyc", uid), {
    status: "APPROVED",
    approvedAt: serverTimestamp()
  });

  // ✅ Update users collection (important!)
  await setDoc(doc(db, "users", uid), {
    kycStatus: "APPROVED",
    kycApprovedAt: serverTimestamp()
  }, { merge: true });

  alert("✅ KYC Approved!");
}

async function rejectKYC(uid){
  if(!confirm("Reject this KYC?")) return;

  await updateDoc(doc(db, "kyc", uid), {
    status: "REJECTED",
    rejectedAt: serverTimestamp()
  });

  await setDoc(doc(db, "users", uid), {
    kycStatus: "REJECTED",
    kycRejectedAt: serverTimestamp()
  }, { merge: true });

  alert("❌ KYC Rejected!");
}

// ----------------------------------------
// ✅ PAYMENTS REQUESTS
// ----------------------------------------
function loadPaymentsPending(){
  const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));

  onSnapshot(q, async (snap)=>{
    paymentList.innerHTML = "";

    let found = 0;

    snap.forEach((docSnap)=>{
      const p = docSnap.data();

      if(p.status === "PENDING"){
        found++;

        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
          <h3>💳 ${p.plan || ""} (${p.role || ""})</h3>
          <p class="small"><b>Email:</b> ${p.email || ""}</p>
          <p class="small"><b>Amount:</b> ₹${p.amount || 0}</p>
          <p class="small"><b>UTR/PaymentID:</b> ${p.utr || ""}</p>
          <p class="small"><b>Status:</b> ${p.status}</p>

          <div style="display:flex;gap:8px;margin-top:10px;">
            <button class="btn" style="flex:1;" data-approve>Approve</button>
            <button class="btn2" style="flex:1;" data-reject>Reject</button>
          </div>
        `;

        card.querySelector("[data-approve]").onclick = async ()=>{
          await approvePayment(docSnap.id, p);
        };

        card.querySelector("[data-reject]").onclick = async ()=>{
          await rejectPayment(docSnap.id);
        };

        paymentList.appendChild(card);
      }
    });

    if(found === 0){
      paymentList.innerHTML = `<p class="small">✅ No pending payments.</p>`;
    }
  });
}

async function approvePayment(paymentDocId, paymentData){
  if(!confirm("Approve this payment and activate plan?")) return;

  const uid = paymentData.uid;
  const plan = paymentData.plan;
  const role = paymentData.role;
  const amount = paymentData.amount || 0;

  const days = PLAN_DAYS[plan] || 0;

  const expiry = addDaysToDate(new Date(), days);

  // ✅ Mark payment as approved
  await updateDoc(doc(db, "payments", paymentDocId), {
    status: "APPROVED",
    approvedAt: serverTimestamp()
  });

  // ✅ Update user plan in users collection
  await setDoc(doc(db, "users", uid), {
    planStatus: "ACTIVE",
    planRole: role,
    planName: plan,
    planAmount: amount,
    planStartDate: new Date().toISOString(),
    planExpiryDate: expiry.toISOString(),
    planExpiryLabel: formatDate(expiry),
    lastPaymentId: paymentDocId,
    updatedAt: serverTimestamp()
  }, { merge: true });

  alert(`✅ Payment Approved!\nPlan Activated: ${plan}\nExpiry: ${formatDate(expiry)}`);
}

async function rejectPayment(paymentDocId){
  if(!confirm("Reject this payment?")) return;

  await updateDoc(doc(db, "payments", paymentDocId), {
    status: "REJECTED",
    rejectedAt: serverTimestamp()
  });

  alert("❌ Payment Rejected!");
}

// ----------------------------------------
// ✅ PROPERTIES (Pending + Approved)
// ----------------------------------------
function loadProperties(){
  const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));

  let allProps = [];

  onSnapshot(q, (snap)=>{
    allProps = [];
    snap.forEach((d)=>{
      allProps.push({ id: d.id, ...d.data() });
    });

    renderProperties(allProps);
  });

  // ✅ Search & Filter
  if(adminSearch){
    adminSearch.oninput = ()=>renderProperties(allProps);
  }
  if(adminTypeFilter){
    adminTypeFilter.onchange = ()=>renderProperties(allProps);
  }
}

function renderProperties(allProps){
  pendingProps.innerHTML = "";
  approvedProps.innerHTML = "";

  let pending = 0;
  let approved = 0;

  const searchText = (adminSearch?.value || "").toLowerCase().trim();
  const typeFilter = adminTypeFilter?.value || "";

  const filtered = allProps.filter(p=>{
    const title = (p.title || "").toLowerCase();
    const city = (p.city || "").toLowerCase();
    const type = p.type || "";

    const matchSearch = !searchText || title.includes(searchText) || city.includes(searchText);
    const matchType = !typeFilter || type === typeFilter;

    return matchSearch && matchType;
  });

  filtered.forEach((p)=>{
    const isApproved = p.status === "APPROVED";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${p.title || "Property"}</h3>
      <p class="small"><b>City:</b> ${p.city || ""}</p>
      <p class="small"><b>Type:</b> ${p.type || ""}</p>
      <p class="small"><b>Price:</b> ${p.price || ""}</p>
      <p class="small"><b>Status:</b> ${p.status || "PENDING"}</p>

      ${p.image ? `<img src="${p.image}" style="width:100%;border-radius:12px;margin-top:8px;border:1px solid #eee;" />` : ""}

      <div style="display:flex;gap:8px;margin-top:10px;">
        ${isApproved
          ? `<button class="btn2" style="flex:1;" data-delete>Delete</button>`
          : `
            <button class="btn" style="flex:1;" data-approve>Approve</button>
            <button class="btn2" style="flex:1;" data-reject>Reject</button>
          `
        }
      </div>
    `;

    if(isApproved){
      approved++;
      card.querySelector("[data-delete]").onclick = async ()=>{
        if(!confirm("Delete this property?")) return;
        await deleteDoc(doc(db, "properties", p.id));
        alert("🗑 Property deleted!");
      };
      approvedProps.appendChild(card);
    }else{
      pending++;
      card.querySelector("[data-approve]").onclick = async ()=>{
        await updateDoc(doc(db, "properties", p.id), {
          status: "APPROVED",
          approvedAt: serverTimestamp()
        });
        alert("✅ Property Approved!");
      };

      card.querySelector("[data-reject]").onclick = async ()=>{
        if(!confirm("Reject this property?")) return;
        await updateDoc(doc(db, "properties", p.id), {
          status: "REJECTED",
          rejectedAt: serverTimestamp()
        });
        alert("❌ Property Rejected!");
      };

      pendingProps.appendChild(card);
    }
  });

  if(propPendingCount) propPendingCount.innerText = pending;
  if(propApprovedCount) propApprovedCount.innerText = approved;

  if(pending === 0){
    pendingProps.innerHTML = `<p class="small">✅ No pending properties.</p>`;
  }
  if(approved === 0){
    approvedProps.innerHTML = `<p class="small">✅ No approved properties.</p>`;
  }
}

// ----------------------------------------
// ✅ ADD PROPERTY FORM
// ----------------------------------------
function initAddPropertyForm(){
  const form = document.getElementById("form");
  if(!form) return;

  form.onsubmit = async (e)=>{
    e.preventDefault();

    const newProp = {
      title: document.getElementById("title").value,
      city: document.getElementById("city").value,
      state: document.getElementById("state").value,
      type: document.getElementById("type").value,
      price: document.getElementById("price").value,
      image: document.getElementById("image").value,
      description: document.getElementById("description").value,
      ownerName: document.getElementById("ownerName").value,
      ownerPhone: document.getElementById("ownerPhone").value,

      status: "APPROVED", // ✅ admin add = auto approved
      createdAt: serverTimestamp()
    };

    // ✅ Save new property
    const { addDoc, collection } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
    await addDoc(collection(db, "properties"), newProp);

    alert("✅ Property Added Successfully!");
    form.reset();
  };
}
