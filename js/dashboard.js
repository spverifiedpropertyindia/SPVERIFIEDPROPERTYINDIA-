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

// ✅ Safe date converter
function toDateSafe(val){
  try{
    if(!val) return null;

    // Firestore Timestamp
    if(typeof val === "object" && val.seconds){
      return new Date(val.seconds * 1000);
    }

    // ISO string
    return new Date(val);
  }catch(e){
    return null;
  }
}

// ✅ plan active check
function isPlanActive(userData){
  if(!userData) return false;

  if(userData.planStatus !== "ACTIVE") return false;

  const exp = toDateSafe(userData.planExpiryAt);
  if(!exp) return false;

  return exp.getTime() > Date.now();
}

// ✅ days remaining
function planDaysRemaining(userData){
  const exp = toDateSafe(userData.planExpiryAt);
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

  // ✅ Plan Status
  const planStatus = userData.planStatus || "INACTIVE";
  if(planStatusEl) planStatusEl.innerText = planStatus;

  // ✅ Expiry show
  const expDateObj = toDateSafe(userData.planExpiryAt);
  const expLabel = expDateObj ? expDateObj.toDateString() : "--";
  if(planExpiryEl) planExpiryEl.innerText = expLabel;

  // ✅ Listing limits
  const LIMITS = { BASIC: 3, STANDARD: 10, PREMIUM: 25 };

  // ✅ new system uses planType
  const planName = userData.planType || "BASIC";
  const maxListings = LIMITS[planName] || 0;

  // ✅ Plan active?
  const active = isPlanActive(userData);
  const remainingDays = planDaysRemaining(userData);

  // ✅ Auto Expire Approved Properties when plan expires
  if(!active){
    await expireUserProperties(u.uid);
  }

  // ✅ UI messages + Add Property allow/deny
  if(kycStatus !== "APPROVED"){
    if(infoMsg){
      infoMsg.innerHTML = `⚠️ आपका KYC <b>${kycStatus}</b> है। पहले <b>KYC Approved</b> कराओ।`;
    }
    if(addBtn){
      addBtn.style.pointerEvents = "none";
      addBtn.style.opacity = "0.5";
      addBtn.innerText = "Add Property (KYC Required)";
    }
    if(remainListingsEl) remainListingsEl.innerText = "0";

    loadMyProperties(u.uid, maxListings, false);
    return;
  }

  if(!active){
    if(infoMsg){
      infoMsg.innerHTML = `⚠️ आपका प्लान Active नहीं है या Expire हो गया है। पहले <b>Buy / Renew Plan</b> करें।`;
    }
    if(addBtn){
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
    where("createdBy", "==", uid),
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
        <p class="small"><b>District:</b> ${p.district || ""}</p>
        <p class="small"><b>Block:</b> ${p.block || ""}</p>
        <p class="small"><b>Village:</b> ${p.village || ""}</p>
        <p class="small"><b>Type:</b> ${p.type || ""}</p>
        <p class="small"><b>Price:</b> ${p.price || ""}</p>
        <p class="small"><b>Status:</b> ${p.status || "PENDING"}</p>
      `;

      myProps.appendChild(card);
    });

    // ✅ Remaining listings update
    if(planActive){
      let remaining = maxListings - count;
      if(remaining < 0) remaining = 0;

      if(remainListingsEl) remainListingsEl.innerText = remaining.toString();

      // ✅ If limit over, block Add Property
      if(addBtn && remaining <= 0){
        addBtn.style.pointerEvents = "none";
        addBtn.style.opacity = "0.5";
        addBtn.innerText = "Limit Reached";

        if(infoMsg){
          infoMsg.innerHTML = `⚠️ आपकी listing limit खत्म हो गई है। अधिक listing के लिए <b>Upgrade Plan</b> करें।`;
        }
      }
    }

    if(count === 0){
      myProps.innerHTML = `<p class="small">No properties yet. Add your first property ✅</p>`;
    }
  });
}

// ✅ Auto Expire Approved Properties when plan expires
async function expireUserProperties(uid){
  try{
    const q = query(
      collection(db, "properties"),
      where("createdBy", "==", uid),
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
