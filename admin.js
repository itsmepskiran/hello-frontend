const BACKEND = 'http://localhost:2025'

// ── Token helpers ──────────────────────────────────────────────────────────────
function getToken()  { return localStorage.getItem('hbmg_token') || '' }
function setToken(t) { localStorage.setItem('hbmg_token', t) }
function clearToken(){ localStorage.removeItem('hbmg_token') }

function authHeaders(extra = {}) {
  return { 'Authorization': `Bearer ${getToken()}`, ...extra }
}

// ── DOM refs ───────────────────────────────────────────────────────────────────
const els = {
  email:          document.getElementById('email'),
  password:       document.getElementById('password'),
  signInBtn:      document.getElementById('signInBtn'),
  signOutBtn:     document.getElementById('signOutBtn'),
  authStatus:     document.getElementById('authStatus'),

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

// ── Status helpers ─────────────────────────────────────────────────────────────
function setStatus(msg, type = 'info') {
  els.status.textContent = msg
  els.status.className   = 'status ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : '')
}
function setBulkStatus(msg, type = 'info') {
  els.bulkStatus.textContent = msg
  els.bulkStatus.className   = 'status ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : '')
}

// ── Auth UI state ──────────────────────────────────────────────────────────────
function setLoggedIn(email) {
  els.authStatus.textContent = `Signed in as ${email}`
  els.authStatus.className   = 'auth-status signed-in'
  els.signInBtn.disabled     = true
  els.signOutBtn.disabled    = false
  els.email.disabled         = true
  els.password.disabled      = true
  setFormEnabled(true)
}

function setLoggedOut() {
  els.authStatus.textContent = 'Signed out — please sign in to make changes'
  els.authStatus.className   = 'auth-status signed-out'
  els.signInBtn.disabled     = false
  els.signOutBtn.disabled    = true
  els.email.disabled         = false
  els.password.disabled      = false
  setFormEnabled(false)
}

function setFormEnabled(enabled) {
  els.form.querySelectorAll('input,select,textarea,button').forEach(el => {
    if (el.type === 'reset') return
    el.disabled = !enabled
  })
  if (els.uploadXlsxBtn) els.uploadXlsxBtn.disabled = !enabled
}

// ── Auth actions ───────────────────────────────────────────────────────────────
async function signIn() {
  const email    = (els.email.value || '').trim()
  const password = els.password.value || ''
  if (!email || !password) { alert('Enter email and password'); return }

  els.signInBtn.textContent = 'Signing in…'
  els.signInBtn.disabled    = true

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
    setLoggedIn(data.email)
    els.password.value = ''
    await loadBrandsCategories()
  } catch (e) {
    alert('Sign-in failed: ' + e.message)
  } finally {
    els.signInBtn.textContent = 'Sign In'
    els.signInBtn.disabled    = false
  }
}

async function signOut() {
  const token = getToken()
  if (token) {
    fetch(`${BACKEND}/admin/logout`, {
      method:  'POST',
      headers: authHeaders(),
    }).catch(() => {})
  }
  clearToken()
  localStorage.removeItem('hbmg_email')
  setLoggedOut()
}

// ── Brands / Categories ────────────────────────────────────────────────────────
async function loadBrandsCategories() {
  setStatus('Loading…')
  try {
    const [br, cr] = await Promise.all([
      fetch(`${BACKEND}/admin/brands`),
      fetch(`${BACKEND}/admin/categories`),
    ])
    if (!br.ok || !cr.ok) throw new Error('Failed to load refs')
    const brands     = await br.json()
    const categories = await cr.json()
    els.brandSelect.innerHTML    = (brands     || []).map(b => `<option value="${b.id}">${b.name}</option>`).join('')
    els.categorySelect.innerHTML = (categories || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('')
    setStatus('')
  } catch (e) {
    setStatus('Failed to load brands/categories — is the backend running on port 2025?', 'error')
  }
}

async function addBrand() {
  const name = (els.brandNew.value || '').trim()
  if (!name) return
  const res = await fetch(`${BACKEND}/admin/brands`, {
    method:  'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body:    JSON.stringify({ name }),
  })
  if (!res.ok) { setStatus('Add brand failed', 'error'); return }
  const data = await res.json()
  const o = document.createElement('option')
  o.value = data.id; o.textContent = data.name
  els.brandSelect.appendChild(o)
  els.brandSelect.value = data.id
  els.brandNew.value    = ''
  setStatus('Brand added', 'success')
}

async function addCategory() {
  const name = (els.categoryNew.value || '').trim()
  if (!name) return
  const res = await fetch(`${BACKEND}/admin/categories`, {
    method:  'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body:    JSON.stringify({ name }),
  })
  if (!res.ok) { setStatus('Add category failed', 'error'); return }
  const data = await res.json()
  const o = document.createElement('option')
  o.value = data.id; o.textContent = data.name
  els.categorySelect.appendChild(o)
  els.categorySelect.value = data.id
  els.categoryNew.value    = ''
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

async function uploadPrimaryImage(productId, file) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('is_primary', 'true')
  const res = await fetch(`${BACKEND}/admin/products/${productId}/images`, {
    method:  'POST',
    headers: authHeaders(),
    body:    fd,
  })
  if (!res.ok) throw new Error('Image upload failed')
  return (await res.json()).public_url
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
      specs,
      tags,
      is_active: true,
    }
    const res = await fetch(`${BACKEND}/admin/products`, {
      method:  'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body:    JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Product save failed')
    }
    const product = await res.json()
    const file = els.imageFile.files[0]
    if (!file) throw new Error('Please select a primary image')
    await uploadPrimaryImage(product.id, file)
    setStatus('Product saved successfully!', 'success')
    els.form.reset()
  } catch (err) {
    console.error(err)
    setStatus('Failed: ' + err.message, 'error')
  }
}

// ── Bulk XLSX ──────────────────────────────────────────────────────────────────
async function handleBulkUpload() {
  const file = els.xlsxFile.files?.[0]
  if (!file) { setBulkStatus('Please select an .xlsx file', 'error'); return }
  setBulkStatus('Uploading…')
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${BACKEND}/admin/products/bulk-xlsx`, {
      method:  'POST',
      headers: authHeaders(),
      body:    fd,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || await res.text())
    }
    const data = await res.json()
    setBulkStatus(
      `Done — Created: ${data.created}, Updated: ${data.updated}, Images: ${data.images_uploaded}`,
      'success'
    )
    els.bulkForm.reset()
  } catch (e) {
    console.error(e)
    setBulkStatus('Bulk upload failed: ' + e.message, 'error')
  }
}

function downloadSampleXlsx() {
  const headers = [
    'title','brand','category','price','mrp','rating','stock',
    'tags','image_url','specs_json','storage','ram','display',
    'battery','camera','warranty','stock_status'
  ]
  const sample = [
    'iPhone 13 (Refurbished)','Apple','Smartphones','45999','69999','4.7','10',
    'featured,sale','','','128 GB','4 GB','6.1" OLED','3227 mAh','12MP + 12MP','12 months','in_stock'
  ]
  const csv = [headers.join(','), sample.map(v => `"${v}"`).join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'helloBMG_products_sample.csv'
  a.click()
}

// ── Init ───────────────────────────────────────────────────────────────────────
function bind() {
  els.signInBtn.addEventListener('click', signIn)
  els.signOutBtn.addEventListener('click', signOut)
  els.addBrandBtn.addEventListener('click', addBrand)
  els.addCategoryBtn.addEventListener('click', addCategory)
  els.form.addEventListener('submit', handleSubmit)
  els.uploadXlsxBtn?.addEventListener('click', handleBulkUpload)
  els.sampleBtn?.addEventListener('click', downloadSampleXlsx)
}

async function init() {
  bind()
  const token = getToken()
  if (token) {
    // Validate stored token
    const res = await fetch(`${BACKEND}/admin/brands`, { headers: authHeaders() })
    if (res.ok) {
      setLoggedIn(localStorage.getItem('hbmg_email') || 'admin')
      await loadBrandsCategories()
      return
    }
    clearToken()
  }
  setLoggedOut()
}

init()
