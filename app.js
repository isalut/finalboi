const DENOMINATIONS = [
  { id: "note-2000", label: "₹2000 Note", value: 2000, type: "Note" },
  { id: "note-500",  label: "₹500 Note",  value: 500,  type: "Note" },
  { id: "note-200",  label: "₹200 Note",  value: 200,  type: "Note" },
  { id: "note-100",  label: "₹100 Note",  value: 100,  type: "Note" },
  { id: "note-50",   label: "₹50 Note",   value: 50,   type: "Note" },
  { id: "note-20",   label: "₹20 Note",   value: 20,   type: "Note" },
  { id: "note-10",   label: "₹10 Note",   value: 10,   type: "Note" },
  { id: "note-5",    label: "₹5 Note",    value: 5,    type: "Note" },
  { id: "coin-20",   label: "₹20 Coin",   value: 20,   type: "Coin" },
  { id: "coin-10",   label: "₹10 Coin",   value: 10,   type: "Coin" },
  { id: "coin-5",    label: "₹5 Coin",    value: 5,    type: "Coin" },
  { id: "coin-2",    label: "₹2 Coin",    value: 2,    type: "Coin" },
  { id: "coin-1",    label: "₹1 Coin",    value: 1,    type: "Coin" }
];

const state = {
  activeSession: "morning",
  hasChecked: false,
  counts: {
    morning: Object.fromEntries(DENOMINATIONS.map((d) => [d.id, 0])),
    evening: Object.fromEntries(DENOMINATIONS.map((d) => [d.id, 0]))
  }
};

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function formatINR(amount) {
  return inrFormatter.format(amount);
}

function sanitizeIntegerInput(rawValue) {
  const digitsOnly = String(rawValue).replace(/[^0-9]/g, "");
  if (!digitsOnly) return 0;
  const parsed = parseInt(digitsOnly, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function computeSessionSummary(sessionKey) {
  let totalAmount = 0;
  let totalPieces = 0;

  for (const denom of DENOMINATIONS) {
    const qty = state.counts[sessionKey][denom.id] || 0;
    totalPieces += qty;
    totalAmount += qty * denom.value;
  }

  return { totalAmount, totalPieces };
}

function renderDenominationRows() {
  const listEl = document.getElementById("denomination-list");
  listEl.innerHTML = "";

  const currentCounts = state.counts[state.activeSession];

  for (const denom of DENOMINATIONS) {
    const qty = currentCounts[denom.id] || 0;
    const lineAmount = qty * denom.value;

    const row = document.createElement("div");
    row.className = "denom-row";

    const labelBox = document.createElement("div");
    labelBox.className = "col-denom";

    const denomLabel = document.createElement("span");
    denomLabel.className = "denom-label";
    denomLabel.textContent = denom.label;

    const denomType = document.createElement("span");
    denomType.className = "denom-type";
    denomType.textContent = denom.type;

    labelBox.append(denomLabel, denomType);

    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.pattern = "[0-9]*";
    input.className = "qty-input col-count";
    input.setAttribute("aria-label", `${state.activeSession} count for ${denom.label}`);
    input.value = qty === 0 ? "" : String(qty);
    input.placeholder = "0";

    input.addEventListener("input", (e) => {
      const cleanQty = sanitizeIntegerInput(e.target.value);
      e.target.value = cleanQty === 0 ? "" : String(cleanQty);
      state.counts[state.activeSession][denom.id] = cleanQty;
      state.hasChecked = false;
      hideResultBanner();
      updateTotalsUI();
      lineTotalEl.textContent = formatINR(cleanQty * denom.value);
    });

    const lineTotalEl = document.createElement("div");
    lineTotalEl.className = "line-total col-amount";
    lineTotalEl.textContent = formatINR(lineAmount);

    row.append(labelBox, input, lineTotalEl);
    listEl.appendChild(row);
  }
}

function updateTotalsUI() {
  const morning = computeSessionSummary("morning");
  const evening = computeSessionSummary("evening");
  const activeSummary = state.activeSession === "morning" ? morning : evening;

  document.getElementById("badge-morning").textContent = formatINR(morning.totalAmount);
  document.getElementById("badge-evening").textContent = formatINR(evening.totalAmount);
  document.getElementById("mini-morning").textContent = formatINR(morning.totalAmount);
  document.getElementById("mini-evening").textContent = formatINR(evening.totalAmount);

  document.getElementById("session-label").textContent =
    state.activeSession === "morning" ? "MORNING CASH TOTAL" : "EVENING CASH TOTAL";
  document.getElementById("session-pieces").textContent = `${activeSummary.totalPieces} pcs`;
  document.getElementById("session-total").textContent = formatINR(activeSummary.totalAmount);
}

function setActiveSession(sessionKey) {
  state.activeSession = sessionKey;

  const morningTab = document.getElementById("tab-morning");
  const eveningTab = document.getElementById("tab-evening");

  const isMorning = sessionKey === "morning";
  morningTab.classList.toggle("active", isMorning);
  morningTab.setAttribute("aria-selected", String(isMorning));

  eveningTab.classList.toggle("active", !isMorning);
  eveningTab.setAttribute("aria-selected", String(!isMorning));

  updateTotalsUI();
  renderDenominationRows();
}

function hideResultBanner() {
  const banner = document.getElementById("result-banner");
  banner.className = "result-banner hidden";
}

function openResultModal() {
  document.getElementById("result-modal").classList.remove("hidden");
  document.getElementById("result-modal-close").focus();
}

function closeResultModal() {
  document.getElementById("result-modal").classList.add("hidden");
}

function evaluateCashEqualisation() {
  const morningTotal = computeSessionSummary("morning").totalAmount;
  const eveningTotal = computeSessionSummary("evening").totalAmount;
  const difference = morningTotal - eveningTotal;
  const absDiffFormatted = formatINR(Math.abs(difference));

  state.hasChecked = true;

  const banner = document.getElementById("result-banner");
  const badge = document.getElementById("result-badge");
  const heading = document.getElementById("result-heading");
  const diffText = document.getElementById("result-diff");
  const subtext = document.getElementById("result-subtext");

  const modalCard = document.getElementById("result-modal-card");
  const modalBadge = document.getElementById("result-modal-badge");
  const modalHeading = document.getElementById("result-modal-heading");
  const modalStatement = document.getElementById("result-modal-statement");

  banner.classList.remove("hidden", "matched", "recheck");
  modalCard.classList.remove("matched", "recheck");

  let statusTone = "matched";
  let badgeLabel = "Equalised";
  let titleText = "AMOUNT MATCHED";
  let diffDisplay = "Difference: ₹0";
  let statementText = "The cash is balanced.";

  if (difference > 0) {
    statusTone = "recheck";
    badgeLabel = "Variance Detected";
    titleText = "RECHECK THE CASH";
    diffDisplay = `Difference: ${absDiffFormatted}`;
    statementText = `Evening cash is ${absDiffFormatted} less than the morning cash.`;
  } else if (difference < 0) {
    statusTone = "recheck";
    badgeLabel = "Variance Detected";
    titleText = "RECHECK THE CASH";
    diffDisplay = `Difference: -${absDiffFormatted}`;
    statementText = `Evening cash is ${absDiffFormatted} more than the morning cash.`;
  }

  banner.classList.add(statusTone);
  badge.textContent = badgeLabel;
  heading.textContent = titleText;
  diffText.textContent = diffDisplay;
  subtext.textContent = statementText;

  modalCard.classList.add(statusTone);
  modalBadge.textContent = badgeLabel;
  modalHeading.textContent = titleText;
  modalStatement.textContent = statementText;
  document.getElementById("modal-morning-val").textContent = formatINR(morningTotal);
  document.getElementById("modal-evening-val").textContent = formatINR(eveningTotal);
  document.getElementById("modal-diff-val").textContent =
    difference < 0 ? `-${absDiffFormatted}` : absDiffFormatted;

  // Scroll smoothly to the top and immediately open the centered result pop-up
  window.scrollTo({ top: 0, behavior: "smooth" });
  openResultModal();
}

function openResetModal() {
  document.getElementById("reset-modal").classList.remove("hidden");
}

function closeResetModal() {
  document.getElementById("reset-modal").classList.add("hidden");
}

function performReset() {
  for (const denom of DENOMINATIONS) {
    state.counts.morning[denom.id] = 0;
    state.counts.evening[denom.id] = 0;
  }
  state.hasChecked = false;
  hideResultBanner();
  closeResultModal();
  updateTotalsUI();
  renderDenominationRows();
  closeResetModal();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("tab-morning").addEventListener("click", () => setActiveSession("morning"));
  document.getElementById("tab-evening").addEventListener("click", () => setActiveSession("evening"));
  document.getElementById("btn-check").addEventListener("click", evaluateCashEqualisation);
  document.getElementById("result-modal-close").addEventListener("click", closeResultModal);
  document.getElementById("btn-reset").addEventListener("click", openResetModal);
  document.getElementById("modal-cancel").addEventListener("click", closeResetModal);
  document.getElementById("modal-confirm").addEventListener("click", performReset);

  updateTotalsUI();
  renderDenominationRows();
});
