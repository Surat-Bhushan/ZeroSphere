import { auth } from "./firebase-init.js";
import { saveCalculationToFirestore } from "./saveData.js";

let currentUser = null;
auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) console.log("User signed in:", user.email);
  else console.log("No user signed in");
});

document.addEventListener("DOMContentLoaded", () => {
  const EF = { diesel: 2.68, petrol: 2.31, coal: 2.42, lpg: 3.0, ch4: 670, n2o: 298 };
  const SEQ_RATE = { forest: 6, grassland: 3 };

  let emissionData = {};
  let totalEmission = 0;
  let totalSink = 0;
  let history = JSON.parse(localStorage.getItem("calcHistory") || "[]");

  const totalEmissionDisplay = document.getElementById("totalEmission");
  const sinkDisplay = document.getElementById("sinkValue");
  const netDisplay = document.getElementById("netEmission");

  // ---------- CALCULATE ----------
  document.getElementById("calcEmissionBtn").addEventListener("click", () => {
    totalEmission = 0;
    emissionData = {};
    Object.keys(EF).forEach(key => {
      const val = parseFloat(document.getElementById(key).value) || 0;
      emissionData[key] = (val * EF[key]) / 1000;
      totalEmission += emissionData[key];
    });
    totalEmissionDisplay.textContent = totalEmission.toFixed(2);
    updateCharts();
  });


  document.getElementById("calcSinkBtn").addEventListener("click", () => {
    totalSink = 0;
    Object.keys(SEQ_RATE).forEach(key => {
      const val = parseFloat(document.getElementById(key).value) || 0;
      totalSink += val * SEQ_RATE[key];
    });
    sinkDisplay.textContent = totalSink.toFixed(2);
    const net = totalEmission - totalSink;
    netDisplay.textContent = net.toFixed(2);
    updateCharts();
  });


  // ---------- CHARTS ----------
  const pieCtx = document.getElementById("emissionPie");
  const barCtx = document.getElementById("emissionBar");
  const lineCtx = document.getElementById("historyLine");
  let pieChart, barChart, lineChart;

  function updateCharts() {
    const labels = Object.keys(emissionData);
    const data = Object.values(emissionData);

    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, {
      type: "pie",
      data: { labels, datasets: [{ data, backgroundColor: ["#2b7a78","#3aafa9","#def2f1","#17252a","#0077b6","#0096c7"] }] },
      options: { plugins: { legend: { position: "right" } } }
    });

    const net = totalEmission - totalSink;
    if (barChart) barChart.destroy();
    barChart = new Chart(barCtx, {
      type: "bar",
      data: {
        labels: ["Total Emission", "Sink", "Net Emission"],
        datasets: [{ label: "t CO₂e", data: [totalEmission, totalSink, net], backgroundColor: ["#0077b6","#90e0ef","#023e8a"] }]
      }
    });

    updateLineChart();
  }

  // ---------- HISTORY LINE CHART ----------
  function updateLineChart() {
    const count = parseInt(document.getElementById("historyCount").value) || 10;
    const showE = document.getElementById("showEmission").checked;
    const showS = document.getElementById("showSink").checked;
    const showN = document.getElementById("showNet").checked;

    const filtered = history.slice(-count).filter(h => h.included !== false);
    const labels = filtered.map(h => h.timestamp);

    const datasets = [];
    if (showE) datasets.push({ label: "Emission", data: filtered.map(h => h.emission), borderColor: "#ff6b6b", fill: false });
    if (showS) datasets.push({ label: "Sink", data: filtered.map(h => h.sink), borderColor: "#2ec4b6", fill: false });
    if (showN) datasets.push({ label: "Net", data: filtered.map(h => h.net), borderColor: "#1f77b4", fill: false });

    if (lineChart) lineChart.destroy();
    lineChart = new Chart(lineCtx, {
      type: "line",
      data: { labels, datasets },
      options: { plugins: { legend: { position: "top" } }, scales: { y: { beginAtZero: true } } }
    });

    renderDatasetCheckboxes(history.slice(-count));
  }

  // ---------- DATASET CHECKBOXES ----------
  function renderDatasetCheckboxes(dataArr) {
    const container = document.getElementById("datasetCheckboxes");
    container.innerHTML = "";
    dataArr.forEach((entry, i) => {
      const div = document.createElement("div");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = entry.included !== false;
      cb.addEventListener("change", () => {
        entry.included = cb.checked;
        localStorage.setItem("calcHistory", JSON.stringify(history));
        updateLineChart();
      });
      const label = document.createElement("label");
      label.textContent = entry.timestamp;
      div.append(cb, label);
      container.appendChild(div);
    });
  }

  // ---------- SAVE / CLEAR ----------
  document.getElementById("saveCalc").addEventListener("click", async () => {
    const net = totalEmission - totalSink;
    const date = new Date();
    const timestamp = `${date.getDate()} ${date.toLocaleString("default",{month:"short"})}, ${date.getHours()}:${String(date.getMinutes()).padStart(2,"0")}`;

    const entry = {
      emission: totalEmission,
      sink: totalSink,
      net,
      timestamp,
      included: true,
      sources: emissionData,
    };

    // Always save locally
    history.push(entry);
    localStorage.setItem("calcHistory", JSON.stringify(history));

    // Save to Firestore only if user is signed in
    if (currentUser) {
  try {
    await saveCalculationToFirestore(entry, "emissions");
    alert("Calculation saved to your profile!");
  } catch (err) {
    console.error(err);
    alert("Saved locally. Error syncing with profile.");
  }
} else {
  alert("Saved locally. Sign in to sync with your profile.");
}

    updateLineChart();
  });


  document.getElementById("clearPage").addEventListener("click", () => {
    if (confirm("Clear current page calculations?")) {
      document.querySelectorAll("input[type='number']").forEach(inp => inp.value = "");
      totalEmission = totalSink = 0;
      totalEmissionDisplay.textContent = sinkDisplay.textContent = netDisplay.textContent = "--";
      updateCharts();
    }
  });


  // ---------- DOWNLOAD CSV ----------
  document.getElementById("downloadCSV").addEventListener("click", () => {
    const count = parseInt(document.getElementById("historyCount").value) || 10;
    const filtered = history.slice(-count).filter(h => h.included !== false);
    let csv = "Date,Timestamp,Emission(t),Sink(t),Net(t),Diesel(L),Petrol(L),Coal(kg),LPG(kg),CH4(m³),N2O(kg)\n";
    filtered.forEach(h => {
      const s = h.sources || {};
      csv += `${h.timestamp},${h.emission},${h.sink},${h.net},${s.diesel||0},${s.petrol||0},${s.coal||0},${s.lpg||0},${s.ch4||0},${s.n2o||0}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ZeroSphere_Report.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  ["showEmission","showSink","showNet","historyCount"].forEach(id =>
    document.getElementById(id).addEventListener("change", updateLineChart)
  );

  updateCharts();
  // Prevent scroll and arrow key changes on numeric fields
document.querySelectorAll('input[type="number"]').forEach(input => {
  input.addEventListener('wheel', e => e.preventDefault());
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
  });
});

});
