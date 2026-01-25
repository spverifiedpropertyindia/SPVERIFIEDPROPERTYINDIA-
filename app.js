// js/app.js
import { db } from "./firebase.js";
import { listenUser, logout } from "./auth.js";

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const ADMIN_EMAIL = "raazsahu1000@gmail.com";

const listDiv = document.getElementById("list");
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("city");
const typeInput = document.getElementById("type");

const loginLink = document.getElementById("loginLink");
const adminLink = document.getElementById("adminLink");
const logoutBtn = document.getElementById("logoutBtn");

if(logoutBtn){
  logoutBtn.onclick = async ()=>{
    await logout();
    location.href="index.html";
  }
}

listenUser((user)=>{
  if(user){
    if(loginLink) loginLink.style.display="none";
    if(logoutBtn) logoutBtn.style.display="inline-block";
    if(adminLink && user.email === ADMIN_EMAIL) adminLink.style.display="inline-block";
  }else{
    if(loginLink) loginLink.style.display="inline-block";
    if(logoutBtn) logoutBtn.style.display="none";
    if(adminLink) adminLink.style.display="none";
  }
});

function cardHTML(docId, p){
  return `
    <div class="card">
      <img src="${p.image || 'https://picsum.photos/500/300'}" alt="property"/>
      <div class="p">
        <div class="badge">${p.type || ""}</div>
        <h3>${p.title || ""}</h3>
        <div class="price">₹ ${p.price || ""}</div>
        <div class="small">${p.city || ""} • ${p.state || ""}</div>
        <div style="margin-top:10px;">
          <a class="btn" href="property.html?id=${docId}" style="display:inline-block;">View Details</a>
        </div>
      </div>
    </div>
  `;
}

async function loadProperties(){
  if(!listDiv) return;
  listDiv.innerHTML = "Loading...";

  let q = query(
    collection(db, "properties"),
    where("status", "==", "APPROVED"),
    where("liveStatus", "==", "LIVE"),
    orderBy("createdAt", "desc"),
    limit(30)
  );

  const city = cityInput?.value?.trim();
  const type = typeInput?.value?.trim();

  const snap = await getDocs(q);

  let html = "";
  snap.forEach((d)=>{
    const p = d.data();
    if(city && (p.city || "").toLowerCase() !== city.toLowerCase()) return;
    if(type && (p.type || "") !== type) return;
    html += cardHTML(d.id, p);
  });

  listDiv.innerHTML = html || "<p>No approved properties found.</p>";
}

if(searchBtn){
  searchBtn.onclick = loadProperties;
}
loadProperties();
