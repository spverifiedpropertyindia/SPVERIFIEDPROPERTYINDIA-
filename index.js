const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ✅ Daily auto expiry (Runs every day)
exports.autoExpirePlans = functions.pubsub
  .schedule("every day 00:10")
  .timeZone("Asia/Kolkata")
  .onRun(async () => {

    const now = new Date();

    const usersSnap = await db.collection("users")
      .where("planStatus","==","ACTIVE")
      .get();

    let expiredUsers = 0;
    let expiredProps = 0;

    for(const uDoc of usersSnap.docs){
      const u = uDoc.data();
      const endAt = u.planEndAt?.toDate ? u.planEndAt.toDate() : null;
      if(!endAt) continue;

      if(endAt < now){
        expiredUsers++;

        await db.collection("users").doc(uDoc.id).update({
          planStatus: "EXPIRED"
        });

        const propSnap = await db.collection("properties")
          .where("uid","==",uDoc.id)
          .get();

        for(const pDoc of propSnap.docs){
          const p = pDoc.data();
          if(p.status === "APPROVED"){
            expiredProps++;
            await db.collection("properties").doc(pDoc.id).update({
              liveStatus: "EXPIRED"
            });
          }
        }
      }
    }

    console.log("✅ Auto Expiry Done", { expiredUsers, expiredProps });
    return null;
  });
