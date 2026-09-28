let menuData = [];
let selectedCategory = 'TẤT CẢ';
let searchQuery = '';
let activeProduct = null;
let selectedSize = 'Grande';
let selectedIce = '100%';
let selectedSweetness = '50%';
let selectedMilk = 'Sữa tươi nguyên kem';
let customQty = 1;
let mobileCart = [];
let insertedBills = { '1k': 0, '2k': 0, '5k': 0, '10k': 0, '20k': 0, '50k': 0, '100k': 0, '200k': 0, '500k': 0 };
let activeOrderCode = null;
let currentChangeAmount = 0;
let isPrintingOrTorn = false;

const categoryIcons = {
  'TẤT CẢ': '🌟',
  'Espresso & Cà Phê': '☕',
  'Cold Brew Ủ Lạnh': '❄️',
  'Frappuccino®': '🧊',
  'Sinh Tố Đá Xay': '🍓',
  'Chocolate & Classics': '🍫',
  'Starbucks Refreshers™': '🍹',
  'Trà Teavana™': '🍵'
};

// ==========================================
// 1. WEB AUDIO API SYNTHESIZER (100% OFFLINE)
// ==========================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playBeepSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  } catch (e) {}
}

function playBillAcceptorSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(160, ctx.currentTime + 0.12);
    osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

function playPrinterSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const duration = 2.2;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const isPrinting = Math.sin(t * 35) > -0.25;
      data[i] = isPrinting ? (Math.random() * 2 - 1) * 0.15 * Math.sin(2200 * t * 2 * Math.PI) : 0;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 1.9);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch (e) {}
}

function playTearSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const duration = 0.25;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 0.12);
    filter.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.25);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch (e) {}
}

function playCoinClinkSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    [2200, 2900, 3800].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      const startTime = ctx.currentTime + idx * 0.08;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  } catch (e) {}
}

// ==========================================
// 2. LIFECYCLE & SOCKET SETUP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  fetchMobileMenu();
  setupEventListeners();
  try {
    setupSocket();
  } catch (err) {
    console.warn('Socket init error:', err);
  }
});

function setupSocket() {
  if (typeof io === 'undefined') return;
  try {
    const socket = io({ transports: ['polling', 'websocket'], timeout: 3000 });
    socket.on('connect', () => {
      socket.emit('join_room', 'kiosk_room');
    });
    socket.on('order_status_updated', (data) => {
      if (activeOrderCode && data && data.orderCode === activeOrderCode) {
        const statusEl = document.getElementById('receipt-torn-status');
        if (statusEl) {
          if (data.status === 'PROCESSING') {
            statusEl.innerHTML = `
              <div class="w-9 h-9 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto text-base animate-pulse">⏳</div>
              <p class="text-xs font-black text-amber-400 uppercase">BARISTA ĐANG PHA CHẾ</p>
              <p class="text-[10px] text-gray-300">Đơn hàng #${activeOrderCode} đang được chuẩn bị!</p>
            `;
          } else if (data.status === 'COMPLETED') {
            statusEl.innerHTML = `
              <div class="w-9 h-9 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto text-base">✓</div>
              <p class="text-xs font-black text-emerald-400 uppercase">PHA CHẾ HOÀN TẤT!</p>
              <p class="text-[10px] text-emerald-300">Mời bạn đến quầy Barista nhận nước!</p>
            `;
          }
        }
      }
    });
  } catch (err) {
    console.warn('Socket connection error:', err);
  }
}

// ==========================================
// 3. MENU DATA & RENDERING
// ==========================================
async function fetchMobileMenu() {
  try {
    const res = await fetch('/api/kiosk/menu');
    menuData = await res.json();
    renderCategoryPillBar();
    renderMobileDrinkList();
  } catch (err) {
    console.error('Lỗi tải danh mục menu:', err);
  }
}

function renderCategoryPillBar() {
  const container = document.getElementById('mobile-category-bar');
  if (!container) return;

  const rawCats = ['TẤT CẢ', ...new Set(menuData.map((p) => p.category))];

  container.innerHTML = rawCats
    .map((cat) => {
      const isSelected = cat === selectedCategory;
      const icon = categoryIcons[cat] || '☕';
      return `
        <button class="mcat-btn px-3.5 py-1.5 rounded-full whitespace-nowrap transition border font-bold flex items-center gap-1.5 cursor-pointer text-xs ${
          isSelected
            ? 'bg-sbk-green text-white border-sbk-green shadow-sm ring-2 ring-sbk-gold/50'
            : 'bg-white text-gray-700 border-gray-200 hover:border-sbk-green hover:text-sbk-green'
        }" data-cat="${cat}">
          <span>${icon}</span>
          <span>${cat}</span>
        </button>
      `;
    })
    .join('');

  document.querySelectorAll('.mcat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      playBeepSound();
      selectedCategory = btn.dataset.cat;
      renderCategoryPillBar();
      renderMobileDrinkList();
    });
  });
}

function renderMobileDrinkList() {
  const container = document.getElementById('mobile-drink-list');
  const countBadge = document.getElementById('mobile-menu-badge');

  let filtered = selectedCategory === 'TẤT CẢ' ? menuData : menuData.filter((p) => p.category === selectedCategory);

  if (searchQuery) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery) ||
        p.category.toLowerCase().includes(searchQuery)
    );
  }

  if (countBadge) countBadge.textContent = `${filtered.length} MÓN`;
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center space-y-2">
        <div class="text-4xl text-gray-300">🔍</div>
        <p class="text-sm font-bold text-gray-600">Không tìm thấy thức uống phù hợp</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((p) => {
      const catIcon = categoryIcons[p.category] || '☕';
      return `
      <div class="bg-white rounded-2xl border border-gray-200 p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-sbk-green/60 transition flex flex-col justify-between gap-3 group">
        <div class="space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center gap-1 text-[10px] font-bold text-sbk-green uppercase bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              <span>${catIcon}</span>
              <span class="truncate max-w-[120px]">${p.category}</span>
            </span>
            <span class="text-xs sm:text-sm font-black text-sbk-dark bg-sbk-light border border-sbk-green/30 px-2.5 py-0.5 rounded-full font-mono">
              ${p.base_price.toLocaleString('vi-VN')}đ
            </span>
          </div>

          <div>
            <h3 class="font-black text-xs sm:text-sm text-sbk-dark group-hover:text-sbk-green transition leading-snug line-clamp-2" title="${p.name}">
              ${p.name}
            </h3>
            <p class="text-[10px] text-gray-400 font-medium mt-0.5">Tall • Grande • Venti</p>
          </div>
        </div>

        <div class="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 mt-auto">
          <span class="text-[9px] text-gray-400 font-bold uppercase">Tùy chọn đá & sữa</span>
          <button class="open-custom-btn px-3 py-1.5 bg-sbk-green hover:bg-[#004225] active:scale-95 text-white text-xs font-black uppercase rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0" data-id="${p.id}">
            <span>+</span> <span>TÙY CHỌN</span>
          </button>
        </div>
      </div>
    `;
    })
    .join('');

  document.querySelectorAll('.open-custom-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      playBeepSound();
      const id = parseInt(btn.dataset.id, 10);
      openCustomizerModal(id);
    });
  });
}

// ==========================================
// 4. DRINK CUSTOMIZER MODAL
// ==========================================
function openCustomizerModal(id) {
  activeProduct = menuData.find((p) => p.id === id);
  if (!activeProduct) return;

  selectedSize = 'Grande';
  selectedIce = '100%';
  selectedSweetness = '50%';
  selectedMilk = activeProduct.options.milk ? activeProduct.options.milk[0].name : 'Sữa tươi nguyên kem';
  customQty = 1;

  document.getElementById('custom-cat-badge').textContent = activeProduct.category;
  document.getElementById('custom-drink-title').textContent = activeProduct.name;
  document.getElementById('custom-drink-base-price').textContent = `${activeProduct.base_price.toLocaleString('vi-VN')} VNĐ`;

  renderCustomizerOptions();
  document.getElementById('customizer-modal').classList.remove('hidden');
}

function renderCustomizerOptions() {
  if (!activeProduct) return;

  // Sizes
  const sizeContainer = document.getElementById('custom-size-options');
  sizeContainer.innerHTML = Object.keys(activeProduct.sizes)
    .map(
      (sz) => `
    <button class="msize-btn py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
      selectedSize === sz ? 'bg-sbk-green text-white border-sbk-green shadow-xs' : 'bg-gray-50 text-sbk-dark border-gray-200 hover:border-sbk-green'
    }" data-size="${sz}">
      ${sz} ${activeProduct.sizes[sz] > 0 ? `(+${activeProduct.sizes[sz] / 1000}k)` : ''}
    </button>
  `
    )
    .join('');

  // Ice
  const iceContainer = document.getElementById('custom-ice-options');
  iceContainer.innerHTML = activeProduct.options.ice
    .map(
      (ic) => `
    <button class="mice-btn py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
      selectedIce === ic ? 'bg-sbk-green text-white border-sbk-green shadow-xs' : 'bg-gray-50 text-sbk-dark border-gray-200 hover:border-sbk-green'
    }" data-ice="${ic}">${ic}</button>
  `
    )
    .join('');

  // Sweetness
  const sweetContainer = document.getElementById('custom-sweet-options');
  sweetContainer.innerHTML = activeProduct.options.sweetness
    .map(
      (sw) => `
    <button class="msweet-btn py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
      selectedSweetness === sw ? 'bg-sbk-green text-white border-sbk-green shadow-xs' : 'bg-gray-50 text-sbk-dark border-gray-200 hover:border-sbk-green'
    }" data-sweet="${sw}">${sw}</button>
  `
    )
    .join('');

  // Milk
  const milkContainer = document.getElementById('custom-milk-options');
  milkContainer.innerHTML = activeProduct.options.milk
    .map(
      (m) => `
    <button class="mmilk-btn py-2 px-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
      selectedMilk === m.name ? 'bg-sbk-green text-white border-sbk-green shadow-xs' : 'bg-gray-50 text-sbk-dark border-gray-200 hover:border-sbk-green'
    }" data-milk="${m.name}">
      ${m.name} ${m.price > 0 ? `(+${m.price / 1000}k)` : ''}
    </button>
  `
    )
    .join('');

  document.getElementById('qty-val').textContent = customQty;

  const itemUnitPrice = calculateCustomUnitPrice();
  const totalPrice = itemUnitPrice * customQty;
  document.getElementById('custom-total-btn').textContent = `${totalPrice.toLocaleString('vi-VN')}`;

  bindCustomizerEvents();
}

function calculateCustomUnitPrice() {
  if (!activeProduct) return 0;
  let total = activeProduct.base_price;
  total += activeProduct.sizes[selectedSize] || 0;
  const milkOpt = activeProduct.options.milk.find((m) => m.name === selectedMilk);
  if (milkOpt) total += milkOpt.price;
  return total;
}

function bindCustomizerEvents() {
  document.querySelectorAll('.msize-btn').forEach((b) => {
    b.addEventListener('click', () => {
      playBeepSound();
      selectedSize = b.dataset.size;
      renderCustomizerOptions();
    });
  });
  document.querySelectorAll('.mice-btn').forEach((b) => {
    b.addEventListener('click', () => {
      playBeepSound();
      selectedIce = b.dataset.ice;
      renderCustomizerOptions();
    });
  });
  document.querySelectorAll('.msweet-btn').forEach((b) => {
    b.addEventListener('click', () => {
      playBeepSound();
      selectedSweetness = b.dataset.sweet;
      renderCustomizerOptions();
    });
  });
  document.querySelectorAll('.mmilk-btn').forEach((b) => {
    b.addEventListener('click', () => {
      playBeepSound();
      selectedMilk = b.dataset.milk;
      renderCustomizerOptions();
    });
  });
}

// ==========================================
// 5. CASH INSERTION & HARDWARE LOGIC
// ==========================================
function updateHardwareCashDisplays() {
  const dueAmount = mobileCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const insertedTotal =
    (insertedBills['1k'] || 0) * 1000 +
    (insertedBills['2k'] || 0) * 2000 +
    (insertedBills['5k'] || 0) * 5000 +
    (insertedBills['10k'] || 0) * 10000 +
    (insertedBills['20k'] || 0) * 20000 +
    (insertedBills['50k'] || 0) * 50000 +
    (insertedBills['100k'] || 0) * 100000 +
    (insertedBills['200k'] || 0) * 200000 +
    (insertedBills['500k'] || 0) * 500000;

  const changeAmount = Math.max(0, insertedTotal - dueAmount);
  currentChangeAmount = changeAmount;

  // Update Left Screen Cart Bar
  const totalCount = mobileCart.reduce((sum, item) => sum + item.quantity, 0);
  const countEl = document.getElementById('mobile-cart-count');
  if (countEl) countEl.textContent = totalCount;
  const cartBtnQty = document.getElementById('cart-btn-qty');
  if (cartBtnQty) cartBtnQty.textContent = totalCount;

  const totalEl = document.getElementById('mobile-cart-total');
  if (totalEl) totalEl.textContent = `${dueAmount.toLocaleString('vi-VN')} VNĐ`;

  // Update Right Hardware Cash LCD
  const dueEl = document.getElementById('vending-due-amount');
  if (dueEl) dueEl.textContent = `${dueAmount.toLocaleString('vi-VN')} VNĐ`;

  const insEl = document.getElementById('vending-inserted-amount');
  if (insEl) insEl.textContent = `${insertedTotal.toLocaleString('vi-VN')} VNĐ`;

  const chgEl = document.getElementById('vending-change-amount');
  if (chgEl) chgEl.textContent = `${changeAmount.toLocaleString('vi-VN')} VNĐ`;

  // Update Action Button
  const submitBtn = document.getElementById('vending-submit-pay-btn');
  const led = document.getElementById('cash-status-led');

  if (submitBtn) {
    if (dueAmount === 0) {
      submitBtn.disabled = true;
      submitBtn.className = 'w-full py-3.5 bg-gray-700 text-gray-400 font-black text-xs uppercase rounded-xl transition shadow cursor-not-allowed flex items-center justify-center gap-2';
      submitBtn.innerHTML = '<span>☕</span> <span>VUI LÒNG CHỌN MÓN TRƯỚC</span>';
      if (led) {
        led.textContent = '⚪ CHƯA CÓ ĐƠN';
        led.className = 'text-[9px] font-black text-gray-400 bg-gray-900 border border-gray-700 px-2 py-0.5 rounded-md';
      }
    } else if (insertedTotal < dueAmount) {
      const shortage = dueAmount - insertedTotal;
      submitBtn.disabled = true;
      submitBtn.className = 'w-full py-3.5 bg-amber-900/60 border border-amber-600/50 text-amber-200 font-black text-xs uppercase rounded-xl transition shadow cursor-not-allowed flex items-center justify-center gap-2';
      submitBtn.innerHTML = `<span>💵</span> <span>ĐÚT THÊM TIỀN (THIẾU ${shortage.toLocaleString('vi-VN')}đ)</span>`;
      if (led) {
        led.textContent = '🟡 ĐANG CHỜ NẠP ĐỦ';
        led.className = 'text-[9px] font-black text-amber-400 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-md';
      }
    } else {
      submitBtn.disabled = false;
      submitBtn.className = 'w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs uppercase rounded-xl transition shadow-xl cursor-pointer flex items-center justify-center gap-2 ring-2 ring-emerald-400/60 animate-pulse';
      submitBtn.innerHTML = `<span>✓</span> <span>XÁC NHẬN THANH TOÁN TIỀN MẶT</span>`;
      if (led) {
        led.textContent = '🟢 TIỀN ĐÃ ĐỦ — BẤM THANH TOÁN';
        led.className = 'text-[9px] font-black text-emerald-300 bg-emerald-950 border border-emerald-400 px-2 py-0.5 rounded-md';
      }
    }
  }
}

// ==========================================
// 6. EXECUTE CASH ORDER & PRINT RECEIPT
// ==========================================
async function submitVendingCashOrder() {
  const dueAmount = mobileCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const insertedTotal =
    (insertedBills['1k'] || 0) * 1000 +
    (insertedBills['2k'] || 0) * 2000 +
    (insertedBills['5k'] || 0) * 5000 +
    (insertedBills['10k'] || 0) * 10000 +
    (insertedBills['20k'] || 0) * 20000 +
    (insertedBills['50k'] || 0) * 50000 +
    (insertedBills['100k'] || 0) * 100000 +
    (insertedBills['200k'] || 0) * 200000 +
    (insertedBills['500k'] || 0) * 500000;

  if (dueAmount === 0) return alert('Vui lòng chọn món trước');
  if (insertedTotal < dueAmount) return alert('Số tiền nạp chưa đủ');

  const submitBtn = document.getElementById('vending-submit-pay-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳</span> <span>ĐANG XỬ LÝ VÀ IN HÓA ĐƠN...</span>';
  }

  const payload = {
    items: mobileCart,
    cashInsertedBills: insertedBills,
    insertedTotal,
    paymentMethod: 'CASH'
  };

  try {
    const res = await fetch('/api/kiosk/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `vending_${Date.now()}_${Math.random()}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      if (submitBtn) submitBtn.disabled = false;
      return alert(data.error || 'Lỗi thanh toán máy Kiosk');
    }

    // Trigger Smart Hardware Receipt Output Animation
    handleVendingHardwarePrintAndDispense(data);

  } catch (err) {
    console.error('Lỗi thanh toán Kiosk:', err);
    if (submitBtn) submitBtn.disabled = false;
    alert('Lỗi kết nối máy chủ Kiosk');
  }
}

function handleVendingHardwarePrintAndDispense(data) {
  const order = data.order || {};
  activeOrderCode = order.order_code || '#SBK-1000';
  isPrintingOrTorn = false;

  const totalAmount = data.calculatedTotal || order.total_amount || 0;
  const insertedAmount = Number(data.insertedAmount) || totalAmount;
  const changeAmount = Number(data.changeAmount) || 0;

  // 1. Play Thermal Printer Sound & Run Slide-Down Animation
  playPrinterSound();

  // Reset bill view
  const idleState = document.getElementById('receipt-idle-state');
  if (idleState) idleState.style.display = 'none';

  const tornStatus = document.getElementById('receipt-torn-status');
  if (tornStatus) tornStatus.style.display = 'none';

  const billEl = document.getElementById('vending-receipt');
  if (billEl) {
    billEl.classList.remove('animate-tear-off');
    billEl.classList.add('animate-print-bill');
    billEl.style.display = 'block';
  }

  // Populate Bill Details
  document.getElementById('receipt-code-display').textContent = activeOrderCode;
  document.getElementById('receipt-time-display').textContent = new Date().toLocaleString('vi-VN');

  const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || mobileCart);
  const itemsContainer = document.getElementById('receipt-items-list');
  if (itemsContainer) {
    itemsContainer.innerHTML = items
      .map(
        (i) => `
      <div class="flex justify-between items-start">
        <div>
          <p class="font-bold">${i.name} (x${i.quantity || 1})</p>
          <p class="text-[8px] text-gray-500">${i.size} | Đá: ${i.options ? i.options.ice : '100%'} | Sữa: ${i.options ? i.options.milk : 'Sữa tươi'}</p>
        </div>
        <span class="font-mono font-bold">${((i.price || 0) * (i.quantity || 1)).toLocaleString('vi-VN')}đ</span>
      </div>
    `
      )
      .join('');
  }

  document.getElementById('receipt-total-display').textContent = `${totalAmount.toLocaleString('vi-VN')}đ`;
  document.getElementById('receipt-inserted-display').textContent = `${insertedAmount.toLocaleString('vi-VN')}đ`;
  document.getElementById('receipt-change-display').textContent = `${changeAmount.toLocaleString('vi-VN')}đ`;

  // 2. DISPENSE CHANGE INTO HOPPER TRAY
  handleDispenseChangeTray(changeAmount, data.changeBills || {});

  // 3. Clear cart & reset inserted bills
  mobileCart = [];
  insertedBills = { '1k': 0, '2k': 0, '5k': 0, '10k': 0, '20k': 0, '50k': 0, '100k': 0, '200k': 0, '500k': 0 };
  updateHardwareCashDisplays();

  // Scroll hardware cabinet into view on mobile
  if (window.innerWidth < 1024) {
    const hwPanel = document.getElementById('vending-hardware-panel');
    if (hwPanel) hwPanel.scrollIntoView({ behavior: 'smooth' });
  }
}

function handleDispenseChangeTray(changeAmount, bills) {
  const trayContents = document.getElementById('change-tray-contents');
  const collectBox = document.getElementById('change-collect-box');
  const trayAmount = document.getElementById('tray-change-amount');
  const trayLed = document.getElementById('change-tray-led');

  if (changeAmount > 0) {
    // Play Coin clinking sound
    setTimeout(() => {
      playCoinClinkSound();
    }, 700);

    if (trayLed) {
      trayLed.className = 'absolute top-1 w-12 h-1 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.9)] animate-pulse';
    }

    const activeKeys = Object.keys(bills).filter((k) => bills[k] > 0);
    const billsHtml = activeKeys.length > 0
      ? activeKeys
          .map(
            (k) => `
            <div class="px-2 py-1 bg-amber-400/20 border border-amber-400/40 rounded text-amber-200 text-[9px] font-black flex items-center justify-between">
              <span>Tờ ${k}:</span>
              <span class="bg-amber-500 text-slate-950 px-1 rounded">${bills[k]} tờ</span>
            </div>
          `
          )
          .join('')
      : `<p class="text-[9px] text-amber-300 font-bold">Thối lại: ${changeAmount.toLocaleString('vi-VN')}đ</p>`;

    if (trayContents) {
      trayContents.innerHTML = `
        <div class="w-full space-y-1.5 animate-drop-change">
          <div class="text-xl">🪙 💵</div>
          <div class="space-y-1 w-full">${billsHtml}</div>
        </div>
      `;
    }

    if (collectBox && trayAmount) {
      trayAmount.textContent = `${changeAmount.toLocaleString('vi-VN')}đ`;
      collectBox.style.display = 'block';
    }
  } else {
    if (trayLed) trayLed.className = 'absolute top-1 w-12 h-1 bg-gray-700 rounded-full';
    if (trayContents) {
      trayContents.innerHTML = `
        <div class="text-xl text-gray-600">📥</div>
        <p class="text-[9px] text-gray-500 font-medium">Khách nạp đúng số tiền (Không có tiền thừa)</p>
      `;
    }
    if (collectBox) collectBox.style.display = 'none';
  }
}

// ==========================================
// 7. INTERACTIVE TEAR BILL ACTION
// ==========================================
function tearReceipt() {
  if (isPrintingOrTorn) return;
  const billEl = document.getElementById('vending-receipt');
  if (!billEl) return;

  isPrintingOrTorn = true;

  // Play realistic paper tear sound
  playTearSound();

  // Run tear off animation
  billEl.classList.remove('animate-print-bill');
  billEl.classList.add('animate-tear-off');

  setTimeout(() => {
    billEl.style.display = 'none';
    billEl.classList.remove('animate-tear-off');

    const tornStatus = document.getElementById('receipt-torn-status');
    if (tornStatus) {
      tornStatus.style.display = 'block';
    }
  }, 620);
}

function collectChange() {
  playBeepSound();
  const collectBox = document.getElementById('change-collect-box');
  if (collectBox) collectBox.style.display = 'none';

  const trayContents = document.getElementById('change-tray-contents');
  if (trayContents) {
    trayContents.innerHTML = `
      <div class="text-emerald-400 font-black text-xs space-y-1 py-3">
        <p>✓ ĐÃ NHẬN TIỀN THỪA</p>
        <p class="text-[9px] text-gray-400 font-normal">Cảm ơn quý khách!</p>
      </div>
    `;
  }

  const trayLed = document.getElementById('change-tray-led');
  if (trayLed) trayLed.className = 'absolute top-1 w-12 h-1 bg-gray-700 rounded-full';
}

// ==========================================
// 8. EVENT LISTENERS
// ==========================================
function setupEventListeners() {
  // Steppers in customizer
  document.getElementById('qty-minus').addEventListener('click', () => {
    playBeepSound();
    if (customQty > 1) {
      customQty--;
      renderCustomizerOptions();
    }
  });

  document.getElementById('qty-plus').addEventListener('click', () => {
    playBeepSound();
    customQty++;
    renderCustomizerOptions();
  });

  document.getElementById('close-custom-btn').addEventListener('click', () => {
    playBeepSound();
    document.getElementById('customizer-modal').classList.add('hidden');
  });

  // Search input listeners
  const searchInput = document.getElementById('search-drink-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      if (clearSearchBtn) {
        clearSearchBtn.classList.toggle('hidden', searchQuery.length === 0);
      }
      renderMobileDrinkList();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      playBeepSound();
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderMobileDrinkList();
    });
  }

  // Confirm add to cart
  document.getElementById('confirm-add-cart-btn').addEventListener('click', () => {
    if (!activeProduct) return;
    playBeepSound();
    const unitPrice = calculateCustomUnitPrice();
    mobileCart.push({
      product_id: activeProduct.id,
      name: activeProduct.name,
      size: selectedSize,
      price: unitPrice,
      quantity: customQty,
      options: {
        ice: selectedIce,
        sweetness: selectedSweetness,
        milk: selectedMilk
      }
    });

    document.getElementById('customizer-modal').classList.add('hidden');
    updateHardwareCashDisplays();
  });

  // Cart modal trigger
  document.getElementById('open-cart-btn').addEventListener('click', openCartModal);
  document.getElementById('close-cart-modal-btn').addEventListener('click', () => {
    playBeepSound();
    document.getElementById('cart-modal').classList.add('hidden');
  });

  const gotoHwBtn = document.getElementById('cart-goto-hardware-btn');
  if (gotoHwBtn) {
    gotoHwBtn.addEventListener('click', () => {
      playBeepSound();
      document.getElementById('cart-modal').classList.add('hidden');
      const hwPanel = document.getElementById('vending-hardware-panel');
      if (hwPanel) hwPanel.scrollIntoView({ behavior: 'smooth' });
    });
  }

  const quickCashBtn = document.getElementById('quick-cash-trigger-btn');
  if (quickCashBtn) {
    quickCashBtn.addEventListener('click', () => {
      playBeepSound();
      const hwPanel = document.getElementById('vending-hardware-panel');
      if (hwPanel) hwPanel.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Banknote Feed Buttons (.vbill-btn)
  document.querySelectorAll('.vbill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const b = btn.dataset.bill;
      playBillAcceptorSound();
      btn.classList.add('scale-90');
      setTimeout(() => btn.classList.remove('scale-90'), 150);

      insertedBills[b] = (insertedBills[b] || 0) + 1;
      updateHardwareCashDisplays();
    });
  });

  // Submit Cash Order Button
  document.getElementById('vending-submit-pay-btn').addEventListener('click', () => {
    playBeepSound();
    submitVendingCashOrder();
  });

  // Tear Receipt Click Event (Bấm vào hóa đơn để xé)
  const billEl = document.getElementById('vending-receipt');
  if (billEl) {
    billEl.addEventListener('click', tearReceipt);
  }

  // Collect Change Button Event
  const collectBtn = document.getElementById('collect-change-btn');
  if (collectBtn) {
    collectBtn.addEventListener('click', collectChange);
  }

  // Copy order link button
  const copyBtn = document.getElementById('copy-order-link-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyOrderLink);
  }
}

function openCartModal() {
  playBeepSound();
  renderCartModalItems();
  const modal = document.getElementById('cart-modal');
  modal.classList.remove('hidden');
}

function renderCartModalItems() {
  const container = document.getElementById('cart-modal-items');
  const totalEl = document.getElementById('cart-modal-total');
  if (!container || !totalEl) return;

  if (mobileCart.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">Chưa có món nào trong giỏ hàng</p>';
    totalEl.textContent = '0 VNĐ';
    return;
  }

  let total = 0;
  container.innerHTML = mobileCart
    .map((item, idx) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      return `
      <div class="p-3 bg-gray-50 rounded-xl flex justify-between items-center text-xs border border-gray-200">
        <div>
          <p class="font-bold text-sbk-dark">${item.name}</p>
          <p class="text-[10px] text-gray-500">Size: ${item.size} | Đá: ${item.options.ice} | Đường: ${item.options.sweetness} | x${item.quantity}</p>
          <p class="font-bold text-sbk-green mt-0.5">${itemTotal.toLocaleString('vi-VN')} VNĐ</p>
        </div>
        <button onclick="removeCartItem(${idx})" class="text-red-600 font-bold px-2 py-1 text-xs hover:bg-red-50 rounded cursor-pointer">XÓA</button>
      </div>
    `;
    })
    .join('');

  totalEl.textContent = `${total.toLocaleString('vi-VN')} VNĐ`;
}

function removeCartItem(idx) {
  playBeepSound();
  mobileCart.splice(idx, 1);
  renderCartModalItems();
  updateHardwareCashDisplays();
}

function copyOrderLink() {
  playBeepSound();
  const orderUrl = `${window.location.origin}/order`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(orderUrl)
      .then(showCopyToast)
      .catch(() => fallbackCopy(orderUrl));
  } else {
    fallbackCopy(orderUrl);
  }
}

function showCopyToast() {
  const toast = document.getElementById('toast-notify');
  if (!toast) return;
  toast.classList.remove('opacity-0', 'pointer-events-none');
  toast.classList.add('opacity-100');
  setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0', 'pointer-events-none');
  }, 2500);
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    showCopyToast();
  } catch (e) {
    alert(`Link máy bán hàng: ${text}`);
  }
  document.body.removeChild(ta);
}
