const BACKEND_URL = localStorage.getItem('hbmg_backend') || 'http://localhost:8010'

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function loadCart() {
  try { return JSON.parse(localStorage.getItem('hbmg_cart') || '[]') } catch { return [] }
}

function cartTotal(cart) {
  return cart.reduce((s, i) => s + i.price * i.qty, 0)
}

function renderOrderSummary(cart) {
  const list = document.getElementById('orderItemsList')
  const subtotalEl = document.getElementById('checkoutSubtotal')
  const totalEl = document.getElementById('checkoutTotal')
  const payBtnAmt = document.getElementById('payBtnAmount')
  if (!list) return

  list.innerHTML = ''
  cart.forEach(item => {
    const row = document.createElement('div')
    row.className = 'order-item-row'

    const img = document.createElement('img')
    img.src = item.image || ''
    img.alt = item.title
    img.onerror = () => { img.style.display = 'none' }

    const info = document.createElement('div'); info.className = 'order-item-info'
    const title = document.createElement('div'); title.className = 'order-item-title'; title.textContent = item.title
    const qty = document.createElement('div'); qty.className = 'order-item-qty'; qty.textContent = `Qty: ${item.qty}`
    info.append(title, qty)

    const price = document.createElement('div'); price.className = 'order-item-price'; price.textContent = fmt(item.price * item.qty)

    row.append(img, info, price)
    list.appendChild(row)
  })

  const total = cartTotal(cart)
  if (subtotalEl) subtotalEl.textContent = fmt(total)
  if (totalEl) totalEl.textContent = fmt(total)
  if (payBtnAmt) payBtnAmt.textContent = fmt(total)
}

function validateForm() {
  const name = document.getElementById('custName')?.value.trim()
  const email = document.getElementById('custEmail')?.value.trim()
  const phone = document.getElementById('custPhone')?.value.trim()

  if (!name) { showError('custName', 'Please enter your full name'); return false }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('custEmail', 'Please enter a valid email'); return false }
  if (!phone || phone.replace(/\D/g, '').length < 10) { showError('custPhone', 'Please enter a valid 10-digit phone number'); return false }
  return true
}

function showError(fieldId, msg) {
  const field = document.getElementById(fieldId)
  if (field) {
    field.style.borderColor = 'var(--danger)'
    field.focus()
    const existing = field.parentElement.querySelector('.field-error')
    if (!existing) {
      const err = document.createElement('span')
      err.className = 'field-error'
      err.style.cssText = 'font-size:.75rem;color:var(--danger);margin-top:2px'
      err.textContent = msg
      field.parentElement.appendChild(err)
      field.addEventListener('input', () => {
        field.style.borderColor = ''
        err.remove()
      }, { once: true })
    }
  }
}

async function handlePayment(cart) {
  if (!validateForm()) return

  const btn = document.getElementById('payNowBtn')
  btn.disabled = true
  btn.textContent = 'Processing…'

  const total = cartTotal(cart)
  const name = document.getElementById('custName').value.trim()
  const email = document.getElementById('custEmail').value.trim()
  const phone = document.getElementById('custPhone').value.trim().replace(/\D/g, '')

  try {
    const res = await fetch(`${BACKEND_URL}/payments/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(total * 100),
        currency: 'INR',
        notes: { source: 'HelloBMG', customer: name }
      })
    })
    if (!res.ok) throw new Error('Order creation failed')
    const data = await res.json()

    const options = {
      key: data.key_id,
      amount: data.order.amount,
      currency: data.order.currency,
      name: 'HelloBMG',
      description: `${cart.length} item${cart.length > 1 ? 's' : ''}`,
      order_id: data.order.id,
      prefill: { name, email, contact: phone },
      theme: { color: '#0ea5e9' },
      handler: async function (response) {
        try {
          const vr = await fetch(`${BACKEND_URL}/payments/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response)
          })
          if (!vr.ok) throw new Error('Verification failed')

          localStorage.setItem('hbmg_last_order', JSON.stringify({
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            items: cart,
            total,
            customerName: name,
            customerEmail: email,
          }))
          localStorage.removeItem('hbmg_cart')
          window.location.href = 'order-success.html'
        } catch {
          window.location.href = 'order-failed.html?reason=verification'
        }
      },
      modal: {
        ondismiss: () => {
          btn.disabled = false
          btn.innerHTML = `<span>Pay Now</span><span>${fmt(total)}</span><span>→</span>`
        }
      }
    }

    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', () => {
      window.location.href = 'order-failed.html?reason=payment'
    })
    rzp.open()
  } catch (err) {
    console.error(err)
    btn.disabled = false
    btn.innerHTML = `<span>Pay Now</span><span>${fmt(total)}</span><span>→</span>`
    alert(`Checkout failed.\n\nMake sure the backend is running at:\n${BACKEND_URL}\n\nError: ${err.message}`)
  }
}

function init() {
  const cart = loadCart()
  const main = document.getElementById('checkoutMain')
  const empty = document.getElementById('emptyCartState')

  if (cart.length === 0) {
    if (main) main.style.display = 'none'
    if (empty) empty.style.display = 'flex'
    return
  }

  renderOrderSummary(cart)
  document.getElementById('payNowBtn')?.addEventListener('click', () => handlePayment(cart))
}

init()
