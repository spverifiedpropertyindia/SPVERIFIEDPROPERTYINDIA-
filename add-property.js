import { db } from "./firebase.js";
import { listenUser } from "./auth.js";
import { getMonthlyLimit, isMonthResetNeeded } from "./plan-utils.js";

import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const warning = document.getElementById("warning");
const form = document.getElementById("propForm");
const gpsText = document.getElementById("gpsText");

let user = null;
let userDocRef = null;
let userData = null;

let gpsData = null;
let capturedAt = null;

function setDateTimeNow(){
  const now = new Date();
  capturedAt = now;
  const dt = now.toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
  document.getElementById("dateTime").value = dt;
}
setDateTimeNow();

window.openCamera = function(){
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";
  input.click();
  input.onchange = () => alert("✅ Photo captured! Ab postimages.org pe upload karke link paste karo.");
};

async function reverseGeocode(lat, lng){
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  const data = await res.json();

  const address = data.address || {};
  const city = address.city || address.town || address.village || address.county || "";
  const state = address.state || "";
  const full = data.display_name || "";

  return { city, state, full };
}

window.captureGPS = async function(){
  if(!navigator.geolocation){
    alert("GPS not supported!");
    return;
  }

  gpsText.innerHTML = "Capturing GPS... ⏳";

  navigator.geolocation.getCurrentPosition(
    async (pos)=>{
      gpsData = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      gpsText.innerHTML = `✅ GPS Captured: ${gpsData.lat.toFixed(6)}, ${gpsData.lng.toFixed(6)}`;
      setDateTimeNow();

      try{
        const loc = await reverseGeocode(gpsData.lat, gpsData.lng);
        document.getElementById("city").value = loc.city || "Unknown";
        document.getElementById("state").value = loc.state || "Unknown";
        document.getElementById("locationAddress").value = loc.full || "Address not found";
      }catch(e){
        alert("GPS captured ✅ but Address fetch failed ❌ Try again");
      }
    },
    ()=>{
      gpsData = null;
      gpsText.innerHTML = "GPS capture failed ❌";
      alert("Please allow GPS permission!");
    },
    { enableHighAccuracy:true, timeout:15000 }
  );
};

listenUser(async (u)=>{
  if(!u){
    alert("Login required!");
    location.href = "login.html";
    return;
  }
  user = u;
  userDocRef = doc(db,"users",u.uid);

  const uSnap = await getDoc(userDocRef);
  if(uSnap.exists()) userData = uSnap.data();

  const kycOk = userData?.kycStatus === "APPROVED";
  const planOk = userData?.planStatus === "ACTIVE";

  if(!kycOk){
    warning.innerHTML = "❌ KYC not approved. Please complete KYC first.";
    form.style.display = "none";
    return;
  }
  if(!planOk){
    warning.innerHTML = "❌ Plan not active. Please buy/renew plan first.";
    form.style.display = "none";
    return;
  }

  let used = userData?.monthlyListingsUsed ?? 0;
  const needReset = isMonthResetNeeded(userData?.monthlyResetAt);
  if(needReset){
    await updateDoc(userDocRef, { monthlyListingsUsed: 0, monthlyResetAt: serverTimestamp() });
    used = 0;
  }

  const role = userData?.role || "OWNER";
  const plan = userData?.activePlan || "BASIC";
  const limit = getMonthlyLimit(role, plan);
  const remaining = limit - used;

  if(limit >= 999999){
    warning.innerHTML = `✅ Plan Active (${role} ${plan}) • Unlimited listing`;
    return;
  }

  if(remaining <= 0){
    warning.innerHTML = `❌ Monthly limit reached! (${role} ${plan})<br/>Used: <b>${used}/${limit}</b>`;
    form.style.display = "none";
    return;
  }

  warning.innerHTML = `✅ KYC Approved + Plan Active<br/>Remaining listings this month: <b>${remaining}</b> / ${limit}`;
});

form.onsubmit = async (e)=>{
  e.preventDefault();
  if(!user || !userDocRef) return;

  const freshSnap = await getDoc(userDocRef);
  if(!freshSnap.exists()){ alert("User profile missing!"); return; }
  const ud = freshSnap.data();

  if(ud.kycStatus !== "APPROVED"){ alert("KYC not approved!"); return; }
  if(ud.planStatus !== "ACTIVE"){ alert("Plan not active!"); return; }

  if(!image.value.trim()){ alert("Image URL compulsory है!"); return; }
  if(!gpsData){ alert("GPS capture compulsory है!"); return; }
  if(!city.value.trim() || !state.value.trim() || !locationAddress.value.trim()){
    alert("City/State/Address missing है! फिर से GPS Capture करो ✅");
    return;
  }

  let used = ud.monthlyListingsUsed ?? 0;
  const needReset = isMonthResetNeeded(ud.monthlyResetAt);
  if(needReset){
    await updateDoc(userDocRef, { monthlyListingsUsed: 0, monthlyResetAt: serverTimestamp() });
    used = 0;
  }

  const role = ud.role || "OWNER";
  const plan = ud.activePlan || "BASIC";
  const limit = getMonthlyLimit(role, plan);

  if(limit < 999999 && used >= limit){
    alert(`Monthly limit reached! (${used}/${limit})`);
    return;
  }

  await addDoc(collection(db,"properties"),{
    uid: user.uid,
    email: user.email,

    title: title.value,
    type: type.value,
    price: price.value,

    image: image.value.trim(),

    gps: gpsData,
    city: city.value,
    state: state.value,
    locationAddress: locationAddress.value,
    capturedAt: capturedAt,

    description: description.value,
    ownerName: ownerName.value,
    ownerPhone: ownerPhone.value,

    status: "PENDING",
    liveStatus: "EXPIRED",
    createdAt: serverTimestamp()
  });

  if(limit < 999999){
    await updateDoc(userDocRef, { monthlyListingsUsed: (used + 1) });
  }

  alert("✅ Property submitted! (PENDING Approval)");
  form.reset();
  location.href = "dashboard.html";
};
