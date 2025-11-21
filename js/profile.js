import { auth } from "./firebase-init.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

const db = getFirestore();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // ----- Load Profile Info -----
  const ref = doc(db, "mines", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data();
    document.getElementById("profile-name").textContent = data.mineName || "--";
    document.getElementById("profile-type").textContent = data.mineType || "--";
    document.getElementById("profile-state").textContent = data.mineState || "--";
    document.getElementById("profile-email").textContent = data.email || user.email;
  }

  // ========== CALCULATOR DATA ==========
  const emissionDiv = document.getElementById("emissionResults");
  const emissionsRef = collection(db, "users", user.uid, "emissions");
  const emissionSnap = await getDocs(emissionsRef);

  if (emissionSnap.empty) {
    emissionDiv.textContent = "No saved calculator results.";
  } else {
    let html = `
      <table>
        <tr>
          <th>Date/Time</th>
          <th>Total Emission (t)</th>
          <th>Total Sink (t)</th>
          <th>Net Emission (t)</th>
          <th>Diesel (L)</th>
          <th>Petrol (L)</th>
          <th>Coal (kg)</th>
          <th>LPG (kg)</th>
          <th>CH₄ (m³)</th>
          <th>N₂O (kg)</th>
        </tr>
    `;

    emissionSnap.forEach((doc) => {
      const d = doc.data();
      const s = d.sources || {};
      html += `
        <tr>
          <td>${d.timestamp || "--"}</td>
          <td>${d.emission?.toFixed?.(2) || "--"}</td>
          <td>${d.sink?.toFixed?.(2) || "--"}</td>
          <td>${d.net?.toFixed?.(2) || "--"}</td>
          <td>${s.diesel || 0}</td>
          <td>${s.petrol || 0}</td>
          <td>${s.coal || 0}</td>
          <td>${s.lpg || 0}</td>
          <td>${s.ch4 || 0}</td>
          <td>${s.n2o || 0}</td>
        </tr>`;
    });
    html += "</table>";
    emissionDiv.innerHTML = html;
  }

  // ========== PATHWAY DATA ==========
  const pathwayDiv = document.getElementById("pathwayResults");
  const pathwaysRef = collection(db, "users", user.uid, "pathways");
  const pathwaySnap = await getDocs(pathwaysRef);

  if (pathwaySnap.empty) {
    pathwayDiv.textContent = "No saved pathway results.";
  } else {
    let html = `
      <table>
        <tr>
          <th>Date/Time</th>
          <th>Method</th>
          <th>Prior Emission (t CO₂e)</th>
          <th>New Emission (t CO₂e)</th>
          <th>Reduction/Sink (t CO₂e)</th>
          <th>Credits (₹)</th>
        </tr>
    `;

    pathwaySnap.forEach((doc) => {
      const d = doc.data();
      // Each entry has sub-objects for afforestation, methane, renewable
      if (d.afforestation)
        html += makePathwayRow(d.timestamp, "Afforestation", d.afforestation);
      if (d.methane)
        html += makePathwayRow(d.timestamp, "Methane Capture", d.methane);
      if (d.renewable)
        html += makePathwayRow(d.timestamp, "Renewable Energy", d.renewable);
    });

    html += "</table>";
    pathwayDiv.innerHTML = html;
  }

  // Helper to format pathway rows
  function makePathwayRow(time, name, data) {
    return `
      <tr>
        <td>${time || "--"}</td>
        <td>${name}</td>
        <td>${data.prior?.toFixed?.(2) || "--"}</td>
        <td>${data.newEmission?.toFixed?.(2) || "--"}</td>
        <td>${data.reduction?.toFixed?.(2) || "--"}</td>
        <td>${data.credits?.toFixed?.(0) || "--"}</td>
      </tr>`;
  }

  // ========== COMBINED CSV DOWNLOAD ==========
  document.getElementById("downloadProfileCSV").addEventListener("click", async () => {
    let csv = "";

    // --- Calculator Section ---
    csv += "Calculator Results\n";
    csv += "Date,Time,Emission(t),Sink(t),Net(t),Diesel(L),Petrol(L),Coal(kg),LPG(kg),CH4(m³),N2O(kg)\n";
    emissionSnap.forEach((doc) => {
      const d = doc.data();
      const s = d.sources || {};
      csv += `${d.timestamp || "--"},${d.emission || "--"},${d.sink || "--"},${d.net || "--"},${s.diesel || 0},${s.petrol || 0},${s.coal || 0},${s.lpg || 0},${s.ch4 || 0},${s.n2o || 0}\n`;
    });

    csv += "\n\nPathway Results\n";
    csv += "Date,Time,Method,Prior Emission (t CO₂e),New Emission (t CO₂e),Reduction/Sink (t CO₂e),Credits (₹)\n";

    pathwaySnap.forEach((doc) => {
      const d = doc.data();
      if (d.afforestation)
        csv += `${d.timestamp || "--"},Afforestation,${d.afforestation.prior || "--"},${d.afforestation.newEmission || "--"},${d.afforestation.reduction || "--"},${d.afforestation.credits || "--"}\n`;
      if (d.methane)
        csv += `${d.timestamp || "--"},Methane Capture,${d.methane.prior || "--"},${d.methane.newEmission || "--"},${d.methane.reduction || "--"},${d.methane.credits || "--"}\n`;
      if (d.renewable)
        csv += `${d.timestamp || "--"},Renewable Energy,${d.renewable.prior || "--"},${d.renewable.newEmission || "--"},${d.renewable.reduction || "--"},${d.renewable.credits || "--"}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ZeroSphere_ProfileData.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });
});

// Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
  alert("Logged out!");
  window.location.href = "login.html";
});
