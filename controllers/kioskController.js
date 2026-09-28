const { queryAll } = require('../config/database');
const orderService = require('../services/orderService');
const cashPassService = require('../services/cashPassService');
const cashboxService = require('../services/cashboxService');

async function getMenu(req, res, next) {
  try {
    const products = await queryAll('SELECT * FROM products');
    const formatted = products.map((p) => ({
      ...p,
      sizes: JSON.parse(p.sizes),
      options: JSON.parse(p.options)
    }));
    res.json(formatted);
  } catch (err) {
    next(err);
  }
}

async function createOrder(req, res, next) {
  try {
    const { items, cashInsertedBills, paymentMethod, customerPhone, insertedTotal } = req.body;
    const result = await orderService.processKioskOrder({
      items,
      cashInsertedBills,
      paymentMethod,
      customerPhone,
      insertedTotal
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('new_order', result.order);
      io.to('barista_room').emit('new_order', result.order);

      const cashboxSummary = await cashboxService.getCashboxSummary();
      io.emit('cashbox_updated', cashboxSummary);
      io.to('admin_room').emit('cashbox_updated', cashboxSummary);

      io.emit('transaction_logged');
      io.to('admin_room').emit('transaction_logged');
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function cancelSession(req, res, next) {
  try {
    const { insertedBills } = req.body;
    let totalInserted = 0;
    if (insertedBills) {
      totalInserted =
        (insertedBills['1k'] || 0) * 1000 +
        (insertedBills['2k'] || 0) * 2000 +
        (insertedBills['5k'] || 0) * 5000 +
        (insertedBills['10k'] || 0) * 10000 +
        (insertedBills['20k'] || 0) * 20000 +
        (insertedBills['50k'] || 0) * 50000 +
        (insertedBills['100k'] || 0) * 100000 +
        (insertedBills['200k'] || 0) * 200000 +
        (insertedBills['500k'] || 0) * 500000;
    }

    if (totalInserted > 0) {
      const emergencyPass = await cashPassService.createCashPass(totalInserted);
      const io = req.app.get('io');
      if (io) {
        const cashboxSummary = await cashboxService.getCashboxSummary();
        io.emit('cashbox_updated', cashboxSummary);
        io.to('admin_room').emit('cashbox_updated', cashboxSummary);
        io.emit('transaction_logged');
        io.to('admin_room').emit('transaction_logged');
      }
      return res.json({
        cancelled: true,
        emergencyPass,
        message: 'Phiếu Voucher khẩn cấp đã được in do hủy giao dịch.'
      });
    }

    res.json({ cancelled: true, message: 'Giao dịch đã hủy.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMenu,
  createOrder,
  cancelSession
};
