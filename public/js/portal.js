document.addEventListener('DOMContentLoaded', async () => {
  // Target URL for customer ordering mode (Order Only)
  const isVercelOrRemote = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const targetUrl = isVercelOrRemote
    ? `${window.location.origin}/order`
    : 'https://shop-git-main-univer3.vercel.app/order';

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

  // Copy order link for customers
  const copyBtn = document.getElementById('copy-portal-order-link-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(targetUrl)
          .then(showPortalToast)
          .catch(() => fallbackPortalCopy(targetUrl));
      } else {
        fallbackPortalCopy(targetUrl);
      }
    });
  }
});

function showPortalToast() {
  const toast = document.getElementById('portal-toast');
  if (!toast) return;
  toast.classList.remove('opacity-0', 'pointer-events-none');
  toast.classList.add('opacity-100');
  setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0', 'pointer-events-none');
  }, 3000);
}

function fallbackPortalCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    showPortalToast();
  } catch (e) {
    alert(`Link đặt món: ${text}`);
  }
  document.body.removeChild(ta);
}
