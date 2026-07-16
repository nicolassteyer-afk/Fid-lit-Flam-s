const STAMP_TARGET = 10;
const STORAGE_KEY = "flams-loyalty-v4";
const SESSION_KEY = "flams-current-client";
const MILESTONES = [
  { stamps: 4, benefit: "5%", label: "5% de remise" },
  { stamps: 7, benefit: "10%", label: "10% de remise" },
  { stamps: 10, benefit: "20%", label: "20% de remise" },
];
const STATUS_LEVELS = [
  { min: 5, key: "diamond", label: "Diamant" },
  { min: 4, key: "platinum", label: "Platine" },
  { min: 3, key: "gold", label: "Or" },
  { min: 2, key: "silver", label: "Argent" },
  { min: 1, key: "bronze", label: "Bronze" },
  { min: 0, key: "new", label: "Nouveau" },
];

const restaurants = [
  { id: "strasbourg", name: "Flam's Strasbourg", city: "Strasbourg" },
  { id: "colmar", name: "Flam's Colmar", city: "Colmar" },
  { id: "mulhouse", name: "Flam's Mulhouse", city: "Mulhouse" },
  { id: "paris", name: "Flam's Paris Grands Boulevards", city: "Paris" },
];

const initialState = {
  cards: [],
  events: [],
  settings: {
    dailyStampLimitEnabled: true,
  },
};

const state = loadState();
const page = document.body.dataset.page;
let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  const installButton = document.querySelector("#install-app");
  if (installButton) installButton.disabled = false;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return structuredClone(initialState);

  try {
    const parsed = JSON.parse(stored);
    return {
      ...structuredClone(initialState),
      ...parsed,
      settings: {
        ...structuredClone(initialState).settings,
        ...(parsed.settings || {}),
      },
    };
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getRestaurant(id) {
  return restaurants.find((restaurant) => restaurant.id === id);
}

function normalizePhone(value) {
  return value.replaceAll(" ", "").replaceAll(".", "").replaceAll("-", "");
}

function generateCardNumber() {
  let cardNumber = "";
  do {
    cardNumber = `FLAMS-${Math.floor(100000 + Math.random() * 900000)}`;
  } while (state.cards.some((card) => card.cardNumber === cardNumber));
  return cardNumber;
}

function createPasswordHash(password) {
  return btoa(unescape(encodeURIComponent(password)));
}

function verifyPassword(card, password) {
  return card.passwordHash === createPasswordHash(password);
}

function pushEvent(type, card, restaurantId, label, stampDelta = 0) {
  const restaurant = getRestaurant(restaurantId);
  state.events.unshift({
    id: crypto.randomUUID(),
    type,
    cardNumber: card.cardNumber,
    customerName: `${card.firstName} ${card.lastName}`,
    restaurantId,
    restaurantName: restaurant?.name || "Restaurant inconnu",
    label,
    stampDelta,
    createdAt: new Date().toISOString(),
  });
}

function findCard(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  return state.cards.find((card) => {
    return (
      card.cardNumber.toLowerCase() === normalized ||
      card.email === normalized ||
      normalizePhone(card.phone) === normalizePhone(normalized) ||
      `${card.firstName} ${card.lastName}`.toLowerCase().includes(normalized)
    );
  });
}

function fillRestaurantSelect(select) {
  if (!select) return;
  select.innerHTML = "";
  for (const restaurant of restaurants) {
    select.add(new Option(`${restaurant.name} - ${restaurant.city}`, restaurant.id));
  }
}

function renderStamps(container, stampCount) {
  if (!container) return;
  container.innerHTML = "";
  for (let index = 0; index < STAMP_TARGET; index += 1) {
    const stampNumber = index + 1;
    const milestone = MILESTONES.find((item) => item.stamps === stampNumber);
    const stamp = document.createElement("span");
    stamp.className = `stamp${index < stampCount ? " is-filled" : ""}${milestone ? " is-milestone" : ""}`;
    if (milestone) stamp.dataset.benefit = milestone.benefit;
    container.append(stamp);
  }
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function hasStampToday(cardNumber) {
  if (!state.settings.dailyStampLimitEnabled) return false;
  const today = getTodayKey();
  return state.events.some((event) => {
    return event.cardNumber === cardNumber && event.type === "stamp_added" && event.createdAt.slice(0, 10) === today;
  });
}

function renderEventItem(event) {
  const item = document.createElement("article");
  item.className = "event";
  item.innerHTML = `
    <strong>${event.label}</strong>
    <p>${event.customerName} - ${event.cardNumber}</p>
    <p>${event.restaurantName} - ${formatDate(event.createdAt)}</p>
  `;
  return item;
}

function formatDate(value) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function showMilestoneModal(card, milestone) {
  let modal = document.querySelector(".gain-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "gain-modal";
    document.body.append(modal);
  }

  modal.innerHTML = `
    <section class="gain-dialog" role="dialog" aria-modal="true" aria-labelledby="gain-title">
      <button class="gain-close" type="button" aria-label="Fermer">×</button>
      <p class="eyebrow">Gain debloque</p>
      <div class="gain-value">${milestone.benefit}</div>
      <h2 id="gain-title">${milestone.label}</h2>
      <p class="gain-copy">${card.firstName} ${card.lastName} vient d'atteindre le palier ${milestone.stamps} tampons.</p>
      <dl class="gain-recap">
        <div>
          <dt>Carte</dt>
          <dd>${card.cardNumber}</dd>
        </div>
        <div>
          <dt>Progression</dt>
          <dd>${card.stampCount}/${STAMP_TARGET} tampons</dd>
        </div>
        <div>
          <dt>Action</dt>
          <dd>Utiliser l'avantage depuis la fiche client si le client souhaite en profiter maintenant.</dd>
        </div>
      </dl>
      <button class="primary" type="button" id="gain-confirm">Compris</button>
    </section>
  `;

  modal.classList.add("is-visible");
  const close = () => modal.classList.remove("is-visible");
  modal.querySelector(".gain-close").addEventListener("click", close);
  modal.querySelector("#gain-confirm").addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  }, { once: true });
}

function initAuthPage() {
  fillRestaurantSelect(document.querySelector("#restaurant-select"));
  renderStamps(document.querySelector("#sample-stamps"), 0);

  document.querySelector("#customer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email").trim().toLowerCase();
    const phone = formData.get("phone").trim();
    const existing = state.cards.find((card) => card.email === email || normalizePhone(card.phone) === normalizePhone(phone));

    if (existing) {
      showToast("Une carte existe deja avec cet email ou telephone.");
      return;
    }

    const card = {
      id: crypto.randomUUID(),
      cardNumber: generateCardNumber(),
      firstName: formData.get("firstName").trim(),
      lastName: formData.get("lastName").trim(),
      email,
      phone,
      passwordHash: createPasswordHash(formData.get("password")),
      restaurantId: formData.get("restaurantId"),
      marketingConsent: formData.get("marketingConsent") === "on",
      stampCount: 0,
      rewardsRedeemed: 0,
      completedCards: 0,
      redeemedMilestones: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.cards.unshift(card);
    pushEvent("card_created", card, card.restaurantId, "Carte creee");
    saveState();
    sessionStorage.setItem(SESSION_KEY, card.cardNumber);
    window.location.href = "carte.html";
  });

  document.querySelector("#login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email").trim().toLowerCase();
    const card = state.cards.find((item) => item.email === email);

    if (!card || !verifyPassword(card, formData.get("password"))) {
      showToast("Email ou mot de passe incorrect.");
      return;
    }

    sessionStorage.setItem(SESSION_KEY, card.cardNumber);
    window.location.href = "carte.html";
  });
}

function initCardPage() {
  const cardNumber = sessionStorage.getItem(SESSION_KEY);
  const card = state.cards.find((item) => item.cardNumber === cardNumber);

  if (!card) {
    window.location.href = "index.html";
    return;
  }

  renderClientCard(card);
  document.querySelector("#copy-card-code").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(card.cardNumber);
      showToast("Code carte copie.");
    } catch {
      showToast(card.cardNumber);
    }
  });

  document.querySelector("#logout-client").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
  });

  setupInstallButton();
}

function setupInstallButton() {
  const installButton = document.querySelector("#install-app");
  const installHelp = document.querySelector("#install-help");
  if (!installButton || !installHelp) return;

  installButton.addEventListener("click", async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installHelp.textContent = "Installation lancee. L'app s'ouvrira directement sur la web app Flam's.";
      return;
    }

    installHelp.textContent = "Sur iPhone : bouton Partager puis Sur l'ecran d'accueil. Sur Android : menu du navigateur puis Installer l'application.";
  });
}

function renderClientCard(card) {
  const remaining = STAMP_TARGET - card.stampCount;
  const nextMilestone = getNextMilestone(card.stampCount);
  const currentBenefit = getCurrentBenefit(card.stampCount);
  const availableBenefit = getAvailableBenefit(card);
  const status = getCustomerStatus(card);
  const walletCard = document.querySelector(".wallet-card");
  walletCard.className = `wallet-card status-${status.key}`;
  document.querySelector("#card-name").textContent = `${card.firstName} ${card.lastName}`;
  document.querySelector("#card-number").textContent = card.cardNumber;
  document.querySelector("#client-status").textContent = status.label;
  document.querySelector("#stamp-count").textContent = `${card.stampCount}/${STAMP_TARGET}`;
  document.querySelector("#reward-status").textContent = nextMilestone
    ? `Encore ${nextMilestone.stamps - card.stampCount} tampon${nextMilestone.stamps - card.stampCount > 1 ? "s" : ""} avant ${nextMilestone.label}`
    : "20% disponible";
  document.querySelector("#client-current-benefit").textContent = availableBenefit
    ? `${availableBenefit.label} disponible`
    : currentBenefit
      ? "Tous les avantages debloques ont ete utilises"
      : "Prochain palier : 5% au 4eme tampon";
  document.querySelector("#client-progress").style.width = `${(card.stampCount / STAMP_TARGET) * 100}%`;
  document.querySelector("#metric-my-stamps").textContent = card.stampCount;
  document.querySelector("#metric-my-completed").textContent = card.completedCards || 0;
  renderStamps(document.querySelector("#client-stamps"), card.stampCount);
  renderMilestones(document.querySelector("#milestone-track"), card.stampCount);
  renderBenefitList(document.querySelector("#benefit-list"), card);

  const history = document.querySelector("#client-history");
  history.innerHTML = "";
  const events = state.events.filter((event) => event.cardNumber === card.cardNumber).slice(0, 8);
  if (events.length === 0) {
    history.innerHTML = `<p class="empty">Aucune activite pour le moment.</p>`;
    return;
  }
  for (const event of events) history.append(renderEventItem(event));
}

function getCurrentBenefit(stampCount) {
  return [...MILESTONES].reverse().find((milestone) => stampCount >= milestone.stamps);
}

function getCustomerStatus(card) {
  const completedCards = card.completedCards || 0;
  return STATUS_LEVELS.find((level) => completedCards >= level.min);
}

function getNextMilestone(stampCount) {
  return MILESTONES.find((milestone) => stampCount < milestone.stamps);
}

function getAvailableBenefit(card) {
  const redeemed = card.redeemedMilestones || [];
  return MILESTONES.find((milestone) => card.stampCount >= milestone.stamps && !redeemed.includes(milestone.stamps));
}

function renderMilestones(container, stampCount) {
  container.innerHTML = "";
  for (const milestone of MILESTONES) {
    const unlocked = stampCount >= milestone.stamps;
    const next = getNextMilestone(stampCount)?.stamps === milestone.stamps;
    const item = document.createElement("article");
    item.className = `milestone-item${unlocked ? " is-unlocked" : ""}${next ? " is-current" : ""}`;
    item.innerHTML = `
      <span class="milestone-dot">${milestone.stamps}</span>
      <span class="milestone-copy">
        <strong>${milestone.label}</strong>
        <span>Palier ${milestone.stamps} tampons</span>
      </span>
      <span class="milestone-state">${unlocked ? "Dispo" : `${milestone.stamps - stampCount} restants`}</span>
    `;
    container.append(item);
  }
}

function renderBenefitList(container, card) {
  container.innerHTML = "";
  for (const milestone of MILESTONES) {
    const unlocked = card.stampCount >= milestone.stamps;
    const redeemed = (card.redeemedMilestones || []).includes(milestone.stamps);
    const item = document.createElement("article");
    item.className = `benefit-item${unlocked && !redeemed ? " is-unlocked" : ""}`;
    item.innerHTML = `
      <span class="benefit-value">${milestone.benefit}</span>
      <span class="benefit-copy">
        <strong>${milestone.label}</strong>
        <span>Debloque au ${milestone.stamps}eme tampon</span>
      </span>
      <span class="pill ${unlocked && !redeemed ? "good" : ""}">${redeemed ? "Utilise" : unlocked ? "Disponible" : "Bloque"}</span>
    `;
    container.append(item);
  }
}

function initRestaurantPage() {
  fillRestaurantSelect(document.querySelector("#staff-restaurant-select"));
  const searchInput = document.querySelector("#card-search");
  const searchButton = document.querySelector("#search-card");
  const restaurantSelect = document.querySelector("#staff-restaurant-select");

  searchButton.addEventListener("click", () => {
    const card = findCard(searchInput.value);
    if (!card) {
      renderStaffCard(null);
      showToast("Carte introuvable.");
      return;
    }
    renderStaffCard(card);
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchButton.click();
  });
  restaurantSelect.addEventListener("change", () => renderRestaurantShortlist("recent"));
  document.querySelector("#show-reward-cards").addEventListener("click", () => renderRestaurantShortlist("rewards"));
  document.querySelector("#show-recent-cards").addEventListener("click", () => renderRestaurantShortlist("recent"));
  renderRestaurantShortlist("recent");
}

function renderStaffCard(card) {
  const panel = document.querySelector("#staff-card-panel");
  if (!card) {
    panel.innerHTML = `<p class="empty">Aucune carte selectionnee.</p>`;
    return;
  }

  const remaining = STAMP_TARGET - card.stampCount;
  const rewardReady = remaining <= 0;
  const currentBenefit = getCurrentBenefit(card.stampCount);
  const availableBenefit = getAvailableBenefit(card);
  const stampedToday = hasStampToday(card.cardNumber);
  const restaurant = getRestaurant(card.restaurantId);
  const lastEvent = state.events.find((event) => event.cardNumber === card.cardNumber);

  panel.innerHTML = `
    <div class="staff-card">
      <div class="staff-meta">
        <div>
          <p class="eyebrow">${card.cardNumber}</p>
          <h2>${card.firstName} ${card.lastName}</h2>
          <p class="customer-line">${card.email} - ${card.phone}</p>
        </div>
        <span class="pill ${availableBenefit ? "good" : "warn"}">${availableBenefit ? availableBenefit.label : `${remaining} restants`}</span>
      </div>
      <div class="mini-stats">
        <span class="pill">${restaurant?.city || "Reseau"}</span>
        <span class="pill">${card.rewardsRedeemed} recompense${card.rewardsRedeemed > 1 ? "s" : ""}</span>
        <span class="pill">${lastEvent ? formatDate(lastEvent.createdAt) : "Nouveau"}</span>
      </div>
      <div class="stamp-grid" id="staff-stamps"></div>
      <div class="staff-actions">
        <button class="primary" type="button" id="add-stamp" ${rewardReady || stampedToday ? "disabled" : ""}>Ajouter un tampon</button>
        <button class="secondary" type="button" id="redeem-reward" ${availableBenefit ? "" : "disabled"}>Utiliser l'avantage</button>
      </div>
      ${stampedToday ? `<p class="customer-line">Tampon deja ajoute aujourd'hui pour cette carte.</p>` : ""}
      <div>
        <h3>Historique carte</h3>
        <div class="event-list compact" id="staff-history"></div>
      </div>
    </div>
  `;

  renderStamps(document.querySelector("#staff-stamps"), card.stampCount);
  document.querySelector("#add-stamp").addEventListener("click", () => addStamp(card.cardNumber));
  document.querySelector("#redeem-reward").addEventListener("click", () => redeemReward(card.cardNumber));
  renderStaffHistory(card);
}

function renderStaffHistory(card) {
  const container = document.querySelector("#staff-history");
  const events = state.events.filter((event) => event.cardNumber === card.cardNumber).slice(0, 6);
  container.innerHTML = "";
  if (events.length === 0) {
    container.innerHTML = `<p class="empty">Aucune activite.</p>`;
    return;
  }
  for (const event of events) container.append(renderEventItem(event));
}

function addStamp(cardNumber) {
  const card = state.cards.find((item) => item.cardNumber === cardNumber);
  if (!card || card.stampCount >= STAMP_TARGET) return;
  if (hasStampToday(cardNumber)) {
    showToast("Limite atteinte : 1 tampon par jour et par carte.");
    renderStaffCard(card);
    return;
  }

  const previousStampCount = card.stampCount;
  card.stampCount += 1;
  card.updatedAt = new Date().toISOString();
  pushEvent("stamp_added", card, document.querySelector("#staff-restaurant-select").value, "Tampon ajoute", 1);
  saveState();
  renderStaffCard(card);
  renderRestaurantShortlist("recent");

  const unlockedMilestone = MILESTONES.find((milestone) => previousStampCount < milestone.stamps && card.stampCount >= milestone.stamps);
  if (unlockedMilestone) {
    showMilestoneModal(card, unlockedMilestone);
  } else {
    showToast("Tampon ajoute.");
  }
}

function redeemReward(cardNumber) {
  const card = state.cards.find((item) => item.cardNumber === cardNumber);
  const benefit = card ? getAvailableBenefit(card) : null;
  if (!card || !benefit) return;

  const isFinalBenefit = benefit.stamps >= STAMP_TARGET;
  card.redeemedMilestones = card.redeemedMilestones || [];
  card.redeemedMilestones.push(benefit.stamps);
  if (isFinalBenefit) {
    card.stampCount = 0;
    card.redeemedMilestones = [];
    card.completedCards = (card.completedCards || 0) + 1;
  }
  card.rewardsRedeemed += 1;
  card.updatedAt = new Date().toISOString();
  pushEvent("reward_redeemed", card, document.querySelector("#staff-restaurant-select").value, `${benefit.label} utilisee`, isFinalBenefit ? -STAMP_TARGET : 0);
  saveState();
  renderStaffCard(card);
  renderRestaurantShortlist("recent");
  showToast(isFinalBenefit ? "20% utilise, carte remise a zero." : "Avantage intermediaire utilise.");
}

function renderRestaurantShortlist(mode) {
  const container = document.querySelector("#restaurant-shortlist");
  const restaurantId = document.querySelector("#staff-restaurant-select").value;
  const relevantEvents = state.events.filter((event) => event.restaurantId === restaurantId);
  let cards = state.cards.filter((card) => card.restaurantId === restaurantId || relevantEvents.some((event) => event.cardNumber === card.cardNumber));

  if (mode === "rewards") cards = cards.filter((card) => card.stampCount >= STAMP_TARGET);
  cards = cards.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 5);
  container.innerHTML = "";

  if (cards.length === 0) {
    container.innerHTML = `<p class="empty">${mode === "rewards" ? "Aucune recompense disponible." : "Aucun client recent."}</p>`;
    return;
  }

  for (const card of cards) {
    const item = document.createElement("article");
    item.className = "event";
    item.innerHTML = `
      <strong>${card.firstName} ${card.lastName}</strong>
      <p>${card.cardNumber} - ${card.stampCount}/${STAMP_TARGET} tampons</p>
      <button class="secondary" type="button">Ouvrir</button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      document.querySelector("#card-search").value = card.cardNumber;
      renderStaffCard(card);
    });
    container.append(item);
  }
}

function initAdminPage() {
  document.querySelector("#admin-client-filter").addEventListener("input", renderClientTable);
  document.querySelector("#export-csv").addEventListener("click", exportCsv);
  document.querySelector("#seed-demo").addEventListener("click", seedDemoData);
  document.querySelector("#daily-stamp-limit-toggle").addEventListener("change", (event) => {
    state.settings.dailyStampLimitEnabled = event.currentTarget.checked;
    saveState();
    renderSettings();
    showToast(state.settings.dailyStampLimitEnabled ? "Limite quotidienne activee." : "Limite quotidienne desactivee.");
  });
  renderAdmin();
}

function renderAdmin() {
  const stampEvents = state.events.filter((event) => event.type === "stamp_added");
  const rewardEvents = state.events.filter((event) => event.type === "reward_redeemed");
  const optinRate = state.cards.length ? Math.round((state.cards.filter((card) => card.marketingConsent).length / state.cards.length) * 100) : 0;

  document.querySelector("#metric-cards").textContent = state.cards.length;
  document.querySelector("#metric-stamps").textContent = stampEvents.length;
  document.querySelector("#metric-rewards").textContent = rewardEvents.length;
  document.querySelector("#metric-optin").textContent = `${optinRate}%`;

  renderDashboardCharts();
  renderRestaurantTable();
  renderClientTable();
  renderEventList();
  renderSettings();
}

function renderDashboardCharts() {
  renderActivityChart();
  renderRestaurantBars();
  renderStatusChart();
  renderMilestoneFunnel();
  renderAdminInsights();
}

function getDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function renderActivityChart() {
  const container = document.querySelector("#activity-chart");
  const total = document.querySelector("#activity-total");
  if (!container || !total) return;

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      key: getDayKey(date),
      label: date.toLocaleDateString("fr-FR", { weekday: "short" }),
      stamps: 0,
      rewards: 0,
    };
  });

  for (const event of state.events) {
    const day = days.find((item) => item.key === event.createdAt.slice(0, 10));
    if (!day) continue;
    if (event.type === "stamp_added") day.stamps += 1;
    if (event.type === "reward_redeemed") day.rewards += 1;
  }

  const max = Math.max(1, ...days.map((day) => day.stamps + day.rewards));
  total.textContent = `${days.reduce((sum, day) => sum + day.stamps + day.rewards, 0)} actions`;
  container.innerHTML = "";

  for (const day of days) {
    const value = day.stamps + day.rewards;
    const column = document.createElement("article");
    column.className = "line-day";
    column.innerHTML = `
      <div class="line-stack" style="--height:${Math.max(8, (value / max) * 100)}%">
        <span class="line-rewards" style="--share:${value ? (day.rewards / value) * 100 : 0}%"></span>
      </div>
      <strong>${value}</strong>
      <span>${day.label}</span>
    `;
    container.append(column);
  }
}

function renderRestaurantBars() {
  const container = document.querySelector("#restaurant-bars");
  if (!container) return;

  const rows = restaurants.map((restaurant) => {
    const events = state.events.filter((event) => event.restaurantId === restaurant.id && event.type === "stamp_added");
    return { restaurant, value: events.length };
  });
  const max = Math.max(1, ...rows.map((row) => row.value));
  container.innerHTML = "";

  for (const row of rows) {
    const item = document.createElement("article");
    item.className = "bar-row";
    item.innerHTML = `
      <div>
        <strong>${row.restaurant.name}</strong>
        <span>${row.restaurant.city}</span>
      </div>
      <div class="bar-track"><span style="width:${(row.value / max) * 100}%"></span></div>
      <strong>${row.value}</strong>
    `;
    container.append(item);
  }
}

function renderStatusChart() {
  const container = document.querySelector("#status-chart");
  if (!container) return;

  const levels = [...STATUS_LEVELS].reverse();
  container.innerHTML = "";
  for (const level of levels) {
    const count = state.cards.filter((card) => getCustomerStatus(card).key === level.key).length;
    const item = document.createElement("article");
    item.className = `status-chip status-${level.key}`;
    item.innerHTML = `<strong>${count}</strong><span>${level.label}</span>`;
    container.append(item);
  }
}

function renderMilestoneFunnel() {
  const container = document.querySelector("#milestone-funnel");
  if (!container) return;

  const rows = [
    { label: "Cartes actives", value: state.cards.length },
    ...MILESTONES.map((milestone) => ({
      label: `${milestone.label} atteint`,
      value: state.cards.filter((card) => card.stampCount >= milestone.stamps).length,
    })),
  ];
  const max = Math.max(1, ...rows.map((row) => row.value));
  container.innerHTML = "";

  for (const row of rows) {
    const item = document.createElement("article");
    item.className = "funnel-row";
    item.innerHTML = `
      <div class="funnel-label">
        <strong>${row.label}</strong>
        <span>${row.value} carte${row.value > 1 ? "s" : ""}</span>
      </div>
      <div class="funnel-track"><span style="width:${(row.value / max) * 100}%"></span></div>
    `;
    container.append(item);
  }
}

function renderAdminInsights() {
  const container = document.querySelector("#admin-insights");
  if (!container) return;

  const stampEvents = state.events.filter((event) => event.type === "stamp_added");
  const rewardEvents = state.events.filter((event) => event.type === "reward_redeemed");
  const activeCards = state.cards.filter((card) => card.stampCount > 0).length;
  const nearReward = state.cards.filter((card) => card.stampCount >= 7).length;
  const bestRestaurant = restaurants
    .map((restaurant) => ({
      name: restaurant.name,
      stamps: stampEvents.filter((event) => event.restaurantId === restaurant.id).length,
    }))
    .sort((a, b) => b.stamps - a.stamps)[0];
  const rewardRate = stampEvents.length ? Math.round((rewardEvents.length / stampEvents.length) * 100) : 0;

  const insights = [
    { label: "Cartes actives", value: activeCards, detail: "clients avec au moins 1 tampon" },
    { label: "Proches d'un gain", value: nearReward, detail: "cartes a 7 tampons ou plus" },
    { label: "Top restaurant", value: bestRestaurant?.stamps || 0, detail: bestRestaurant?.name || "Aucune activite" },
    { label: "Taux recompense", value: `${rewardRate}%`, detail: "recompenses / tampons" },
  ];

  container.innerHTML = "";
  for (const insight of insights) {
    const item = document.createElement("article");
    item.className = "insight-card";
    item.innerHTML = `<span>${insight.label}</span><strong>${insight.value}</strong><p>${insight.detail}</p>`;
    container.append(item);
  }
}

function renderSettings() {
  const toggle = document.querySelector("#daily-stamp-limit-toggle");
  const label = document.querySelector("#daily-stamp-limit-label");
  if (!toggle || !label) return;

  toggle.checked = state.settings.dailyStampLimitEnabled;
  label.textContent = state.settings.dailyStampLimitEnabled ? "Activee" : "Desactivee";
}

function renderRestaurantTable() {
  const body = document.querySelector("#restaurant-table");
  body.innerHTML = "";
  for (const restaurant of restaurants) {
    const events = state.events.filter((event) => event.restaurantId === restaurant.id);
    const cards = state.cards.filter((card) => card.restaurantId === restaurant.id);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${restaurant.name}</strong><p>${restaurant.city}</p></td>
      <td>${cards.length}</td>
      <td>${events.filter((event) => event.type === "stamp_added").length}</td>
      <td>${events.filter((event) => event.type === "reward_redeemed").length}</td>
      <td>${events[0]?.createdAt ? formatDate(events[0].createdAt) : "Aucune"}</td>
    `;
    body.append(row);
  }
}

function renderClientTable() {
  const body = document.querySelector("#client-table");
  const filter = document.querySelector("#admin-client-filter").value.trim().toLowerCase();
  const cards = state.cards.filter((card) => `${card.firstName} ${card.lastName} ${card.email} ${card.phone} ${card.cardNumber}`.toLowerCase().includes(filter));
  body.innerHTML = "";

  if (cards.length === 0) {
    body.innerHTML = `<tr><td colspan="5">Aucun client trouve.</td></tr>`;
    return;
  }

  for (const card of cards) {
    const restaurant = getRestaurant(card.restaurantId);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${card.firstName} ${card.lastName}</strong><p>${card.email}</p></td>
      <td>${card.cardNumber}</td>
      <td>${card.stampCount}/${STAMP_TARGET}</td>
      <td>${restaurant?.name || "Reseau"}</td>
      <td><span class="pill ${getAvailableBenefit(card) ? "good" : ""}">${getAvailableBenefit(card)?.label || "Active"}</span></td>
    `;
    body.append(row);
  }
}

function renderEventList() {
  const eventList = document.querySelector("#event-list");
  eventList.innerHTML = "";
  if (state.events.length === 0) {
    eventList.innerHTML = `<p class="empty">Aucune activite pour le moment.</p>`;
    return;
  }
  for (const event of state.events.slice(0, 10)) eventList.append(renderEventItem(event));
}

function exportCsv() {
  const header = ["cardNumber", "firstName", "lastName", "email", "phone", "restaurant", "stampCount", "rewardsRedeemed", "marketingConsent"];
  const rows = state.cards.map((card) => [
    card.cardNumber,
    card.firstName,
    card.lastName,
    card.email,
    card.phone,
    getRestaurant(card.restaurantId)?.name || "",
    card.stampCount,
    card.rewardsRedeemed,
    card.marketingConsent ? "yes" : "no",
  ]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "flams-fidelite-clients.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function seedDemoData() {
  if (state.cards.length > 0 && !confirm("Ajouter des donnees demo aux donnees existantes ?")) return;

  const demoCards = [
    ["Camille", "Martin", "camille.martin@example.com", "06 11 22 33 44", "strasbourg", 8, 1, true],
    ["Nicolas", "Weber", "nicolas.weber@example.com", "06 22 33 44 55", "colmar", 10, 0, true],
    ["Lea", "Schmitt", "lea.schmitt@example.com", "06 33 44 55 66", "mulhouse", 4, 2, false],
    ["Sarah", "Klein", "sarah.klein@example.com", "06 44 55 66 77", "paris", 6, 0, true],
    ["Thomas", "Muller", "thomas.muller@example.com", "06 55 66 77 88", "strasbourg", 2, 0, false],
  ];

  for (const [firstName, lastName, email, phone, restaurantId, stampCount, rewardsRedeemed, marketingConsent] of demoCards) {
    if (state.cards.some((card) => card.email === email)) continue;
    const card = {
      id: crypto.randomUUID(),
      cardNumber: generateCardNumber(),
      firstName,
      lastName,
      email,
      phone,
      passwordHash: createPasswordHash("flams123"),
      restaurantId,
      marketingConsent,
      stampCount,
      rewardsRedeemed,
      completedCards: rewardsRedeemed,
      redeemedMilestones: [],
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 20).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
    };
    state.cards.unshift(card);
    pushEvent("card_created", card, restaurantId, "Carte creee");
    for (let index = 0; index < stampCount; index += 1) pushEvent("stamp_added", card, restaurantId, "Tampon ajoute", 1);
    for (let index = 0; index < rewardsRedeemed; index += 1) pushEvent("reward_redeemed", card, restaurantId, "Recompense utilisee", -STAMP_TARGET);
  }

  saveState();
  renderAdmin();
  showToast("Donnees demo ajoutees. Mot de passe demo: flams123");
}

if (page === "auth") initAuthPage();
if (page === "card") initCardPage();
if (page === "restaurant") initRestaurantPage();
if (page === "admin") initAdminPage();
