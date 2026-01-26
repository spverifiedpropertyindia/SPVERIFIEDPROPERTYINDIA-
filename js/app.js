import { db } from "./firebase.js";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  limit,
  startAfter
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const districtSelect = document.getElementById("district");
const blockSelect = document.getElementById("block");

// ✅ village input + datalist
const villageInput = document.getElementById("village");
const villageList = document.getElementById("villageList");

const typeSelect = document.getElementById("type");

const searchBtn = document.getElementById("searchBtn");
const list = document.getElementById("list");
const msg = document.getElementById("msg");

const loadMoreBtn = document.getElementById("loadMoreBtn");

// ✅ Pagination vars
let lastDoc = null;
let isLoading = false;

function resetPagination() {
  lastDoc = null;
  if (loadMoreBtn) loadMoreBtn.style.display = "none";
}

// ✅ Load districts
async function loadDistricts() {
  districtSelect.innerHTML = `<option value="">All District</option>`;
  blockSelect.innerHTML = `<option value="">All Block</option>`;

  villageInput.value = "";
  villageList.innerHTML = "";

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

// ✅ Load blocks
async function loadBlocks(districtName) {
  blockSelect.innerHTML = `<option value="">All Block</option>`;

  villageInput.value = "";
  villageList.innerHTML = "";

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

// ✅ Load villages (Chunk mode) → datalist
async function loadVillages(blockName) {
  villageInput.value = "";
  villageList.innerHTML = "";

  if (!blockName) return;

  const district = districtSelect.value.trim();
  blockName = blockName.trim();

  msg.innerHTML = "⏳ Loading villages...";

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

  allVillages = Array.from(new Set(allVillages)).sort();

  allVillages.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    villageList.appendChild(opt);
  });

  msg.innerHTML = `✅ Villages loaded: ${allVillages.length}`;
}

// ✅ Auto change handlers
districtSelect.onchange = async () => {
  await loadBlocks(districtSelect.value);
};

blockSelect.onchange = async () => {
  await loadVillages(blockSelect.value);
};

// ✅ Render (Append mode)
function appendProperties(arr) {
  if (!arr.length) return;

  arr.forEach((p) => {
    const whatsapp = (p.whatsapp || "").replace(/\D/g, "");

    // ✅ WhatsApp Auto Message
    const wMsg = encodeURIComponent(
      `Hello, I am interested in this property:\n\n` +
      `🏠 ${p.title || ""}\n` +
      `📍 District: ${p.district || ""}\n` +
      `🏘 Block: ${p.block || ""}\n` +
      `🌿 Village: ${p.village || ""}\n` +
      `💰 Price: ${p.price || ""}\n` +
      `🏷 Type: ${p.type || ""}\n\n` +
      `Please share more details.`
    );

    const whatsappLink = whatsapp ? `https://wa.me/91${whatsapp}?text=${wMsg}` : "";

    list.innerHTML += `
      <div class="card">
        <h3>${p.title || ""}</h3>
        <p class="small"><b>District:</b> ${p.district || ""}</p>
        <p class="small"><b>Block:</b> ${p.block || ""}</p>
        <p class="small"><b>Village:</b> ${p.village || ""}</p>
        <p class="small"><b>Type:</b> ${p.type || ""}</p>
        <p class="small"><b>Price:</b> ${p.price || ""}</p>

        <p class="small" style="margin-top:8px;">${p.description || ""}</p>

        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
          <a class="btn2" href="property-details.html?id=${p.id}">
            👁 View Details
          </a>

          ${whatsapp ? `
            <a class="btn2" target="_blank" href="${whatsappLink}">
              💬 WhatsApp
            </a>
          ` : ""}
        </div>
      </div>
    `;
  });
}

// ✅ Load approved properties (Pagination)
async function loadApprovedProperties(isFresh = false) {
  if (isLoading) return;
  isLoading = true;

  if (isFresh) {
    list.innerHTML = "";
    resetPagination();
  }

  msg.innerHTML = "⏳ Loading properties...";

  const district = districtSelect.value;
  const block = blockSelect.value;
  const village = (villageInput.value || "").trim();
  const type = typeSelect.value;

  let q = query(
    collection(db, "properties"),
    where("status", "==", "APPROVED"),
    orderBy("createdAt", "desc"),
    limit(12)
  );

  if (district) q = query(q, where("district", "==", district));
  if (block) q = query(q, where("block", "==", block));
  if (village) q = query(q, where("village", "==", village));
  if (type) q = query(q, where("type", "==", type));

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snap = await getDocs(q);

  // ✅ No more data
  if (snap.empty) {
    msg.innerHTML = "✅ No more properties.";
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
    isLoading = false;
    return;
  }

  const arr = [];
  snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));

  lastDoc = snap.docs[snap.docs.length - 1];

  appendProperties(arr);

  msg.innerHTML = `✅ Loaded: ${arr.length} properties`;

  // ✅ show Load More if we got full page
  if (loadMoreBtn) {
    loadMoreBtn.style.display = (arr.length === 12) ? "inline-block" : "none";
  }

  isLoading = false;
}

// ✅ Search Button (fresh load)
searchBtn.onclick = () => loadApprovedProperties(true);

// ✅ Load more
if (loadMoreBtn) {
  loadMoreBtn.onclick = () => loadApprovedProperties(false);
}

// ✅ First load
(async function init() {
  await loadDistricts();
  await loadApprovedProperties(true);
})();
