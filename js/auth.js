// js/auth.js
import { auth } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithRedirect(auth, provider);
}

export async function handleRedirectLogin() {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (e) {
    console.error("Redirect Login Error:", e);
    return null;
  }
}

export async function logout() {
  await signOut(auth);
}

export function listenUser(cb) {
  return onAuthStateChanged(auth, (user) => cb(user));
                            }
