const { queryGet, queryRun } = require('../config/database');
const cashboxService = require('./cashboxService');

async function calculateBackendOrderTotal(items) {
  let total = 0;

  for (const item of items) {
    const product = await queryGet('SELECT * FROM products WHERE id = ?', [item.product_id]);
    if (!product) {
      throw new Error(`Product with ID ${item.product_id} not found`);
    }

    let itemPrice = product.base_price;
    const sizes = JSON.parse(product.sizes);
    if (item.size) {
      const baseSize = item.size.split(' ')[0];
      const sizePrice = sizes[item.size] ?? sizes[baseSize] ?? 0;
      itemPrice += sizePrice;
    }

    const options = JSON.parse(product.options);
    if (item.options) {
      if (item.options.milk && options.milk) {
        const selectedMilk = options.milk.find((m) => m.name === item.options.milk);
        if (selectedMilk && selectedMilk.price) {
          itemPrice += selectedMilk.price;
        }
      }
    }

    total += itemPrice * (item.quantity || 1);
  }

  return total;
}

async function processKioskOrder({ items, cashInsertedBills, paymentMethod, customerPhone }) {
  const calculatedTotal = await calculateBackendOrderTotal(items);
  const orderCode = `SBK-${Math.floor(1000 + Math.random() * 9000)}`;

  if (paymentMethod === 'VIETQR') {
    const orderRes = await queryRun(
      `INSERT INTO orders (order_code, items, total_amount, payment_method, status)
       VALUES (?, ?, ?, 'VIETQR', 'PENDING_BARISTA')`,
      [orderCode, JSON.stringify(items), calculatedTotal]
    );

    const createdOrder = await queryGet('SELECT * FROM orders WHERE id = ?', [orderRes.lastID]);

    await queryRun(
      `INSERT INTO transactions (order_id, type, amount, balance_before, balance_after, note)
       VALUES (?, 'DRINK_PAYMENT', ?, ?, ?, 'Thanh toan VietQR Chuyen Khoan (Mô phỏng)')`,
      [createdOrder.id, calculatedTotal, calculatedTotal, 0]
    );

    return {
      order: createdOrder,
      insertedAmount: calculatedTotal,
      calculatedTotal,
      changeAmount: 0,
      changeBills: {},
      paymentMethod: 'VIETQR'
    };
  }

  // Default: CASH payment
  let insertedAmount = 0;
  if (cashInsertedBills) {
    insertedAmount =
      (cashInsertedBills['10k'] || 0) * 10000 +
      (cashInsertedBills['20k'] || 0) * 20000 +
      (cashInsertedBills['50k'] || 0) * 50000 +
      (cashInsertedBills['100k'] || 0) * 100000 +
      (cashInsertedBills['200k'] || 0) * 200000 +
      (cashInsertedBills['500k'] || 0) * 500000;
  }

  if (insertedAmount < calculatedTotal) {
    throw new Error(`Số tiền nạp chưa đủ. Yêu cầu: ${calculatedTotal.toLocaleString('vi-VN')} VNĐ, Đã đút: ${insertedAmount.toLocaleString('vi-VN')} VNĐ`);
  }

  const changeAmount = insertedAmount - calculatedTotal;

  // Record cash deposit into Acceptor vault
  await cashboxService.recordAcceptorDeposit(cashInsertedBills || {});

  // Calculate & record change payout from Dispenser vault if change > 0
  let changeResult = { bills: {}, remainder: 0 };
  if (changeAmount > 0) {
    changeResult = cashboxService.calculateChangeBills(changeAmount);
    await cashboxService.recordDispenserPayout(changeResult.bills);
  }

  const orderRes = await queryRun(
    `INSERT INTO orders (order_code, items, total_amount, payment_method, status)
     VALUES (?, ?, ?, 'CASH', 'PENDING_BARISTA')`,
    [orderCode, JSON.stringify(items), calculatedTotal]
  );

  const createdOrder = await queryGet('SELECT * FROM orders WHERE id = ?', [orderRes.lastID]);

  await queryRun(
    `INSERT INTO transactions (order_id, type, amount, balance_before, balance_after, note)
     VALUES (?, 'DEPOSIT', ?, ?, ?, 'Kiosk Cash Deposit & Direct Change Dispensed')`,
    [createdOrder.id, insertedAmount, insertedAmount, changeAmount]
  );

  return {
    order: createdOrder,
    insertedAmount,
    calculatedTotal,
    changeAmount,
    changeBills: changeResult.bills,
    paymentMethod: 'CASH'
  };
}

module.exports = {
  calculateBackendOrderTotal,
  processKioskOrder
};
