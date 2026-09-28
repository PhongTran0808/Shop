const { queryAll, queryGet, queryRun } = require('../config/database');

async function getOrders(req, res, next) {
  try {
    const orders = await queryAll("SELECT * FROM orders WHERE status != 'COMPLETED' ORDER BY id ASC");
    const formatted = orders.map((o) => ({
      ...o,
      items: JSON.parse(o.items)
    }));
    res.json(formatted);
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await queryRun('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    const updated = await queryGet('SELECT * FROM orders WHERE id = ?', [id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('order_status_updated', {
        id: updated.id,
        order_code: updated.order_code,
        status: updated.status
      });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOrders,
  updateOrderStatus
};
