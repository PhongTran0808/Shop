let menuData = [];
let activeProduct = null;
let selectedSize = 'Grande';
let selectedIce = '100%';
let selectedSweetness = '50%';
let selectedMilk = 'Sữa tươi nguyên kem';
let cart = [];

let insertedBills = { '10k': 0, '20k': 0, '50k': 0, '100k': 0, '200k': 0, '500k': 0 };

document.addEventListener('DOMContentLoaded', () => {
  fetchMenu();
  setupEventListeners();
});

let selectedCategory = 'TẤT CẢ';

async function fetchMenu() {
  try {
    const res = await fetch('/api/kiosk/menu');
    menuData = await res.json();
    renderCategoryFilterBar();
    renderFullMenu();
    if (menuData.length > 0) {
      selectProduct(menuData[0].id);
    }
  } catch (err) {
    console.error('Lỗi nạp danh mục menu:', err);
  }
}

function renderCategoryFilterBar() {
  const filterBar = document.getElementById('category-filter-bar');
  if (!filterBar) return;

  const categories = ['TẤT CẢ', ...new Set(menuData.map((p) => p.category))];

  filterBar.innerHTML = categories
    .map((cat) => {
      const isSelected = cat === selectedCategory;
      return `
        <button class="cat-filter-btn px-2.5 py-1 rounded-full whitespace-nowrap transition border ${
          isSelected
            ? 'bg-sbk-green text-white border-sbk-green shadow-xs'
            : 'bg-white text-gray-600 border-gray-200 hover:border-sbk-green hover:text-sbk-green'
        }" data-cat="${cat}">${cat}</button>
      `;
    })
    .join('');

  document.querySelectorAll('.cat-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCategory = btn.dataset.cat;
      renderCategoryFilterBar();
      renderFullMenu();
    });
  });
}

function renderFullMenu() {
  const container = document.getElementById('full-menu-list');
  const countBadge = document.getElementById('menu-count-badge');

  const filteredData =
    selectedCategory === 'TẤT CẢ' ? menuData : menuData.filter((p) => p.category === selectedCategory);

  if (countBadge) countBadge.textContent = `${filteredData.length} MÓN`;

  if (!container) return;
  const currentScroll = container.scrollTop;

  if (filteredData.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 text-center py-8">Không có món nào trong danh mục này</p>';
    return;
  }

  container.innerHTML = filteredData
    .map(
      (p) => `
    <button class="drink-item-btn w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between group ${
      activeProduct && activeProduct.id === p.id
        ? 'bg-green-50 border-sbk-green shadow-sm ring-1 ring-sbk-green'
        : 'bg-white border-gray-200 hover:border-sbk-green hover:bg-gray-50'
    }" data-id="${p.id}">
      <div class="pr-2 min-w-0 flex-1">
        <span class="text-[9px] font-bold text-sbk-green uppercase bg-green-100 px-1.5 py-0.5 rounded inline-block mb-1">${p.category}</span>
        <p class="font-bold text-xs text-sbk-dark group-hover:text-sbk-green transition leading-snug line-clamp-2">${p.name}</p>
        <p class="text-[11px] font-bold text-sbk-green mt-1">${p.base_price.toLocaleString('vi-VN')} VNĐ</p>
      </div>
      <span class="badge-btn text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shrink-0 ${
        activeProduct && activeProduct.id === p.id
          ? 'bg-sbk-green text-white'
          : 'bg-sbk-light text-sbk-dark group-hover:bg-sbk-green group-hover:text-white transition'
      }">CHỌN</span>
    </button>
  `
    )
    .join('');

  container.scrollTop = currentScroll;

  document.querySelectorAll('.drink-item-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      selectProduct(id);
    });
  });
}

function updateMenuSelection(selectedId) {
  document.querySelectorAll('.drink-item-btn').forEach((btn) => {
    const id = parseInt(btn.dataset.id, 10);
    const isSelected = id === selectedId;
    const badge = btn.querySelector('.badge-btn');
    if (isSelected) {
      btn.className = 'drink-item-btn w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between group bg-green-50 border-sbk-green shadow-sm ring-1 ring-sbk-green';
      if (badge) badge.className = 'badge-btn text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shrink-0 bg-sbk-green text-white';
    } else {
      btn.className = 'drink-item-btn w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between group bg-white border-gray-200 hover:border-sbk-green hover:bg-gray-50';
      if (badge) badge.className = 'badge-btn text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shrink-0 bg-sbk-light text-sbk-dark group-hover:bg-sbk-green group-hover:text-white transition';
    }
  });
}

function selectProduct(id) {
  activeProduct = menuData.find((p) => p.id === id);
  if (!activeProduct) return;

  selectedSize = 'Grande';
  selectedIce = '100%';
  selectedSweetness = '50%';
  selectedMilk = activeProduct.options.milk ? activeProduct.options.milk[0].name : 'Sữa tươi nguyên kem';

  updateMenuSelection(id);
  renderProductDetail();
}

function formatSizeDisplay(size) {
  if (!size) return '';
  if (size.includes('(')) return size;
  const map = {
    'Tall': 'Tall (Nhỏ)',
    'Grande': 'Grande (Vừa)',
    'Venti': 'Venti (Lớn)'
  };
  return map[size] || size;
}

function renderProductDetail() {
  const container = document.getElementById('product-detail-container');
  if (!activeProduct) return;

  container.innerHTML = `
    <div class="border-b border-gray-100 pb-3">
      <span class="text-[10px] font-bold bg-sbk-green text-white px-2.5 py-0.5 rounded-full uppercase">${activeProduct.category}</span>
      <h2 class="text-base font-bold text-sbk-dark uppercase mt-1.5 leading-snug">${activeProduct.name}</h2>
      <p class="text-xs text-sbk-green font-bold mt-0.5">Giá tiêu chuẩn: ${activeProduct.base_price.toLocaleString('vi-VN')} VNĐ</p>
    </div>

    <!-- Size Customizer -->
    <div class="space-y-1">
      <label class="text-[11px] font-bold text-gray-500"><span class="uppercase">SIZE</span> <span class="normal-case text-gray-400">(Chọn Kích Cỡ):</span></label>
      <div class="grid grid-cols-3 gap-2">
        ${Object.keys(activeProduct.sizes)
          .map(
            (size) => {
              const label = formatSizeDisplay(size);
              const extraPrice = activeProduct.sizes[size] > 0 ? `(+${activeProduct.sizes[size] / 1000}k)` : '';
              const isSelected = selectedSize === size || selectedSize.startsWith(size);
              return `
              <button class="size-btn py-2 px-1 rounded-lg border text-xs font-bold transition flex flex-col items-center justify-center leading-tight ${
                isSelected ? 'bg-sbk-green text-white border-sbk-green shadow-sm' : 'bg-white text-sbk-dark border-gray-300 hover:border-sbk-green'
              }" data-size="${size}">
                <span>${label}</span>
                ${extraPrice ? `<span class="text-[10px] opacity-90 mt-0.5">${extraPrice}</span>` : ''}
              </button>
            `;
            }
          )
          .join('')}
      </div>
    </div>

    <!-- Ice Customizer -->
    <div class="space-y-1">
      <label class="text-[11px] font-bold text-gray-500"><span class="uppercase">ICE LEVEL</span> <span class="normal-case text-gray-400">(Chọn Lượng Đá):</span></label>
      <div class="grid grid-cols-3 gap-2">
        ${activeProduct.options.ice
          .map(
            (ice) => `
          <button class="ice-btn py-2 rounded-lg border text-xs font-bold transition ${
            selectedIce === ice ? 'bg-sbk-green text-white border-sbk-green' : 'bg-white text-sbk-dark border-gray-300'
          }" data-ice="${ice}">${ice}</button>
        `
          )
          .join('')}
      </div>
    </div>

    <!-- Sweetness Customizer -->
    <div class="space-y-1">
      <label class="text-[11px] font-bold text-gray-500"><span class="uppercase">SWEETNESS</span> <span class="normal-case text-gray-400">(Lượng Đường / Độ Ngọt):</span></label>
      <div class="grid grid-cols-3 gap-2">
        ${activeProduct.options.sweetness
          .map(
            (sweet) => `
          <button class="sweet-btn py-2 rounded-lg border text-xs font-bold transition ${
            selectedSweetness === sweet ? 'bg-sbk-green text-white border-sbk-green' : 'bg-white text-sbk-dark border-gray-300'
          }" data-sweet="${sweet}">${sweet}</button>
        `
          )
          .join('')}
      </div>
    </div>

    <!-- Milk Customizer -->
    <div class="space-y-1">
      <label class="text-[11px] font-bold text-gray-500"><span class="uppercase">MILK OPTION</span> <span class="normal-case text-gray-400">(Tùy Chọn Loại Sữa):</span></label>
      <div class="grid grid-cols-3 gap-2">
        ${activeProduct.options.milk
          .map(
            (m) => `
          <button class="milk-btn py-2 px-1 rounded-lg border text-[11px] font-bold transition ${
            selectedMilk === m.name ? 'bg-sbk-green text-white border-sbk-green' : 'bg-white text-sbk-dark border-gray-300'
          }" data-milk="${m.name}">
            ${m.name} ${m.price > 0 ? `(+${m.price / 1000}k)` : ''}
          </button>
        `
          )
          .join('')}
      </div>
    </div>
  `;

  updateAddButtonPrice();
  bindCustomizerEvents();
}

function bindCustomizerEvents() {
  document.querySelectorAll('.size-btn').forEach((b) => {
    b.addEventListener('click', () => {
      selectedSize = b.dataset.size;
      renderProductDetail();
    });
  });
  document.querySelectorAll('.ice-btn').forEach((b) => {
    b.addEventListener('click', () => {
      selectedIce = b.dataset.ice;
      renderProductDetail();
    });
  });
  document.querySelectorAll('.sweet-btn').forEach((b) => {
    b.addEventListener('click', () => {
      selectedSweetness = b.dataset.sweet;
      renderProductDetail();
    });
  });
  document.querySelectorAll('.milk-btn').forEach((b) => {
    b.addEventListener('click', () => {
      selectedMilk = b.dataset.milk;
      renderProductDetail();
    });
  });
}

function calculateItemPrice() {
  if (!activeProduct) return 0;
  let total = activeProduct.base_price;
  const baseSize = selectedSize ? selectedSize.split(' ')[0] : 'Grande';
  total += activeProduct.sizes[selectedSize] ?? activeProduct.sizes[baseSize] ?? 0;
  const milkOpt = activeProduct.options.milk.find((m) => m.name === selectedMilk);
  if (milkOpt) total += milkOpt.price;
  return total;
}

function updateAddButtonPrice() {
  const price = calculateItemPrice();
  document.getElementById('add-btn-price').textContent = price.toLocaleString('vi-VN');
}

function setupEventListeners() {
  document.getElementById('add-to-cart-btn').addEventListener('click', () => {
    if (!activeProduct) return;
    const item = {
      product_id: activeProduct.id,
      name: activeProduct.name,
      size: formatSizeDisplay(selectedSize),
      options: { ice: selectedIce, sweetness: selectedSweetness, milk: selectedMilk },
      price: calculateItemPrice(),
      quantity: 1
    };
    cart.push(item);
    renderCart();
  });

  // Cash payment button
  document.getElementById('cash-pay-btn').addEventListener('click', () => {
    if (cart.length === 0) return alert('Vui lòng chọn ít nhất 1 món vào đơn hàng!');
    openCashModal();
  });

  // VietQR payment button
  document.getElementById('vietqr-pay-btn').addEventListener('click', () => {
    if (cart.length === 0) return alert('Vui lòng chọn ít nhất 1 món vào đơn hàng!');
    openVietQRModal();
  });

  // Cash modal buttons
  document.getElementById('close-modal-btn').addEventListener('click', closeCashModal);
  document.getElementById('reset-cash-btn').addEventListener('click', () => {
    insertedBills = { '10k': 0, '20k': 0, '50k': 0, '100k': 0, '200k': 0, '500k': 0 };
    updateCashModalDisplay();
  });

  document.querySelectorAll('.bill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bill = btn.dataset.bill;
      insertedBills[bill] = (insertedBills[bill] || 0) + 1;
      updateCashModalDisplay();
    });
  });

  document.getElementById('submit-cash-order-btn').addEventListener('click', submitCashOrder);

  // VietQR modal buttons
  document.getElementById('close-vietqr-btn').addEventListener('click', closeVietQRModal);
  document.getElementById('confirm-vietqr-btn').addEventListener('click', confirmVietQROrder);

  // Receipt modal finish button
  document.getElementById('finish-receipt-btn').addEventListener('click', () => {
    document.getElementById('receipt-modal').classList.add('hidden');
    const slot = document.getElementById('visual-dispenser-slot');
    const sensorText = document.getElementById('sensor-text');
    if (slot) slot.classList.add('hidden');
    if (sensorText) sensorText.textContent = 'CẢM BIẾN KIOSK: SẴN SÀNG NHẬN TIỀN & THỐI TIỀN LẺ';
    cart = [];
    renderCart();
  });
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');

  if (cart.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 text-center py-8">Chưa có món nào trong đơn hàng</p>';
    totalEl.textContent = '0 VNĐ';
    return;
  }

  let total = 0;
  container.innerHTML = cart
    .map((item, idx) => {
      total += item.price * item.quantity;
      return `
      <div class="p-3 bg-sbk-light rounded-xl flex justify-between items-center text-xs border border-gray-100">
        <div>
          <p class="font-bold text-sbk-dark leading-snug">${item.name}</p>
          <p class="text-[10px] text-gray-500 font-medium">Size: <span class="font-bold text-sbk-green">${item.size}</span> | Đá: ${item.options.ice} | Đường: ${item.options.sweetness} | Sữa: ${item.options.milk}</p>
          <p class="font-bold text-sbk-green mt-0.5">${item.price.toLocaleString('vi-VN')} VNĐ</p>
        </div>
        <button onclick="removeItem(${idx})" class="text-red-600 font-bold px-2 py-1 text-xs hover:bg-red-50 rounded">XÓA</button>
      </div>
    `;
    })
    .join('');

  totalEl.textContent = `${total.toLocaleString('vi-VN')} VNĐ`;
}

function removeItem(idx) {
  cart.splice(idx, 1);
  renderCart();
}

function openCashModal() {
  insertedBills = { '10k': 0, '20k': 0, '50k': 0, '100k': 0, '200k': 0, '500k': 0 };
  updateCashModalDisplay();
  document.getElementById('cash-modal').classList.remove('hidden');
}

function closeCashModal() {
  document.getElementById('cash-modal').classList.add('hidden');
}

function calculateInsertedTotal() {
  return (
    (insertedBills['10k'] || 0) * 10000 +
    (insertedBills['20k'] || 0) * 20000 +
    (insertedBills['50k'] || 0) * 50000 +
    (insertedBills['100k'] || 0) * 100000 +
    (insertedBills['200k'] || 0) * 200000 +
    (insertedBills['500k'] || 0) * 500000
  );
}

function updateCashModalDisplay() {
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
  const insertedTotal = calculateInsertedTotal();
  const changeTotal = Math.max(0, insertedTotal - cartTotal);

  document.getElementById('modal-order-total').textContent = `${cartTotal.toLocaleString('vi-VN')} VNĐ`;
  document.getElementById('modal-cash-inserted').textContent = `${insertedTotal.toLocaleString('vi-VN')} VNĐ`;
  document.getElementById('modal-cash-change').textContent = `${changeTotal.toLocaleString('vi-VN')} VNĐ`;

  document.getElementById('cash-inserted-display').textContent = `${insertedTotal.toLocaleString('vi-VN')} VNĐ`;
}

async function submitCashOrder() {
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
  const insertedTotal = calculateInsertedTotal();

  if (insertedTotal < cartTotal) {
    return alert(`Số tiền nạp chưa đủ. Còn thiếu ${(cartTotal - insertedTotal).toLocaleString('vi-VN')} VNĐ`);
  }

  const payload = {
    items: cart,
    cashInsertedBills: insertedBills,
    paymentMethod: 'CASH'
  };

  try {
    const res = await fetch('/api/kiosk/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `kiosk_${Date.now()}_${Math.random()}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Lỗi xử lý đơn hàng');

    closeCashModal();
    showReceiptModal(data);
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

function openVietQRModal() {
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
  document.getElementById('vietqr-total-display').textContent = `${cartTotal.toLocaleString('vi-VN')} VNĐ`;

  // Dùng VietQR API chuẩn — quét được trực tiếp bằng app ngân hàng
  const bankId = '970436';       // BIN Vietcombank
  const accountNo = '1047881500';
  const addInfo = encodeURIComponent(`Thanh toan Starbucks ${cartTotal}VND`);
  const accountName = encodeURIComponent('STARBUCKS STORE LOCAL');
  const vietqrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${cartTotal}&addInfo=${addInfo}&accountName=${accountName}`;

  const img = document.getElementById('vietqr-img');
  img.src = '';
  img.alt = 'Đang tải mã QR...';
  img.src = vietqrUrl;
  img.onerror = () => { img.alt = 'Không tải được QR. Vui lòng nhập STK thủ công.'; };

  document.getElementById('vietqr-modal').classList.remove('hidden');
}

function closeVietQRModal() {
  document.getElementById('vietqr-modal').classList.add('hidden');
}

async function confirmVietQROrder() {
  const payload = {
    items: cart,
    paymentMethod: 'VIETQR'
  };

  try {
    const res = await fetch('/api/kiosk/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `kiosk_qr_${Date.now()}_${Math.random()}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Lỗi xử lý đơn hàng VietQR');

    closeVietQRModal();
    showReceiptModal(data);
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

function showReceiptModal(data) {
  document.getElementById('receipt-order-code').textContent = data.order.order_code;

  let itemsSummary = '';
  if (data.order && data.order.items) {
    const items = typeof data.order.items === 'string' ? JSON.parse(data.order.items) : data.order.items;
    itemsSummary = items.map((i) => `<p>• ${i.name} [Size: ${i.size}] x${i.quantity || 1}</p>`).join('');
  }

  const payMethodText = data.paymentMethod === 'VIETQR' ? 'Chuyển khoản VietQR' : 'Tiền mặt Kiosk';

  document.getElementById('receipt-details').innerHTML = `
    <div class="mb-2 font-bold text-sbk-green">PHƯƠNG THỨC: ${payMethodText}</div>
    ${itemsSummary}
    <div class="border-t border-gray-200 pt-2 mt-2 font-bold flex justify-between">
      <span>TỔNG TIỀN:</span>
      <span class="text-sbk-green">${data.calculatedTotal.toLocaleString('vi-VN')} VNĐ</span>
    </div>
  `;

  // Handle cash change dispenser UI box & visual animation
  const changeBox = document.getElementById('receipt-change-box');
  const hardwareChangeDisplay = document.getElementById('cash-change-display');

  if (data.changeAmount > 0) {
    changeBox.classList.remove('hidden');
    document.getElementById('receipt-change-total').textContent = `Thối lại: ${data.changeAmount.toLocaleString('vi-VN')} VNĐ`;

    const bills = data.changeBills || {};
    const billsFormatted = Object.keys(bills)
      .filter((k) => bills[k] > 0)
      .map((k) => `<span>• Tờ ${k}: <strong>${bills[k]} tờ</strong></span>`)
      .join('');

    document.getElementById('receipt-change-bills').innerHTML = billsFormatted || '<span>Nhả tiền mặt lẻ tại khay</span>';
    if (hardwareChangeDisplay) {
      hardwareChangeDisplay.textContent = `${data.changeAmount.toLocaleString('vi-VN')} VNĐ`;
    }

    animateCashDispense(data.changeBills, data.changeAmount);
  } else {
    changeBox.classList.add('hidden');
    if (hardwareChangeDisplay) {
      hardwareChangeDisplay.textContent = '0 VNĐ';
    }
    const slot = document.getElementById('visual-dispenser-slot');
    if (slot) slot.classList.add('hidden');
  }

  document.getElementById('receipt-modal').classList.remove('hidden');
}

function animateCashDispense(changeBills, changeAmount) {
  const slot = document.getElementById('visual-dispenser-slot');
  const billsContainer = document.getElementById('visual-dispensed-bills');
  const sensorText = document.getElementById('sensor-text');

  if (!slot || !billsContainer) return;

  if (!changeBills || changeAmount <= 0) {
    slot.classList.add('hidden');
    return;
  }

  slot.classList.remove('hidden');
  slot.classList.add('tray-dispensing-glow');
  billsContainer.innerHTML = '';
  if (sensorText) sensorText.textContent = `KHAY THỐI TIỀN LẺ: ĐANG ĐÙN TIỀN THỪA (${changeAmount.toLocaleString('vi-VN')} VNĐ)...`;

  const billColors = {
    '500k': 'bg-cyan-900 text-cyan-200 border-cyan-400',
    '200k': 'bg-yellow-900 text-yellow-200 border-yellow-400',
    '100k': 'bg-green-900 text-green-200 border-green-400',
    '50k': 'bg-red-900 text-red-200 border-red-400',
    '20k': 'bg-blue-900 text-blue-200 border-blue-400',
    '10k': 'bg-indigo-900 text-indigo-200 border-indigo-400',
    '5k': 'bg-amber-900 text-amber-200 border-amber-400'
  };

  let delay = 0;
  Object.keys(changeBills).forEach((denom) => {
    const count = changeBills[denom];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const badge = document.createElement('div');
        const colorClass = billColors[denom] || 'bg-gray-800 text-white border-gray-400';
        badge.className = `animate-bill-dispense px-2 py-0.5 rounded text-[10px] font-mono font-bold border shadow-md flex items-center gap-1 shrink-0 ${colorClass}`;
        badge.innerHTML = `<span>${denom.toUpperCase()}</span>`;
        billsContainer.appendChild(badge);
      }, delay);
      delay += 250;
    }
  });

  setTimeout(() => {
    slot.classList.remove('tray-dispensing-glow');
    if (sensorText) sensorText.textContent = 'CẢM BIẾN KIOSK: ĐÃ HOÀN TẤT THỐI TIỀN MẶT LẺ';
  }, delay + 500);
}
