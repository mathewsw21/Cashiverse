const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

admin.initializeApp();
const db = getFirestore();

async function getUserFromAuthHeader(req) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const idToken = authHeader.substring(7);
  return await admin.auth().verifyIdToken(idToken);
}
//        ### Post CREATE PROFILE ###
exports.createProfile = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Post Method is allowed" });
    }

    const decodedUser = await getUserFromAuthHeader(req);
    const { firstName, lastName, role, employeeId } = req.body;

    if (!firstName || !lastName || !role || !employeeId) {
      return res.status(400).json({
        error: "firstName, lastName, role, and employeeId are required"
      });
    }

    if (role !== "employee" && role !== "manager") {
      return res.status(400).json({
        error: "Only manager or employee roles are allowed"
      });
    }

    const userDoc = {
      uid: decodedUser.uid,
      email: decodedUser.email || null,
      firstName,
      lastName,
      role,
      employeeId,
      createdAt: FieldValue.serverTimestamp()
    };

    await db.collection("users").doc(decodedUser.uid).set(userDoc);

    return res.status(201).json({
      message: "Profile created successfully",
      uid: decodedUser.uid
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({
      error: error.message || "Unauthorized"
    });
  }
});

//        ### Post Clock in ###
exports.clockIn = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Post Method is allowed" });
    }

    const decodedUser = await getUserFromAuthHeader(req);

    const userRef = db.collection("users").doc(decodedUser.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({
        error: "No Profile found. Create profile first."
      });
    }

    const userData = userSnap.data();

    if (userData.role !== "employee") {
      return res.status(403).json({
        error: "Only employees can clock in"
      });
    }

    const { dateWorked } = req.body;

    if (!dateWorked) {
      return res.status(400).json({
        error: "dateWorked is required"
      });
    }

    const fullName = `${userData.firstName} ${userData.lastName}`;
    const entryLabel = `${userData.firstName}${userData.lastName}_${dateWorked}`;

    const timeEntry = {
      userId: decodedUser.uid,
      employeeId: userData.employeeId,
      username: fullName,
      dateWorked,
      clockIn: FieldValue.serverTimestamp(),
      clockOut: null,
      hoursWorked: null,
      entryLabel,
      createdAt: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection("timeEntries").add(timeEntry);

    return res.status(201).json({
      message: "Successfully Clocked In",
      entryId: docRef.id
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({
      error: error.message || "Unauthorized"
    });
  }
});

//        ### Get TimeEntry ###
exports.gettimeEntries = onRequest(async (req, res) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Get Method is allowed" });
    }

    const decodedUser = await getUserFromAuthHeader(req);

       const snapshot = await db
         .collection("timeEntries")
         .where("userId", "==", decodedUser.uid)
         .get();

       const entries = snapshot.docs.map(doc => {
         const data = doc.data()

         return {
           id: doc.id,
           ...data,
           clockIn: data.clockIn ? data.clockIn.toDate().toISOString() : null,
           clockOut: data.clockOut ? data.clockOut.toDate().toISOString() : null,
           createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
         };
       });

       return res.status(200).json({
         count: entries.length,
         entries
       });

     } catch (error) {
       console.error(error);
       return res.status(401).json({
         error: error.message || "Unauthorized"
       });
     }
 });

 //        ### Put Update User Names ###
 exports.userNameUpdate = onRequest(async (req, res) => {
 try {
 if(req.method !== "PUT") {
 return res.status(405).json({ error: "Put Method is allowed" });
 }

const decodedUser = await getUserFromAuthHeader(req);
const { firstName, lastName } = req.body;

if (!firstName || !lastName) {
 return res.status(400).json({
         error: error.message || "Please Insert Either First Name or Last Name"
       });
     }

     const user = db.collection("users").doc(decodedUser.uid);
     const updateData = {
     updatedTime: FieldValue.serverTimestamp()
     };
     if (firstName) updateData.firstName = firstName;
     if (lastName) updateData.lastName = lastName;
     await user.update(updateData);
     return res.status(200).json({
       message: "User name successfully updated"
     });
    } catch (error) {
      console.error(error);
      return res.status(401).json({
        error: error.message || "Unauthorized"
      });
    }
 });

//        ### Delete My Time Entry ###
exports.deleteTimeEntry = onRequest(async (req, res) => {
  try {
    if (req.method !== "DELETE") {
      return res.status(405).json({ error: "Delete Method is allowed" });
    }

    const decodedUser = await getUserFromAuthHeader(req);
    const { entryId } = req.body;

    if (!entryId) { // YOu can get entryId from get time entry id
      return res.status(400).json({
        error: "entryId is required"
      });
    }

    const entryRef = db.collection("timeEntries").doc(entryId);
    const entrySnap = await entryRef.get();

    if (!entrySnap.exists) {
      return res.status(404).json({
        error: "Time entry not found"
      });
    }

    const entryData = entrySnap.data();

    if (entryData.userId !== decodedUser.uid) {
      return res.status(403).json({
        error: "You can only delete your own time entries"
      });
    }

    await entryRef.delete();

    return res.status(200).json({
      message: "Time entry deleted",
      entryId
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({
      error: error.message || "Unauthorized"
    });
  }
});
