// js/add-property.js
import { db } from "./firebase.js";
import { listenUser } from "./auth.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const form = document.getElementById("propForm");

const photoFile = document.getElementById("photoFile");
const previewBox = document.getElementById("previewBox");

const gpsBtn = document.getElementById("gpsBtn");
const city = document.getElementById("city");
const state = document.getElementById("state");
const locationAddress = document.getElementById("locationAddress");
const lat = document.getElementById("lat");
const lng = document.getElementById("lng");

let currentUser = null;
let finalWatermarkedBase64 = "";

// ✅ Login check
listenUser((u)=>{
  if(!u){
    alert("Login required ✅");
    location.href="login.html";
    return;
  }
  currentUser = u;
});

// ✅ Date/Time String
function getDateTimeString(){
  const now = new Date();
  const d = now.toLocaleDateString();
  const t = now.toLocaleTimeString();
  return `${d} ${t}`;
}

// ✅ Watermark function
async function addWatermarkToBase64(base64, textLines = []) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      // draw original photo
      ctx.drawImage(img, 0, 0);

      // watermark background strip
      const padding = Math.max(18, Math.floor(img.width * 0.02));
      const lineHeight = Math.max(30, Math.floor(img.width * 0.03));
      const stripHeight = (textLines.length * lineHeight) + padding;

      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, canvas.height - stripHeight, canvas.width, stripHeight);

      // watermark text
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(18, Math.floor(img.width * 0.028))}px Arial`;
      ctx.textBaseline = "top";

      let y = canvas.height - stripHeight + Math.floor(padding * 0.5);
      for(const line of textLines){
        ctx.fillText(line, padding, y);
        y += lineHeight;
      }

      const out = canvas.toDataURL("image/jpeg", 0.75); // ✅ compressed
      resolve(out);
    };

    img.onerror = reject;
    img.src = base64;
  });
}

// ✅ GPS capture
gpsBtn.onclick = ()=>{
  if(!navigator.geolocation){
    alert("GPS not supported ❌");
    return;
  }

  gpsBtn.innerText = "Getting GPS...";
  navigator.geolocation.getCurrentPosition(
    (pos)=>{
      lat.value = pos.coords.latitude;
      lng.value = pos.coords.longitude;

      // ✅ fallback autofill (manual allowed)
      if(!city.value) city.value = "Fill City";
      if(!state.value) state.value = "Fill State";
      if(!locationAddress.value) locationAddress.value = `Lat:${lat.value}, Lng:${lng.value}`;

      gpsBtn.innerText = "✅ GPS Captured";
    },
    ()=>{
      gpsBtn.innerText = "📍 Capture GPS";
      alert("GPS permission denied ❌\nAllow location OR fill manually ✅");
    },
    { enableHighAccuracy:true, timeout:15000 }
  );
};

// ✅ Photo capture -> Base64 -> Watermark
photoFile.addEventListener("change", async ()=>{
  const file = photoFile.files?.[0];
  if(!file) return;

  const reader = new FileReader();

  reader.onload = async ()=>{
    try{
      const base64 = reader.result;

      const dt = getDateTimeString();
      const gpsText = (lat.value && lng.value) ? `GPS: ${lat.value}, ${lng.value}` : "GPS: Not Captured";
      const cityState = `City/State: ${city.value || "-"}, ${state.value || "-"}`;

      const lines = [
        "✅ SP VERIFIED PROPERTY INDIA",
        `Date/Time: ${dt}`,
        gpsText,
        cityState
      ];

      finalWatermarkedBase64 = await addWatermarkToBase64(base64, lines);

      previewBox.innerHTML = `
        <img src="${finalWatermarkedBase64}"
             style="width:100%;max-height:240px;object-fit:cover;border-radius:16px;border:1px solid #eee;">
        <p class="small" style="margin-top:8px;">✅ Watermark Applied (Date/Time/GPS)</p>
      `;
    }catch(e){
      console.error(e);
      alert("Watermark error ❌");
    }
  };

  reader.readAsDataURL(file);
});

// ✅ Submit
form.onsubmit = async (e)=>{
  e.preventDefault();

  if(!finalWatermarkedBase64){
    alert("Photo required ❌");
    return;
  }

  if(!lat.value || !lng.value){
    alert("GPS required ❌ (Capture GPS button दबाओ)");
    return;
  }

  const data = {
    uid: currentUser.uid,
    email: currentUser.email,

    title: document.getElementById("title").value.trim(),
    type: document.getElementById("type").value.trim(),
    price: document.getElementById("price").value.trim(),
    description: document.getElementById("description").value.trim(),

    image: finalWatermarkedBase64, // ✅ watermarked photo saved
    city: city.value.trim(),
    state: state.value.trim(),
    locationAddress: locationAddress.value.trim(),
    gps: { lat:Number(lat.value), lng:Number(lng.value) },

    status: "PENDING",
    liveStatus: "EXPIRED",
    createdAt: serverTimestamp()
  };

  await addDoc(collection(db,"properties"), data);

  alert("✅ Property Submitted!\nAdmin approve के बाद live होगी ✅");
  location.href="dashboard.html";
};
