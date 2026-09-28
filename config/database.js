const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'kios_data.db');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      base_price INTEGER NOT NULL,
      image TEXT,
      sizes TEXT NOT NULL,
      options TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cash_passes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code TEXT UNIQUE NOT NULL,
      initial_amount INTEGER NOT NULL,
      current_balance INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE NOT NULL,
      cash_pass_id INTEGER REFERENCES cash_passes(id),
      items TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_BARISTA',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cash_pass_id INTEGER REFERENCES cash_passes(id),
      order_id INTEGER REFERENCES orders(id),
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_before INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kiosk_cashbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      bill_5k INTEGER DEFAULT 0,
      bill_10k INTEGER DEFAULT 0,
      bill_20k INTEGER DEFAULT 0,
      bill_50k INTEGER DEFAULT 0,
      bill_100k INTEGER DEFAULT 0,
      bill_200k INTEGER DEFAULT 0,
      bill_500k INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exchange_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      currency TEXT UNIQUE NOT NULL,
      rate_to_vnd INTEGER NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS loyalty_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_phone TEXT NOT NULL,
      order_id INTEGER REFERENCES orders(id),
      transaction_id INTEGER REFERENCES transactions(id),
      stars_earned INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      response_body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const prodRes = db.exec('SELECT COUNT(*) as count FROM products');
  const count = prodRes[0] && prodRes[0].values[0] ? prodRes[0].values[0][0] : 0;

  if (count < 40) {
    db.run('DELETE FROM products');
    const defaultSizes = JSON.stringify({ Tall: 0, Grande: 12000, Venti: 24000 });
    const sizeEspresso = JSON.stringify({ Solo: 0, Doppio: 15000 });
    const defaultOptions = JSON.stringify({
      ice: ['0%', '50%', '100%'],
      sweetness: ['0%', '50%', '100%'],
      milk: [
        { name: 'Sữa tươi nguyên kem', price: 0 },
        { name: 'Sữa tách béo', price: 0 },
        { name: 'Sữa Hạnh Nhân', price: 5000 },
        { name: 'Sữa Yến Mạch', price: 5000 }
      ]
    });

    const initialMenu = [
      // ── ESPRESSO & CÀ PHÊ ──────────────────────────────────────────
      { name: 'Caffè Latte (Cà Phê Sữa)', category: 'Espresso & Cà Phê', price: 75000, sizes: defaultSizes },
      { name: 'Cappuccino (Cà Phê Cappuccino)', category: 'Espresso & Cà Phê', price: 75000, sizes: defaultSizes },
      { name: 'Flat White (Cà Phê Flat White)', category: 'Espresso & Cà Phê', price: 80000, sizes: defaultSizes },
      { name: 'Almondmilk Hazelnut Latte (Latte Hạnh Nhân Hạt Phỉ)', category: 'Espresso & Cà Phê', price: 80000, sizes: defaultSizes },
      { name: 'Caffè Mocha (Cà Phê Mocha)', category: 'Espresso & Cà Phê', price: 80000, sizes: defaultSizes },
      { name: 'Caramel Macchiato (Cà Phê Caramel Macchiato)', category: 'Espresso & Cà Phê', price: 85000, sizes: defaultSizes },
      { name: 'Brown Sugar Oatmilk Iced Shaken Espresso (Espresso Yến Mạch Đường Nâu)', category: 'Espresso & Cà Phê', price: 90000, sizes: defaultSizes },
      { name: 'Caffè Americano (Cà Phê Americano)', category: 'Espresso & Cà Phê', price: 65000, sizes: defaultSizes },
      { name: 'Cold Foam Iced Espresso (Espresso Đá Foam Lạnh)', category: 'Espresso & Cà Phê', price: 65000, sizes: defaultSizes },
      { name: 'Asian Dolce Latte – Bạc Xỉu', category: 'Espresso & Cà Phê', price: 80000, sizes: defaultSizes },
      { name: 'Dolce Espresso – Cà Phê Sữa Đá', category: 'Espresso & Cà Phê', price: 55000, sizes: defaultSizes },
      { name: 'Espresso (Cà Phê Espresso Nguyên Chất)', category: 'Espresso & Cà Phê', price: 40000, sizes: sizeEspresso },
      { name: 'Con Panna/Macchiato (Espresso Con Panna)', category: 'Espresso & Cà Phê', price: 50000, sizes: sizeEspresso },
      // ── COLD BREW Ủ LẠNH ───────────────────────────────────────────
      { name: 'Cold Brew (Cà Phê Ủ Lạnh)', category: 'Cold Brew Ủ Lạnh', price: 65000, sizes: defaultSizes },
      { name: 'Vanilla Sweet Cream Cold Brew (Cà Phê Ủ Lạnh Kem Vani)', category: 'Cold Brew Ủ Lạnh', price: 75000, sizes: defaultSizes },
      { name: 'Honey Ruby Grapefruit Cold Brew (Cà Phê Ủ Lạnh Bưởi Hồng Mật Ong)', category: 'Cold Brew Ủ Lạnh', price: 80000, sizes: defaultSizes },
      { name: 'Freshly Brewed Coffee (Cà Phê Phin Pha Mới)', category: 'Cold Brew Ủ Lạnh', price: 55000, sizes: defaultSizes },
      // ── FRAPPUCCINO® ────────────────────────────────────────────────
      { name: 'Coffee Frappuccino® (Đá Xay Cà Phê Frappuccino®)', category: 'Frappuccino®', price: 80000, sizes: defaultSizes },
      { name: 'Caramel Frappuccino® (Đá Xay Caramel Frappuccino®)', category: 'Frappuccino®', price: 90000, sizes: defaultSizes },
      { name: 'Mocha Frappuccino® (Đá Xay Mocha Frappuccino®)', category: 'Frappuccino®', price: 90000, sizes: defaultSizes },
      { name: 'Espresso Frappuccino® (Đá Xay Espresso Frappuccino®)', category: 'Frappuccino®', price: 90000, sizes: defaultSizes },
      { name: 'Coconut Espresso Frappuccino® (Đá Xay Espresso Dừa Frappuccino®)', category: 'Frappuccino®', price: 70000, sizes: defaultSizes },
      { name: 'Almondmilk Hazelnut Frappuccino® (Đá Xay Hạnh Nhân Hạt Phỉ Frappuccino®)', category: 'Frappuccino®', price: 90000, sizes: defaultSizes },
      { name: 'Java Chip Frappuccino® (Đá Xay Java Chip Frappuccino®)', category: 'Frappuccino®', price: 100000, sizes: defaultSizes },
      { name: 'Brown Sugar Cocoa Oatmilk Frappuccino® (Đá Xay Yến Mạch Cacao Đường Nâu)', category: 'Frappuccino®', price: 100000, sizes: defaultSizes },
      { name: 'Vanilla Cream Frappuccino® (Kem Đá Xay Vani Frappuccino®)', category: 'Frappuccino®', price: 90000, sizes: defaultSizes },
      { name: 'Strawberries & Cream Frappuccino® (Kem Đá Xay Dâu Tây Frappuccino®)', category: 'Frappuccino®', price: 90000, sizes: defaultSizes },
      { name: 'Almondmilk Hazelnut Cream Frappuccino® (Kem Đá Xay Hạnh Nhân Hạt Phỉ)', category: 'Frappuccino®', price: 90000, sizes: defaultSizes },
      { name: 'Green Tea Cream Frappuccino® (Kem Đá Xay Trà Xanh Frappuccino®)', category: 'Frappuccino®', price: 100000, sizes: defaultSizes },
      { name: 'Chocolate Chip Cream Frappuccino® (Kem Đá Xay Sô-cô-la Chip Frappuccino®)', category: 'Frappuccino®', price: 100000, sizes: defaultSizes },
      // ── SINH TỐ ĐÁ XAY ─────────────────────────────────────────────
      { name: 'Mango Passion Fruit (Sinh Tố Xoài Chanh Dây)', category: 'Sinh Tố Đá Xay', price: 80000, sizes: defaultSizes },
      { name: 'Raspberry Black Currant (Sinh Tố Phúc Bồn Tử Lý Chua)', category: 'Sinh Tố Đá Xay', price: 80000, sizes: defaultSizes },
      // ── CHOCOLATE & CLASSICS ────────────────────────────────────────
      { name: 'Signature Hot Chocolate (Sô-cô-la Nóng Đặc Trưng)', category: 'Chocolate & Classics', price: 75000, sizes: defaultSizes },
      { name: 'Steamed Milk/Soy Milk (Sữa Nóng/Sữa Đậu Nành Hấp)', category: 'Chocolate & Classics', price: 40000, sizes: defaultSizes },
      // ── STARBUCKS REFRESHERS™ ───────────────────────────────────────
      { name: 'Strawberry Açaí with Lemonade (Dâu Tây Açaí Chanh Refreshers™)', category: 'Starbucks Refreshers™', price: 75000, sizes: defaultSizes },
      { name: 'Mango Dragonfruit with Lemonade (Xoài Thanh Long Chanh Refreshers™)', category: 'Starbucks Refreshers™', price: 75000, sizes: defaultSizes },
      { name: 'Pink Drink with Strawberry Açaí (Pink Drink Dâu Tây Açaí)', category: 'Starbucks Refreshers™', price: 80000, sizes: defaultSizes },
      { name: 'Dragon Drink with Mango Dragonfruit (Dragon Drink Xoài Thanh Long)', category: 'Starbucks Refreshers™', price: 80000, sizes: defaultSizes },
      // ── TRÀ TEAVANA™ ────────────────────────────────────────────────
      { name: 'English Breakfast Earl Grey Tea Latte (Trà Đen Bá Tước Latte)', category: 'Trà Teavana™', price: 70000, sizes: defaultSizes },
      { name: 'Chai Tea Latte (Trà Chai Sữa Nóng/Đá)', category: 'Trà Teavana™', price: 75000, sizes: defaultSizes },
      { name: 'Pure Matcha Latte (Trà Xanh Matcha Sữa)', category: 'Trà Teavana™', price: 80000, sizes: defaultSizes },
      { name: 'Pure Matcha & Espresso Fusion (Matcha Kết Hợp Espresso)', category: 'Trà Teavana™', price: 80000, sizes: defaultSizes },
      { name: 'Ruby Grapefruit & Honey Black Tea (Trà Đen Bưởi Hồng Mật Ong)', category: 'Trà Teavana™', price: 75000, sizes: defaultSizes },
      { name: 'Iced Pomegranate Pearls Hibiscus (Trà Hibiscus Lựu Trân Châu Đá)', category: 'Trà Teavana™', price: 75000, sizes: defaultSizes },
      { name: 'Iced Strawberry Green Tea Lemonade (Trà Xanh Dâu Chanh Đá)', category: 'Trà Teavana™', price: 75000, sizes: defaultSizes },
      { name: 'Iced Tea Lemonade (Trà Chanh Đá)', category: 'Trà Teavana™', price: 65000, sizes: defaultSizes },
      { name: 'Earl Grey & English Breakfast Pure Tea (Trà Thuần Bá Tước/Anh Quốc)', category: 'Trà Teavana™', price: 55000, sizes: defaultSizes },
      { name: 'Mint Citrus, Hibiscus & Chamomile Tea (Trà Thuần Bạc Hà/Hibiscus/Hoa Cúc)', category: 'Trà Teavana™', price: 55000, sizes: defaultSizes },
    ];

    initialMenu.forEach((p) => {
      db.run(
        'INSERT INTO products (name, category, base_price, image, sizes, options) VALUES (?, ?, ?, ?, ?, ?)',
        [p.name, p.category, p.price, 'SBK', defaultSizes, defaultOptions]
      );
    });
  }

  const cashRes = db.exec('SELECT COUNT(*) as count FROM kiosk_cashbox');
  if (!cashRes[0] || cashRes[0].values[0][0] === 0) {
    db.run(
      'INSERT INTO kiosk_cashbox (type, bill_5k, bill_10k, bill_20k, bill_50k, bill_100k, bill_200k, bill_500k) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['ACCEPTOR', 0, 0, 0, 0, 0, 0, 0]
    );
    db.run(
      'INSERT INTO kiosk_cashbox (type, bill_5k, bill_10k, bill_20k, bill_50k, bill_100k, bill_200k, bill_500k) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['DISPENSER', 50, 50, 40, 30, 20, 0, 0]
    );
  }

  const rateRes = db.exec('SELECT COUNT(*) as count FROM exchange_rates');
  if (!rateRes[0] || rateRes[0].values[0][0] === 0) {
    db.run('INSERT INTO exchange_rates (currency, rate_to_vnd) VALUES (?, ?)', ['USD', 25400]);
    db.run('INSERT INTO exchange_rates (currency, rate_to_vnd) VALUES (?, ?)', ['EUR', 27200]);
    db.run('INSERT INTO exchange_rates (currency, rate_to_vnd) VALUES (?, ?)', ['JPY', 165]);
  }

  saveDatabase();
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

async function queryAll(sql, params = []) {
  const database = await getDb();
  const stmt = database.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }

  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

async function queryGet(sql, params = []) {
  const results = await queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

async function queryRun(sql, params = []) {
  const database = await getDb();
  database.run(sql, params);

  const lastIdRes = database.exec('SELECT last_insert_rowid() as id');
  const lastID = lastIdRes[0] && lastIdRes[0].values[0] ? lastIdRes[0].values[0][0] : 0;
  saveDatabase();
  return { lastID };
}

module.exports = {
  getDb,
  queryAll,
  queryGet,
  queryRun,
  saveDatabase
};
