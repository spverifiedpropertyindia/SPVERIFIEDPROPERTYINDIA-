import { db } from "./firebase.js";
import { listenUser, logoutUser } from "./auth.js";

import {
  doc, getDoc,
  collection, query, where, orderBy, onSnapshot,
  getDocs, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const logoutBtn = document.getElementById("logoutBtn");
const userEmail = document.getElementById("userEmail");

const kycStatusEl = document.getElementById("kycStatus");
const planStatusEl = document.getElementById("planStatus");
const planExpiryEl = document.getElementById("planExpiry");
const remainListingsEl = document.getElementById("remainListings");

const infoMsg = document.getElementById("infoMsg");
const addBtn = document.getElementById("addBtn");

const myProps = document.getElementById("myProps");

function toDateSafe(val){
  try{
    if(!val) return null;

    // Firestore Timestamp case
    if(typeof val === "object" && val.seconds){
      return new Date(val.seconds * 1000);
    }

    // ISO string case
    return new Date(val);
  }catch(e){
    return null;
  }
}

function isPlanActive(userData){
  if(!userData) return false;

  if(userData.planStatus !== "ACTIVE") return false;

  const exp = toDateSafe(userData.planExpiryDate);
  if(!exp) return false;

  return exp.getTime() > Date.now();
}

function planDaysRemaining(userData){
  const exp = toDateSafe(userData.planExpiryDate);
  if(!exp) return 0;

  const diff = exp.getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}

// ✅ Logout
if(logoutBtn){
  logoutBtn.onclick = async ()=>{
    await logoutUser();
    location.href = "login.html";
  };
}

// ✅ Main
listenUser(async (u)=>{
  if(!u){
    alert("Login required!");
    location.href = "login.html";
    return;
  }

  if(userEmail) userEmail.innerText = u.email;

  // ✅ Load user data
  const userSnap = await getDoc(doc(db, "users", u.uid));

  let userData = {};
  if(userSnap.exists()){
    userData = userSnap.data();
  }

  // ✅ KYC Status
  const kycStatus = userData.kycStatus || "NOT_SUBMITTED";
  if(kycStatusEl) kycStatusEl.innerText = kycStatus;

  // ✅ Plan Status + Expiry
  const planStatus = userData.planStatus || "INACTIVE";
  if(planStatusEl) planStatusEl.innerText = planStatus;

  // Expiry label (admin-pro.js sets planExpiryLabel also)
  const expLabel = userData.planExpiryLabel || "--";
  if(planExpiryEl) planExpiryEl.innerText = expLabel;

  // ✅ Listings remaining (simple rule)
  // BASIC = 3, STANDARD = 10, PREMIUM = 25
  const LIMITS = { BASIC: 3, STANDARD: 10, PREMIUM: 25 };
  const planName = userData.planName || "BASIC";
  const maxListings = LIMITS[planName] || 0;

  // ✅ Check current plan active or expired
  const active = isPlanActive(userData);
  const remainingDays = planDaysRemaining(userData);

  // ✅ NEW FEATURE: Plan expired -> Auto Expire Properties
  if(!active){
    await expireUserProperties(u.uid);
  }

  // ✅ UI messages + Add Property allow/deny
  if(!active){
    if(infoMsg){
      infoMsg.innerHTML = `⚠️ आपका प्लान Active नहीं है या Expire हो गया है। पहले <b>Buy / Renew Plan</b> करें।`;
    }
    if(addBtn){
      addBtn.classList.add("disabled");
      addBtn.style.pointerEvents = "none";
      addBtn.style.opacity = "0.5";
      addBtn.innerText = "Add Property (Plan Required)";
    }
    if(remainListingsEl) remainListingsEl.innerText = "0";
  }else{
    if(infoMsg){
      infoMsg.innerHTML = `✅ आपका प्लान Active है। (<b>${planName}</b>) - Expiry in <b>${remainingDays}</b> days`;
    }
    if(addBtn){
      addBtn.style.pointerEvents = "auto";
      addBtn.style.opacity = "1";
      addBtn.innerText = "Add Property";
    }

    // Remaining listings will be calculated after loading properties
    if(remainListingsEl) remainListingsEl.innerText = maxListings.toString();
  }

  // ✅ Load My Properties
  loadMyProperties(u.uid, maxListings, active);
});

// ✅ My Properties List
function loadMyProperties(uid, maxListings, planActive){
  if(!myProps) return;

  const q = query(
    collection(db, "properties"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snap)=>{
    myProps.innerHTML = "";

    let count = 0;

    snap.forEach((d)=>{
      count++;
      const p = d.data();

      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <h3>${p.title || "Property"}</h3>
        <p class="small"><b>City:</b> ${p.city || ""}</p>
        <p class="small"><b>Type:</b> ${p.type || ""}</p>
        <p class="small"><b>Price:</b> ${p.price || ""}</p>
        <p class="small"><b>Status:</b> ${p.status || "PENDING"}</p>
      `;

      myProps.appendChild(card);
    });

    // ✅ Remaining listings update (only if plan active)
    const remainListingsEl = document.getElementById("remainListings");
    if(planActive){
      let remaining = maxListings - count;
      if(remaining < 0) remaining = 0;
      if(remainListingsEl) remainListingsEl.innerText = remaining.toString();

      // ✅ If limit over, block Add Property
      const addBtn = document.getElementById("addBtn");
      if(addBtn){
        if(remaining <= 0){
          addBtn.style.pointerEvents = "none";
          addBtn.style.opacity = "0.5";
          addBtn.innerText = "Limit Reached";
          const infoMsg = document.getElementById("infoMsg");
          if(infoMsg){
            infoMsg.innerHTML = `⚠️ आपकी listing limit खत्म हो गई है। अधिक listing के लिए <b>Upgrade Plan</b> करें।`;
          }
        }
      }
    }

    if(count === 0){
      myProps.innerHTML = `<p class="small">No properties yet. Add your first property ✅</p>`;
    }
  });
}

// ✅ NEW FEATURE FUNCTION: Auto Expire Approved Properties when plan expires
async function expireUserProperties(uid){
  try{
    const q = query(
      collection(db, "properties"),
      where("uid", "==", uid),
      where("status", "==", "APPROVED")
    );

    const snap = await getDocs(q);
    if(snap.empty) return;

    const batch = writeBatch(db);

    snap.forEach((d)=>{
      batch.update(doc(db, "properties", d.id), {
        status: "EXPIRED",
        expiredAt: new Date().toISOString()
      });
    });

    await batch.commit();
    console.log("✅ Auto Expired properties (plan expired)");
  }catch(err){
    console.log("❌ Expire error:", err);
  }
}
