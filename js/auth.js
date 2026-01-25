// js/auth.js
import { auth } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// ✅ Mobile safe Google Login (Redirect)
export async function googleLogin() {
  const provider = new GoogleAuthProvider();
  await signInWithRedirect(auth, provider);
}

// ✅ Redirect ke baad user get
export async function handleRedirectLogin() {
  try {
    const res = await getRedirectResult(auth);
    return res?.user || null;
  } catch (e) {
    console.error("Redirect login error:", e);
    return null;
  }
}

export async function logout() {
  await signOut(auth);
}

export function listenUser(cb) {
  return onAuthStateChanged(auth, (user) => cb(user));
}
