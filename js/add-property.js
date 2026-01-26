import { db } from "./firebase.js";
import { listenUser } from "./auth.js";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const statusMsg = document.getElementById("statusMsg");
const msg = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");
const form = document.getElementById("propForm");

// ✅ inputs
const districtSelect = document.getElementById("district");
const blockSelect = document.getElementById("block");
const villageInput = document.getElementById("village");
const villageList = document.getElementById("villageList");

let currentUser = null;
let userDoc = null;

// ✅ helpers
function daysLeft(expiryISO){
  if(!expiryISO) return null;
  const exp = new Date(expiryISO).getTime();
  const diff = exp - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isAccessAllowed(u){
  if(!u) return false;

  const kycOk = (u.kycStatus === "APPROVED");
  const planOk = (u.planStatus === "ACTIVE");

  if(!kycOk) return false;
  if(!planOk) return false;

  // ✅ expiry check
  if(u.planExpiryAt){
    const left = daysLeft(u.planExpiryAt);
    if(left < 0) return false;
  }

  return true;
}

// ✅ Load Districts
async function loadDistricts(){
  districtSelect.innerHTML = `<option value="">Select District</option>`;
  blockSelect.innerHTML = `<option value="">Select Block</option>`;
  villageInput.value = "";
  villageList.innerHTML = "";

  const snap = await getDoc(doc(db, "locations", "Chhattisgarh"));
  if(!snap.exists()){
    msg.innerHTML = "❌ Locations data not found! Upload it first.";
    return;
  }

  const districts = snap.data().districts || [];
  districts.forEach((d)=>{
    districtSelect.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

// ✅ Load Blocks
async function loadBlocks(districtName){
  blockSelect.innerHTML = `<option value="">Select Block</option>`;
  villageInput.value = "";
  villageList.innerHTML = "";

  if(!districtName) return;

  const snap = await getDoc(doc(db, "blocks", districtName.trim()));
  if(!snap.exists()) return;

  const blocks = snap.data().blocks || [];
  blocks.forEach((b)=>{
    blockSelect.innerHTML += `<option value="${b}">${b}</option>`;
  });
}

// ✅ Load Villages (Chunk mode)
async function loadVillages(districtName, blockName){
  villageInput.value = "";
  villageList.innerHTML = "";

  if(!districtName || !blockName) return;

  const q = query(
    collection(db, "villages"),
    where("district", "==", districtName.trim()),
    where("block", "==", blockName.trim()),
    orderBy("part", "asc")
  );

  const snap = await getDocs(q);

  let all = [];
  snap.forEach((d)=>{
    all = all.concat(d.data().villages || []);
  });

  all = Array.from(new Set(all)).sort();

  all.forEach((v)=>{
    const opt = document.createElement("option");
    opt.value = v;
    villageList.appendChild(opt);
  });
}

districtSelect.onchange = async () => {
  await loadBlocks(districtSelect.value);
};

blockSelect.onchange = async () => {
  await loadVillages(districtSelect.value, blockSelect.value);
};

// ✅ Check user access + enable form
listenUser(async (u)=>{
  if(!u){
    alert("Login required!");
    location.href = "login.html";
    return;
  }

  currentUser = u;

  await loadDistricts();

  // ✅ get user doc
  const snap = await getDoc(doc(db, "users", u.uid));
  if(!snap.exists()){
    statusMsg.innerHTML = "❌ User data missing!";
    return;
  }

  userDoc = snap.data();

  const allowed = isAccessAllowed(userDoc);

  if(!allowed){
    const left = userDoc.planExpiryAt ? daysLeft(userDoc.planExpiryAt) : null;

    statusMsg.innerHTML = `
      ❌ Access Locked!<br/>
      ✅ KYC: <b>${userDoc.kycStatus || "PENDING"}</b><br/>
      ✅ Plan: <b>${userDoc.planType || "NONE"}</b> (${userDoc.planStatus || "INACTIVE"})<br/>
      ✅ Expiry: <b>${userDoc.planExpiryAt ? new Date(userDoc.planExpiryAt).toDateString() : "N/A"}</b><br/>
      ✅ Days Left: <b>${left === null ? "N/A" : left}</b><br/>
      👉 Buy/Activate plan from Plans page.
    `;

    submitBtn.disabled = true;
    return;
  }

  statusMsg.innerHTML = "✅ Access OK! You can submit property.";
  submitBtn.disabled = false;
});

// ✅ Submit Property + Duplicate Block
form.onsubmit = async (e)=>{
  e.preventDefault();

  if(!currentUser || !userDoc) return;

  // ✅ re-check access just before submit
  if(!isAccessAllowed(userDoc)){
    alert("❌ Access locked! KYC/Plan issue.");
    return;
  }

  const title = document.getElementById("title").value.trim();
  const price = document.getElementById("price").value.trim();
  const district = districtSelect.value.trim();
  const block = blockSelect.value.trim();
  const village = villageInput.value.trim();
  const type = document.getElementById("type").value;
  const description = document.getElementById("description").value.trim();
  const ownerName = document.getElementById("ownerName").value.trim();
  const ownerPhone = document.getElementById("ownerPhone").value.trim();
  const whatsapp = document.getElementById("whatsapp").value.trim();
  const city = document.getElementById("city").value.trim();

  if(!title || !price || !district || !block || !village || !type || !description){
    alert("❌ Please fill all required fields!");
    return;
  }

  msg.innerHTML = "⏳ Checking duplicate property...";

  // ✅ DUPLICATE CHECK (same user + title + district + block + village)
  const dupQ = query(
    collection(db, "properties"),
    where("createdBy", "==", currentUser.uid),
    where("title", "==", title),
    where("district", "==", district),
    where("block", "==", block),
    where("village", "==", village)
  );

  const dupSnap = await getDocs(dupQ);
  if(!dupSnap.empty){
    msg.innerHTML = "❌ Duplicate property detected! Same property already exists.";
    alert("❌ Duplicate property detected!");
    return;
  }

  msg.innerHTML = "⏳ Submitting property...";

  await addDoc(collection(db, "properties"), {
    title,
    price,
    district,
    block,
    village,
    type,
    description,
    ownerName,
    ownerPhone,
    whatsapp,
    city,
    state: "Chhattisgarh",

    status: "PENDING",
    createdAt: serverTimestamp(),
    createdBy: currentUser.uid,
    createdEmail: currentUser.email || ""
  });

  msg.innerHTML = "✅ Property submitted! Admin approval pending.";
  alert("✅ Property submitted! Admin approval pending.");
  form.reset();

  // ✅ reset block/village
  blockSelect.innerHTML = `<option value="">Select Block</option>`;
  villageInput.value = "";
  villageList.innerHTML = "";
};
