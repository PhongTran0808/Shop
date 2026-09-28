document.addEventListener('DOMContentLoaded', async () => {
  // Target URL to open when scanning the QR code
  const targetUrl = 'https://shop-ten-drab-87.vercel.app/';

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
});
