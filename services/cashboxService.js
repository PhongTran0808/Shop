const { queryGet, queryRun } = require('../config/database');

async function recordAcceptorDeposit(bills) {
  await queryRun(
    `UPDATE kiosk_cashbox
     SET bill_10k = bill_10k + ?,
         bill_20k = bill_20k + ?,
         bill_50k = bill_50k + ?,
         bill_100k = bill_100k + ?,
         bill_200k = bill_200k + ?,
         bill_500k = bill_500k + ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE type = 'ACCEPTOR'`,
    [
      bills['10k'] || 0,
      bills['20k'] || 0,
      bills['50k'] || 0,
      bills['100k'] || 0,
      bills['200k'] || 0,
      bills['500k'] || 0
    ]
  );
  return await queryGet("SELECT * FROM kiosk_cashbox WHERE type = 'ACCEPTOR'");
}

function calculateChangeBills(changeAmount) {
  let rem = changeAmount;
  const bills = {
    '200k': 0,
    '100k': 0,
    '50k': 0,
    '20k': 0,
    '10k': 0,
    '5k': 0
  };

  const denominations = [
    { key: '200k', val: 200000 },
    { key: '100k', val: 100000 },
    { key: '50k', val: 50000 },
    { key: '20k', val: 20000 },
    { key: '10k', val: 10000 },
    { key: '5k', val: 5000 }
  ];

  for (const d of denominations) {
    if (rem >= d.val) {
      bills[d.key] = Math.floor(rem / d.val);
      rem %= d.val;
    }
  }

  return { bills, remainder: rem };
}

async function recordDispenserPayout(bills) {
  await queryRun(
    `UPDATE kiosk_cashbox
     SET bill_5k = MAX(0, bill_5k - ?),
         bill_10k = MAX(0, bill_10k - ?),
         bill_20k = MAX(0, bill_20k - ?),
         bill_50k = MAX(0, bill_50k - ?),
         bill_100k = MAX(0, bill_100k - ?),
         bill_200k = MAX(0, bill_200k - ?),
         updated_at = CURRENT_TIMESTAMP
     WHERE type = 'DISPENSER'`,
    [
      bills['5k'] || 0,
      bills['10k'] || 0,
      bills['20k'] || 0,
      bills['50k'] || 0,
      bills['100k'] || 0,
      bills['200k'] || 0
    ]
  );
  return await queryGet("SELECT * FROM kiosk_cashbox WHERE type = 'DISPENSER'");
}

async function getCashboxSummary() {
  const acceptor = (await queryGet("SELECT * FROM kiosk_cashbox WHERE type = 'ACCEPTOR'")) || {};
  const dispenser = (await queryGet("SELECT * FROM kiosk_cashbox WHERE type = 'DISPENSER'")) || {};

  const calcTotal = (c) =>
    (c.bill_5k || 0) * 5000 +
    (c.bill_10k || 0) * 10000 +
    (c.bill_20k || 0) * 20000 +
    (c.bill_50k || 0) * 50000 +
    (c.bill_100k || 0) * 100000 +
    (c.bill_200k || 0) * 200000 +
    (c.bill_500k || 0) * 500000;

  return {
    acceptor: { ...acceptor, total: calcTotal(acceptor) },
    dispenser: { ...dispenser, total: calcTotal(dispenser) }
  };
}

async function collectCash() {
  await queryRun(
    `UPDATE kiosk_cashbox
     SET bill_5k=0, bill_10k=0, bill_20k=0, bill_50k=0, bill_100k=0, bill_200k=0, bill_500k=0, updated_at=CURRENT_TIMESTAMP
     WHERE type = 'ACCEPTOR'`
  );
  return await getCashboxSummary();
}

module.exports = {
  recordAcceptorDeposit,
  calculateChangeBills,
  recordDispenserPayout,
  getCashboxSummary,
  collectCash
};
