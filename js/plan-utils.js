// js/plan-utils.js
import { db } from "./firebase.js";
import { listenUser } from "./auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const ADMIN_EMAIL = "raazsahu1000@gmail.com";

// ✅ Returns {user, userData, isAdmin}
export async function getUserAndData(){
  return new Promise((resolve)=>{
    listenUser(async (user)=>{
      if(!user){
        resolve({ user:null, userData:null, isAdmin:false });
        return;
      }

      const isAdmin = (user.email === ADMIN_EMAIL);

      // ✅ Admin bypass: fake approved userData
      if(isAdmin){
        resolve({
          user,
          isAdmin:true,
          userData:{
            kycStatus:"APPROVED",
            planStatus:"ACTIVE",
            activePlan:"PREMIUM",
            role:"ADMIN"
          }
        });
        return;
      }

      const snap = await getDoc(doc(db,"users",user.uid));
      const userData = snap.exists() ? snap.data() : {};
      resolve({ user, userData, isAdmin:false });
    });
  });
}

// ✅ Check user KYC / Plan (Admin bypass)
export async function requireKycAndPlan(){
  const { user, userData, isAdmin } = await getUserAndData();

  if(!user){
    alert("Login required ✅");
    location.href="login.html";
    return false;
  }

  // ✅ Admin = allow always
  if(isAdmin) return true;

  if(userData.kycStatus !== "APPROVED"){
    alert("KYC Required ❌");
    location.href="kyc.html";
    return false;
  }

  return true;
    }
