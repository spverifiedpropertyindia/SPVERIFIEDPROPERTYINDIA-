// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDKyu_TDnbqE6yO9kx0pahFnxqL72q38ME",
  authDomain: "raazsahuteam-d02de.firebaseapp.com",
  projectId: "raazsahuteam-d02de",
  storageBucket: "raazsahuteam-d02de.firebasestorage.app",
  messagingSenderId: "307824931465",
  appId: "1:307824931465:web:9f6de256e9d8eb7f528c58"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
