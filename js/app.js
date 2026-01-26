import { db } from "./firebase.js";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const districtSelect = document.getElementById("district");
const blockSelect = document.getElementById("block");
const villageSelect = document.getElementById("village");
const typeSelect = document.getElementById("type");

const searchBtn = document.getElementById("searchBtn");
const list = document.getElementById("list");
const msg = document.getElementById("msg");

// ✅ Load districts
async function loadDistricts() {
  districtSelect.innerHTML = `<option value="">All District</option>`;
  blockSelect.innerHTML = `<option value="">All Block</option>`;
  villageSelect.innerHTML = `<option value="">All Village</option>`;

  const snap = await getDoc(doc(db, "locations", "Chhattisgarh"));
  if (!snap.exists()) {
    msg.innerHTML = "❌ District list not found! Upload locations data first.";
    return;
  }

  const data = snap.data();
  const districts = data.districts || [];

  districts.forEach((d) => {
    districtSelect.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

// ✅ Load blocks district-wise
async function loadBlocks(districtName) {
  blockSelect.innerHTML = `<option value="">All Block</option>`;
  villageSelect.innerHTML = `<option value="">All Village</option>`;

  if (!districtName) return;

  districtName = districtName.trim();

  const snap = await getDoc(doc(db, "blocks", districtName));
  if (!snap.exists()) return;

  const data = snap.data();
  const blocks = data.blocks || [];

  blocks.forEach((b) => {
    blockSelect.innerHTML += `<option value="${b}">${b}</option>`;
  });
}

// ✅ ✅ Load villages (Chunk Mode)
async function loadVillages(blockName) {
  villageSelect.innerHTML = `<option value="">All Village</option>`;
  if (!blockName) return;

  const district = districtSelect.value.trim();
  blockName = blockName.trim();

  // ✅ Read all chunk docs for this district+block
  const q = query(
    collection(db, "villages"),
    where("district", "==", district),
    where("block", "==", blockName),
    orderBy("part", "asc")
  );

  const snap = await getDocs(q);

  let allVillages = [];
  snap.forEach((d) => {
    const data = d.data();
    allVillages = allVillages.concat(data.villages || []);
  });

  // ✅ Unique + sort
  allVillages = Array.from(new Set(allVillages)).sort();

  allVillages.forEach((v) => {
    villageSelect.innerHTML += `<option value="${v}">${v}</option>`;
  });
}

// ✅ Auto change handlers
districtSelect.onchange = async () => {
  await loadBlocks(districtSelect.value);
};

blockSelect.onchange = async () => {
  await loadVillages(blockSelect.value);
};

// ✅ Render properties
function renderProperties(arr) {
  list.innerHTML = "";

  if (!arr.length) {
    list.innerHTML = `<p class="small">❌ No properties found.</p>`;
    return;
  }

  arr.forEach((p) => {
    const whatsapp = (p.whatsapp || "").replace(/\D/g, "");

    list.innerHTML += `
      <div class="card">
        <h3>${p.title || ""}</h3>
        <p class="small"><b>District:</b> ${p.district || ""}</p>
        <p class="small"><b>Block:</b> ${p.block || ""}</p>
        <p class="small"><b>Village:</b> ${p.village || ""}</p>
        <p class="small"><b>Type:</b> ${p.type || ""}</p>
        <p class="small"><b>Price:</b> ${p.price || ""}</p>

        <p class="small" style="margin-top:8px;">${p.description || ""}</p>

        ${whatsapp ? `
          <a class="btn2" target="_blank"
             href="https://wa.me/91${whatsapp}">
             ✅ WhatsApp
          </a>
        ` : ""}
      </div>
    `;
  });
}

// ✅ Fetch Approved Properties (Search)
async function loadApprovedProperties() {
  msg.innerHTML = "⏳ Loading properties...";

  const district = districtSelect.value;
  const block = blockSelect.value;
  const village = villageSelect.value;
  const type = typeSelect.value;

  let q = query(
    collection(db, "properties"),
    where("status", "==", "APPROVED"),
    orderBy("createdAt", "desc")
  );

  if (district) q = query(q, where("district", "==", district));
  if (block) q = query(q, where("block", "==", block));
  if (village) q = query(q, where("village", "==", village));
  if (type) q = query(q, where("type", "==", type));

  const snap = await getDocs(q);

  const arr = [];
  snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));

  msg.innerHTML = `✅ Found: ${arr.length} properties`;
  renderProperties(arr);
}

searchBtn.onclick = loadApprovedProperties;

// ✅ First load
(async function init() {
  await loadDistricts();
  await loadApprovedProperties();
})();
