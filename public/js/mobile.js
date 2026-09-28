let menuData = [];
let selectedCategory = 'TẤT CẢ';
let activeProduct = null;
let selectedSize = 'Grande';
let selectedIce = '100%';
let selectedSweetness = '50%';
let selectedMilk = 'Sữa tươi nguyên kem';
let customQty = 1;
let mobileCart = [];
let insertedBills = { '1k': 0, '2k': 0, '5k': 0, '10k': 0, '20k': 0, '50k': 0, '100k': 0, '200k': 0, '500k': 0 };
let activeOrderCode = null;

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
  if (typeof io === 'undefined') {
    console.warn('Socket.IO not available in this environment');
    return;
  }
  try {
    const socket = io({ transports: ['polling', 'websocket'], timeout: 3000 });

    socket.on('connect', () => {
      socket.emit('join_room', 'kiosk_room');
    });

    socket.on('order_status_updated', (data) => {
      if (activeOrderCode && data && data.orderCode === activeOrderCode) {
        const statusText = document.getElementById('mreceipt-status-text');
        if (statusText) {
          if (data.status === 'PROCESSING') {
            statusText.textContent = 'Barista đang pha chế thức uống của bạn...';
            statusText.className = 'font-bold text-amber-600 text-xs mt-0.5 animate-pulse';
          } else if (data.status === 'COMPLETED') {
            statusText.textContent = 'ĐƠN HÀNG ĐÃ PHA CHẾ HOÀN TẤT! VUI LÒNG NHẬN NƯỚC';
            statusText.className = 'font-bold text-green-600 text-xs mt-0.5';
          }
        }
      }
    });
  } catch (err) {
    console.warn('Socket connect failed:', err);
  }
}

async function fetchMobileMenu() {
  try {
    const res = await fetch('/api/kiosk/menu');
    menuData = await res.json();
    renderCategoryPillBar();
    renderMobileDrinkList();
  } catch (err) {
    console.error('Lỗi nạp menu mobile:', err);
  }
}

function renderCategoryPillBar() {
  const container = document.getElementById('mobile-category-bar');
  if (!container) return;

  const categories = ['TẤT CẢ', ...new Set(menuData.map((p) => p.category))];

  container.innerHTML = categories
    .map((cat) => {
      const isSelected = cat === selectedCategory;
      return `
        <button class="mcat-btn px-3 py-1 rounded-full whitespace-nowrap transition border ${
          isSelected
            ? 'bg-sbk-green text-white border-sbk-green shadow-xs'
            : 'bg-gray-100 text-gray-700 border-gray-200 hover:border-sbk-green hover:text-sbk-green'
        }" data-cat="${cat}">${cat}</button>
      `;
    })
    .join('');

  document.querySelectorAll('.mcat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCategory = btn.dataset.cat;
      renderCategoryPillBar();
      renderMobileDrinkList();
    });
  });
}

function renderMobileDrinkList() {
  const container = document.getElementById('mobile-drink-list');
  const countBadge = document.getElementById('mobile-menu-badge');

  const filtered = selectedCategory === 'TẤT CẢ' ? menuData : menuData.filter((p) => p.category === selectedCategory);
  if (countBadge) countBadge.textContent = `${filtered.length} MÓN`;

  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 text-center py-8">Không có món nào trong danh mục này</p>';
    return;
  }

  container.innerHTML = filtered
    .map(
      (p) => `
    <div class="p-3 bg-white rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between gap-3 group active:scale-[0.99] transition">
      <div class="min-w-0 flex-1">
        <span class="text-[9px] font-bold text-sbk-green uppercase bg-green-100 px-2 py-0.5 rounded inline-block mb-1">${p.category}</span>
        <h3 class="font-bold text-xs text-sbk-dark group-hover:text-sbk-green leading-snug line-clamp-2">${p.name}</h3>
        <p class="text-xs font-bold text-sbk-green mt-1">${p.base_price.toLocaleString('vi-VN')} VNĐ</p>
      </div>

      <button class="open-custom-btn px-3 py-2 bg-sbk-green text-white text-xs font-bold uppercase rounded-full shadow hover:bg-[#004225] shrink-0" data-id="${p.id}">
        CHỌN MÓN
      </button>
    </div>
  `
    )
    .join('');

  document.querySelectorAll('.open-custom-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      openCustomizerModal(id);
    });
  });
}

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
    <button class="msize-btn py-2 rounded-xl border text-xs font-bold transition ${
      selectedSize === sz ? 'bg-sbk-green text-white border-sbk-green' : 'bg-gray-50 text-sbk-dark border-gray-200'
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
    <button class="mice-btn py-2 rounded-xl border text-xs font-bold transition ${
      selectedIce === ic ? 'bg-sbk-green text-white border-sbk-green' : 'bg-gray-50 text-sbk-dark border-gray-200'
    }" data-ice="${ic}">${ic}</button>
  `
    )
    .join('');

  // Sweetness
  const sweetContainer = document.getElementById('custom-sweet-options');
  sweetContainer.innerHTML = activeProduct.options.sweetness
    .map(
      (sw) => `
    <button class="msweet-btn py-2 rounded-xl border text-xs font-bold transition ${
      selectedSweetness === sw ? 'bg-sbk-green text-white border-sbk-green' : 'bg-gray-50 text-sbk-dark border-gray-200'
    }" data-sweet="${sw}">${sw}</button>
  `
    )
    .join('');

  // Milk
  const milkContainer = document.getElementById('custom-milk-options');
  milkContainer.innerHTML = activeProduct.options.milk
    .map(
      (m) => `
    <button class="mmilk-btn py-2 px-1 rounded-xl border text-[11px] font-bold transition ${
      selectedMilk === m.name ? 'bg-sbk-green text-white border-sbk-green' : 'bg-gray-50 text-sbk-dark border-gray-200'
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
      selectedSize = b.dataset.size;
      renderCustomizerOptions();
    });
  });
  document.querySelectorAll('.mice-btn').forEach((b) => {
    b.addEventListener('click', () => {
      selectedIce = b.dataset.ice;
      renderCustomizerOptions();
    });
  });
  document.querySelectorAll('.msweet-btn').forEach((b) => {
    b.addEventListener('click', () => {
      selectedSweetness = b.dataset.sweet;
      renderCustomizerOptions();
    });
  });
  document.querySelectorAll('.mmilk-btn').forEach((b) => {
    b.addEventListener('click', () => {
      selectedMilk = b.dataset.milk;
      renderCustomizerOptions();
    });
  });
}

function setupEventListeners() {
  // Steppers
  document.getElementById('qty-minus').addEventListener('click', () => {
    if (customQty > 1) {
      customQty--;
      renderCustomizerOptions();
    }
  });

  document.getElementById('qty-plus').addEventListener('click', () => {
    customQty++;
    renderCustomizerOptions();
  });

  document.getElementById('close-custom-btn').addEventListener('click', () => {
    document.getElementById('customizer-modal').classList.add('hidden');
  });

  // Confirm add to cart
  document.getElementById('confirm-add-cart-btn').addEventListener('click', () => {
    if (!activeProduct) return;
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
    updateMobileCartBar();
  });

  // Open cart modal
  document.getElementById('open-cart-btn').addEventListener('click', openCartModal);
  document.getElementById('close-cart-modal-btn').addEventListener('click', closeCartModal);

  // Payment Buttons
  document.getElementById('pay-vietqr-mobile-btn').addEventListener('click', openMobileVietQR);
  document.getElementById('close-mobile-vietqr-btn').addEventListener('click', () => {
    document.getElementById('mobile-vietqr-modal').classList.add('hidden');
  });
  document.getElementById('confirm-mobile-vietqr-btn').addEventListener('click', submitMobileVietQROrder);

  document.getElementById('pay-cash-mobile-btn').addEventListener('click', openMobileCash);
  document.getElementById('close-mobile-cash-btn').addEventListener('click', () => {
    document.getElementById('mobile-cash-modal').classList.add('hidden');
  });

  document.querySelectorAll('.mbill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const b = btn.dataset.bill;
      insertedBills[b] = (insertedBills[b] || 0) + 1;
      updateMobileCashDisplay();
    });
  });

  document.getElementById('submit-mobile-cash-btn').addEventListener('click', submitMobileCashOrder);

  document.getElementById('finish-mobile-receipt-btn').addEventListener('click', () => {
    document.getElementById('mobile-receipt-modal').classList.add('hidden');
    mobileCart = [];
    updateMobileCartBar();
  });
}

function updateMobileCartBar() {
  const totalCount = mobileCart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = mobileCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  document.getElementById('mobile-cart-count').textContent = totalCount;
  document.getElementById('mobile-cart-total').textContent = `${totalPrice.toLocaleString('vi-VN')} VNĐ`;
}

function openCartModal() {
  renderMobileCartItems();
  document.getElementById('cart-modal').classList.remove('hidden');
}

function closeCartModal() {
  document.getElementById('cart-modal').classList.add('hidden');
}

function renderMobileCartItems() {
  const container = document.getElementById('cart-modal-items');
  const totalEl = document.getElementById('cart-modal-total');

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
        <button onclick="removeMobileItem(${idx})" class="text-red-600 font-bold px-2 py-1 text-xs hover:bg-red-50 rounded">XÓA</button>
      </div>
    `;
    })
    .join('');

  totalEl.textContent = `${total.toLocaleString('vi-VN')} VNĐ`;
}

function removeMobileItem(idx) {
  mobileCart.splice(idx, 1);
  renderMobileCartItems();
  updateMobileCartBar();
}

function openMobileVietQR() {
  if (mobileCart.length === 0) return alert('Vui lòng chọn món trước khi thanh toán');

  const cartTotal = mobileCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.getElementById('mobile-vietqr-total').textContent = `${cartTotal.toLocaleString('vi-VN')} VNĐ`;

  const canvas = document.getElementById('mobile-vietqr-canvas');
  const qrString = `00020101021238570010A0000007270127000697042201130900112233440208QRIBFTTA5303704540${cartTotal}5802VN62150811STARBUCKS6304`;
  QRCode.toCanvas(canvas, qrString, { width: 140, margin: 1 });

  document.getElementById('mobile-vietqr-modal').classList.remove('hidden');
}

async function submitMobileVietQROrder() {
  const payload = {
    items: mobileCart,
    paymentMethod: 'VIETQR'
  };

  try {
    const res = await fetch('/api/kiosk/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `mobile_qr_${Date.now()}_${Math.random()}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Lỗi xử lý đơn hàng VietQR');

    document.getElementById('mobile-vietqr-modal').classList.add('hidden');
    closeCartModal();
    showMobileReceipt(data);
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

function openMobileCash() {
  if (mobileCart.length === 0) return alert('Vui lòng chọn món trước khi thanh toán');
  insertedBills = { '1k': 0, '2k': 0, '5k': 0, '10k': 0, '20k': 0, '50k': 0, '100k': 0, '200k': 0, '500k': 0 };
  updateMobileCashDisplay();
  document.getElementById('mobile-cash-modal').classList.remove('hidden');
}

function updateMobileCashDisplay() {
  const cartTotal = mobileCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
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

  const changeTotal = Math.max(0, insertedTotal - cartTotal);

  document.getElementById('mcash-order-total').textContent = `${cartTotal.toLocaleString('vi-VN')} VNĐ`;
  document.getElementById('mcash-inserted').textContent = `${insertedTotal.toLocaleString('vi-VN')} VNĐ`;
  document.getElementById('mcash-change').textContent = `${changeTotal.toLocaleString('vi-VN')} VNĐ`;
}

async function submitMobileCashOrder() {
  const cartTotal = mobileCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
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

  if (insertedTotal < cartTotal) {
    return alert(`Số tiền nạp chưa đủ. Còn thiếu ${(cartTotal - insertedTotal).toLocaleString('vi-VN')} VNĐ`);
  }

  const payload = {
    items: mobileCart,
    cashInsertedBills: insertedBills,
    paymentMethod: 'CASH'
  };

  try {
    const res = await fetch('/api/kiosk/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `mobile_cash_${Date.now()}_${Math.random()}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Lỗi xử lý đơn hàng tiền mặt');

    document.getElementById('mobile-cash-modal').classList.add('hidden');
    closeCartModal();
    showMobileReceipt(data);
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

function showMobileReceipt(data) {
  activeOrderCode = data.order.order_code;
  document.getElementById('mreceipt-order-code').textContent = activeOrderCode;

  let itemsSummary = '';
  if (data.order && data.order.items) {
    const items = typeof data.order.items === 'string' ? JSON.parse(data.order.items) : data.order.items;
    itemsSummary = items.map((i) => `<p>• ${i.name} (Size ${i.size}) x${i.quantity || 1}</p>`).join('');
  }

  const payMethodText = data.paymentMethod === 'VIETQR' ? 'Chuyển khoản VietQR' : 'Tiền mặt Kiosk';

  document.getElementById('mreceipt-details').innerHTML = `
    <div class="mb-1 font-bold text-sbk-green">PHƯƠNG THỨC: ${payMethodText}</div>
    ${itemsSummary}
    <div class="border-t border-gray-200 pt-1.5 mt-1.5 font-bold flex justify-between">
      <span>TỔNG TIỀN:</span>
      <span class="text-sbk-green">${data.calculatedTotal.toLocaleString('vi-VN')} VNĐ</span>
    </div>
  `;

  document.getElementById('mreceipt-status-text').textContent = 'Đang chờ Barista tiếp nhận...';
  document.getElementById('mreceipt-status-text').className = 'font-bold text-sbk-green text-xs mt-0.5';

  document.getElementById('mobile-receipt-modal').classList.remove('hidden');
}