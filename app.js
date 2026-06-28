const FALLBACK_IMG  = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop'
const BACKEND_URL   = localStorage.getItem('hbmg_backend') || 'https://hellobmg-api.skreenit.workers.dev'

const state = {
  products: [],
  filtered: [],
  featured: [],
  newArrivals: [],
  compare: [],
  cart: [],
  currentCategory: 'All',
  query: '',
  sort: 'popularity',
  onlyInStock: false,
}

function qs(s, r = document) { return r.querySelector(s) }
function qsa(s, r = document) { return Array.from(r.querySelectorAll(s)) }

function formatCurrency(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 2800) {
  const container = qs('#toastContainer')
  if (!container) return
  const el = document.createElement('div')
  el.className = `toast ${type}`
  el.textContent = msg
  container.appendChild(el)
  setTimeout(() => {
    el.classList.add('hiding')
    el.addEventListener('animationend', () => el.remove(), { once: true })
  }, duration)
}

// ── Cart persistence ───────────────────────────────────────────────────────────
function saveCart() {
  try { localStorage.setItem('hbmg_cart', JSON.stringify(state.cart)) } catch {}
}
function loadCartFromStorage() {
  try { return JSON.parse(localStorage.getItem('hbmg_cart') || '[]') } catch { return [] }
}

// ── Product loading ────────────────────────────────────────────────────────────
async function loadProductsFromBackend() {
  const res = await fetch(`${BACKEND_URL}/products`)
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
  const products = await res.json()
  state.products    = products
  state.featured    = products.filter(p => p.tags?.includes('featured')).slice(0, 8)
  state.newArrivals = products.filter(p => p.tags?.includes('new')).slice(0, 8)
}

async function loadProducts() {
  try {
    await loadProductsFromBackend()
  } catch {
    // Fallback to bundled JSON when backend is offline
    const res = await fetch('data/products.json')
    const json = await res.json()
    state.products    = json.products
    state.featured    = json.products.filter(p => p.tags?.includes('featured')).slice(0, 8)
    state.newArrivals = json.products.filter(p => p.tags?.includes('new')).slice(0, 8)
  }
}

// ── Badges ─────────────────────────────────────────────────────────────────────
function renderBadges(container, p) {
  container.innerHTML = ''
  if (p.tags?.includes('sale')) {
    const b = document.createElement('span'); b.className = 'badge sale'; b.textContent = 'Sale'; container.appendChild(b)
  }
  if (p.tags?.includes('new')) {
    const b = document.createElement('span'); b.className = 'badge new-tag'; b.textContent = 'New'; container.appendChild(b)
  }
  if (p.tags?.includes('featured')) {
    const b = document.createElement('span'); b.className = 'badge featured'; b.textContent = 'Featured'; container.appendChild(b)
  }
}

// ── Product card ───────────────────────────────────────────────────────────────
function buildCard(p) {
  const tpl = qs('#productCardTpl').content.cloneNode(true)
  const root = tpl.querySelector('.product-card')
  root.dataset.id = p.id

  const thumb = tpl.querySelector('.thumb')
  thumb.src = p.image || FALLBACK_IMG
  thumb.alt = p.title

  tpl.querySelector('.title').textContent = p.title
  tpl.querySelector('.price').textContent = formatCurrency(p.price)

  if (p.mrp && p.mrp > p.price) {
    tpl.querySelector('.mrp').textContent = formatCurrency(p.mrp)
    const pct = Math.round((1 - p.price / p.mrp) * 100)
    tpl.querySelector('.discount').textContent = `${pct}% off`
  }

  tpl.querySelector('.rating').textContent = `★ ${Number(p.rating || 0).toFixed(1)}`

  const stockEl = tpl.querySelector('.stock-badge')
  if (p.stock === 0) { stockEl.textContent = 'Out of stock'; stockEl.classList.add('out') }
  else if (p.stock <= 3) { stockEl.textContent = `Only ${p.stock} left!`; stockEl.classList.add('low') }
  else { stockEl.textContent = 'In stock'; stockEl.classList.add('in') }

  renderBadges(tpl.querySelector('.badge-group'), p)

  const compareBtn = tpl.querySelector('.add-compare')
  if (state.compare.includes(p.id)) compareBtn.classList.add('comparing')

  compareBtn.addEventListener('click', () => toggleCompare(p.id))
  tpl.querySelector('.add-cart').addEventListener('click', () => addToCart(p.id))
  tpl.querySelector('.buy-now').addEventListener('click', () => buyNow(p.id))

  return tpl
}

// ── Filtering & sorting ────────────────────────────────────────────────────────
function computeFiltered() {
  const q = state.query.trim().toLowerCase()
  state.filtered = state.products.filter(p => {
    const matchCat = state.currentCategory === 'All' || p.category === state.currentCategory
    const matchQ = !q || `${p.title} ${p.brand} ${p.category}`.toLowerCase().includes(q)
    const matchStock = !state.onlyInStock || p.stock > 0
    return matchCat && matchQ && matchStock
  })
  switch (state.sort) {
    case 'price_asc': state.filtered.sort((a, b) => a.price - b.price); break
    case 'price_desc': state.filtered.sort((a, b) => b.price - a.price); break
    case 'rating_desc': state.filtered.sort((a, b) => b.rating - a.rating); break
    default: state.filtered.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
  }
}

function renderGrid(target, list) {
  if (!target) return
  target.innerHTML = ''
  if (list.length === 0) {
    target.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No products found.</p></div>'
    return
  }
  const frag = document.createDocumentFragment()
  list.forEach(p => frag.appendChild(buildCard(p)))
  target.appendChild(frag)
}

// ── Banner ─────────────────────────────────────────────────────────────────────
function buildBannerCard(p) {
  const card = document.createElement('article')
  card.className = 'banner-card'
  card.addEventListener('click', () => addToCart(p.id))

  const img = document.createElement('img')
  img.src = p.image || FALLBACK_IMG
  img.alt = p.title
  img.loading = 'lazy'

  const title = document.createElement('div'); title.className = 'title'; title.textContent = p.title
  const price = document.createElement('div'); price.className = 'price'; price.textContent = formatCurrency(p.price)
  const stock = document.createElement('div'); stock.className = 'stock'
  stock.textContent = p.stock > 0 ? '✓ In stock' : 'Out of stock'

  card.append(img, title, price, stock)
  return card
}

function renderBanner() {
  const track = qs('#bannerTrack')
  if (!track) return
  track.innerHTML = ''
  const frag = document.createDocumentFragment();
  (state.featured || []).forEach(p => frag.appendChild(buildBannerCard(p)))
  track.appendChild(frag)

  const scrollBy = 240
  qs('#bannerPrev')?.addEventListener('click', () => track.scrollBy({ left: -scrollBy, behavior: 'smooth' }))
  qs('#bannerNext')?.addEventListener('click', () => track.scrollBy({ left: scrollBy, behavior: 'smooth' }))
}

// ── Compare ────────────────────────────────────────────────────────────────────
function toggleCompare(id) {
  const idx = state.compare.indexOf(id)
  if (idx >= 0) {
    state.compare.splice(idx, 1)
    toast('Removed from comparison', 'info', 1800)
  } else if (state.compare.length >= 3) {
    toast('You can compare up to 3 products', 'error', 2500)
    return
  } else {
    state.compare.push(id)
    toast('Added to comparison', 'success', 1800)
  }
  refreshCompareButtons()
  renderCompareBar()
  renderCompareTable()
  renderStickyCompare()
}

function refreshCompareButtons() {
  qsa('.product-card').forEach(card => {
    const id = card.dataset.id
    const btn = card.querySelector('.add-compare')
    if (!btn) return
    if (state.compare.includes(id)) btn.classList.add('comparing')
    else btn.classList.remove('comparing')
  })
}

function renderCompareBar() {
  const bar = qs('#compareBar')
  if (!bar) return
  bar.innerHTML = ''
  if (state.compare.length === 0) {
    bar.innerHTML = '<p>Select up to 3 products using the <strong>+ Compare</strong> button on any product card.</p>'
    return
  }
  state.compare.map(id => state.products.find(p => p.id === id)).filter(Boolean).forEach(p => {
    const chip = document.createElement('span')
    chip.className = 'compare-chip'
    const img = document.createElement('img'); img.src = p.image || FALLBACK_IMG; img.alt = ''
    const label = document.createElement('span'); label.textContent = p.title
    const btn = document.createElement('button'); btn.textContent = '✕'; btn.title = 'Remove'
    btn.addEventListener('click', () => toggleCompare(p.id))
    chip.append(img, label, btn)
    bar.appendChild(chip)
  })
}

function renderCompareTable() {
  const head = qs('#compareHead')
  const body = qs('#compareBody')
  if (!head || !body) return
  body.innerHTML = ''

  const products = state.compare.map(id => state.products.find(p => p.id === id)).filter(Boolean)

  // Dynamic thead
  const headRow = document.createElement('tr')
  const specTh = document.createElement('th'); specTh.textContent = 'Spec'; headRow.appendChild(specTh)
  products.forEach(p => {
    const th = document.createElement('th')
    const wrap = document.createElement('div'); wrap.className = 'compare-product-header'
    const img = document.createElement('img'); img.src = p.image || FALLBACK_IMG; img.alt = p.title
    img.onerror = () => { img.style.display = 'none' }
    const name = document.createElement('span'); name.textContent = p.title
    wrap.append(img, name); th.appendChild(wrap)
    headRow.appendChild(th)
  })
  for (let i = products.length; i < 3; i++) headRow.appendChild(document.createElement('th'))
  head.innerHTML = ''; head.appendChild(headRow)

  if (products.length === 0) return

  const addRow = (label, cells, isHTML = false) => {
    const tr = document.createElement('tr')
    const th = document.createElement('th'); th.textContent = label; tr.appendChild(th)
    cells.forEach(cell => {
      const td = document.createElement('td')
      if (isHTML) td.innerHTML = cell; else td.textContent = cell
      tr.appendChild(td)
    })
    for (let i = cells.length; i < 3; i++) tr.appendChild(document.createElement('td'))
    body.appendChild(tr)
  }

  // Price — highlight lowest
  const prices = products.map(p => p.price)
  const minPrice = Math.min(...prices)
  addRow('Price', products.map(p =>
    p.price === minPrice
      ? `<span class="compare-best">${formatCurrency(p.price)}</span>`
      : formatCurrency(p.price)
  ), true)

  // MRP & savings
  addRow('MRP', products.map(p => p.mrp && p.mrp > p.price ? formatCurrency(p.mrp) : '—'))
  addRow('You Save', products.map(p =>
    p.mrp && p.mrp > p.price
      ? `${formatCurrency(p.mrp - p.price)} (${Math.round((1 - p.price / p.mrp) * 100)}% off)`
      : '—'
  ))

  // Rating — highlight highest
  const ratings = products.map(p => Number(p.rating || 0))
  const maxRating = Math.max(...ratings)
  addRow('Rating', products.map(p => {
    const r = Number(p.rating || 0)
    return r === maxRating
      ? `<span class="compare-best">★ ${r.toFixed(1)}</span>`
      : `★ ${r.toFixed(1)}`
  }), true)

  // Specs
  const specKeys = [
    ['Storage', 'storage'],
    ['RAM', 'ram'],
    ['Display', 'display'],
    ['Battery', 'battery'],
    ['Camera', 'camera'],
    ['Warranty', 'warranty'],
    ['Brand', 'brand'],
    ['Model', 'model'],
  ]
  specKeys.forEach(([label, key]) => {
    addRow(label, products.map(p => p.specs?.[key] ?? p[key] ?? '—'))
  })

  // Availability
  addRow('Availability', products.map(p =>
    p.stock > 0
      ? `<span style="color:var(--success);font-weight:700">✓ In Stock</span>`
      : `<span style="color:var(--danger);font-weight:600">✗ Out of Stock</span>`
  ), true)

  // Action row
  const actionTr = document.createElement('tr')
  const emptyTh = document.createElement('th'); actionTr.appendChild(emptyTh)
  products.forEach(p => {
    const td = document.createElement('td')
    const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;flex-direction:column;gap:7px'
    const cartBtn = document.createElement('button'); cartBtn.className = 'btn-primary'; cartBtn.style.width = '100%'
    cartBtn.textContent = 'Add to Cart'; cartBtn.addEventListener('click', () => addToCart(p.id))
    const buyBtn = document.createElement('button'); buyBtn.className = 'btn-secondary'; buyBtn.style.width = '100%'
    buyBtn.textContent = 'Buy Now'; buyBtn.addEventListener('click', () => buyNow(p.id))
    wrap.append(cartBtn, buyBtn); td.appendChild(wrap); actionTr.appendChild(td)
  })
  for (let i = products.length; i < 3; i++) actionTr.appendChild(document.createElement('td'))
  body.appendChild(actionTr)
}

function renderStickyCompare() {
  const sticky = qs('#compareSticky')
  const itemsEl = qs('#compareStickyItems')
  const labelEl = qs('#compareStickyLabel')
  if (!sticky || !itemsEl) return

  if (state.compare.length === 0) {
    sticky.classList.remove('show')
    return
  }

  sticky.classList.add('show')
  itemsEl.innerHTML = ''
  const products = state.compare.map(id => state.products.find(p => p.id === id)).filter(Boolean)
  products.forEach(p => {
    const item = document.createElement('div'); item.className = 'compare-sticky-item'
    const img = document.createElement('img'); img.src = p.image || FALLBACK_IMG; img.alt = ''
    const name = document.createElement('span'); name.className = 'cmp-name'; name.textContent = p.title
    const rm = document.createElement('button'); rm.className = 'rm-cmp'; rm.textContent = '✕'
    rm.addEventListener('click', () => toggleCompare(p.id))
    item.append(img, name, rm); itemsEl.appendChild(item)
  })
  if (labelEl) labelEl.textContent = `${products.length}/3 selected`
}

// ── Cart ───────────────────────────────────────────────────────────────────────
function openCart() {
  qs('#cartDrawer').classList.add('open')
  qs('#cartDrawer').setAttribute('aria-hidden', 'false')
  qs('#cartOverlay').classList.add('show')
}
function closeCart() {
  qs('#cartDrawer').classList.remove('open')
  qs('#cartDrawer').setAttribute('aria-hidden', 'true')
  qs('#cartOverlay').classList.remove('show')
}

function addToCart(id) {
  const p = state.products.find(x => x.id === id)
  if (!p) return
  if (p.stock === 0) { toast('This product is out of stock', 'error'); return }
  const existing = state.cart.find(x => x.id === id)
  if (existing) { existing.qty += 1; toast(`${p.title.slice(0, 30)}… qty updated`, 'success') }
  else { state.cart.push({ id, title: p.title, price: p.price, image: p.image, qty: 1 }); toast(`Added to cart!`, 'success') }
  updateCartUI()
  saveCart()
}

function removeFromCart(id) {
  const idx = state.cart.findIndex(x => x.id === id)
  if (idx >= 0) { state.cart.splice(idx, 1); updateCartUI(); saveCart() }
}

function changeQty(id, delta) {
  const item = state.cart.find(x => x.id === id)
  if (!item) return
  item.qty = Math.max(1, item.qty + delta)
  updateCartUI(); saveCart()
}

function cartTotal() { return state.cart.reduce((s, i) => s + i.price * i.qty, 0) }

function updateCartUI() {
  const count = state.cart.reduce((s, i) => s + i.qty, 0)
  const countEl = qs('#cartCount')
  if (countEl) countEl.textContent = count

  const items = qs('#cartItems')
  if (!items) return
  items.innerHTML = ''

  if (state.cart.length === 0) {
    items.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p>Your cart is empty</p></div>'
  } else {
    state.cart.forEach(i => {
      const row = document.createElement('div'); row.className = 'cart-item'
      const img = document.createElement('img'); img.src = i.image || FALLBACK_IMG; img.alt = i.title
      const info = document.createElement('div'); info.className = 'cart-item-info'
      const titleEl = document.createElement('div'); titleEl.className = 'cart-item-title'; titleEl.textContent = i.title
      const priceEl = document.createElement('div'); priceEl.className = 'cart-item-price'; priceEl.textContent = formatCurrency(i.price)
      const ctr = document.createElement('div'); ctr.className = 'cart-item-controls'
      const minus = document.createElement('button'); minus.className = 'qty-btn'; minus.textContent = '−'
      const qtyNum = document.createElement('span'); qtyNum.className = 'qty-num'; qtyNum.textContent = i.qty
      const plus = document.createElement('button'); plus.className = 'qty-btn'; plus.textContent = '+'
      const rmBtn = document.createElement('button'); rmBtn.className = 'remove-btn'; rmBtn.textContent = 'Remove'
      minus.addEventListener('click', () => changeQty(i.id, -1))
      plus.addEventListener('click', () => changeQty(i.id, 1))
      rmBtn.addEventListener('click', () => removeFromCart(i.id))
      ctr.append(minus, qtyNum, plus, rmBtn)
      info.append(titleEl, priceEl, ctr)
      row.append(img, info); items.appendChild(row)
    })
  }

  const totalEl = qs('#cartTotal')
  if (totalEl) totalEl.textContent = formatCurrency(cartTotal())
}

function buyNow(id) {
  addToCart(id)
  saveCart()
  window.location.href = 'checkout.html'
}

// ── Bind events ────────────────────────────────────────────────────────────────
function bind() {
  qs('#viewCartBtn').addEventListener('click', openCart)
  qs('#closeCart').addEventListener('click', closeCart)
  qs('#cartOverlay').addEventListener('click', closeCart)

  qs('#searchForm').addEventListener('submit', e => {
    e.preventDefault()
    state.query = qs('#searchInput').value
    computeFiltered(); renderGrid(qs('#catalogGrid'), state.filtered)
  })
  qs('#sortSelect').addEventListener('change', () => {
    state.sort = qs('#sortSelect').value
    computeFiltered(); renderGrid(qs('#catalogGrid'), state.filtered)
  })
  qs('#onlyInStock').addEventListener('change', () => {
    state.onlyInStock = qs('#onlyInStock').checked
    computeFiltered(); renderGrid(qs('#catalogGrid'), state.filtered)
  })
  qsa('.chip').forEach(ch => ch.addEventListener('click', () => {
    qsa('.chip').forEach(c => c.classList.remove('active'))
    ch.classList.add('active')
    state.currentCategory = ch.dataset.category
    computeFiltered(); renderGrid(qs('#catalogGrid'), state.filtered)
  }))
  qs('#clearCompare').addEventListener('click', () => {
    state.compare = []; refreshCompareButtons(); renderCompareBar(); renderCompareTable(); renderStickyCompare()
  })
  qs('#clearCompareStickyBtn')?.addEventListener('click', () => {
    state.compare = []; refreshCompareButtons(); renderCompareBar(); renderCompareTable(); renderStickyCompare()
  })
}

// ── Init ───────────────────────────────────────────────────────────────────────
async function init() {
  state.cart = loadCartFromStorage()
  await loadProducts()
  computeFiltered()
  renderBanner()
  renderGrid(qs('#featuredGrid'), state.featured)
  renderGrid(qs('#newGrid'), state.newArrivals)
  renderGrid(qs('#catalogGrid'), state.filtered)
  updateCartUI()
  bind()
}

init()
