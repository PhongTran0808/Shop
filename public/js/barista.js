let orders = [];

document.addEventListener('DOMContentLoaded', () => {
  setupSocket();
  fetchOrders();
  setupEventListeners();
});

function setupSocket() {
  const socket = io({
    auth: { token: getCookie('sbk_session') }
  });

  socket.on('connect', () => {
    socket.emit('join_room', 'barista_room');
  });

  socket.on('new_order', (newOrder) => {
    orders.unshift(newOrder);
    renderOrders();
    playNotificationSound();
  });

  socket.on('order_status_updated', (data) => {
    const idx = orders.findIndex((o) => o.id === data.id);
    if (idx !== -1) {
      if (data.status === 'COMPLETED') {
        orders.splice(idx, 1);
      } else {
        orders[idx].status = data.status;
      }
      renderOrders();
    }
  });
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

async function fetchOrders() {
  try {
    const res = await fetch('/api/barista/orders');
    orders = await res.json();
    renderOrders();
  } catch (err) {
    console.error('Lỗi nạp đơn hàng Barista:', err);
  }
}

function renderOrders() {
  const container = document.getElementById('orders-grid');
  document.getElementById('order-count-badge').textContent = `${orders.length} Đơn Đang Chờ`;

  if (orders.length === 0) {
    container.innerHTML = '<p class="col-span-full text-center py-12 text-slate-400 font-bold text-sm">Chưa có đơn hàng nào đang chờ pha chế...</p>';
    return;
  }

  container.innerHTML = orders
    .map((o) => `
    <div class="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-3 hover:shadow-md transition">
      <div>
        <div class="flex justify-between items-center pb-2.5 border-b border-gray-100">
          <span class="font-mono font-bold text-lg text-sbk-dark tracking-wide">${o.order_code}</span>
          <span class="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
            o.status === 'IN_PREPARATION' ? 'bg-yellow-400 text-sbk-dark font-bold' : 'bg-red-500 text-white font-bold animate-pulse'
          }">${o.status === 'PENDING_BARISTA' ? 'CHỜ PHA CHẾ' : 'ĐANG PHA CHẾ'}</span>
        </div>

        <div class="my-3 space-y-2">
          ${o.items
            .map(
              (item) => `
            <div class="bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl text-xs space-y-1">
              <p class="font-bold text-slate-800 text-sm leading-snug">${item.name} <span class="text-sbk-green font-semibold">[${item.size}]</span> <span class="text-slate-500 font-medium">x${item.quantity || 1}</span></p>
              <p class="text-xs text-slate-500 font-medium">Đá: ${item.options ? item.options.ice : '100%'} | Đường: ${item.options ? item.options.sweetness : '100%'} | ${item.options ? item.options.milk : 'Sữa tươi'}</p>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="space-y-2 pt-2 border-t border-gray-100">
        ${
          o.status === 'PENDING_BARISTA'
            ? `<button onclick="updateStatus(${o.id}, 'IN_PREPARATION')" class="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-sbk-dark font-bold text-xs uppercase rounded-xl transition shadow-sm">BẮT ĐẦU PHA CHẾ</button>`
            : `<button onclick="updateStatus(${o.id}, 'COMPLETED')" class="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase rounded-xl transition shadow-sm">HOÀN TẤT ĐƠN HÀNG</button>`
        }
      </div>
    </div>
  `)
    .join('');
}

async function updateStatus(orderId, status) {
  try {
    const res = await fetch(`/api/barista/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (!res.ok) alert('Lỗi cập nhật đơn');
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

function setupEventListeners() {
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}
