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

console.log("✅ VPI FINAL LOADED v=2");

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

  // ✅ login page pe user mil gaya -> dashboard bhejo
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

export const VPI = {
  auth,

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
  }
};