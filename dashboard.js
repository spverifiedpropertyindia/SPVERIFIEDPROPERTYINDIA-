import { db } from "./firebase.js";
import { listenUser, logout } from "./auth.js";
import { getMonthlyLimit } from "./plan-utils.js";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const logoutBtn = document.getElementById("logoutBtn");
const userEmail = document.getElementById("userEmail");

const kycStatus = document.getElementById("kycStatus");
const planStatus = document.getElementById("planStatus");
const planExpiry = document.getElementById("planExpiry");
const remainListings = document.getElementById("remainListings");

const infoMsg = document.getElementById("infoMsg");
const addBtn = document.getElementById("addBtn");
const myProps = document.getElementById("myProps");

logoutBtn.onclick = async () => {
  await logout();
  location.href = "index.html";
};

function formatDate(ts){
  if(!ts) return "--";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}

function propCard(id,p){
  return `
    <div class="card">
      <img src="${p.image || 'https://picsum.photos/500/300'}" />
      <div class="p">
        <div class="badge">${p.status || "PENDING"} • ${p.liveStatus || "EXPIRED"}</div>
        <h3>${p.title || ""}</h3>
        <div class="price">₹ ${p.price || ""}</div>
        <p class="small">${p.city || ""} • ${p.state || ""} • ${p.type || ""}</p>
        <div style="margin-top:10px;">
          <a class="btn2" href="property.html?id=${id}" style="display:inline-block;">View</a>
        </div>
      </div>
    </div>
  `;
}

listenUser(async (u)=>{
  if(!u){
    alert("Login required!");
    location.href = "login.html";
    return;
  }

  userEmail.innerText = u.email;

  const uSnap = await getDoc(doc(db,"users",u.uid));

  let userData = { kycStatus: "PENDING", planStatus: "EXPIRED" };
  if(uSnap.exists()) userData = uSnap.data();

  kycStatus.innerText = userData.kycStatus || "PENDING";
  planStatus.innerText = userData.planStatus || "EXPIRED";
  planExpiry.innerText = formatDate(userData.planEndAt);

  const role = userData?.role || "OWNER";
  const plan = userData?.activePlan || "BASIC";
  const limit = getMonthlyLimit(role, plan);
  const used = userData?.monthlyListingsUsed ?? 0;

  if(limit >= 999999) remainListings.innerText = "Unlimited";
  else remainListings.innerText = Math.max(0, limit - used);

  const kycOk = userData.kycStatus === "APPROVED";
  const planOk = userData.planStatus === "ACTIVE";

  if(!kycOk){
    infoMsg.innerHTML = "⚠️ KYC Pending/Rejected. KYC approved hone ke baad hi property add hoga.";
    addBtn.style.pointerEvents = "none";
    addBtn.style.opacity = "0.5";
  } else if(!planOk){
    infoMsg.innerHTML = "⚠️ Plan EXPIRED. Buy/Renew plan to add property.";
    addBtn.style.pointerEvents = "none";
    addBtn.style.opacity = "0.5";
  } else {
    infoMsg.innerHTML = "✅ KYC Approved + Plan Active. You can add property now!";
    addBtn.style.pointerEvents = "auto";
    addBtn.style.opacity = "1";
  }

  myProps.innerHTML = "Loading...";
  const pq = query(collection(db,"properties"), where("uid","==",u.uid), orderBy("createdAt","desc"));
  const psnap = await getDocs(pq);

  let html = "";
  psnap.forEach((d)=>{ html += propCard(d.id, d.data()); });
  myProps.innerHTML = html || "<p>No properties submitted yet.</p>";
});
