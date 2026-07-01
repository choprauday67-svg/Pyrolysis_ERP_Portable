/* ──────────────────────────────────────────────────────────────────
   biz-modules.js — Shared ERP utilities
   ────────────────────────────────────────────────────────────────── */

/**
 * Generic API request helper compatible with backend JSON response.
 */
const apiRequest = async (path, options = {}) => {
  const token = localStorage.getItem('token');
  const config = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options
  };
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Frontend Supplier Validation Interceptor
  if (path.includes('/api/suppliers') && (config.method === 'POST' || config.method === 'PUT') && config.body) {
    const bodyObj = typeof config.body === 'string' ? JSON.parse(config.body) : config.body;
    if (!bodyObj.name || !bodyObj.name.trim()) {
      throw new Error('Supplier name is required.');
    }
    const phoneRegex = /^\d{10}$/;
    if (!bodyObj.contact || !bodyObj.contact.trim()) {
      throw new Error('Phone number is required.');
    } else if (!phoneRegex.test(bodyObj.contact.trim())) {
      throw new Error('Enter a valid 10-digit phone number.');
    }
  }

  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }
  const response = await fetch(path, config);
  let payload = {};
  try { payload = await response.json(); } catch (_) {}
  if (!response.ok) {
    throw new Error(payload.message || `HTTP ${response.status}`);
  }
  return payload;
};

/**
 * Format a number as Indian rupees.
 */
const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Show a flash notification that auto-dismisses after 5s.
 */
const createFlash = (message, type = 'success') => {
  const container = document.getElementById('flash-container');
  if (!container) return;
  const icon = type === 'error' ? '❌' : '✅';
  const div = document.createElement('div');
  div.className = `flash ${type}`;
  div.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.prepend(div);
  setTimeout(() => div.remove(), 5000);
};

/**
 * Build the top navigation bar based on current path.
 */
const buildNav = () => {
  const links = [
    { href: '/',              label: 'Dashboard' },
    { href: '/invoice.html',  label: 'Invoices' },
    { href: '/customers.html',label: 'Customers' },
    { href: '/analytics.html',label: 'Analytics' },
    { href: '/reports.html',  label: 'Reports' }
  ];
  const nav = document.querySelector('.biz-main-nav');
  if (nav) {
    const cur = window.location.pathname;
    nav.innerHTML = links.map(link => {
      const active = cur === link.href || (link.href !== '/' && cur.startsWith(link.href));
      return `<a class="${active ? 'active' : ''}" href="${link.href}">${link.label}</a>`;
    }).join('');
  }

  // Update header branding
  const brandLink = document.querySelector('header div a');
  if (brandLink && brandLink.textContent.includes('Pyrolysis ERP')) {
    brandLink.innerHTML = '<strong>HARIT MANGAL</strong> INDUSTRIES';
  }
};

/**
 * Returns context-specific action label and URL for alerts.
 */
const getAlertAction = (alert) => {
  if (!alert) return { label: 'View', href: '#' };
  switch (alert.type) {
    case 'DATA_GAP':  return { label: 'Reconcile Inventory', href: '/reports.html' };
    case 'TYRE':      return { label: 'Tyre Stock', href: '/reports.html' };
    case 'OIL':       return { label: 'Production Logs', href: '/reports.html' };
    case 'CARBON':    return { label: 'Production Logs', href: '/reports.html' };
    case 'ANOMALY':   return { label: 'Factory Logs', href: '/reports.html' };
    case 'PAYMENT':   return { label: 'View Invoices', href: '/invoice.html' };
    case 'INVOICE':   return { label: 'View Invoices', href: '/invoice.html' };
    default:          return { label: 'View', href: '#' };
  }
};

/**
 * Old injection logic removed. Handled by biz-dashboard.js
 */
const injectTopBarHandlers = () => {
    // Handled by biz-dashboard.js now
};

// Initialize handlers when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectTopBarHandlers);
} else {
  injectTopBarHandlers();
}

/**
 * Download a file securely passing the JWT token.
 */
const downloadAuthenticatedFile = async (url, defaultFilename = 'download') => {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  // Get filename from Content-Disposition if available
  let filename = defaultFilename;
  const disposition = response.headers.get('Content-Disposition');
  if (disposition && disposition.includes('filename=')) {
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
    if (filenameMatch && filenameMatch.length === 2) {
      filename = filenameMatch[1];
    }
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  setTimeout(() => {
    window.URL.revokeObjectURL(downloadUrl);
    a.remove();
  }, 100);
};

window.bizHelpers = { apiRequest, formatCurrency, createFlash, buildNav, downloadAuthenticatedFile, getAlertAction };
