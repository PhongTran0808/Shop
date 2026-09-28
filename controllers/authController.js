const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

function login(req, res) {
  const { pin } = req.body;

  let role = null;
  if (pin === '1234') {
    role = 'POS';
  } else if (pin === '5555') {
    role = 'BARISTA';
  } else if (pin === '8888') {
    role = 'ADMIN';
  }

  if (!role) {
    return res.status(401).json({ error: 'Mã PIN không hợp lệ' });
  }

  const token = jwt.sign({ role, authenticatedAt: Date.now() }, JWT_SECRET, { expiresIn: '8h' });

  res.cookie('sbk_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  });

  return res.json({
    message: 'Đăng nhập thành công',
    token,
    role
  });
}

function verify(req, res) {
  return res.json({ authenticated: true, user: req.user });
}

function logout(req, res) {
  res.clearCookie('sbk_session');
  return res.json({ message: 'Đăng xuất thành công' });
}

module.exports = {
  login,
  verify,
  logout
};
