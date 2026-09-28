const cashPassService = require('../services/cashPassService');

async function scanQr(req, res, next) {
  try {
    const { qrCode } = req.body;
    const pass = await cashPassService.verifyAndDecodePass(qrCode);
    res.json(pass);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function payWithPass(req, res, next) {
  try {
    const { qrCode, amount, orderId } = req.body;
    const pass = await cashPassService.verifyAndDecodePass(qrCode);
    const updatedPass = await cashPassService.deductBalance(pass.id, amount, orderId);

    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('transaction_logged', { passId: pass.id, amount });
    }

    res.json({
      success: true,
      updatedPass
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  scanQr,
  payWithPass
};
