"use strict";

/* ---------- Core RF math (Stephen Pavlik / Sound Design Live) ---------- */

// dBm from transmit power in mW: 10 * log10(mW)
function dbmFromMw(mw) {
  if (mw <= 0) return -Infinity;
  return 10 * Math.log10(mw);
}

// Free Space Path Loss (dB) = 20*log10(distance_m) + 20*log10(freq_MHz) - 27.55
function freeSpacePathLoss(distanceM, freqMHz) {
  if (distanceM <= 0 || freqMHz <= 0) return NaN;
  return 20 * Math.log10(distanceM) + 20 * Math.log10(freqMHz) - 27.55;
}

// Polarization mismatch loss (dB, positive value) = -20*log10(cos(angle))
function polarizationMismatchLoss(angleDeg) {
  const clamped = Math.min(Math.max(angleDeg, 0), 89.999);
  const rad = (clamped * Math.PI) / 180;
  const cos = Math.cos(rad);
  if (cos <= 0) return Infinity;
  return -20 * Math.log10(cos);
}

function fmt(n, digits = 2) {
  if (!isFinite(n)) return n > 0 ? "&infin;" : "-&infin;";
  return n.toFixed(digits);
}

function signed(n, digits = 2) {
  if (!isFinite(n)) return n > 0 ? "+&infin;" : "-&infin;";
  const s = n >= 0 ? "+" : "";
  return s + n.toFixed(digits);
}

/* ---------- Signal quality classification against -40 / -70 / -90 dBm ---------- */

function classify(level) {
  if (!isFinite(level)) {
    return { label: "Kein Signal", color: "var(--red)", note: "Kein sinnvoller Pegel berechenbar." };
  }
  if (level >= -40) {
    return { label: "Exzellent", color: "var(--green)", note: "Sehr starker Empfangspegel, hohe Reserve." };
  }
  if (level >= -70) {
    return { label: "Gut", color: "var(--green)", note: "Solider Betriebspegel, übliches Ziel für Live-Einsatz." };
  }
  if (level >= -90) {
    return { label: "Grenzwertig", color: "var(--orange)", note: "Nahe der Rauschschwelle vieler Empfänger &ndash; Dropout-Risiko steigt." };
  }
  return { label: "Kritisch", color: "var(--red)", note: "Wahrscheinlich unterhalb der Empfindlichkeitsschwelle &ndash; Dropouts zu erwarten." };
}

function meterPosition(level) {
  // Map dBm range [-100 .. -30] onto 0-100% for the visual meter.
  const min = -100, max = -30;
  const pct = ((level - min) / (max - min)) * 100;
  return Math.min(100, Math.max(0, pct));
}

/* ---------- DOM helpers ---------- */

function num(id) {
  const el = document.getElementById(id);
  const v = parseFloat(el.value);
  return isNaN(v) ? 0 : v;
}

function renderResults(container, headlineLevel, rows, warnings) {
  const cls = classify(headlineLevel);
  const pos = meterPosition(headlineLevel);

  let html = "";
  html += `<div class="result-headline">`;
  html += `<div class="result-value" style="color:${cls.color}">${fmt(headlineLevel, 2)} dBm</div>`;
  html += `<div class="result-label" style="color:${cls.color}">${cls.label}</div>`;
  html += `<div class="result-sub">${cls.note}</div>`;
  html += `</div>`;

  html += `<div class="meter"><div class="meter-marker" style="left:${pos}%"></div></div>`;
  html += `<div class="meter-scale"><span>-100</span><span>-90</span><span>-70</span><span>-40</span><span>-30</span></div>`;

  html += `<div class="breakdown"><h3>Berechnung (Schritt für Schritt)</h3>`;
  let running = 0;
  for (const row of rows) {
    running += row.value;
    const valClass = row.value >= 0 ? "pos" : "neg";
    html += `<div class="breakdown-row"><span>${row.label}</span><span class="val ${valClass}">${signed(row.value, 2)} dB</span></div>`;
  }
  html += `<div class="breakdown-total"><span>Empfangspegel</span><span>${fmt(headlineLevel, 2)} dBm</span></div>`;
  html += `</div>`;

  if (warnings && warnings.length) {
    html += `<div class="warning">${warnings.join("<br>")}</div>`;
  }

  container.innerHTML = html;
}

/* ---------- RF Microphone calculator ---------- */

function calcMic() {
  const txPowerMw = num("mic-txpower");
  const txAnt = num("mic-txant");
  const dist = num("mic-dist");
  const freq = num("mic-freq");
  const pol = num("mic-pol");
  const rxAnt = num("mic-rxant");
  const cable1 = num("mic-cable1");
  const conn1 = num("mic-conn1");
  const multi = num("mic-multi");
  const cable2 = num("mic-cable2");
  const conn2 = num("mic-conn2");

  const txDbm = dbmFromMw(txPowerMw);
  const fspl = freeSpacePathLoss(dist, freq);
  const polLoss = polarizationMismatchLoss(pol);

  const rows = [
    { label: `TX Sendeleistung (${txPowerMw} mW &rarr; dBm)`, value: txDbm },
    { label: "TX Antennengewinn", value: txAnt },
    { label: `Freiraumdämpfung (FSPL, ${dist} m @ ${freq} MHz)`, value: -fspl },
    { label: `Polarisations-Fehlanpassung (${pol}&deg;)`, value: -polLoss },
    { label: "RX Antennengewinn", value: rxAnt },
    { label: "Kabelverlust (Antenne &rarr; Multicoupler)", value: -cable1 },
    { label: "Steckerverlust (Antenne &rarr; Multicoupler)", value: -conn1 },
    { label: "Multicoupler Gewinn/Verlust", value: multi },
    { label: "Kabelverlust (Multicoupler &rarr; Empfänger)", value: -cable2 },
    { label: "Steckerverlust (Multicoupler &rarr; Empfänger)", value: -conn2 },
  ];

  const total = rows.reduce((acc, r) => acc + r.value, 0);

  const warnings = [];
  if (txPowerMw <= 0) warnings.push("Sendeleistung muss größer als 0 mW sein.");
  if (dist <= 0) warnings.push("Entfernung muss größer als 0 m sein.");
  if (pol >= 89.9) warnings.push("Polarisations-Fehlanpassung nahe 90&deg; &rarr; nahezu vollständige Auslöschung.");

  renderResults(document.getElementById("mic-results"), total, rows, warnings);
}

/* ---------- IEM calculator ---------- */

function calcIem() {
  const txPowerMw = num("iem-txpower");
  const cable1 = num("iem-cable1");
  const conn1 = num("iem-conn1");
  const combiner = num("iem-combiner");
  const cable2 = num("iem-cable2");
  const conn2 = num("iem-conn2");
  const txAnt = num("iem-txant");
  const pol = num("iem-pol");
  const dist = num("iem-dist");
  const freq = num("iem-freq");
  const rxAnt = num("iem-rxant");

  const txDbm = dbmFromMw(txPowerMw);
  const fspl = freeSpacePathLoss(dist, freq);
  const polLoss = polarizationMismatchLoss(pol);

  const rows = [
    { label: `TX Sendeleistung (${txPowerMw} mW &rarr; dBm)`, value: txDbm },
    { label: "Kabelverlust (TX &rarr; Combiner)", value: -cable1 },
    { label: "Steckerverlust (TX &rarr; Combiner)", value: -conn1 },
    { label: "Combiner Gewinn/Verlust", value: combiner },
    { label: "Kabelverlust (Combiner &rarr; Sendeantenne)", value: -cable2 },
    { label: "Steckerverlust (Combiner &rarr; Sendeantenne)", value: -conn2 },
    { label: "TX Antennengewinn", value: txAnt },
    { label: `Polarisations-Fehlanpassung (${pol}&deg;)`, value: -polLoss },
    { label: `Freiraumdämpfung (FSPL, ${dist} m @ ${freq} MHz)`, value: -fspl },
    { label: "RX Antennengewinn (Bodypack)", value: rxAnt },
  ];

  const total = rows.reduce((acc, r) => acc + r.value, 0);

  const warnings = [];
  if (txPowerMw <= 0) warnings.push("Sendeleistung muss größer als 0 mW sein.");
  if (dist <= 0) warnings.push("Entfernung muss größer als 0 m sein.");
  if (pol >= 89.9) warnings.push("Polarisations-Fehlanpassung nahe 90&deg; &rarr; nahezu vollständige Auslöschung.");

  renderResults(document.getElementById("iem-results"), total, rows, warnings);
}

/* ---------- Examples from the PDF (for verification) ---------- */

function loadMicExample() {
  document.getElementById("mic-txpower").value = 20;
  document.getElementById("mic-txant").value = 0;
  document.getElementById("mic-dist").value = 12.2;
  document.getElementById("mic-freq").value = 540;
  document.getElementById("mic-pol").value = 45;
  document.getElementById("mic-rxant").value = 7;
  document.getElementById("mic-cable1").value = 2.8;
  document.getElementById("mic-conn1").value = 0.5;
  document.getElementById("mic-multi").value = 0;
  document.getElementById("mic-cable2").value = 0.28;
  document.getElementById("mic-conn2").value = 0.5;
  calcMic();
}

function loadIemExample() {
  document.getElementById("iem-txpower").value = 30;
  document.getElementById("iem-cable1").value = 0.6;
  document.getElementById("iem-conn1").value = 0.5;
  document.getElementById("iem-combiner").value = -3;
  document.getElementById("iem-cable2").value = 1.67;
  document.getElementById("iem-conn2").value = 0.5;
  document.getElementById("iem-txant").value = 10;
  document.getElementById("iem-pol").value = 45;
  document.getElementById("iem-dist").value = 12.2;
  document.getElementById("iem-freq").value = 600;
  document.getElementById("iem-rxant").value = 1;
  calcIem();
}

/* ---------- Wiring ---------- */

document.getElementById("mic-form").addEventListener("input", calcMic);
document.getElementById("iem-form").addEventListener("input", calcIem);
document.getElementById("mic-example").addEventListener("click", loadMicExample);
document.getElementById("iem-example").addEventListener("click", loadIemExample);

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

calcMic();
calcIem();
