import { auth, db } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ✅ Google Login (Redirect - Mobile best)
export async function googleLogin(){
  const provider = new GoogleAuthProvider();
  await signInWithRedirect(auth, provider);
}

// ✅ Handle redirect result (after login)
export async function handleRedirectLogin(){
  try{
    const result = await getRedirectResult(auth);
    if(result && result.user){

      // ✅ user firestore doc create/update
      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        email: result.user.email || "",
        name: result.user.displayName || "",
        photo: result.user.photoURL || "",
        kycStatus: "PENDING",
        planStatus: "INACTIVE",
        updatedAt: serverTimestamp()
      }, { merge: true });

      return result.user;
    }
  }catch(err){
    console.log("Redirect Login Error:", err);
  }
  return null;
}

// ✅ Listen logged in user
export function listenUser(cb){
  return onAuthStateChanged(auth, (user) => {
    cb(user);
  });
}

// ✅ Logout
export async function logoutUser(){
  await signOut(auth);
}
