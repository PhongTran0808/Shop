let activePass = null;
let html5QrcodeScanner = null;

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  try {
    setupQrScanner();
  } catch (err) {
    console.warn('QR scanner init error:', err);
  }
  try {
    setupSocket();
  } catch (err) {
    console.warn('Socket init error:', err);
  }
});

function setupSocket() {
  if (typeof io === 'undefined') {
    console.warn('Socket.IO not loaded');
    return;
  }
  try {
    const socket = io({
      auth: { token: getCookie('sbk_session') },
      transports: ['polling', 'websocket'],
      timeout: 3000
    });

    socket.on('connect', () => {
      socket.emit('join_room', 'pos_room');
    });
  } catch (err) {
    console.warn('Socket connection error:', err);
  }
}

function setupQrScanner() {
  html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 200 });
  html5QrcodeScanner.render((decodedText) => {
    document.getElementById('manual-qr-input').value = decodedText;
    verifyQrPass(decodedText);
  });
}

function setupEventListeners() {
  document.getElementById('scan-btn').addEventListener('click', () => {
    const qr = document.getElementById('manual-qr-input').value;
    if (qr) verifyQrPass(qr);
  });

  document.getElementById('charge-amount-input').addEventListener('input', updatePaySummary);

  document.getElementById('process-pay-btn').addEventListener('click', processPayment);

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });
}

async function verifyQrPass(qrCode) {
  try {
    const res = await fetch('/api/pos/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCode })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Mã QR không hợp lệ');
      return;
    }

    activePass = data;
    renderScanResult();
  } catch (err) {
    alert('Lỗi kiểm tra mã QR');
  }
}

function renderScanResult() {
  if (!activePass) return;

  document.getElementById('scan-result-card').classList.remove('hidden');
  document.getElementById('pass-balance-display').textContent = `${activePass.current_balance.toLocaleString('vi-VN')} VNĐ`;
  document.getElementById('pass-version-display').textContent = `Version Nonce: v${activePass.version} | Trạng Thái: ${activePass.status}`;

  document.getElementById('process-pay-btn').removeAttribute('disabled');
  updatePaySummary();
}

function updatePaySummary() {
  if (!activePass) return;

  const amount = parseInt(document.getElementById('charge-amount-input').value, 10) || 0;
  const before = activePass.current_balance;
  const after = before - amount;

  document.getElementById('summary-before').textContent = `${before.toLocaleString('vi-VN')} VNĐ`;
  document.getElementById('summary-deduct').textContent = `${amount.toLocaleString('vi-VN')} VNĐ`;
  document.getElementById('summary-after').textContent = `${after.toLocaleString('vi-VN')} VNĐ`;

  const payBtn = document.getElementById('process-pay-btn');
  if (amount > 0 && after >= 0) {
    payBtn.removeAttribute('disabled');
  } else {
    payBtn.setAttribute('disabled', 'true');
  }
}

async function processPayment() {
  if (!activePass) return;
  const amount = parseInt(document.getElementById('charge-amount-input').value, 10);
  if (!amount || amount <= 0) return alert('Vui lòng nhập số tiền trừ hợp lệ!');

  try {
    const res = await fetch('/api/pos/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `pos_pay_${Date.now()}_${Math.random()}`
      },
      body: JSON.stringify({
        qrCode: activePass.qr_code,
        amount
      })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Thanh toán thất bại');

    alert(`Thanh toán thành công ${amount.toLocaleString('vi-VN')} VNĐ!\nSố dư mới còn lại: ${data.updatedPass.current_balance.toLocaleString('vi-VN')} VNĐ\nNonce Version mới: v${data.updatedPass.version}`);

    activePass = data.updatedPass;
    renderScanResult();
    document.getElementById('manual-qr-input').value = activePass.qr_code;
    document.getElementById('charge-amount-input').value = '';
  } catch (err) {
    alert('Lỗi xử lý thanh toán');
  }
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}
