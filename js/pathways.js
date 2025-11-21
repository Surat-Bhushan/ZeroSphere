import { auth } from "./firebase-init.js";
import { saveCalculationToFirestore } from "./saveData.js"; // reuse saveData.js



let currentUser = null;

// Track auth state
auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    console.log("User signed in:", user.email);
  } else {
    console.log("No user signed in.");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // ---------- CONSTANTS ----------
  const COST = {
    afforestation: 10000, // ₹ per ha
    methane: 25000,       // ₹ per t CH₄ captured
    renewable: 80000      // ₹ per MWh replaced
  };

  const FACTOR = {
    afforSinkPerHa: 6,    // t CO₂e / ha / year
    methanePerTon: 0.67,  // t CO₂e / t CH₄
    renewPerMWh: 0.72     // t CO₂e / MWh
  };

  const CREDIT_PRICE = 1000; // ₹ per t CO₂e

  // ---------- SELECTORS ----------
  const fundInput = document.getElementById("fund");
  const landInput = document.getElementById("land");
  const currentEmissionInput = document.getElementById("currentEmission");
  // Prevent the current emission input from being overwritten accidentally
currentEmissionInput.addEventListener("input", () => {
  currentEmissionInput.dataset.manual = "true"; // track manual input
});


  const afforBtn = document.getElementById("calcAffor");
  const methaneBtn = document.getElementById("calcMethane");
  const renewBtn = document.getElementById("calcRenew");

  const downloadBtn = document.getElementById("downloadCSV");

  // Chart checkboxes
  const showAffor = document.getElementById("showAffor");
  const showMethane = document.getElementById("showMethane");
  const showRenew = document.getElementById("showRenew");

  // Chart context
  const chartCtx = document.getElementById("pathwayChart");

  // ---------- DATA STORAGE ----------
  let results = {
    afforestation: null,
    methane: null,
    renewable: null
  };

  let chart;

  // ---------- FUNCTIONS ----------
  function getInputs() {
    const fund = parseFloat(fundInput.value) || 0;
    const land = parseFloat(landInput.value) || 0;
    const currentEmission = parseFloat(currentEmissionInput.value) || 0;
    return { fund, land, currentEmission };
  }

  function updateChart() {
    const labels = [];
    const reductions = [];
    const colors = [];

    if (showAffor.checked && results.afforestation) {
      labels.push("Afforestation");
      reductions.push(results.afforestation.reduction);
      colors.push("#2b9348");
    }
    if (showMethane.checked && results.methane) {
      labels.push("Methane Capture");
      reductions.push(results.methane.reduction);
      colors.push("#0077b6");
    }
    if (showRenew.checked && results.renewable) {
      labels.push("Renewable Energy");
      reductions.push(results.renewable.reduction);
      colors.push("#ffb703");
    }

    if (chart) chart.destroy();
    chart = new Chart(chartCtx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Emission Reduction (t CO₂e)",
            data: reductions,
            backgroundColor: colors
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            title: { display: true, text: "t CO₂e" },
            beginAtZero: true
          }
        }
      }
    });
  }

  function calcAfforestation() {
    const { fund, land, currentEmission } = getInputs();
    const maxArea = Math.min(land, fund / COST.afforestation);
    const additionalSink = maxArea * FACTOR.afforSinkPerHa;
    const newEmission = Math.max(currentEmission - additionalSink, 0);
    const credits = additionalSink * CREDIT_PRICE;

    document.getElementById("afforPrior").textContent = currentEmission.toFixed(2);
    document.getElementById("afforNew").textContent = newEmission.toFixed(2);
    document.getElementById("afforSink").textContent = additionalSink.toFixed(2);
    document.getElementById("afforCredits").textContent = credits.toFixed(0);

    results.afforestation = {
      prior: currentEmission,
      newEmission,
      reduction: additionalSink,
      credits
    };
    updateChart();
  }

  function calcMethane() {
    const { fund, land, currentEmission } = getInputs();
    const capturedCH4 = fund / COST.methane;
    const reduction = capturedCH4 * FACTOR.methanePerTon;
    const newEmission = Math.max(currentEmission - reduction, 0);
    const credits = reduction * CREDIT_PRICE;

    document.getElementById("methanePrior").textContent = currentEmission.toFixed(2);
    document.getElementById("methaneNew").textContent = newEmission.toFixed(2);
    document.getElementById("methaneSink").textContent = reduction.toFixed(2);
    document.getElementById("methaneCredits").textContent = credits.toFixed(0);

    results.methane = {
      prior: currentEmission,
      newEmission,
      reduction,
      credits
    };
    updateChart();
  }

  function calcRenew() {
    const { fund, land, currentEmission } = getInputs();
    const renewableMWh = fund / COST.renewable;
    const reduction = renewableMWh * FACTOR.renewPerMWh;
    const newEmission = Math.max(currentEmission - reduction, 0);
    const credits = reduction * CREDIT_PRICE;

    document.getElementById("renewPrior").textContent = currentEmission.toFixed(2);
    document.getElementById("renewNew").textContent = newEmission.toFixed(2);
    document.getElementById("renewSink").textContent = reduction.toFixed(2);
    document.getElementById("renewCredits").textContent = credits.toFixed(0);

    results.renewable = {
      prior: currentEmission,
      newEmission,
      reduction,
      credits
    };
    updateChart();
  }

  // ---------- CSV DOWNLOAD ----------
  // ---------- CSV DOWNLOAD (Visible Pathways Only) ----------
function downloadCSVReport() {
  const headers = [
    "Method",
    "Prior Emission (t CO₂e)",
    "New Emission (t CO₂e)",
    "Reduction/Sink (t CO₂e)",
    "Credits (₹)"
  ];

  const rows = [];

  if (showAffor.checked && results.afforestation) {
    const a = results.afforestation;
    rows.push(["Afforestation", a.prior.toFixed(2), a.newEmission.toFixed(2), a.reduction.toFixed(2), a.credits.toFixed(0)]);
  }

  if (showMethane.checked && results.methane) {
    const m = results.methane;
    rows.push(["Methane Capture", m.prior.toFixed(2), m.newEmission.toFixed(2), m.reduction.toFixed(2), m.credits.toFixed(0)]);
  }

  if (showRenew.checked && results.renewable) {
    const r = results.renewable;
    rows.push(["Renewable Energy", r.prior.toFixed(2), r.newEmission.toFixed(2), r.reduction.toFixed(2), r.credits.toFixed(0)]);
  }

  // Add timestamp
  const now = new Date();
  const timestamp = now.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  let csvContent =
    `ZeroSphere Pathway Report (Generated: ${timestamp})\n` +
    headers.join(",") +
    "\n" +
    rows.map(r => r.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ZeroSphere_Pathway_Report.csv";
  link.click();
  URL.revokeObjectURL(url);
}

  // ---------- EVENT LISTENERS ----------
  afforBtn.addEventListener("click", calcAfforestation);
  methaneBtn.addEventListener("click", calcMethane);
  renewBtn.addEventListener("click", calcRenew);
  downloadBtn.addEventListener("click", downloadCSVReport);

  showAffor.addEventListener("change", updateChart);
  showMethane.addEventListener("change", updateChart);
  showRenew.addEventListener("change", updateChart);

  // Prevent scroll and arrow key changes on numeric fields
document.querySelectorAll('input[type="number"]').forEach(input => {
  input.addEventListener('wheel', e => e.preventDefault());
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
  });
});
document.getElementById("savePathway").addEventListener("click", async () => {
  const entry = {
    afforestation: results.afforestation || null,
    methane: results.methane || null,
    renewable: results.renewable || null,
    timestamp: new Date().toLocaleString(),
  };

  // Always save locally
  let pathwayHistory = JSON.parse(localStorage.getItem("pathwayHistory") || "[]");
  pathwayHistory.push(entry);
  localStorage.setItem("pathwayHistory", JSON.stringify(pathwayHistory));

  // --- SAVE TO FIRESTORE ---
  if (currentUser) {
    try {
      // Add this line here
      await saveCalculationToFirestore(entry, "pathways");
      alert("Pathway results saved to your profile!");
    } catch (err) {
      console.error(err);
      alert("Saved locally. Error syncing with profile.");
    }
  } else {
    alert("Saved locally. Sign in to sync with your profile.");
  }
});

document.getElementById("clearPathway").addEventListener("click", () => {
  if (!confirm("Clear all inputs and results on this page?")) return;

  // Clear input fields
  document.getElementById("fund").value = "";
  document.getElementById("land").value = "";
  document.getElementById("currentEmission").value = "";

  // Clear results displayed
  ["afforPrior","afforNew","afforSink","afforCredits",
   "methanePrior","methaneNew","methaneSink","methaneCredits",
   "renewPrior","renewNew","renewSink","renewCredits"].forEach(id => {
    document.getElementById(id).textContent = "--";
  });

  // Clear chart
  if (chart) chart.destroy();

  // Clear local results object
  results.afforestation = null;
  results.methane = null;
  results.renewable = null;
});



});
