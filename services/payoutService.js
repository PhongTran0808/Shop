const { queryGet, queryRun } = require('../config/database');

async function processVietQRPayout(passId, amount, targetAccount) {
  const pass = await queryGet('SELECT * FROM cash_passes WHERE id = ?', [passId]);
  if (!pass || pass.current_balance < amount) {
    throw new Error('Insufficient balance for VietQR Payout');
  }

  const newBalance = pass.current_balance - amount;
  await queryRun("UPDATE cash_passes SET current_balance = ?, status = 'PENDING_PAYOUT' WHERE id = ?", [
    newBalance,
    passId
  ]);

  try {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await queryRun("UPDATE cash_passes SET status = 'ACTIVE' WHERE id = ?", [passId]);
    await queryRun(
      `INSERT INTO transactions (cash_pass_id, type, amount, balance_before, balance_after, note)
       VALUES (?, 'VIETQR_PAYOUT', ?, ?, ?, ?)`,
      [passId, amount, pass.current_balance, newBalance, `VietQR Payout to ${targetAccount}`]
    );

    return await queryGet('SELECT * FROM cash_passes WHERE id = ?', [passId]);
  } catch (err) {
    await queryRun(
      "UPDATE cash_passes SET current_balance = current_balance + ?, status = 'ACTIVE' WHERE id = ?",
      [amount, passId]
    );
    throw new Error('VietQR Payout Gateway Failed. Balance reverted.');
  }
}

module.exports = {
  processVietQRPayout
};
