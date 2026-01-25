import { db } from "./firebase.js";
import { listenUser } from "./auth.js";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const form = document.getElementById("propForm");
const warning = document.getElementById("warning");

const gpsBtn = document.getElementById("gpsBtn");
const gpsText = document.getElementById("gpsText");

const dateTimeInput = document.getElementById("dateTime");

const photo1 = document.getElementById("photo1");
const photo2 = document.getElementById("photo2");
const photo3 = document.getElementById("photo3");
const photoPreview = document.getElementById("photoPreview");

let currentUser = null;

let gpsData = {
  lat: null,
  lng: null
};

// ✅ Auto DateTime
function setDateTime(){
  const now = new Date();
  const pad = (n)=> String(n).padStart(2,"0");
  const dt = `${pad(now.getDate())}-${pad(now.getMonth()+1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if(dateTimeInput) dateTimeInput.value = dt;
}
setDateTime();

listenUser(async (u)=>{
  if(!u){
    alert("Login required!");
    location.href = "login.html";
    return;
  }
  currentUser = u;

  // ✅ Optional safety check
  const userSnap = await getDoc(doc(db, "users", u.uid));
  if(userSnap.exists()){
    const ud = userSnap.data();

    if(ud.kycStatus !== "APPROVED"){
      if(warning) warning.innerHTML = "⚠️ KYC APPROVED hona जरूरी hai. Pehle KYC approve karvao.";
    } else if(ud.planStatus !== "ACTIVE"){
      if(warning) warning.innerHTML = "⚠️ Plan ACTIVE hona जरूरी hai. Pehle plan buy/renew karo.";
    } else {
      if(warning) warning.innerHTML = "✅ You can submit property.";
    }
  }
});

// ✅ Preview helper
function showPreview(){
  if(!photoPreview) return;

  const files = [
    photo1?.files?.[0],
    photo2?.files?.[0],
    photo3?.files?.[0]
  ].filter(Boolean);

  if(files.length === 0){
    photoPreview.innerHTML = "";
    return;
  }

  let html = `<div style="display:flex;gap:8px;flex-wrap:wrap;">`;

  files.forEach((f)=>{
    const url = URL.createObjectURL(f);
    html += `
      <img src="${url}" style="width:110px;height:80px;object-fit:cover;border-radius:12px;border:1px solid #eee;" />
    `;
  });

  html += `</div>`;
  photoPreview.innerHTML = html;
}

if(photo1) photo1.onchange = showPreview;
if(photo2) photo2.onchange = showPreview;
if(photo3) photo3.onchange = showPreview;

// ✅ Reverse Geocode (Free Nominatim)
async function reverseGeocode(lat, lng){
  try{
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url);
    const data = await res.json();

    const address = data.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      "";

    const state = address.state || "";
    const full = data.display_name || "";

    return { city, state, full };
  }catch(e){
    return { city:"", state:"", full:"" };
  }
}

// ✅ GPS Capture
if(gpsBtn){
  gpsBtn.onclick = async ()=>{
    gpsText.innerText = "⏳ Capturing GPS...";

    if(!navigator.geolocation){
      gpsText.innerText = "❌ GPS not supported!";
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos)=>{
      gpsData.lat = pos.coords.latitude;
      gpsData.lng = pos.coords.longitude;

      gpsText.innerText = `✅ GPS Captured: ${gpsData.lat.toFixed(6)}, ${gpsData.lng.toFixed(6)}`;

      const result = await reverseGeocode(gpsData.lat, gpsData.lng);

      const cityEl = document.getElementById("city");
      const stateEl = document.getElementById("state");
      const addrEl = document.getElementById("locationAddress");

      if(cityEl) cityEl.value = result.city || "";
      if(stateEl) stateEl.value = result.state || "";
      if(addrEl) addrEl.value = result.full || "";

    }, ()=>{
      gpsText.innerText = "❌ GPS Permission denied!";
    }, {
      enableHighAccuracy: true,
      timeout: 15000
    });
  };
}

// ✅ Submit Property
if(form){
  form.onsubmit = async (e)=>{
    e.preventDefault();
    if(!currentUser) return;

    // ✅ Minimum 3 Photos compulsory check
    const f1 = photo1?.files?.[0];
    const f2 = photo2?.files?.[0];
    const f3 = photo3?.files?.[0];

    if(!f1 || !f2 || !f3){
      alert("⚠️ Minimum 3 photos (Front/Left/Right) compulsory hai!");
      return;
    }

    // ✅ GPS compulsory check
    if(!gpsData.lat || !gpsData.lng){
      alert("⚠️ GPS capture compulsory hai!");
      return;
    }

    const title = document.getElementById("title").value.trim();
    const type = document.getElementById("type").value.trim();
    const price = document.getElementById("price").value.trim();
    const description = document.getElementById("description").value.trim();
    const ownerName = document.getElementById("ownerName").value.trim();
    const ownerPhone = document.getElementById("ownerPhone").value.trim();

    const city = document.getElementById("city").value.trim();
    const state = document.getElementById("state").value.trim();
    const locationAddress = document.getElementById("locationAddress").value.trim();

    await addDoc(collection(db, "properties"), {
      uid: currentUser.uid,
      email: currentUser.email,

      title,
      type,
      price,
      description,
      ownerName,
      ownerPhone,

      city,
      state,
      locationAddress,

      gpsLat: gpsData.lat,
      gpsLng: gpsData.lng,

      // ✅ Photo only selection info (no upload)
      photo1Selected: true,
      photo2Selected: true,
      photo3Selected: true,

      status: "PENDING",
      createdAt: serverTimestamp()
    });

    alert("✅ Property Submitted! Status: PENDING");
    form.reset();

    gpsData = { lat:null, lng:null };
    if(gpsText) gpsText.innerText = "GPS not captured ❌";
    if(photoPreview) photoPreview.innerHTML = "";
    setDateTime();
  };
  }
