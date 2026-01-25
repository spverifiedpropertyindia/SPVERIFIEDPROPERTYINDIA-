// js/dashboard.js
import { db } from "./firebase.js";
import { listenUser, logout } from "./auth.js";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const ADMIN_EMAIL = "raazsahu1000@gmail.com";

// DOM
const userEmailEl = document.getElementById("userEmail");
const roleEl = document.getElementById("userRole");
const kycEl = document.getElementById("kycStatus");
const planEl = document.getElementById("planStatus");
const remainingEl = document.getElementById("remainingListings");

const myPropsEl = document.getElementById("myProps");

const addBtn = document.getElementById("addPropertyBtn");
const buyPlanBtn = document.getElementById("buyPlanBtn");
const kycBtn = document.getElementById("kycBtn");

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await logout();
    location.href = "index.html";
  };
}

function limitByPlan(role, plan) {
  // OWNER plans
  if (role === "OWNER") {
    if (plan === "BASIC") return 1;
    if (plan === "STANDARD") return 4;
    if (plan === "PREMIUM") return 10;
  }

  // BROKER plans
  if (role === "BROKER") {
    if (plan === "BASIC") return 2;
    if (plan === "STANDARD") return 25;
    if (plan === "PREMIUM") return 999999; // Unlimited
  }

  return 0;
}

function propCard(p) {
  return `
    <div class="card">
      <img src="${p.image || "https://picsum.photos/500/300"}" />
      <div class="p">
        <div class="badge">${p.status || ""} • ${p.liveStatus || ""}</div>
        <h3>${p.title || ""}</h3>
        <div class="price">₹ ${p.price || ""}</div>
        <div class="small">${p.city || ""} • ${p.state || ""} • ${p.type || ""}</div>
      </div>
    </div>
  `;
}

async function loadMyProperties(uid) {
  if (!myPropsEl) return;

  myPropsEl.innerHTML = "Loading...";

  const q = query(
    collection(db, "properties"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  let html = "";
  snap.forEach((d) => {
    html += propCard(d.data());
  });

  myPropsEl.innerHTML = html || "<p>No properties yet.</p>";
}

listenUser(async (user) => {
  if (!user) {
    alert("Login required ✅");
    location.href = "login.html";
    return;
  }

  const isAdmin = user.email === ADMIN_EMAIL;

  if (userEmailEl) userEmailEl.innerText = user.email;

  // ✅ Get user doc
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  const userData = userSnap.exists() ? userSnap.data() : {};

  // ✅ Admin Full Access override
  const role = isAdmin ? "ADMIN" : (userData.role || "OWNER");
  const kycStatus = isAdmin ? "APPROVED ✅ (ADMIN BYPASS)" : (userData.kycStatus || "PENDING");
  const planStatus = isAdmin ? "ACTIVE ✅ (ADMIN BYPASS)" : (userData.planStatus || "INACTIVE");
  const activePlan = isAdmin ? "PREMIUM" : (userData.activePlan || "BASIC");

  if (roleEl) roleEl.innerText = role;
  if (kycEl) kycEl.innerText = kycStatus;
  if (planEl) planEl.innerText = `${planStatus} (${activePlan})`;

  // ✅ Listing Remaining (Admin unlimited)
  if (isAdmin) {
    if (remainingEl) remainingEl.innerText = "Unlimited ✅";
  } else {
    const limitCount = limitByPlan(userData.role || "OWNER", activePlan);
    const used = userData.monthlyListingsUsed || 0;
    const remaining = Math.max(0, limitCount - used);
    if (remainingEl) remainingEl.innerText = `${remaining}/${limitCount}`;
  }

  // ✅ Buttons logic
  if (addBtn) {
    addBtn.onclick = () => {
      // ✅ User process only (Admin bypass)
      if (!isAdmin && userData.kycStatus !== "APPROVED") {
        alert("KYC Pending ❌\nपहले KYC submit करो ✅");
        location.href = "kyc.html";
        return;
      }
      if (!isAdmin && userData.planStatus !== "ACTIVE") {
        alert("Plan required ❌\nपहले plan buy करो ✅");
        location.href = "plans.html";
        return;
      }
      location.href = "add-property.html";
    };
  }

  if (buyPlanBtn) {
    buyPlanBtn.onclick = () => {
      // ✅ Admin bypass (admin ko plan buy nahi chahiye)
      if (isAdmin) {
        alert("Admin को plan buy करने की जरूरत नहीं ✅");
        return;
      }
      location.href = "plans.html";
    };
  }

  if (kycBtn) {
    kycBtn.onclick = () => {
      // ✅ Admin bypass
      if (isAdmin) {
        alert("Admin को KYC submit करने की जरूरत नहीं ✅");
        return;
      }
      location.href = "kyc.html";
    };
  }

  // ✅ Load properties list
  await loadMyProperties(user.uid);
});
