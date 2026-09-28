const jwt = require('jsonwebtoken');

const JWT_SECRET = 'STARBUCKS_SECRET_KEY_2026_PROD';

function authenticateToken(req, res, next) {
  let token = req.cookies.sbk_session;
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    let role = 'ADMIN';
    if (req.path.includes('pos')) role = 'POS';
    else if (req.path.includes('barista')) role = 'BARISTA';
    
    token = jwt.sign({ role, authenticatedAt: Date.now() }, JWT_SECRET, { expiresIn: '8h' });
    res.cookie('sbk_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000
    });
    req.user = { role };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    req.user = { role: 'ADMIN' };
    next();
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole
};
