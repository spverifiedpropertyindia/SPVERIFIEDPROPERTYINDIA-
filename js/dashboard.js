import { db } from "./firebase.js";
import { listenUser, logoutUser } from "./auth.js";

import {
  doc, getDoc,
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const userEmailEl = document.getElementById("userEmail");
const kycStatusEl = document.getElementById("kycStatus");
const planStatusEl = document.getElementById("planStatus");
const planExpiryEl = document.getElementById("planExpiry");
const remainListingsEl = document.getElementById("remainListings");
const infoMsgEl = document.getElementById("infoMsg");
const myPropsEl = document.getElementById("myProps");

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await logoutUser();
    location.href = "login.html";
  });
}

// ✅ Plan Days logic
const PLAN_DAYS = {
  BASIC: 28,
  STANDARD: 56,
  PREMIUM: 84
};

// ✅ Listing Limits (aap chahe to change kar lena)
const LISTING_LIMIT = {
  BASIC: 5,
  STANDARD: 15,
  PREMIUM: 50
};

function formatDate(dateObj) {
  const d = String(dateObj.getDate()).padStart(2, "0");
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const y = dateObj.getFullYear();
  return `${d}-${m}-${y}`;
}

function calcExpiry(planType, planUpdatedAt) {
  if (!planType || !PLAN_DAYS[planType] || !planUpdatedAt) return null;

  const start = planUpdatedAt.toDate ? planUpdatedAt.toDate() : null;
  if (!start) return null;

  const expiry = new Date(start);
  expiry.setDate(expiry.getDate() + PLAN_DAYS[planType]);
  return expiry;
}

listenUser(async (u) => {
  if (!u) {
    location.href = "login.html";
    return;
  }

  userEmailEl.innerText = u.email;

  // ✅ Load user doc
  const userSnap = await getDoc(doc(db, "users", u.uid));
  if (!userSnap.exists()) {
    kycStatusEl.innerText = "NOT FOUND";
    planStatusEl.innerText = "NOT FOUND";
    planExpiryEl.innerText = "--";
    remainListingsEl.innerText = "0";
    infoMsgEl.innerText = "❌ User data not found in database.";
    return;
  }

  const ud = userSnap.data();

  // ✅ KYC Status
  const kycStatus = ud.kycStatus || "PENDING";
  kycStatusEl.innerText = kycStatus;

  // ✅ Plan Status + Plan Type
  const planStatus = ud.planStatus || "NOT ACTIVE";
  const planType = ud.planType || "BASIC";

  // show plan status readable
  planStatusEl.innerText = `${planStatus} (${planType})`;

  // ✅ Expiry calculation (based on planUpdatedAt)
  const expiryDate = calcExpiry(planType, ud.planUpdatedAt);

  if (planStatus !== "ACTIVE") {
    planExpiryEl.innerText = "—";
  } else if (!expiryDate) {
    planExpiryEl.innerText = "ACTIVE";
  } else {
    const today = new Date();
    const diffMs = expiryDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      planExpiryEl.innerText = "EXPIRED";
    } else {
      planExpiryEl.innerText = `${formatDate(expiryDate)} (${daysLeft}d left)`;
    }
  }

  // ✅ Listings Remaining logic
  const limit = LISTING_LIMIT[planType] || 5;

  // Count user properties
  const q = query(collection(db, "properties"), where("uid", "==", u.uid));
  const propsSnap = await getDocs(q);
  const totalProps = propsSnap.size;

  const remaining = Math.max(limit - totalProps, 0);
  remainListingsEl.innerText = remaining;

  // ✅ Info Message
  if (kycStatus !== "APPROVED") {
    infoMsgEl.innerText = "⚠️ KYC Pending: Pehle KYC approve karvao.";
  } else if (planStatus !== "ACTIVE") {
    infoMsgEl.innerText = "⚠️ Plan Active nahi hai: Buy / Renew Plan karo.";
  } else {
    infoMsgEl.innerText = "✅ Everything looks good! You can add properties.";
  }

  // ✅ Show My Properties (basic view)
  myPropsEl.innerHTML = "";

  if (propsSnap.empty) {
    myPropsEl.innerHTML = `<p class="small">No properties added yet.</p>`;
    return;
  }

  propsSnap.forEach((docx) => {
    const p = docx.data();
    const title = p.title || p.propertyTitle || "Property";
    const city = p.city || "";
    const price = p.price || "";

    myPropsEl.innerHTML += `
      <div class="box">
        <h3>${title}</h3>
        <p class="small">📍 ${city}</p>
        <p class="small">💰 ${price}</p>
      </div>
    `;
  });
});
