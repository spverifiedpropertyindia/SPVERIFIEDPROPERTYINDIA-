import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

console.log("✅ VPI PRO LOADED");

const firebaseConfig = {
  apiKey: "AIzaSyDKyu_TDnbqE6yO9kx0pahFnxqL72q38ME",
  authDomain: "raazsahuteam-d02de.firebaseapp.com",
  projectId: "raazsahuteam-d02de",
  storageBucket: "raazsahuteam-d02de.firebasestorage.app",
  messagingSenderId: "307824931465",
  appId: "1:307824931465:web:9f6de256e9d8eb7f528c58",
  measurementId: "G-BG0SCBN118"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

let _user = null;

function isLoginPage() {
  return location.href.includes("user-login.html");
}

function goDashboard() {
  location.href = "index.html";
}

onAuthStateChanged(auth, (u) => {
  _user = u || null;

  if (_user && isLoginPage()) {
    goDashboard();
  }
});

// ✅ Redirect result handle
(async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      _user = result.user;
      console.log("✅ Redirect Login Success:", result.user.email);

      if (isLoginPage()) {
        goDashboard();
      }
    }
  } catch (e) {
    console.log("❌ Redirect result error:", e);
  }
})();

// ✅ helper: get user profile doc
async function getUserDoc() {
  if (!_user) return null;
  const snap = await getDoc(doc(db, "users", _user.uid));
  return snap.exists() ? snap.data() : null;
}

function toDateSafe(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  return new Date(ts);
}

export const VPI = {
  auth,
  db,

  currentUser() {
    return _user;
  },

  isAdmin() {
    return !!_user && _user.email === "raazsahu1000@gmail.com";
  },

  async googleLogin() {
    await setPersistence(auth, browserLocalPersistence);

    if (auth.currentUser) {
      _user = auth.currentUser;
      if (isLoginPage()) goDashboard();
      return auth.currentUser;
    }

    await signInWithRedirect(auth, provider);
    return null;
  },

  async logout() {
    await signOut(auth);
    _user = null;
  },

  requireLogin() {
    const u = _user;
    if (!u) {
      alert("❌ Please login first");
      location.href = "user-login.html";
      throw new Error("NOT_LOGGED_IN");
    }
    return u;
  },

  requireAdmin() {
    const u = this.requireLogin();
    if (u.email !== "raazsahu1000@gmail.com") {
      alert("❌ Admin access only");
      location.href = "index.html";
      throw new Error("NOT_ADMIN");
    }
    return u;
  },

  // ✅ PRO: KYC Approved required
  async requireKycApproved() {
    const u = this.requireLogin();
    const profile = await getUserDoc();
    if (!profile || profile.kycStatus !== "APPROVED") {
      alert("❌ KYC not approved yet. Please complete KYC and wait for admin approval ✅");
      location.href = "kyc.html";
      throw new Error("KYC_NOT_APPROVED");
    }
    return true;
  },

  // ✅ PRO: Plan Active + Not Expired required
  async requireActivePlan() {
    const u = this.requireLogin();
    const profile = await getUserDoc();

    if (!profile || profile.planStatus !== "ACTIVE") {
      alert("❌ Your plan is not active. Please select plan + upload payment proof ✅");
      location.href = "plans.html";
      throw new Error("PLAN_NOT_ACTIVE");
    }

    const expiresAt = toDateSafe(profile.planExpiresAt);
    if (expiresAt) {
      const now = new Date();
      if (expiresAt.getTime() < now.getTime()) {
        alert("❌ Plan expired! Please renew plan ✅");
        location.href = "plans.html";
        throw new Error("PLAN_EXPIRED");
      }
    }

    return true;
  }
};