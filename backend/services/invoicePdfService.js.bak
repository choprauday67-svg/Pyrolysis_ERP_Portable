'use strict';

const fs   = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// ─── Numeric helpers ────────────────────────────────────────────────────────

const safeNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const round2 = (v) => Math.round((safeNumber(v) + Number.EPSILON) * 100) / 100;

// ─── Normalise a single line-item ───────────────────────────────────────────

const normalizeItem = (item) => {
  const quantity   = safeNumber(item.quantity);
  const rate       = safeNumber(item.rate);
  const taxable    = round2(safeNumber(item.taxable_amount) || quantity * rate);
  let   cgst       = round2(safeNumber(item.cgst));
  let   sgst       = round2(safeNumber(item.sgst));
  let   igst       = round2(safeNumber(item.igst));
  const taxPercent = safeNumber(item.tax_percent);

  // Auto-calculate tax when none provided
  if (!cgst && !sgst && !igst) {
    if (taxPercent > 0) {
      cgst = round2((taxPercent / 200) * taxable);
      sgst = round2((taxPercent / 200) * taxable);
    } else {
      cgst = round2(0.09 * taxable);
      sgst = round2(0.09 * taxable);
    }
  }

  if (igst > 0) { cgst = 0; sgst = 0; }

  return {
    product_description: item.product_description || '-',
    hsn_code:            item.hsn_code   || '-',
    unit:                item.unit        || '-',
    tax_percent:         taxPercent       || 18,
    quantity,
    rate,
    taxable_amount: taxable,
    cgst,
    sgst,
    igst,
    total_amount: round2(taxable + cgst + sgst + igst)
  };
};

// ─── Compute invoice-level totals from items ────────────────────────────────

const computeTotals = (items) => {
  const acc = { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
  for (const it of items) {
    const ni = normalizeItem(it);
    acc.taxable += ni.taxable_amount;
    acc.cgst    += ni.cgst;
    acc.sgst    += ni.sgst;
    acc.igst    += ni.igst;
    acc.total   += ni.total_amount;
  }
  return {
    taxable_amount: round2(acc.taxable),
    cgst:           round2(acc.cgst),
    sgst:           round2(acc.sgst),
    igst:           round2(acc.igst),
    total_amount:   round2(acc.total)
  };
};

// ─── Build the template data object ─────────────────────────────────────────

const buildTemplateData = (invoiceData, items) => {
  const normalizedItems = items.map(normalizeItem);
  const computedTotals  = computeTotals(items);

  // Prefer stored totals if they exist and are non-zero, else use computed
  const storedTotal = safeNumber(invoiceData.total_amount);
  const totals = storedTotal > 0 ? {
    taxable_amount: round2(safeNumber(invoiceData.taxable_amount)),
    cgst:           round2(safeNumber(invoiceData.cgst)),
    sgst:           round2(safeNumber(invoiceData.sgst)),
    igst:           round2(safeNumber(invoiceData.igst)),
    total_amount:   round2(storedTotal)
  } : computedTotals;

  return {
    // Invoice header
    invoice_number:   invoiceData.invoice_number,
    invoice_date:     invoiceData.invoice_date,
    eway_bill_number: invoiceData.eway_bill_number,
    challan_number:   invoiceData.challan_number,
    challan_date:     invoiceData.challan_date,
    transport_name:   invoiceData.transport_name,
    vehicle_number:   invoiceData.vehicle_number,

    // Customer
    customer_name:    invoiceData.customer_name,
    address:          invoiceData.address,
    gst_number:       invoiceData.gst_number,
    state:            invoiceData.state,
    state_code:       invoiceData.state_code,
    phone:            invoiceData.phone,

    // Line items
    items: normalizedItems,

    // Totals
    totals,

    // Bank details
    bank_details: {
      bank_name:       invoiceData.bank_name,
      account_holder:  invoiceData.account_holder,
      account_number:  invoiceData.account_number,
      ifsc_code:       invoiceData.ifsc_code,
      branch:          invoiceData.branch
    },

    // Payment & extras
    payment_status:  invoiceData.payment_status,
    upi_id:          invoiceData.upi_id,
    logo_image:      invoiceData.logo_image      || null,
    signature_image: invoiceData.signature_image || null,
    stamp_image:     invoiceData.stamp_image     || null,
    qr_code_image:   invoiceData.qr_code_image   || null
  };
};

// ─── Main PDF generation function ───────────────────────────────────────────

const generateInvoicePdf = async (invoiceData, items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one invoice item is required to generate PDF.');
  }

  // Build HTML from template
  const templatePath = path.join(__dirname, '..', 'templates', 'invoice.html');
  let html = fs.readFileSync(templatePath, 'utf-8');

  const templateData = buildTemplateData(invoiceData, items);

  // Inject data BEFORE </head> so it's available before any script runs
  const dataTag = `<script>window.INVOICE_DATA = ${JSON.stringify(templateData)};</script>`;
  html = html.replace('</head>', `${dataTag}\n</head>`);

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none'
    ]
  });

  try {
    const page = await browser.newPage();

    // A4 viewport (96 DPI equivalent)
    await page.setViewport({ width: 794, height: 1123 });

    // Load content and wait for network to settle
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait until the inline script signals it has finished rendering
    await page.waitForFunction(() => window.INVOICE_RENDERED === true, { timeout: 10000 });

    // Generate A4 PDF
    const pdfBuffer = await page.pdf({
      format:          'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
    });

    await page.close();
    return pdfBuffer;

  } finally {
    await browser.close();
  }
};

module.exports = { generateInvoicePdf };
