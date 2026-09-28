const express = require('express');
const https = require('https');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const selfsigned = require('selfsigned');
const { Server } = require('socket.io');

const { getLanIp } = require('./config/network');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const kioskRoutes = require('./routes/kioskRoutes');
const posRoutes = require('./routes/posRoutes');
const baristaRoutes = require('./routes/baristaRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

app.get('/api/qr', (req, res) => {
  const host = req.get('host') || 'localhost:7001';
  const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const defaultUrl = `${protocol}://${host}`;
  const text = req.query.text || defaultUrl;
  try {
    const qrcode = require('qrcode');
    res.setHeader('Content-Type', 'image/png');
    qrcode.toFileStream(res, text, {
      width: 300,
      margin: 1
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tạo QR Code' });
  }
});

app.get('/api/system/network-info', (req, res) => {
  const lanIp = getLanIp();
  const host = req.get('host') || 'shop-ten-drab-87.vercel.app';
  const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const baseUrl = host.includes('localhost') ? 'https://shop-ten-drab-87.vercel.app' : `${protocol}://${host}`;
  res.json({
    lanIp,
    localUrl: 'https://shop-ten-drab-87.vercel.app/',
    lanUrl: 'https://shop-ten-drab-87.vercel.app/',
    mobileUrl: 'https://shop-ten-drab-87.vercel.app/'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/kiosk', kioskRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/barista', baristaRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

// Support both Local standalone server (HTTPS/Socket.IO) and Vercel serverless
if (require.main === module) {
  const pems = selfsigned.generate(
    [
      { name: 'commonName', value: 'localhost' },
      { name: 'organizationName', value: 'Starbucks Local Kiosk' }
    ],
    { days: 365, keySize: 2048 }
  );

  const httpsOptions = {
    key: pems.private,
    cert: pems.cert
  };

  const httpsServer = https.createServer(httpsOptions, app);
  const io = new Server(httpsServer, {
    cors: { origin: '*' }
  });

  app.set('io', io);

  io.use((socket, next) => {
    socket.user = { role: 'ADMIN' };
    next();
  });

  io.on('connection', (socket) => {
    socket.on('join_room', (roomName) => {
      socket.join(roomName);
    });
  });

  const HTTPS_PORT = process.env.PORT || 7001;
  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    const lanIp = getLanIp();
    console.log('====================================================');
    console.log(`☕ Starbucks Smart Kiosk Server Running (HTTPS)`);
    console.log(`► Local Server: https://localhost:${HTTPS_PORT}`);
    console.log(`► LAN Server:   https://${lanIp}:${HTTPS_PORT}`);
    console.log('====================================================');
  });

  const HTTP_PORT = 7000;
  try {
    http
      .createServer((req, res) => {
        const host = req.headers.host ? req.headers.host.split(':')[0] : 'localhost';
        res.writeHead(301, { Location: `https://${host}:${HTTPS_PORT}${req.url}` });
        res.end();
      })
      .listen(HTTP_PORT);
  } catch (err) {
    // Port 7000 optional
  }
}

module.exports = app;
