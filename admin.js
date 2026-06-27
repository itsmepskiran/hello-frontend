const els = {
  authForm: document.getElementById('authForm'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  signInBtn: document.getElementById('signInBtn'),
  signOutBtn: document.getElementById('signOutBtn'),
  authStatus: document.getElementById('authStatus'),

  form: document.getElementById('productForm'),
  status: document.getElementById('status'),
  title: document.getElementById('title'),
  brandSelect: document.getElementById('brandSelect'),
  brandNew: document.getElementById('brandNew'),
  addBrandBtn: document.getElementById('addBrandBtn'),
  categorySelect: document.getElementById('categorySelect'),
  categoryNew: document.getElementById('categoryNew'),
  addCategoryBtn: document.getElementById('addCategoryBtn'),
  price: document.getElementById('price'),
  mrp: document.getElementById('mrp'),
  rating: document.getElementById('rating'),
  stock: document.getElementById('stock'),
  stockStatus: document.getElementById('stockStatus'),
  tags: document.getElementById('tags'),
  storage: document.getElementById('storage'),
  ram: document.getElementById('ram'),
  display: document.getElementById('display'),
  battery: document.getElementById('battery'),
  camera: document.getElementById('camera'),
  warranty: document.getElementById('warranty'),
  specsJson: document.getElementById('specsJson'),
  imageFile: document.getElementById('imageFile'),
  bulkForm: document.getElementById('bulkForm'),
  xlsxFile: document.getElementById('xlsxFile'),
  uploadXlsxBtn: document.getElementById('uploadXlsxBtn'),
  bulkStatus: document.getElementById('bulkStatus'),
}

const backendUrl = localStorage.getItem('hbmg_backend') || 'http://localhost:8010'

function setStatus(msg, type='info'){ els.status.textContent = msg; els.status.className = 'status ' + (type==='success'?'success':type==='error'?'error':'') }
function setAuthStatus(text){ if (els.authStatus) els.authStatus.textContent = text }
function setFormEnabled(enabled){ els.form.querySelectorAll('input,select,textarea,button').forEach(i=>{ if(i.type==='reset')return; i.disabled=!enabled }) }

async function loadBrandsCategories(){
  setStatus('Loading brands and categories...')
  try{
    const [br, cr] = await Promise.all([
      fetch(`${backendUrl}/admin/brands`),
      fetch(`${backendUrl}/admin/categories`)
    ])
    if(!br.ok || !cr.ok) throw new Error('Failed to load refs')
    const brands = await br.json(); const categories = await cr.json()
    els.brandSelect.innerHTML = (brands||[]).map(b=>`<option value="${b.id}">${b.name}</option>`).join('')
    els.categorySelect.innerHTML = (categories||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')
    setStatus('Ready')
  }catch(e){ setStatus('Failed to load brands/categories', 'error'); console.error(e) }
}

async function addBrand(){
  const name=(els.brandNew.value||'').trim(); if(!name) return
  const res = await fetch(`${backendUrl}/admin/brands`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) })
  if(!res.ok){ setStatus('Add brand failed','error'); return }
  const data = await res.json(); const o=document.createElement('option'); o.value=data.id; o.textContent=data.name; els.brandSelect.appendChild(o); els.brandSelect.value=data.id; els.brandNew.value=''; setStatus('Brand added','success')
}
async function addCategory(){
  const name=(els.categoryNew.value||'').trim(); if(!name) return
  const res = await fetch(`${backendUrl}/admin/categories`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) })
  if(!res.ok){ setStatus('Add category failed','error'); return }
  const data = await res.json(); const o=document.createElement('option'); o.value=data.id; o.textContent=data.name; els.categorySelect.appendChild(o); els.categorySelect.value=data.id; els.categoryNew.value=''; setStatus('Category added','success')
}

function buildSpecs(){ const manual={ storage:els.storage.value||undefined, ram:els.ram.value||undefined, display:els.display.value||undefined, battery:els.battery.value||undefined, camera:els.camera.value||undefined, warranty:els.warranty.value||undefined }; let specs=manual; const raw=els.specsJson.value.trim(); if(raw){ try{ const parsed=JSON.parse(raw); specs={...manual,...parsed} }catch(e){ throw new Error('Specs JSON invalid: '+e.message) } } Object.keys(specs).forEach(k=> specs[k]===undefined && delete specs[k]); return specs }

async function uploadPrimaryImage(productId, file){
  const fd = new FormData();
  fd.append('file', file);
  fd.append('is_primary', 'true');
  const res = await fetch(`${backendUrl}/admin/products/${productId}/images`, { method:'POST', body: fd })
  if(!res.ok) throw new Error('Image upload failed')
  const data = await res.json(); return data.public_url
}

async function handleSubmit(e){ e.preventDefault(); try{ setStatus('Saving product...'); const specs=buildSpecs(); const tags=(els.tags.value||'').split(',').map(s=>s.trim()).filter(Boolean); const payload={ title:els.title.value.trim(), brand_id:els.brandSelect.value, category_id:els.categorySelect.value, price:Number(els.price.value||0), mrp:els.mrp.value?Number(els.mrp.value):null, rating:els.rating.value?Number(els.rating.value):null, stock:els.stock.value?Number(els.stock.value):0, stock_status: els.stockStatus?.value || 'in_stock', popularity:0, specs, tags, is_active:true }; const res = await fetch(`${backendUrl}/admin/products`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }); if(!res.ok) throw new Error('Product save failed'); const product = await res.json(); const file=els.imageFile.files[0]; if(!file) throw new Error('Select an image'); await uploadPrimaryImage(product.id, file); setStatus('Product saved!', 'success'); els.form.reset() } catch(err){ console.error(err); setStatus('Failed: '+err.message,'error') } }

async function handleBulkUpload(){
  els.bulkStatus.textContent = 'Uploading...'
  els.bulkStatus.className = 'status'
  const file = els.xlsxFile.files?.[0]
  if(!file){ els.bulkStatus.textContent='Please select an .xlsx file'; els.bulkStatus.classList.add('error'); return }
  try{
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${backendUrl}/admin/products/bulk-xlsx`, { method:'POST', body: fd })
    if(!res.ok) throw new Error(await res.text())
    const data = await res.json()
    els.bulkStatus.textContent = `Success: Created ${data.created}, Updated ${data.updated}, Images ${data.images_uploaded}`
    els.bulkStatus.classList.add('success')
    els.bulkForm.reset()
  }catch(e){
    console.error(e)
    els.bulkStatus.textContent = 'Bulk upload failed'
    els.bulkStatus.classList.add('error')
  }
}

function bind(){
  els.addBrandBtn.addEventListener('click', addBrand)
  els.addCategoryBtn.addEventListener('click', addCategory)
  els.form.addEventListener('submit', handleSubmit)
  els.uploadXlsxBtn?.addEventListener('click', handleBulkUpload)
  // Optional: if you host backend behind auth, wire these to your auth endpoints
  els.signInBtn?.addEventListener('click', async ()=>{ setAuthStatus('Signed in (demo)'); setFormEnabled(true) })
  els.signOutBtn?.addEventListener('click', async ()=>{ setAuthStatus('Signed out'); setFormEnabled(false) })
}

async function init(){
  bind(); setFormEnabled(true); setAuthStatus('Using backend API')
  await loadBrandsCategories()
}

init()
