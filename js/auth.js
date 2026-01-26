import { auth, db } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ✅ Google Login (POPUP - Best for Brave + Mobile)
export async function googleLogin() {
  const provider = new GoogleAuthProvider();

  // ✅ Force account chooser
  provider.setCustomParameters({
    prompt: "select_account"
  });

  const result = await signInWithPopup(auth, provider);

  if (result && result.user) {
    const u = result.user;

    // ✅ user firestore doc create/update
    await setDoc(
      doc(db, "users", u.uid),
      {
        uid: u.uid,
        email: u.email || "",
        name: u.displayName || "",
        photo: u.photoURL || "",
        kycStatus: "PENDING",
        planStatus: "INACTIVE",
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    return u;
  }

  return null;
}

// ✅ अब redirect handler की जरूरत नहीं (लेकिन file में रहने दो)
export async function handleRedirectLogin() {
  return null;
}

// ✅ Listen logged in user
export function listenUser(cb) {
  return onAuthStateChanged(auth, (user) => cb(user));
}

// ✅ Logout
export async function logoutUser() {
  await signOut(auth);
}
