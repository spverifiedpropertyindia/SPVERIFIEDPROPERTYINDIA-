// js/auth.js
import { auth } from "./firebase.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const provider = new GoogleAuthProvider();

export async function googleLogin() {
  await signInWithPopup(auth, provider);
}

export function listenUser(callback){
  onAuthStateChanged(auth, (user)=>{
    callback(user);
  });
}

export async function logout(){
  await signOut(auth);
}
