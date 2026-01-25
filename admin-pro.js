import { db } from "./firebase.js";
import { listenUser, logoutUser } from "./auth.js";

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const ADMIN_EMAIL = "raazsahu1000@gmail.com";

// ✅ UI
const logoutBtn = document.getElementById("logoutBtn");

const kycCount = document.getElementById("kycCount");
const propPendingCount = document.getElementById("propPendingCount");
const propApprovedCount = document.getElementById("propApprovedCount");

const kycList = document.getElementById("kycList");
const paymentList = document.getElementById("paymentList");
const pendingProps = document.getElementById("pendingProps");
const approvedProps = document.getElementById("approvedProps");

const adminSearch = document.getElementById("adminSearch");
const adminTypeFilter = document.getElementById("adminTypeFilter");

const form = document.getElementById("form");

// ✅ Logout
if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await logoutUser();
    location.href = "login.html";
  };
}

// ✅ Tabs
document.querySelectorAll(".tabBtn").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".tabBtn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.getAttribute("data-tab");
    document.querySelectorAll(".box").forEach((box) => box.classList.add("hidden"));
    document.getElementById(tab).classList.remove("hidden");
  };
});

let currentUser = null;

// ✅ Auth Check Admin
listenUser(async (u) => {
  if (!u) {
    alert("Login required!");
    location.href = "login.html";
    return;
  }

  currentUser = u;

  if (u.email !== ADMIN_EMAIL) {
    alert("Access denied! Admin only.");
    location.href = "dashboard.html";
    return;
  }

  loadKycRequests();
  loadPayments();
  loadPendingProperties();
  loadApprovedProperties();
});


// ======================================
// ✅ KYC REQUESTS (Approve/Reject)
// ======================================
function loadKycRequests() {
  const q = query(collection(db, "kyc"), where("status", "==", "PENDING"));

  onSnapshot(q, (snap) => {
    kycList.innerHTML = "";
    kycCount.innerHTML = snap.size;

    if (snap.empty) {
      kycList.innerHTML = `<p class="small">✅ No pending KYC.</p>`;
      return;
    }

    snap.forEach((d) => {
      const k = d.data();

      kycList.innerHTML += `
        <div class="card">
          <h3>👤 ${k.fullName || "N/A"}</h3>
          <p class="small"><b>Phone:</b> ${k.phone || ""}</p>
          <p class="small"><b>Address:</b> ${k.address || ""}</p>
          <p class="small"><b>ID Type:</b> ${k.idType || ""}</p>
          <p class="small"><b>ID Number:</b> ${k.idNumber || ""}</p>

          <hr style="margin:10px 0;border:0;border-top:1px solid #eee;"/>

          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${k.panUrl ? `<a class="btn2" target="_blank" href="${k.panUrl}">View PAN</a>` : ""}
            ${k.aadhaarFrontUrl ? `<a class="btn2" target="_blank" href="${k.aadhaarFrontUrl}">Aadhaar Front</a>` : ""}
            ${k.aadhaarBackUrl ? `<a class="btn2" target="_blank" href="${k.aadhaarBackUrl}">Aadhaar Back</a>` : ""}
          </div>

          <div style="margin-top:12px;display:flex;gap:10px;">
            <button class="btn" onclick="approveKyc('${d.id}', '${k.uid}')">Approve</button>
            <button class="btn2" onclick="rejectKyc('${d.id}', '${k.uid}')">Reject</button>
          </div>
        </div>
      `;
    });
  });
}

window.approveKyc = async function (kycDocId, uid) {
  if (!confirm("Approve this KYC?")) return;

  await updateDoc(doc(db, "kyc", kycDocId), {
    status: "APPROVED",
    approvedAt: serverTimestamp()
  });

  await updateDoc(doc(db, "users", uid), {
    kycStatus: "APPROVED",
    kycUpdatedAt: serverTimestamp()
  });

  alert("✅ KYC Approved!");
};

window.rejectKyc = async function (kycDocId, uid) {
  if (!confirm("Reject this KYC?")) return;

  await updateDoc(doc(db, "kyc", kycDocId), {
    status: "REJECTED",
    rejectedAt: serverTimestamp()
  });

  await updateDoc(doc(db, "users", uid), {
    kycStatus: "REJECTED",
    kycUpdatedAt: serverTimestamp()
  });

  alert("❌ KYC Rejected!");
};


// ======================================
// ✅ PAYMENTS (Approve/Reject)
// ======================================
function loadPayments() {
  const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snap) => {
    paymentList.innerHTML = "";

    if (snap.empty) {
      paymentList.innerHTML = `<p class="small">No payments found.</p>`;
      return;
    }

    snap.forEach((d) => {
      const p = d.data();

      paymentList.innerHTML += `
        <div class="card">
          <h3>💳 ${p.role || ""} - ${p.plan || ""}</h3>
          <p class="small"><b>Email:</b> ${p.email || ""}</p>
          <p class="small"><b>Amount:</b> ₹${p.amount || 0}</p>
          <p class="small"><b>UTR / TXN:</b> ${p.utr || ""}</p>
          <p class="small"><b>Status:</b> <b>${p.status || ""}</b></p>

          <div style="margin-top:10px;display:flex;gap:10px;">
            <button class="btn" onclick="approvePayment('${d.id}', '${p.uid}', '${p.role}', '${p.plan}')">Approve</button>
            <button class="btn2" onclick="rejectPayment('${d.id}')">Reject</button>
          </div>
        </div>
      `;
    });
  });
}

window.approvePayment = async function (paymentId, uid, role, plan) {
  if (!confirm("Approve this payment?")) return;

  await updateDoc(doc(db, "payments", paymentId), {
    status: "APPROVED",
    approvedAt: serverTimestamp()
  });

  await updateDoc(doc(db, "users", uid), {
    planRole: role,
    planType: plan,
    planStatus: "ACTIVE",
    planUpdatedAt: serverTimestamp()
  });

  alert("✅ Payment Approved & Plan Activated!");
};

window.rejectPayment = async function (paymentId) {
  if (!confirm("Reject this payment?")) return;

  await updateDoc(doc(db, "payments", paymentId), {
    status: "REJECTED",
    rejectedAt: serverTimestamp()
  });

  alert("❌ Payment Rejected!");
};


// ======================================
// ✅ PROPERTIES (Pending) + WhatsApp button
// ======================================
let allPendingProps = [];

function loadPendingProperties() {
  const q = query(
    collection(db, "properties"),
    where("status", "==", "PENDING"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snap) => {
    allPendingProps = [];
    propPendingCount.innerHTML = snap.size;

    snap.forEach((d) => {
      allPendingProps.push({ id: d.id, ...d.data() });
    });

    renderPendingProps();
  });
}

function renderPendingProps() {
  const search = (adminSearch.value || "").toLowerCase().trim();
  const typeFilter = adminTypeFilter.value;

  const filtered = allPendingProps.filter((p) => {
    const title = (p.title || "").toLowerCase();
    const city = (p.city || "").toLowerCase();
    const type = p.type || "";

    const matchSearch = !search || title.includes(search) || city.includes(search);
    const matchType = !typeFilter || type === typeFilter;

    return matchSearch && matchType;
  });

  pendingProps.innerHTML = "";

  if (filtered.length === 0) {
    pendingProps.innerHTML = `<p class="small">No pending properties found.</p>`;
    return;
  }

  filtered.forEach((p) => {
    const w = (p.whatsapp || "").replace(/\D/g, ""); // ✅ numbers only

    pendingProps.innerHTML += `
      <div class="card">
        <h3>🏠 ${p.title || ""}</h3>
        <p class="small"><b>City:</b> ${p.city || ""}</p>
        <p class="small"><b>State:</b> ${p.state || ""}</p>
        <p class="small"><b>Type:</b> ${p.type || ""}</p>
        <p class="small"><b>Price:</b> ${p.price || ""}</p>

        <p class="small" style="margin-top:8px;">
          <b>Owner:</b> ${p.ownerName || ""} (${p.ownerPhone || ""})
        </p>

        ${w ? `
          <a class="btn2" target="_blank" style="margin-top:8px;display:inline-block;"
             href="https://wa.me/91${w}">
             ✅ WhatsApp Owner
          </a>
        ` : ""}

        <div style="margin-top:12px;display:flex;gap:10px;">
          <button class="btn" onclick="approveProperty('${p.id}')">Approve</button>
          <button class="btn2" onclick="rejectProperty('${p.id}')">Reject</button>
        </div>
      </div>
    `;
  });
}

adminSearch.oninput = renderPendingProps;
adminTypeFilter.onchange = renderPendingProps;

window.approveProperty = async function (propId) {
  if (!confirm("Approve this property?")) return;

  await updateDoc(doc(db, "properties", propId), {
    status: "APPROVED",
    approvedAt: serverTimestamp()
  });

  alert("✅ Property Approved!");
};

window.rejectProperty = async function (propId) {
  if (!confirm("Reject this property?")) return;

  await updateDoc(doc(db, "properties", propId), {
    status: "REJECTED",
    rejectedAt: serverTimestamp()
  });

  alert("❌ Property Rejected!");
};


// ======================================
// ✅ APPROVED PROPERTIES + WhatsApp button
// ======================================
function loadApprovedProperties() {
  const q = query(
    collection(db, "properties"),
    where("status", "==", "APPROVED"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snap) => {
    approvedProps.innerHTML = "";
    propApprovedCount.innerHTML = snap.size;

    if (snap.empty) {
      approvedProps.innerHTML = `<p class="small">No approved properties.</p>`;
      return;
    }

    snap.forEach((d) => {
      const p = d.data();
      const w = (p.whatsapp || "").replace(/\D/g, "");

      approvedProps.innerHTML += `
        <div class="card">
          <h3>✅ ${p.title || ""}</h3>
          <p class="small"><b>City:</b> ${p.city || ""}</p>
          <p class="small"><b>Type:</b> ${p.type || ""}</p>
          <p class="small"><b>Price:</b> ${p.price || ""}</p>

          ${w ? `
            <a class="btn2" target="_blank" style="margin-top:8px;display:inline-block;"
               href="https://wa.me/91${w}">
               ✅ WhatsApp Owner
            </a>
          ` : ""}

          <div style="margin-top:10px;">
            <button class="btn2" onclick="deleteApprovedProperty('${d.id}')">Delete</button>
          </div>
        </div>
      `;
    });
  });
}

window.deleteApprovedProperty = async function (propId) {
  if (!confirm("Delete this approved property?")) return;
  await deleteDoc(doc(db, "properties", propId));
  alert("🗑 Property Deleted!");
};


// ======================================
// ✅ ADD PROPERTY SAVE (Admin)
// ======================================
if (form) {
  form.onsubmit = async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const city = document.getElementById("city").value.trim();
    const state = document.getElementById("state").value.trim();
    const type = document.getElementById("type").value;
    const price = document.getElementById("price").value.trim();
    const description = document.getElementById("description").value.trim();
    const ownerName = document.getElementById("ownerName").value.trim();
    const ownerPhone = document.getElementById("ownerPhone").value.trim();
    const whatsapp = document.getElementById("whatsapp").value.trim();

    if (!title || !city || !type || !price || !description) {
      alert("Please fill required fields!");
      return;
    }

    await addDoc(collection(db, "properties"), {
      title,
      city,
      state,
      type,
      price,
      description,
      ownerName,
      ownerPhone,
      whatsapp, // ✅ Added
      status: "PENDING",
      createdAt: serverTimestamp(),
      createdBy: currentUser?.uid || ""
    });

    alert("✅ Property Saved! Status: PENDING");
    form.reset();
  };
}
