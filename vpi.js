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

// ✅ Auto update current user
onAuthStateChanged(auth, (u) => {
  _user = u || null;
});

// ✅ IMPORTANT: Redirect ke baad result ko pick karo aur user set karo
(async () => {
  try {
    const result = await getRedirectResult(auth);

    if (result && result.user) {
      _user = result.user;

      // ✅ redirect ke baad auto dashboard pe bhejo
      // (ye line sabse important hai)
      if (location.pathname.endsWith("/user-login.html")) {
        location.href = "index.html";
      }
    }
  } catch (e) {
    console.log("Redirect result error:", e);
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
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (e) {
      console.log("Persistence error:", e);
    }

    // ✅ अगर पहले से login है तो return
    if (auth.currentUser) {
      _user = auth.currentUser;
      return auth.currentUser;
    }

    // ✅ Mobile me popup block hota hai, redirect best hai
    await signInWithRedirect(auth, provider);

    // redirect start hote hi ye page unload ho jayega
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