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
    const modal = document.getElementById('mobile-vietqr-modal');
    modal.classList.add('hidden');
    modal.style.display = 'none';
  });
  document.getElementById('confirm-mobile-vietqr-btn').addEventListener('click', submitMobileVietQROrder);

  document.getElementById('pay-cash-mobile-btn').addEventListener('click', openMobileCash);
  document.getElementById('close-mobile-cash-btn').addEventListener('click', () => {
    const modal = document.getElementById('mobile-cash-modal');
    modal.classList.add('hidden');
    modal.style.display = 'none';
  });

  document.querySelectorAll('.mbill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const b = btn.dataset.bill;
      insertedBills[b] = (insertedBills[b] || 0) + 1;
      updateMobileCashDisplay();
    });
  });

  document.getElementById('submit-mobile-cash-btn').addEventListener('click', submitMobileCashOrder);

  // Copy order link button
  const copyBtn = document.getElementById('copy-order-link-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyOrderLink);
  }

  document.getElementById('finish-mobile-receipt-btn').addEventListener('click', () => {
    const modal = document.getElementById('mobile-receipt-modal');
    modal.classList.add('hidden');
    modal.style.display = 'none';
    mobileCart = [];
    updateMobileCartBar();
  });
}

function copyOrderLink() {
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
    alert(`Link đặt món: ${text}`);
  }
  document.body.removeChild(ta);
}

function updateMobileCartBar() {
  const totalCount = mobileCart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = mobileCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  document.getElementById('mobile-cart-count').textContent = totalCount;
  document.getElementById('mobile-cart-total').textContent = `${totalPrice.toLocaleString('vi-VN')} VNĐ`;
}

function openCartModal() {
  renderMobileCartItems();
  const modal = document.getElementById('cart-modal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function closeCartModal() {
  const modal = document.getElementById('cart-modal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
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

  const modal = document.getElementById('mobile-vietqr-modal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

async function submitMobileVietQROrder() {
  const confirmBtn = document.getElementById('confirm-mobile-vietqr-btn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '⏳ ĐANG XỬ LÝ...';
  }

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
    if (!res.ok) {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '✅ XÁC NHẬN ĐÃ CHUYỂN TIỀN';
      }
      return alert(data.error || 'Lỗi xử lý đơn hàng VietQR');
    }

    const qrModal = document.getElementById('mobile-vietqr-modal');
    qrModal.classList.add('hidden');
    qrModal.style.display = 'none';
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '✅ XÁC NHẬN ĐÃ CHUYỂN TIỀN';
    }
    closeCartModal();
    showMobileReceipt(data);
  } catch (err) {
    console.error('Lỗi thanh toán VietQR Mobile:', err);
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '✅ XÁC NHẬN ĐÃ CHUYỂN TIỀN';
    }
    alert('Lỗi kết nối máy chủ');
  }
}

function openMobileCash() {
  if (mobileCart.length === 0) return alert('Vui lòng chọn món trước khi thanh toán');
  insertedBills = { '1k': 0, '2k': 0, '5k': 0, '10k': 0, '20k': 0, '50k': 0, '100k': 0, '200k': 0, '500k': 0 };
  updateMobileCashDisplay();
  const modal = document.getElementById('mobile-cash-modal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
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

  const submitBtn = document.getElementById('submit-mobile-cash-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="inline-flex items-center gap-2">
        <svg class="animate-spin h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span>ĐANG XỬ LÝ THANH TOÁN...</span>
      </span>
    `;
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
        'X-Idempotency-Key': `mobile_cash_${Date.now()}_${Math.random()}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'XÁC NHẬN THANH TOÁN';
      }
      return alert(data.error || 'Lỗi xử lý đơn hàng tiền mặt');
    }

    const cashModal = document.getElementById('mobile-cash-modal');
    cashModal.classList.add('hidden');
    cashModal.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'XÁC NHẬN THANH TOÁN';
    }
    closeCartModal();
    showMobileReceipt(data);
  } catch (err) {
    console.error('Lỗi thanh toán tiền mặt Mobile:', err);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'XÁC NHẬN THANH TOÁN';
    }
    alert('Lỗi kết nối máy chủ');
  }
}

function showMobileReceipt(data) {
  try {
    activeOrderCode = data.order ? data.order.order_code : '#SBK';
    document.getElementById('mreceipt-order-code').textContent = activeOrderCode;

    let itemsSummary = '';
    if (data.order && data.order.items) {
      const items = typeof data.order.items === 'string' ? JSON.parse(data.order.items) : data.order.items;
      itemsSummary = items.map((i) => `<p>• ${i.name} (Size ${i.size}) x${i.quantity || 1}</p>`).join('');
    }

    const payMethodText = data.paymentMethod === 'VIETQR' ? 'Chuyển khoản VietQR' : 'Tiền mặt Kiosk';
    const totalAmount = data.calculatedTotal || (data.order ? data.order.total_amount : 0);
    const insertedAmount = Number(data.insertedAmount) || totalAmount;
    const changeAmount = Number(data.changeAmount) || 0;

    let cashBreakdownHtml = '';
    if (data.paymentMethod === 'CASH') {
      cashBreakdownHtml = `
        <div class="border-t border-dashed border-gray-300 pt-1.5 mt-1.5 space-y-1 text-xs">
          <div class="flex justify-between items-center text-gray-700">
            <span>Tiền khách đã nạp:</span>
            <span class="font-bold text-gray-900">${insertedAmount.toLocaleString('vi-VN')} VNĐ</span>
          </div>
          <div class="flex justify-between items-center ${changeAmount > 0 ? 'text-amber-800' : 'text-gray-500'}">
            <span class="font-bold">Tiền thối lại cho khách:</span>
            <span class="font-black ${changeAmount > 0 ? 'text-amber-700 text-sm' : 'text-gray-600'}">${changeAmount.toLocaleString('vi-VN')} VNĐ</span>
          </div>
        </div>
      `;
    }

    document.getElementById('mreceipt-details').innerHTML = `
      <div class="mb-1 font-bold text-sbk-green">PHƯƠNG THỨC: ${payMethodText}</div>
      <div class="space-y-1">${itemsSummary}</div>
      <div class="border-t border-gray-200 pt-1.5 mt-1.5 font-bold flex justify-between">
        <span>TỔNG TIỀN:</span>
        <span class="text-sbk-green">${totalAmount.toLocaleString('vi-VN')} VNĐ</span>
      </div>
      ${cashBreakdownHtml}
    `;

    // Handle Mobile Cash Change Box
    const changeBox = document.getElementById('mreceipt-change-box');
    if (changeAmount > 0) {
      if (changeBox) {
        changeBox.style.display = 'block';
      }
      const changeTotalEl = document.getElementById('mreceipt-change-total');
      if (changeTotalEl) {
        changeTotalEl.textContent = `${changeAmount.toLocaleString('vi-VN')} VNĐ`;
      }

      const bills = data.changeBills || {};
      const activeKeys = Object.keys(bills).filter((k) => bills[k] > 0);
      const billsFormatted = activeKeys.length > 0
        ? activeKeys
            .map((k) => `
              <div class="bg-yellow-100/90 border border-yellow-300 px-2 py-1 rounded-lg font-bold text-yellow-950 flex items-center justify-between text-xs">
                <span>• Tờ ${k}:</span>
                <span class="bg-amber-600 text-white px-1.5 py-0.5 rounded text-[11px] font-black">${bills[k]} tờ</span>
              </div>
            `)
            .join('')
        : `<div class="col-span-2 text-xs text-amber-900 italic">Đã xuất ${changeAmount.toLocaleString('vi-VN')} VNĐ tại khay tiền</div>`;

      const billsEl = document.getElementById('mreceipt-change-bills');
      if (billsEl) {
        billsEl.innerHTML = billsFormatted;
      }
    } else {
      if (changeBox) {
        changeBox.style.display = 'none';
      }
    }

    document.getElementById('mreceipt-status-text').textContent = 'Đang chờ Barista tiếp nhận...';
    document.getElementById('mreceipt-status-text').className = 'font-bold text-sbk-green text-xs mt-0.5';

    const modal = document.getElementById('mobile-receipt-modal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  } catch (err) {
    console.error('Lỗi hiển thị biên lai mobile:', err);
    const modal = document.getElementById('mobile-receipt-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  }
}