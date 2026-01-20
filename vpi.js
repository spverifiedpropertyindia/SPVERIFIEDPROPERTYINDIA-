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

const firebaseConfig = {
  apiKey: "AIzaSyDKyu_TDnbqE6yQ9kx0pahFn",
  authDomain: "raazsahuteam-d02de.firebaseapp.com",
  projectId: "raazsahuteam-d02de",
  storageBucket: "raazsahuteam-d02de.appspot.com",
  messagingSenderId: "307824931465",
  appId: "1:307824931465:web:9f6de256e9d8eb7f528c58",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let _user = null;

// ✅ Always update user state
onAuthStateChanged(auth, (u) => {
  _user = u || null;
});

// ✅ Handle redirect result (very important for Mobile + GitHub Pages)
(async () => {
  try {
    const res = await getRedirectResult(auth);
    if (res && res.user) {
      _user = res.user;
    }
  } catch (e) {
    console.log("Redirect login error:", e);
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

  // ✅ Mobile / GitHub Pages Safe Login
  async googleLogin() {
    await setPersistence(auth, browserLocalPersistence);

    if (auth.currentUser) {
      _user = auth.currentUser;
      return auth.currentUser;
    }

    // ✅ Always Redirect (Popup problem fixed ✅)
    await signInWithRedirect(auth, provider);
    return null; // redirect will reload the page
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