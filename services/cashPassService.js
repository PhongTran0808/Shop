const crypto = require('crypto');
const { queryGet, queryRun } = require('../config/database');

const HMAC_SECRET = 'STARBUCKS_HMAC_SECRET_KEY_2026';

function generateSignature(passId, timestamp, version, balance) {
  const data = `${passId}:${timestamp}:${version}:${balance}`;
  return crypto.createHmac('sha256', HMAC_SECRET).update(data).digest('hex').substring(0, 12);
}

async function createCashPass(initialAmount) {
  const timestamp = Date.now();
  const expiresAt = new Date(timestamp + 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const tempQr = `PENDING_${timestamp}_${Math.random()}`;
  const res = await queryRun(
    `INSERT INTO cash_passes (qr_code, initial_amount, current_balance, version, status, expires_at)
     VALUES (?, ?, ?, 1, 'ACTIVE', ?)`,
    [tempQr, initialAmount, initialAmount, expiresAt]
  );

  const passId = res.lastID;
  const signature = generateSignature(passId, timestamp, 1, initialAmount);
  const finalQrCode = `SBK.PASS.${passId}.${timestamp}.1.${signature}`;

  await queryRun('UPDATE cash_passes SET qr_code = ? WHERE id = ?', [finalQrCode, passId]);

  return await queryGet('SELECT * FROM cash_passes WHERE id = ?', [passId]);
}

async function verifyAndDecodePass(qrString) {
  const parts = qrString.split('.');
  if (parts.length !== 5 || parts[0] !== 'SBK' || parts[1] !== 'PASS') {
    throw new Error('Invalid QR Code format');
  }

  const passId = parseInt(parts[2], 10);
  const version = parseInt(parts[4], 10);

  const pass = await queryGet('SELECT * FROM cash_passes WHERE id = ?', [passId]);
  if (!pass) {
    throw new Error('Cash pass not found');
  }

  if (pass.status !== 'ACTIVE') {
    throw new Error('Cash pass is no longer active');
  }

  if (new Date(pass.expires_at) < new Date()) {
    throw new Error('Cash pass has expired');
  }

  if (pass.version !== version) {
    throw new Error('QR Code version outdated. Replay attack prevented.');
  }

  return pass;
}

async function deductBalance(passId, amount, orderId = null) {
  const pass = await queryGet('SELECT * FROM cash_passes WHERE id = ?', [passId]);
  if (!pass) throw new Error('Pass not found');
  if (pass.current_balance < amount) throw new Error('Insufficient balance on QR pass');

  const newBalance = pass.current_balance - amount;
  const newVersion = pass.version + 1;
  const newStatus = newBalance === 0 ? 'EXHAUSTED' : 'ACTIVE';

  const timestamp = Date.now();
  const signature = generateSignature(pass.id, timestamp, newVersion, newBalance);
  const newQrCode = `SBK.PASS.${pass.id}.${timestamp}.${newVersion}.${signature}`;

  await queryRun(
    `UPDATE cash_passes 
     SET current_balance = ?, version = ?, qr_code = ?, status = ? 
     WHERE id = ?`,
    [newBalance, newVersion, newQrCode, newStatus, pass.id]
  );

  await queryRun(
    `INSERT INTO transactions (cash_pass_id, order_id, type, amount, balance_before, balance_after, note)
     VALUES (?, ?, 'DRINK_PAYMENT', ?, ?, ?, 'POS Order Payment Deduction')`,
    [pass.id, orderId, amount, pass.current_balance, newBalance]
  );

  return await queryGet('SELECT * FROM cash_passes WHERE id = ?', [pass.id]);
}

module.exports = {
  createCashPass,
  verifyAndDecodePass,
  deductBalance
};
