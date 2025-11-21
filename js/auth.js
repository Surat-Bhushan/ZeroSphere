// js/auth.js

import { auth } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  getFirestore,
  setDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const db = getFirestore();

// ---------------------- SIGNUP ----------------------
document.getElementById("signup-btn").addEventListener("click", async () => {
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value.trim();
  const mineName = document.getElementById("mine-name").value.trim();
  const mineType = document.getElementById("mine-type").value;
  const mineState = document.getElementById("mine-state").value;

  if (!mineName || !mineType || !mineState || !email || !password) {
    alert("Please fill in all fields!");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "mines", user.uid), {
      mineName,
      mineType,
      mineState,
      email,
      createdAt: new Date().toISOString()
    });

    alert("Account created successfully!");
    window.location.assign("index.html");  // ✅ safer redirect
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});

// ---------------------- LOGIN ----------------------
document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Login successful!");
    window.location.assign("index.html");  // ✅ safer redirect
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});

// ---------------------- LOGOUT ----------------------
document.getElementById("logout-btn").addEventListener("click", async () => {
  try {
    await signOut(auth);
    alert("Logged out!");
    // ✅ Delay redirect slightly so Firebase finishes cleanup
    setTimeout(() => {
      window.location.assign("index.html");
    }, 300);
  } catch (error) {
    console.error("Logout failed:", error);
    alert("Error logging out. Try again.");
  }
});

// ---------------------- AUTH STATE MONITOR ----------------------
onAuthStateChanged(auth, async (user) => {
  const logoutBtn = document.getElementById("logout-btn");

  if (user) {
    logoutBtn.classList.remove("hidden");

    const mineDoc = await getDoc(doc(db, "mines", user.uid));
    if (mineDoc.exists()) {
      console.log("Mine data:", mineDoc.data());
    }
  } else {
    logoutBtn.classList.add("hidden");
  }
});
