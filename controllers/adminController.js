const { queryAll } = require('../config/database');
const cashboxService = require('../services/cashboxService');

async function getCashbox(req, res, next) {
  try {
    const summary = await cashboxService.getCashboxSummary();
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

async function collectCash(req, res, next) {
  try {
    const summary = await cashboxService.collectCash();
    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('cashbox_updated', summary);
    }
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

async function getAuditLogs(req, res, next) {
  try {
    const logs = await queryAll('SELECT * FROM transactions ORDER BY id DESC LIMIT 100');
    res.json(logs);
  } catch (err) {
    next(err);
  }
}

async function getExchangeRates(req, res, next) {
  try {
    const rates = await queryAll('SELECT * FROM exchange_rates');
    res.json(rates);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCashbox,
  collectCash,
  getAuditLogs,
  getExchangeRates
};
