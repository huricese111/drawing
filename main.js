const state = {
  data: null,
  category: "all",
  query: "",
  sort: "newest",
  visibleItems: [],
  lightboxIndex: -1
};

const elements = {
  chips: document.querySelector('[data-role="category-chips"]'),
  grid: document.querySelector('[data-role="grid"]'),
  empty: document.querySelector('[data-role="empty"]'),
  lightbox: document.querySelector('[data-role="lightbox"]'),
  lightboxImg: document.querySelector('[data-role="lightbox-img"]'),
  lightboxCaption: document.querySelector('[data-role="lightbox-caption"]')
};

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function parseDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function compareItems(a, b) {
  if (state.sort === "az") return a.title.localeCompare(b.title);
  if (state.sort === "za") return b.title.localeCompare(a.title);

  const ad = parseDate(a.date);
  const bd = parseDate(b.date);
  const at = ad ? ad.getTime() : 0;
  const bt = bd ? bd.getTime() : 0;
  if (state.sort === "oldest") return at - bt;
  return bt - at;
}

function filterItems(items) {
  const q = normalizeText(state.query);
  return items.filter((item) => {
    const inCategory = state.category === "all" ? true : item.category === state.category;
    if (!inCategory) return false;
    if (!q) return true;
    const haystack = normalizeText(`${item.title} ${item.category} ${item.id}`);
    return haystack.includes(q);
  });
}

function buildCategoryStats(items) {
  const counts = new Map();
  for (const item of items) {
    const key = item.category || "Uncategorized";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderChips(items) {
  const stats = buildCategoryStats(items);
  const total = items.length;

  const nodes = [];

  nodes.push(
    chipButton({
      name: "All",
      count: total,
      active: state.category === "all",
      categoryValue: "all"
    })
  );

  for (const { name, count } of stats) {
    nodes.push(
      chipButton({
        name,
        count,
        active: state.category === name,
        categoryValue: name
      })
    );
  }

  elements.chips.replaceChildren(...nodes);
}

function chipButton({ name, count, active, categoryValue }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.dataset.action = "filter";
  button.dataset.category = categoryValue;
  button.dataset.active = String(active);

  const label = document.createElement("span");
  label.textContent = name;

  const badge = document.createElement("span");
  badge.className = "chip__count";
  badge.textContent = String(count);

  button.append(label, badge);
  return button;
}

function renderGrid(items) {
  elements.empty.hidden = items.length > 0;

  const nodes = items.map((item, idx) => {
    const card = document.createElement("article");
    card.className = "card";
    card.tabIndex = 0;
    card.dataset.action = "open";
    card.dataset.index = String(idx);

    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = item.thumb || item.src;
    img.alt = item.title;

    const meta = document.createElement("div");
    meta.className = "meta";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = item.title;

    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = `${item.category}${item.date ? ` • ${item.date}` : ""}`;

    meta.append(title, sub);
    card.append(img, meta);
    return card;
  });

  elements.grid.replaceChildren(...nodes);
}

function setVisibleItems(items) {
  state.visibleItems = items;
  renderGrid(items);
}

function applyFiltersAndRender() {
  const all = state.data?.items ?? [];
  const filtered = filterItems(all).slice().sort(compareItems);
  setVisibleItems(filtered);
  renderChips(all);
}

function openLightbox(index) {
  const item = state.visibleItems[index];
  if (!item) return;

  state.lightboxIndex = index;
  elements.lightboxImg.src = item.src;
  elements.lightboxImg.alt = item.title;
  elements.lightboxCaption.textContent = `${item.title} • ${item.category}${item.date ? ` • ${item.date}` : ""}`;
  elements.lightbox.showModal();
}

function closeLightbox() {
  if (!elements.lightbox.open) return;
  elements.lightbox.close();
  state.lightboxIndex = -1;
}

function stepLightbox(delta) {
  const max = state.visibleItems.length;
  if (max === 0) return;
  const next = (state.lightboxIndex + delta + max) % max;
  openLightbox(next);
}

async function loadData() {
  const res = await fetch("./gallery.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load gallery.json (${res.status})`);
  const data = await res.json();

  const items = Array.isArray(data.items) ? data.items : [];
  const normalized = items
    .map((item) => ({
      id: String(item.id ?? ""),
      title: String(item.title ?? "Untitled"),
      category: String(item.category ?? "Uncategorized"),
      date: item.date ? String(item.date) : "",
      src: String(item.src ?? ""),
      thumb: String(item.thumb ?? item.src ?? "")
    }))
    .filter((item) => item.src);

  state.data = { title: String(data.title ?? "Gallery"), items: normalized };
  document.title = state.data.title;
  document.querySelector(".brand").textContent = state.data.title;
  applyFiltersAndRender();
}

function attachEvents() {
  document.addEventListener("click", (e) => {
    const target = e.target instanceof Element ? e.target.closest("[data-action]") : null;
    if (!target) return;
    const action = target.getAttribute("data-action");

    if (action === "filter") {
      state.category = target.getAttribute("data-category") || "all";
      applyFiltersAndRender();
      return;
    }

    if (action === "open") {
      const index = Number(target.getAttribute("data-index"));
      if (Number.isFinite(index)) openLightbox(index);
      return;
    }

    if (action === "close") {
      closeLightbox();
      return;
    }

    if (action === "prev") {
      stepLightbox(-1);
      return;
    }

    if (action === "next") {
      stepLightbox(1);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!elements.lightbox.open) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });

  const search = document.querySelector('[data-action="search"]');
  const sort = document.querySelector('[data-action="sort"]');

  search?.addEventListener("input", (e) => {
    state.query = e.target.value ?? "";
    applyFiltersAndRender();
  });

  sort?.addEventListener("change", (e) => {
    state.sort = e.target.value ?? "newest";
    applyFiltersAndRender();
  });
}

attachEvents();
loadData().catch(() => {
  state.data = { title: "Gallery", items: [] };
  applyFiltersAndRender();
});

