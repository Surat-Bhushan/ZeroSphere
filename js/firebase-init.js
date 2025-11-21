import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAreWKov9bSNBzQ2E6i445R9bL85e0QowA",
  authDomain: "zerosphere-2025.firebaseapp.com",
  projectId: "zerosphere-2025",
  storageBucket: "zerosphere-2025.firebasestorage.app",
  messagingSenderId: "1004098350467",
  appId: "1:1004098350467:web:610414f27139ef4524dab6"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

