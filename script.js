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

/* ---------- Coax cable attenuation database ----------
 * Daempfungswerte in dB pro 100m bei Referenzfrequenzen. RG-/LMR-/Belden-
 * Werte sind typische Herstellerangaben (ca.-Werte, aus dB/100ft-Datenblatt-
 * angaben umgerechnet). Aircell 7/5 Werte stammen direkt aus dem
 * SSB-Electronic-Datenblatt (dB/100m). Für den tatsächlich verbauten
 * Kabeltyp/die Charge im Zweifel das Datenblatt des Herstellers pruefen. */

const CABLE_TYPES = {
  rg58: {
    label: "RG58",
    points: [[100, 16.1], [400, 32.5], [900, 51.5], [1000, 54.5]],
  },
  rg8x: {
    label: "RG8X (Mini-8)",
    points: [[100, 9.5], [400, 19.4], [900, 30.5], [1000, 32.5]],
  },
  rg213: {
    label: "RG213 / RG8",
    points: [[100, 6.9], [400, 14.4], [900, 23.6], [1000, 25.3]],
  },
  belden9913: {
    label: "Belden 9913 / 9913F7",
    points: [[100, 3.9], [400, 7.9], [900, 12.1], [1000, 13.1]],
  },
  lmr195: {
    label: "LMR-195",
    points: [[100, 12.8], [400, 25.9], [900, 39.7], [1000, 42.0], [1500, 52.2], [2000, 61.0]],
  },
  lmr240: {
    label: "LMR-240",
    points: [[100, 7.9], [400, 16.1], [900, 24.6], [1000, 25.9], [1500, 32.2], [2000, 37.7]],
  },
  lmr400: {
    label: "LMR-400",
    points: [[100, 4.3], [400, 8.2], [900, 12.8], [1000, 13.4], [1500, 16.7], [2000, 19.4]],
  },
  aircell7: {
    label: "Aircell 7",
    points: [[100, 5.97], [200, 8.59], [300, 10.64], [432, 12.92], [500, 13.98], [800, 18.05], [1000, 20.44], [1296, 23.60], [1500, 25.73], [1800, 28.50], [2000, 30.29]],
  },
  aircell5: {
    label: "Aircell 5",
    points: [[100, 8.93], [200, 12.74], [300, 15.70], [432, 18.99], [500, 20.49], [800, 26.24], [1000, 29.54], [1296, 33.92], [1500, 36.70], [1800, 40.50], [2000, 42.88]],
  },
};

// dB pro 100m bei gegebener Frequenz, interpoliert zwischen den bekannten
// Datenpunkten (linear über sqrt(f), da Kabeldämpfung durch den Skineffekt
// naeherungsweise proportional zu sqrt(f) verlaeuft). Ausserhalb des
// Tabellenbereichs wird mit derselben sqrt(f)-Naeherung extrapoliert.
function cableDbPer100m(cableKey, freqMHz) {
  const cable = CABLE_TYPES[cableKey];
  if (!cable || !isFinite(freqMHz) || freqMHz <= 0) return NaN;
  const pts = cable.points;

  if (freqMHz <= pts[0][0]) {
    return pts[0][1] * Math.sqrt(freqMHz / pts[0][0]);
  }
  const last = pts[pts.length - 1];
  if (freqMHz >= last[0]) {
    return last[1] * Math.sqrt(freqMHz / last[0]);
  }

  for (let i = 0; i < pts.length - 1; i++) {
    const [f1, a1] = pts[i];
    const [f2, a2] = pts[i + 1];
    if (freqMHz >= f1 && freqMHz <= f2) {
      const t = (Math.sqrt(freqMHz) - Math.sqrt(f1)) / (Math.sqrt(f2) - Math.sqrt(f1));
      return a1 + (a2 - a1) * t;
    }
  }
  return NaN;
}

function cableLossDb(cableKey, lengthM, freqMHz) {
  const per100m = cableDbPer100m(cableKey, freqMHz);
  if (!isFinite(per100m) || !isFinite(lengthM) || lengthM < 0) return NaN;
  return (per100m / 100) * lengthM;
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
  for (const row of rows) {
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

/* ---------- Cable type+length -> dB wiring (shared by all cable fields) ---------- */

function setupCableCalc(prefix, freqInputId, recalcFn) {
  const modeBox = document.getElementById(`${prefix}-mode`);
  const calcWrap = document.getElementById(`${prefix}-calc`);
  const dbInput = document.getElementById(prefix);
  const typeSelect = document.getElementById(`${prefix}-type`);
  const lengthInput = document.getElementById(`${prefix}-length`);
  const computedEl = document.getElementById(`${prefix}-computed`);
  const computedFreqEl = document.getElementById(`${prefix}-computed-freq`);

  function update() {
    if (!modeBox.checked) {
      calcWrap.hidden = true;
      dbInput.readOnly = false;
      recalcFn();
      return;
    }
    calcWrap.hidden = false;
    dbInput.readOnly = true;

    const freq = num(freqInputId);
    const length = num(`${prefix}-length`);
    const loss = cableLossDb(typeSelect.value, length, freq);

    if (isFinite(loss)) {
      dbInput.value = loss.toFixed(2);
      computedEl.textContent = loss.toFixed(2);
      computedFreqEl.textContent = freq;
    } else {
      computedEl.textContent = "&ndash;";
      computedFreqEl.textContent = "&ndash;";
    }
    recalcFn();
  }

  // Explicitly triggers recalcFn after every update instead of relying on
  // event bubbling into the form's own "input" listener - checkbox
  // "change" events fire in an order relative to "input" that isn't safe
  // to depend on for keeping the totals in sync.
  modeBox.addEventListener("change", update);
  typeSelect.addEventListener("input", update);
  lengthInput.addEventListener("input", update);
  document.getElementById(freqInputId).addEventListener("input", update);

  update();
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
  const splitter = num("mic-splitter");
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
    { label: "Kabelverlust (Antenne &rarr; Splitter)", value: -cable1 },
    { label: "Steckerverlust (Antenne &rarr; Splitter)", value: -conn1 },
    { label: "Splitter Gewinn/Verlust", value: splitter },
    { label: "Kabelverlust (Splitter &rarr; Empfänger)", value: -cable2 },
    { label: "Steckerverlust (Splitter &rarr; Empfänger)", value: -conn2 },
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

function resetCableField(prefix) {
  document.getElementById(`${prefix}-mode`).checked = false;
  document.getElementById(`${prefix}-calc`).hidden = true;
  document.getElementById(prefix).readOnly = false;
}

function loadMicExample() {
  document.getElementById("mic-txpower").value = 20;
  document.getElementById("mic-txant").value = 0;
  document.getElementById("mic-dist").value = 12.2;
  document.getElementById("mic-freq").value = 540;
  document.getElementById("mic-pol").value = 45;
  document.getElementById("mic-rxant").value = 7;
  resetCableField("mic-cable1");
  document.getElementById("mic-cable1").value = 2.8;
  document.getElementById("mic-conn1").value = 0.5;
  document.getElementById("mic-splitter").value = 0;
  resetCableField("mic-cable2");
  document.getElementById("mic-cable2").value = 0.28;
  document.getElementById("mic-conn2").value = 0.5;
  calcMic();
}

function loadIemExample() {
  document.getElementById("iem-txpower").value = 30;
  resetCableField("iem-cable1");
  document.getElementById("iem-cable1").value = 0.6;
  document.getElementById("iem-conn1").value = 0.5;
  document.getElementById("iem-combiner").value = -3;
  resetCableField("iem-cable2");
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

setupCableCalc("mic-cable1", "mic-freq", calcMic);
setupCableCalc("mic-cable2", "mic-freq", calcMic);
setupCableCalc("iem-cable1", "iem-freq", calcIem);
setupCableCalc("iem-cable2", "iem-freq", calcIem);
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
