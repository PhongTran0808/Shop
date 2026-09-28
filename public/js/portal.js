document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/system/network-info');
    const net = await res.json();

    const targetUrl = net.mobileUrl || `https://${window.location.hostname}:7001/mobile.html`;

    const badge = document.getElementById('qr-url-badge');
    if (badge) {
      badge.textContent = targetUrl;
    }

    const canvas = document.getElementById('qr-canvas');
    if (window.QRCode && canvas) {
      QRCode.toCanvas(canvas, targetUrl, { width: 220, margin: 2 }, function (error) {
        if (error) console.error(error);
      });
    }
  } catch (err) {
    console.error('Lỗi nạp thông tin mạng LAN:', err);
    const canvas = document.getElementById('qr-canvas');
    const fallbackUrl = `https://${window.location.hostname}:7001/mobile.html`;
    if (window.QRCode && canvas) {
      QRCode.toCanvas(canvas, fallbackUrl, { width: 220, margin: 2 });
    }
  }
});
