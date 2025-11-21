// js/saveData.js
import { auth } from "./firebase-init.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const db = getFirestore();

/**
 * Save calculator or pathway data to Firestore
 * @param {Object} entry - Data object to store
 * @param {String} collectionName - subcollection name ("emissions" or "pathways")
 */
export async function saveCalculationToFirestore(entry, collectionName = "emissions") {
  const user = auth.currentUser;
  if (!user) {
    console.warn("No user logged in. Skipping Firestore save.");
    return;
  }

  try {
    const colRef = collection(db, "users", user.uid, collectionName);
    await addDoc(colRef, {
      ...entry,
      createdAt: serverTimestamp(),
    });
    console.log(`Saved to Firestore → users/${user.uid}/${collectionName}`);
  } catch (err) {
    console.error("Firestore write failed:", err);
  }
}
