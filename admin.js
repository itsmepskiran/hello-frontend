// Local dev: wrangler dev runs on 8787.
// After deploying, change this to your workers.dev URL:
//   https://hellobmg-api.<your-subdomain>.workers.dev
const BACKEND = localStorage.getItem('hbmg_backend') || 'https://hellobmg-api.skreenit.workers.dev'

// ── Token helpers ──────────────────────────────────────────────────────────────
function getToken()  { return localStorage.getItem('hbmg_token') || '' }
function setToken(t) { localStorage.setItem('hbmg_token', t) }
function clearToken(){ localStorage.removeItem('hbmg_token'); localStorage.removeItem('hbmg_email') }

function authHeaders(extra = {}) {
  return { 'Authorization': `Bearer ${getToken()}`, ...extra }
}

// ── DOM refs ───────────────────────────────────────────────────────────────────
const modal      = document.getElementById('loginModal')
const mainPage   = document.getElementById('mainPage')
const loginForm  = document.getElementById('loginForm')
const loginError = document.getElementById('loginError')
const signInBtn  = document.getElementById('signInBtn')
const signOutBtn = document.getElementById('signOutBtn')
const headerEmail= document.getElementById('headerEmail')

const els = {
  form:           document.getElementById('productForm'),
  status:         document.getElementById('status'),
  title:          document.getElementById('title'),
  brandSelect:    document.getElementById('brandSelect'),
  brandNew:       document.getElementById('brandNew'),
  addBrandBtn:    document.getElementById('addBrandBtn'),
  categorySelect: document.getElementById('categorySelect'),
  categoryNew:    document.getElementById('categoryNew'),
  addCategoryBtn: document.getElementById('addCategoryBtn'),
  price:          document.getElementById('price'),
  mrp:            document.getElementById('mrp'),
  rating:         document.getElementById('rating'),
  stock:          document.getElementById('stock'),
  stockStatus:    document.getElementById('stockStatus'),
  tags:           document.getElementById('tags'),
  storage:        document.getElementById('storage'),
  ram:            document.getElementById('ram'),
  display:        document.getElementById('display'),
  battery:        document.getElementById('battery'),
  camera:         document.getElementById('camera'),
  warranty:       document.getElementById('warranty'),
  specsJson:      document.getElementById('specsJson'),
  imageFile:      document.getElementById('imageFile'),
  bulkForm:       document.getElementById('bulkForm'),
  xlsxFile:       document.getElementById('xlsxFile'),
  uploadXlsxBtn:  document.getElementById('uploadXlsxBtn'),
  bulkStatus:     document.getElementById('bulkStatus'),
  sampleBtn:      document.getElementById('sampleBtn'),
}

// ── Modal show / hide ──────────────────────────────────────────────────────────
function showModal() {
  modal.classList.remove('hidden')
  mainPage.classList.remove('visible')
  loginError.textContent = ''
  document.getElementById('email').value    = ''
  document.getElementById('password').value = ''
  document.getElementById('email').focus()
}

function showMainPage(email) {
  modal.classList.add('hidden')
  mainPage.classList.add('visible')
  headerEmail.textContent = email
}

// ── Status helpers ─────────────────────────────────────────────────────────────
function setStatus(msg, type = '') {
  els.status.textContent = msg
  els.status.className   = 'status ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : '')
}
function setBulkStatus(msg, type = '') {
  els.bulkStatus.textContent = msg
  els.bulkStatus.className   = 'status ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : '')
}

// ── Auth ───────────────────────────────────────────────────────────────────────
async function signIn(e) {
  e.preventDefault()
  const email    = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value
  if (!email || !password) { loginError.textContent = 'Enter email and password'; return }

  signInBtn.textContent = 'Signing in…'
  signInBtn.disabled    = true
  loginError.textContent = ''

  try {
    const res = await fetch(`${BACKEND}/admin/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Login failed')
    }
    const data = await res.json()
    setToken(data.token)
    localStorage.setItem('hbmg_email', data.email)
    showMainPage(data.email)
    await loadBrandsCategories()
  } catch (err) {
    loginError.textContent = err.message
  } finally {
    signInBtn.textContent = 'Sign In'
    signInBtn.disabled    = false
  }
}

async function signOut() {
  const token = getToken()
  if (token) {
    fetch(`${BACKEND}/admin/logout`, {
      method: 'POST', headers: authHeaders(),
    }).catch(() => {})
  }
  clearToken()
  showModal()
}

// ── Brands / Categories ────────────────────────────────────────────────────────
async function loadBrandsCategories() {
  setStatus('Loading…')
  try {
    const [br, cr] = await Promise.all([
      fetch(`${BACKEND}/admin/brands`),
      fetch(`${BACKEND}/admin/categories`),
    ])
    if (!br.ok || !cr.ok) throw new Error('Failed to load brands/categories')
    const brands     = await br.json()
    const categories = await cr.json()
    els.brandSelect.innerHTML    = (brands     || []).map(b => `<option value="${b.id}">${b.name}</option>`).join('')
    els.categorySelect.innerHTML = (categories || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('')
    setStatus('')
  } catch (e) {
    setStatus('Could not load brands/categories — is the Worker running?', 'error')
  }
}

async function addBrand() {
  const name = (els.brandNew.value || '').trim()
  if (!name) return
  const res = await fetch(`${BACKEND}/admin/brands`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name }),
  })
  if (!res.ok) { setStatus('Add brand failed', 'error'); return }
  const data = await res.json()
  const o = document.createElement('option')
  o.value = data.id; o.textContent = data.name
  els.brandSelect.appendChild(o); els.brandSelect.value = data.id
  els.brandNew.value = ''
  setStatus('Brand added', 'success')
}

async function addCategory() {
  const name = (els.categoryNew.value || '').trim()
  if (!name) return
  const res = await fetch(`${BACKEND}/admin/categories`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name }),
  })
  if (!res.ok) { setStatus('Add category failed', 'error'); return }
  const data = await res.json()
  const o = document.createElement('option')
  o.value = data.id; o.textContent = data.name
  els.categorySelect.appendChild(o); els.categorySelect.value = data.id
  els.categoryNew.value = ''
  setStatus('Category added', 'success')
}

// ── Product form ───────────────────────────────────────────────────────────────
function buildSpecs() {
  const manual = {
    storage:  els.storage.value  || undefined,
    ram:      els.ram.value      || undefined,
    display:  els.display.value  || undefined,
    battery:  els.battery.value  || undefined,
    camera:   els.camera.value   || undefined,
    warranty: els.warranty.value || undefined,
  }
  let specs = { ...manual }
  const raw = els.specsJson.value.trim()
  if (raw) {
    try   { specs = { ...specs, ...JSON.parse(raw) } }
    catch (e) { throw new Error('Specs JSON invalid: ' + e.message) }
  }
  Object.keys(specs).forEach(k => specs[k] === undefined && delete specs[k])
  return specs
}

async function handleSubmit(e) {
  e.preventDefault()
  try {
    setStatus('Saving product…')
    const specs = buildSpecs()
    const tags  = (els.tags.value || '').split(',').map(s => s.trim()).filter(Boolean)
    const payload = {
      title:        els.title.value.trim(),
      brand_id:     els.brandSelect.value,
      category_id:  els.categorySelect.value,
      price:        Number(els.price.value   || 0),
      mrp:          els.mrp.value    ? Number(els.mrp.value)    : null,
      rating:       els.rating.value ? Number(els.rating.value) : null,
      stock:        els.stock.value  ? Number(els.stock.value)  : 0,
      stock_status: els.stockStatus.value || 'in_stock',
      popularity:   0,
      specs, tags, is_active: true,
    }
    const res = await fetch(`${BACKEND}/admin/products`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      if (res.status === 401) { clearToken(); showModal(); return }
      throw new Error(err.detail || 'Product save failed')
    }
    const product = await res.json()
    const file = els.imageFile.files[0]
    if (!file) throw new Error('Please select a primary image')
    const fd = new FormData()
    fd.append('file', file); fd.append('is_primary', 'true')
    const imgRes = await fetch(`${BACKEND}/admin/products/${product.id}/images`, {
      method: 'POST', headers: authHeaders(), body: fd,
    })
    if (!imgRes.ok) throw new Error('Image upload failed')
    setStatus('Product saved successfully!', 'success')
    els.form.reset()
  } catch (err) {
    console.error(err)
    setStatus('Failed: ' + err.message, 'error')
  }
}

// ── Bulk upload: parse XLSX/CSV in browser, send JSON to Worker ────────────────
async function handleBulkUpload() {
  const file = els.xlsxFile.files?.[0]
  if (!file) { setBulkStatus('Please select a file', 'error'); return }

  setBulkStatus('Parsing file…')
  try {
    // SheetJS loaded via CDN script tag (window.XLSX)
    const XLSX = window.XLSX
    if (!XLSX) throw new Error('SheetJS not loaded — check your internet connection')

    const data = await file.arrayBuffer()
    const wb   = XLSX.read(data, { type: 'array' })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

    if (!rows.length) { setBulkStatus('File is empty or has no data rows', 'error'); return }

    const required = ['title', 'brand', 'category', 'price']
    const missing  = required.filter(col => !(col in rows[0]))
    if (missing.length) {
      setBulkStatus(`Missing required column(s): ${missing.join(', ')}`, 'error')
      return
    }

    setBulkStatus(`Uploading ${rows.length} product(s)…`)

    const res = await fetch(`${BACKEND}/admin/products/bulk-json`, {
      method:  'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body:    JSON.stringify({ products: rows }),
    })
    if (!res.ok) {
      if (res.status === 401) { clearToken(); showModal(); return }
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Upload failed')
    }
    const result = await res.json()
    setBulkStatus(`Done — Created: ${result.created}, Updated: ${result.updated}`, 'success')
    els.bulkForm.reset()
  } catch (e) {
    console.error(e)
    setBulkStatus('Bulk upload failed: ' + e.message, 'error')
  }
}

// ── Stock modal ────────────────────────────────────────────────────────────────
let _stockData = []

async function openStockModal() {
  document.getElementById('stockModal').classList.remove('hidden')
  document.getElementById('stockSearch').value = ''
  await loadStock()
}

function closeStockModal() {
  document.getElementById('stockModal').classList.add('hidden')
}

async function loadStock() {
  const wrap = document.getElementById('stockTableWrap')
  const summary = document.getElementById('stockSummary')
  wrap.innerHTML = '<p class="stock-loading">Loading…</p>'
  summary.innerHTML = ''

  try {
    const res = await fetch(`${BACKEND}/admin/stock`, { headers: authHeaders() })
    if (!res.ok) {
      if (res.status === 401) { clearToken(); showModal(); return }
      throw new Error('Failed to load stock')
    }
    _stockData = await res.json()
    renderStock(_stockData)
  } catch (e) {
    wrap.innerHTML = `<p class="stock-loading" style="color:var(--error)">${e.message}</p>`
  }
}

function renderStock(items) {
  const wrap    = document.getElementById('stockTableWrap')
  const summary = document.getElementById('stockSummary')

  const total  = items.length
  const out    = items.filter(p => Number(p.stock) === 0).length
  const low    = items.filter(p => Number(p.stock) > 0 && Number(p.stock) < 5).length
  const ok     = total - out - low

  summary.innerHTML = `
    <span class="summary-chip total">${total} Products</span>
    <span class="summary-chip ok">${ok} In Stock</span>
    <span class="summary-chip low">${low} Low (&lt;5)</span>
    <span class="summary-chip out">${out} Out of Stock</span>
  `

  if (!items.length) {
    wrap.innerHTML = '<p class="stock-loading">No products found.</p>'
    return
  }

  const rows = items.map(p => {
    const qty      = Number(p.stock)
    const qtyClass = qty === 0 ? 'out' : qty < 5 ? 'low' : 'ok'
    const price    = Number(p.price).toLocaleString('en-IN')
    const mrp      = p.mrp ? Number(p.mrp).toLocaleString('en-IN') : '—'
    const rowClass = p.is_active ? '' : 'st-inactive'
    const badge    = p.stock_status === 'in_stock' ? 'In Stock'
                   : p.stock_status === 'out_of_stock' ? 'Out of Stock'
                   : 'Preorder'
    return `<tr class="${rowClass}" data-id="${p.id}">
      <td class="st-title" title="${p.title}">${p.title}</td>
      <td class="st-muted">${p.brand_name || '—'}</td>
      <td class="st-muted">${p.category_name || '—'}</td>
      <td>₹${price}</td>
      <td>₹${mrp}</td>
      <td>
        <div class="inline-qty">
          <input type="number" min="0" step="1" value="${qty}" data-orig="${qty}">
          <button class="btn btn-primary btn-save inline-save" data-id="${p.id}" data-status="${p.stock_status}">Save</button>
        </div>
      </td>
      <td><span class="st-badge ${p.stock_status}">${badge}</span></td>
      <td>${p.is_active ? '✅ Active' : '❌ Inactive'}</td>
    </tr>`
  }).join('')

  wrap.innerHTML = `
    <table id="stockTable">
      <thead><tr>
        <th>Product</th><th>Brand</th><th>Category</th>
        <th>Price</th><th>MRP</th><th>Stock Qty</th>
        <th>Status</th><th>Active</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`

  // bind save buttons
  wrap.querySelectorAll('.inline-save').forEach(btn => {
    btn.addEventListener('click', async function() {
      const id      = this.dataset.id
      const input   = this.closest('.inline-qty').querySelector('input')
      const newQty  = Number(input.value)
      const status  = newQty > 0 ? 'in_stock' : 'out_of_stock'
      this.textContent = '…'
      this.disabled = true
      try {
        const res = await fetch(`${BACKEND}/admin/products/${id}/stock`, {
          method:  'PATCH',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body:    JSON.stringify({ stock: newQty, stock_status: status }),
        })
        if (!res.ok) throw new Error('Update failed')
        input.dataset.orig = newQty
        this.textContent = '✓'
        setTimeout(() => { this.textContent = 'Save'; this.disabled = false }, 1200)
      } catch (e) {
        this.textContent = 'Err'
        setTimeout(() => { this.textContent = 'Save'; this.disabled = false }, 1500)
      }
    })
  })
}

function filterStock(q) {
  if (!q) { renderStock(_stockData); return }
  const lower = q.toLowerCase()
  renderStock(_stockData.filter(p =>
    String(p.title || '').toLowerCase().includes(lower) ||
    String(p.brand_name || '').toLowerCase().includes(lower) ||
    String(p.category_name || '').toLowerCase().includes(lower)
  ))
}

function downloadSampleCsv() {
  const headers = ['title','brand','category','price','mrp','rating','stock','tags','image_url','specs_json','storage','ram','display','battery','camera','warranty','stock_status']
  const sample  = ['iPhone 13 (Refurbished)','Apple','Smartphones','45999','69999','4.7','10','featured,sale','','','128 GB','4 GB','6.1" OLED','3227 mAh','12MP + 12MP','12 months','in_stock']
  const csv = [headers.join(','), sample.map(v => `"${v}"`).join(',')].join('\n')
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: 'helloBMG_products_sample.csv',
  })
  a.click()
}

// ── Init ───────────────────────────────────────────────────────────────────────
function bind() {
  loginForm.addEventListener('submit', signIn)
  signOutBtn.addEventListener('click', signOut)
  els.addBrandBtn.addEventListener('click', addBrand)
  els.addCategoryBtn.addEventListener('click', addCategory)
  els.form.addEventListener('submit', handleSubmit)
  els.uploadXlsxBtn?.addEventListener('click', handleBulkUpload)
  els.sampleBtn?.addEventListener('click', downloadSampleCsv)

  document.getElementById('viewStockBtn').addEventListener('click', openStockModal)
  document.getElementById('closeStockBtn').addEventListener('click', closeStockModal)
  document.getElementById('stockModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeStockModal()
  })
  document.getElementById('stockSearch').addEventListener('input', e => filterStock(e.target.value))
}

async function init() {
  bind()
  const token = getToken()
  if (token) {
    // Validate stored token silently
    const res = await fetch(`${BACKEND}/admin/brands`, { headers: authHeaders() })
    if (res.ok) {
      const email = localStorage.getItem('hbmg_email') || 'admin'
      showMainPage(email)
      await loadBrandsCategories()
      return
    }
    clearToken()
  }
  showModal()
}

init()
