// js/add-property.js
import { db } from "./firebase.js";
import { listenUser } from "./auth.js";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const ADMIN_EMAIL = "raazsahu1000@gmail.com";

// DOM
const form = document.getElementById("propForm");
const dateTime = document.getElementById("dateTime");

const photoFile = document.getElementById("photoFile");
const photoPreview = document.getElementById("photoPreview");
const imageUrlInput = document.getElementById("image");

const gpsBtn = document.getElementById("gpsBtn");
const gpsText = document.getElementById("gpsText");

const city = document.getElementById("city");
const state = document.getElementById("state");
const locationAddress = document.getElementById("locationAddress");

let currentUser = null;
let base64Photo = "";
let gpsLat = null;
let gpsLng = null;

// Auto Date/Time
function nowText(){
  const d = new Date();
  return d.toLocaleDateString() + " " + d.toLocaleTimeString();
}
if(dateTime) dateTime.value = nowText();

// Login check
listenUser((u)=>{
  if(!u){
    alert("Login required ✅");
    location.href="login.html";
    return;
  }
  currentUser = u;
});

// ✅ Convert photo to base64 + preview
photoFile.addEventListener("change", ()=>{
  const file = photoFile.files?.[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = ()=>{
    base64Photo = reader.result;
    photoPreview.innerHTML = `
      <img src="${base64Photo}"
        style="width:100%;max-height:230px;object-fit:cover;border-radius:16px;border:1px solid #eee;">
      <p class="small" style="margin-top:8px;">✅ Photo Selected</p>
    `;
  };
  reader.readAsDataURL(file);
});

// ✅ Reverse geocode (FREE) from lat/lng using OpenStreetMap Nominatim
async function reverseGeocode(lat, lng){
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, {
    headers: { "Accept": "application/json" }
  });
  const data = await res.json();

  const addr = data.address || {};
  const cityName =
    addr.city || addr.town || addr.village || addr.county || "";

  const stateName = addr.state || "";

  const full = data.display_name || "";

  return { cityName, stateName, full };
}

// ✅ GPS Capture button (100% reliable)
gpsBtn.onclick = ()=>{
  if(!navigator.geolocation){
    alert("❌ GPS not supported in this phone");
    return;
  }

  gpsBtn.innerText = "📍 Capturing GPS...";
  gpsBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async (pos)=>{
      gpsLat = pos.coords.latitude;
      gpsLng = pos.coords.longitude;

      gpsText.innerHTML = `✅ GPS Captured: <b>${gpsLat}</b>, <b>${gpsLng}</b>`;

      // auto fill city/state/address
      try{
        const r = await reverseGeocode(gpsLat, gpsLng);
        city.value = r.cityName || "Unknown";
        state.value = r.stateName || "Unknown";
        locationAddress.value = r.full || `Lat:${gpsLat}, Lng:${gpsLng}`;
      }catch(e){
        city.value = "Fill manually";
        state.value = "Fill manually";
        locationAddress.value = `Lat:${gpsLat}, Lng:${gpsLng}`;
      }

      gpsBtn.innerText = "✅ GPS Captured";
      gpsBtn.disabled = false;
    },
    (err)=>{
      console.log(err);
      gpsBtn.innerText = "📍 Capture GPS";
      gpsBtn.disabled = false;

      if(err.code === 1){
        alert("❌ Location Permission BLOCKED!\n\n✅ Fix:\nChrome → Settings → Site Settings → Location → Allow\nthen reload site.");
      }else if(err.code === 2){
        alert("❌ GPS not available!\n✅ Turn ON Location + High Accuracy mode.");
      }else{
        alert("❌ GPS timeout!\n✅ Open GPS & try again.");
      }
    },
    { enableHighAccuracy:true, timeout:20000, maximumAge:0 }
  );
};

// ✅ Submit
form.onsubmit = async (e)=>{
  e.preventDefault();

  if(!currentUser){
    alert("Login required ❌");
    return;
  }

  const isAdmin = currentUser.email === ADMIN_EMAIL;

  // user doc check (user process only)
  const userSnap = await getDoc(doc(db,"users",currentUser.uid));
  const userData = userSnap.exists() ? userSnap.data() : {};

  if(!isAdmin && userData.kycStatus !== "APPROVED"){
    alert("KYC Pending ❌\nAdmin approve के बाद property add होगा ✅");
    location.href="kyc.html";
    return;
  }

  if(!isAdmin && userData.planStatus !== "ACTIVE"){
    alert("Plan required ❌\nPlan buy करके फिर add करो ✅");
    location.href="plans.html";
    return;
  }

  // ✅ Photo required
  if(!base64Photo && !(imageUrlInput.value || "").trim()){
    alert("Photo compulsory ❌\nCamera/Gallery से photo select करो ✅");
    return;
  }

  // ✅ GPS required
  if(!gpsLat || !gpsLng){
    alert("GPS compulsory ❌\nपहले Capture GPS button दबाओ ✅");
    return;
  }

  // Prefer Image URL if user provided, else base64
  const finalImage = (imageUrlInput.value || "").trim() || base64Photo;

  const data = {
    uid: currentUser.uid,
    email: currentUser.email,

    title: document.getElementById("title").value.trim(),
    type: document.getElementById("type").value.trim(),
    price: document.getElementById("price").value.trim(),
    description: document.getElementById("description").value.trim(),

    ownerName: document.getElementById("ownerName").value.trim(),
    ownerPhone: document.getElementById("ownerPhone").value.trim(),

    image: finalImage,

    city: city.value.trim(),
    state: state.value.trim(),
    locationAddress: locationAddress.value.trim(),
    gps: { lat: gpsLat, lng: gpsLng },

    status: "PENDING",
    liveStatus: "EXPIRED",
    createdAt: serverTimestamp()
  };

  await addDoc(collection(db,"properties"), data);

  alert("✅ Property Submitted!\nAdmin approve के बाद LIVE होगी ✅");
  location.href="dashboard.html";
};
