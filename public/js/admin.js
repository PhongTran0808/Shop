let revenueChartInstance = null;
let paymentChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  fetchCashboxData();
  fetchAuditLogs();
  initCharts();
  setupEventListeners();
  try {
    setupSocket();
  } catch (err) {
    console.warn('Socket setup error:', err);
  }
  // Auto-refresh admin data every 5s on Vercel
  setInterval(() => {
    fetchCashboxData();
    fetchAuditLogs();
  }, 5000);
});

function setupSocket() {
  if (typeof io === 'undefined') return;
  try {
    const socket = io({
      transports: ['polling', 'websocket'],
      auth: { token: getCookie('sbk_session') },
      timeout: 3000
    });

    socket.on('connect', () => {
      socket.emit('join_room', 'admin_room');
    });

  socket.on('cashbox_updated', (summary) => {
    if (summary && summary.acceptor) {
      renderCashbox(summary);
    } else {
      fetchCashboxData();
    }
  });

  socket.on('transaction_logged', () => {
    fetchAuditLogs();
  });
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

async function fetchCashboxData() {
  try {
    const res = await fetch('/api/admin/cashbox');
    const data = await res.json();
    renderCashbox(data);
  } catch (err) {
    console.error('Lỗi nạp dữ liệu két tiền:', err);
  }
}

function renderCashbox(summary) {
  const acceptorTotal = summary.acceptor ? summary.acceptor.total : 0;
  const dispenserTotal = summary.dispenser ? summary.dispenser.total : 0;
  const vaultTotal = acceptorTotal + dispenserTotal;

  if (document.getElementById('acceptor-total')) {
    document.getElementById('acceptor-total').textContent = `${acceptorTotal.toLocaleString('vi-VN')} VNĐ`;
  }
  if (document.getElementById('acceptor-vault-display')) {
    document.getElementById('acceptor-vault-display').textContent = `${acceptorTotal.toLocaleString('vi-VN')} VNĐ`;
  }
  if (document.getElementById('dispenser-vault-display')) {
    document.getElementById('dispenser-vault-display').textContent = `${dispenserTotal.toLocaleString('vi-VN')} VNĐ`;
  }
  if (document.getElementById('vault-total')) {
    document.getElementById('vault-total').textContent = `${vaultTotal.toLocaleString('vi-VN')} VNĐ`;
  }

  const acc = summary.acceptor || {};
  if (document.getElementById('acceptor-bills')) {
    document.getElementById('acceptor-bills').innerHTML = `
      <div class="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 font-medium">1k:<br><strong class="text-emerald-700 font-bold">${acc.bill_1k || 0}</strong></div>
      <div class="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 font-medium">2k:<br><strong class="text-emerald-700 font-bold">${acc.bill_2k || 0}</strong></div>
      <div class="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 font-medium">5k:<br><strong class="text-emerald-700 font-bold">${acc.bill_5k || 0}</strong></div>
      <div class="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 font-medium">10k:<br><strong class="text-emerald-700 font-bold">${acc.bill_10k || 0}</strong></div>
      <div class="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 font-medium">20k:<br><strong class="text-emerald-700 font-bold">${acc.bill_20k || 0}</strong></div>
      <div class="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 font-medium">50k:<br><strong class="text-emerald-700 font-bold">${acc.bill_50k || 0}</strong></div>
      <div class="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 font-medium">100k:<br><strong class="text-emerald-700 font-bold">${acc.bill_100k || 0}</strong></div>
      <div class="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 font-medium">200k:<br><strong class="text-emerald-700 font-bold">${acc.bill_200k || 0}</strong></div>
      <div class="p-1.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 font-medium">500k:<br><strong class="text-emerald-700 font-bold">${acc.bill_500k || 0}</strong></div>
    `;
  }

  const dis = summary.dispenser || {};
  if (document.getElementById('dispenser-bills')) {
    document.getElementById('dispenser-bills').innerHTML = `
      <div class="p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 font-medium">1k:<br><strong class="text-amber-700 font-bold">${dis.bill_1k || 0}</strong></div>
      <div class="p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 font-medium">2k:<br><strong class="text-amber-700 font-bold">${dis.bill_2k || 0}</strong></div>
      <div class="p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 font-medium">5k:<br><strong class="text-amber-700 font-bold">${dis.bill_5k || 0}</strong></div>
      <div class="p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 font-medium">10k:<br><strong class="text-amber-700 font-bold">${dis.bill_10k || 0}</strong></div>
      <div class="p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 font-medium">20k:<br><strong class="text-amber-700 font-bold">${dis.bill_20k || 0}</strong></div>
      <div class="p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 font-medium">50k:<br><strong class="text-amber-700 font-bold">${dis.bill_50k || 0}</strong></div>
      <div class="p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 font-medium">100k:<br><strong class="text-amber-700 font-bold">${dis.bill_100k || 0}</strong></div>
      <div class="p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 font-medium">200k:<br><strong class="text-amber-700 font-bold">${dis.bill_200k || 0}</strong></div>
    `;
  }
}

async function fetchAuditLogs() {
  try {
    const res = await fetch('/api/admin/audit-logs');
    const logs = await res.json();
    renderAuditLogs(logs);
    updateKPIsAndCharts(logs);
  } catch (err) {
    console.error('Lỗi nạp nhật ký audit:', err);
  }
}

function updateKPIsAndCharts(logs) {
  let vietqrTotal = 0;
  let cashTotal = 0;
  let orderCount = 0;

  logs.forEach((log) => {
    if (log.note && log.note.includes('VietQR')) {
      vietqrTotal += log.amount || 0;
      orderCount++;
    } else if (log.type === 'DEPOSIT') {
      cashTotal += log.amount || 0;
      orderCount++;
    }
  });

  if (document.getElementById('vietqr-total')) {
    document.getElementById('vietqr-total').textContent = `${vietqrTotal.toLocaleString('vi-VN')} VNĐ`;
  }
  if (document.getElementById('orders-count')) {
    document.getElementById('orders-count').textContent = `${orderCount} Đơn`;
  }

  // Update payment distribution chart
  if (paymentChartInstance) {
    paymentChartInstance.data.datasets[0].data = [cashTotal || 1, vietqrTotal || 1];
    paymentChartInstance.update();
  }
}

function renderAuditLogs(logs) {
  const container = document.getElementById('audit-table-body');
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = '<tr><td colspan="7" class="p-3 text-center text-gray-400">Chưa có lịch sử giao dịch nào</td></tr>';
    return;
  }

  container.innerHTML = logs
    .map(
      (log) => `
    <tr class="hover:bg-gray-50 transition border-b border-gray-100">
      <td class="p-2 font-mono font-bold text-gray-700">#${log.id}</td>
      <td class="p-2 font-bold"><span class="px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
        log.type === 'DEPOSIT'
          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          : log.type === 'DRINK_PAYMENT'
          ? 'bg-amber-100 text-amber-800 border border-amber-300'
          : 'bg-blue-100 text-blue-800 border border-blue-300'
      }">${log.type}</span></td>
      <td class="p-2 font-bold text-emerald-700 font-mono">${log.amount.toLocaleString('vi-VN')} VNĐ</td>
      <td class="p-2 text-gray-600 font-mono">${log.balance_before.toLocaleString('vi-VN')} VNĐ</td>
      <td class="p-2 text-gray-900 font-bold font-mono">${log.balance_after.toLocaleString('vi-VN')} VNĐ</td>
      <td class="p-2 text-gray-700 font-medium">${log.note || '-'}</td>
      <td class="p-2 text-gray-500 font-mono text-[10px]">${new Date(log.created_at).toLocaleString('vi-VN')}</td>
    </tr>
  `
    )
    .join('');
}

function initCharts() {
  const revCtx = document.getElementById('revenueChart');
  if (revCtx) {
    revenueChartInstance = new Chart(revCtx, {
      type: 'line',
      data: {
        labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
        datasets: [
          {
            label: 'Doanh Thu (VNĐ)',
            data: [120000, 350000, 680000, 920000, 1150000, 1420000, 1850000, 2100000],
            borderColor: '#006241',
            backgroundColor: 'rgba(0, 98, 65, 0.12)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#cba258',
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#1e3932', font: { weight: 'bold', size: 10 } } }
        },
        scales: {
          x: { ticks: { color: '#475569', font: { size: 10 } }, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
          y: { ticks: { color: '#475569', font: { size: 10 } }, grid: { color: 'rgba(0, 0, 0, 0.05)' } }
        }
      }
    });
  }

  const payCtx = document.getElementById('paymentChart');
  if (payCtx) {
    paymentChartInstance = new Chart(payCtx, {
      type: 'doughnut',
      data: {
        labels: ['Tiền Mặt Kiosk', 'VietQR Transfer'],
        datasets: [
          {
            data: [65, 35],
            backgroundColor: ['#006241', '#cba258'],
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#1e3932', font: { weight: 'bold', size: 10 } } }
        }
      }
    });
  }
}

function setupEventListeners() {
  const collectBtnSidebar = document.getElementById('collect-btn-sidebar');
  if (collectBtnSidebar) {
    collectBtnSidebar.addEventListener('click', async () => {
      if (!confirm('Xác nhận thu gom toàn bộ tiền mặt trong hộc ACCEPTOR về két sắt?')) return;
      try {
        const res = await fetch('/api/admin/cashbox/collect', { method: 'POST' });
        const summary = await res.json();
        renderCashbox(summary);
        alert('Đã hoàn tất thu gom tiền mặt trong két thành công!');
      } catch (err) {
        alert('Lỗi khi thực hiện thu gom tiền mặt');
      }
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login.html';
    });
  }
}
