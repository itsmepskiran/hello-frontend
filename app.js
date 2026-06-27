import { supabase, storage } from './supabase-config.js'

const state = {
  products: [],
  filtered: [],
  featured: [],
  newArrivals: [],
  compare: [],
  cart: [],
  cartOpen: false,
  cartCount: 0,
  currentCategory: 'All',
  query: '',
  sort: 'popularity',
  onlyInStock: false,
}

const els = {}

function qs(s,r=document){return r.querySelector(s)}
function qsa(s,r=document){return Array.from(r.querySelectorAll(s))}

function formatCurrency(n){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n)}

async function loadProductsFromSupabase(){
  // Optional: if you configure Supabase schema, uncomment to use instead of JSON
  const { data, error } = await supabase
    .from('products')
    .select(`id,title,price,mrp,rating,stock,popularity,specs,tags,brand:brands(name),category:categories(name),product_images(*)`)
    .eq('is_active', true)
    .order('popularity', { ascending: false })
    .limit(200)
  if (error) throw error
  const mapped = (data||[]).map(row=>{
    const img = row.product_images?.find(i=>i.is_primary) || row.product_images?.[0]
    let imageUrl = img?.cdn_url
    if (!imageUrl && img?.storage_path) {
      try { imageUrl = storage.getPublicUrl('product-images', img.storage_path) } catch {}
    }
    return {
      id: row.id,
      title: row.title,
      brand: row.brand?.name || '',
      model: row.specs?.model || '',
      category: row.category?.name || 'Other',
      price: row.price, mrp: row.mrp, rating: Number(row.rating||0), stock: row.stock||0, popularity: row.popularity||0, image: imageUrl,
      tags: row.tags||[], specs: row.specs||{}
    }
  })
  state.products = mapped
  state.featured = mapped.filter(p=>p.tags.includes('featured')).slice(0,8)
  state.newArrivals = mapped.filter(p=>p.tags.includes('new')).slice(0,8)
}

async function loadProducts(){
  try{
    await loadProductsFromSupabase()
  }catch(e){
    const res = await fetch('data/products.json');
    const json = await res.json();
    state.products = json.products
    state.featured = json.products.filter(p=>p.tags?.includes('featured')).slice(0,8)
    state.newArrivals = json.products.filter(p=>p.tags?.includes('new')).slice(0,8)
  }
}

function renderBadges(container, p){
  container.innerHTML=''
  if(p.tags?.includes('sale')){const b=document.createElement('span');b.className='badge sale';b.textContent='Sale';container.appendChild(b)}
  if(p.stock>0 && p.stock<5){const b=document.createElement('span');b.className='badge';b.textContent='Only few left';container.appendChild(b)}
}

function buildCard(p){
  const tpl = qs('#productCardTpl').content.cloneNode(true)
  const root = tpl.querySelector('.product-card'); root.dataset.id=p.id
  tpl.querySelector('.thumb').src = p.image || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop'
  tpl.querySelector('.thumb').alt = p.title
  tpl.querySelector('.title').textContent = p.title
  tpl.querySelector('.price').textContent = formatCurrency(p.price)
  if(p.mrp && p.mrp>p.price) tpl.querySelector('.mrp').textContent = formatCurrency(p.mrp)
  tpl.querySelector('.rating').textContent = `★ ${p.rating.toFixed(1)}`
  tpl.querySelector('.stock').textContent = p.stock>0?'In stock':'Out of stock'
  renderBadges(tpl.querySelector('.badge-group'), p)
  tpl.querySelector('.add-cart').addEventListener('click', ()=> addToCart(p.id))
  tpl.querySelector('.add-compare').addEventListener('click', ()=> toggleCompare(p.id))
  return tpl
}

function computeFiltered(){
  const q = state.query.trim().toLowerCase()
  state.filtered = state.products.filter(p=>{
    const matchesCategory = state.currentCategory==='All' || p.category===state.currentCategory
    const matchesQuery = !q || `${p.title} ${p.brand} ${p.category}`.toLowerCase().includes(q)
    const matchesStock = !state.onlyInStock || p.stock>0
    return matchesCategory && matchesQuery && matchesStock
  })
  switch(state.sort){
    case 'price_asc': state.filtered.sort((a,b)=>a.price-b.price); break
    case 'price_desc': state.filtered.sort((a,b)=>b.price-a.price); break
    case 'rating_desc': state.filtered.sort((a,b)=>b.rating-a.rating); break
    default: state.filtered.sort((a,b)=> (b.popularity??0)-(a.popularity??0))
  }
}

function renderGrid(target, list){
  target.innerHTML=''
  const frag=document.createDocumentFragment()
  list.forEach(p=>frag.appendChild(buildCard(p)))
  target.appendChild(frag)
}

function buildBannerCard(p){
  const card = document.createElement('article')
  card.className = 'banner-card'
  const img = document.createElement('img'); img.src = p.image || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop'; img.alt = p.title
  const title = document.createElement('div'); title.className='title'; title.textContent=p.title
  const price = document.createElement('div'); price.className='price'; price.textContent = formatCurrency(p.price)
  const stock = document.createElement('div'); stock.className='stock'; stock.textContent = p.stock>0 ? 'In stock' : 'Out of stock'
  card.appendChild(img); card.appendChild(title); card.appendChild(price); card.appendChild(stock)
  return card
}

function renderBanner(){
  const track = document.getElementById('bannerTrack')
  if(!track) return
  track.innerHTML=''
  const frag=document.createDocumentFragment()
  (state.featured||[]).forEach(p=> frag.appendChild(buildBannerCard(p)))
  track.appendChild(frag)
  const prev = document.getElementById('bannerPrev')
  const next = document.getElementById('bannerNext')
  const scrollBy = 260
  prev?.addEventListener('click', ()=> track.scrollBy({ left: -scrollBy, behavior: 'smooth'}))
  next?.addEventListener('click', ()=> track.scrollBy({ left: scrollBy, behavior: 'smooth'}))
}

// Compare
function toggleCompare(id){
  const idx=state.compare.indexOf(id); if(idx>=0) state.compare.splice(idx,1); else if(state.compare.length<3) state.compare.push(id)
  renderCompareBar(); renderCompareTable()
}
function renderCompareBar(){
  const bar = qs('#compareBar'); bar.innerHTML=''
  if(state.compare.length===0){bar.textContent='Add up to 3 products to compare.';return}
  state.compare.map(id=>state.products.find(p=>p.id===id)).forEach(p=>{
    const chip=document.createElement('span'); chip.className='compare-chip'; chip.innerHTML=`<img src="${p.image}" style="width:24px;height:24px;border-radius:6px;object-fit:cover"> ${p.title}`
    const btn=document.createElement('button'); btn.textContent='✕'; btn.addEventListener('click',()=>toggleCompare(p.id)); chip.appendChild(btn)
    bar.appendChild(chip)
  })
}
function renderCompareTable(){
  const body = qs('#compareBody'); body.innerHTML=''
  const products = state.compare.map(id=>state.products.find(p=>p.id===id))
  if(products.length===0) return
  const specs=['brand','model','storage','ram','display','battery','camera','warranty']
  const rows=[]
  rows.push(['Price', ...products.map(p=>formatCurrency(p.price))])
  rows.push(['Rating', ...products.map(p=>`★ ${p.rating.toFixed(1)}`)])
  for(const key of specs){ rows.push([key[0].toUpperCase()+key.slice(1), ...products.map(p=> p.specs?.[key] ?? (p[key]||'-'))]) }
  rows.push(['Availability', ...products.map(p=> p.stock>0?'In stock':'Out of stock')])
  for(const row of rows){ const tr=document.createElement('tr'); row.forEach((cell,i)=>{const el=document.createElement(i===0?'th':'td'); el.textContent=cell; tr.appendChild(el)}); body.appendChild(tr) }
}

// Cart
function openCart(){ qs('#cartDrawer').classList.add('open'); state.cartOpen=true }
function closeCart(){ qs('#cartDrawer').classList.remove('open'); state.cartOpen=false }
function addToCart(id){ const p=state.products.find(x=>x.id===id); if(!p) return; const existing=state.cart.find(x=>x.id===id); if(existing) existing.qty+=1; else state.cart.push({id:id,title:p.title,price:p.price,image:p.image,qty:1}); updateCartUI() }
function removeFromCart(id){ const idx=state.cart.findIndex(x=>x.id===id); if(idx>=0){ state.cart.splice(idx,1); updateCartUI() } }
function changeQty(id,delta){ const item=state.cart.find(x=>x.id===id); if(!item) return; item.qty=Math.max(1,item.qty+delta); updateCartUI() }
function cartTotal(){ return state.cart.reduce((s,i)=> s + i.price*i.qty, 0) }
function updateCartUI(){
  const btn=qs('#viewCartBtn'); const count = state.cart.reduce((s,i)=>s+i.qty,0); btn.textContent=`Cart (${count})`
  const items=qs('#cartItems'); items.innerHTML=''
  state.cart.forEach(i=>{
    const row=document.createElement('div'); row.className='cart-item'
    row.innerHTML=`<img src="${i.image}"><div style="flex:1"><div>${i.title}</div><div>${formatCurrency(i.price)} × ${i.qty}</div></div>`
    const ctr=document.createElement('div'); ctr.innerHTML=`<button>-</button> <button>+</button> <button>Remove</button>`
    const [minus,plus,remove]=ctr.querySelectorAll('button')
    minus.addEventListener('click',()=>changeQty(i.id,-1)); plus.addEventListener('click',()=>changeQty(i.id,1)); remove.addEventListener('click',()=>removeFromCart(i.id))
    row.appendChild(ctr); items.appendChild(row)
  })
  qs('#cartTotal').textContent = formatCurrency(cartTotal())
}

async function checkout(){
  if(state.cart.length===0){ alert('Cart is empty'); return }
  const backendUrl = localStorage.getItem('hbmg_backend') || 'http://localhost:8010'
  const amountPaise = cartTotal()*100
  try{
    const res = await fetch(`${backendUrl}/payments/create-order`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ amount: Math.round(amountPaise), currency:'INR', notes:{ source:'HelloBMG' } }) })
    if(!res.ok) throw new Error('Order creation failed')
    const data = await res.json()
    const options = {
      key: data.key_id,
      amount: data.order.amount,
      currency: data.order.currency,
      name: 'HelloBMG',
      description: 'Order Payment',
      order_id: data.order.id,
      handler: async function (response){
        try{
          const vr = await fetch(`${backendUrl}/payments/verify`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(response) })
          if(!vr.ok) throw new Error('Verification failed')
          alert('Payment success!')
          state.cart=[]; updateCartUI(); closeCart()
        }catch(err){ alert('Verification failed') }
      },
      prefill: {},
      theme: { color: '#0ea5e9' }
    }
    const rzp = new Razorpay(options)
    rzp.open()
  }catch(err){
    console.error(err); alert('Checkout failed. Make sure backend is running.')
  }
}

function bind(){
  qs('#viewCartBtn').addEventListener('click', openCart)
  qs('#closeCart').addEventListener('click', closeCart)
  qs('#checkoutBtn').addEventListener('click', checkout)
  qs('#searchForm').addEventListener('submit',(e)=>{e.preventDefault(); state.query=qs('#searchInput').value; computeFiltered(); renderGrid(qs('#catalogGrid'), state.filtered)})
  qs('#sortSelect').addEventListener('change',()=>{ state.sort=qs('#sortSelect').value; computeFiltered(); renderGrid(qs('#catalogGrid'), state.filtered) })
  qs('#onlyInStock').addEventListener('change',()=>{ state.onlyInStock=qs('#onlyInStock').checked; computeFiltered(); renderGrid(qs('#catalogGrid'),state.filtered) })
  qsa('.chip').forEach(ch=> ch.addEventListener('click',()=>{ qsa('.chip').forEach(c=>c.classList.remove('active')); ch.classList.add('active'); state.currentCategory=ch.dataset.category; computeFiltered(); renderGrid(qs('#catalogGrid'), state.filtered) }))
}

async function init(){
  await loadProducts();
  computeFiltered();
  renderBanner()
  renderGrid(qs('#featuredGrid'), state.featured)
  renderGrid(qs('#newGrid'), state.newArrivals)
  renderGrid(qs('#catalogGrid'), state.filtered)
  bind();
}

init()
