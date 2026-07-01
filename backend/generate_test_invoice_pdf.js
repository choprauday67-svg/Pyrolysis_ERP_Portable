const fs = require('fs');
const path = require('path');
const { buildInvoicePdf } = require('./services/invoicePdfService');

const invoice = {
  invoice_number: 'INV-1001',
  invoice_date: '2026-05-31',
  due_date: '2026-06-15',
  payment_status: 'Pending',
  customer_name: 'Harit Mangal Industries Pvt Ltd',
  address: 'Plot No. 12, Industrial Area, Antri, Madhya Pradesh, 475001',
  gst_number: '23AAACH7400M1ZZ',
  phone: '+91 98765 43210',
  eway_bill_number: 'EWB1234567890',
  website: 'www.haritmangal.com',
  taxable_amount: 100000,
  cgst: 9000,
  sgst: 9000,
  igst: 0,
  total_amount: 118000,
  signature_image: null
};

const items = [
  {
    product_description: 'Industrial-grade carbon steel reactor vessel with automated temperature control and pressure monitoring system.',
    hsn_code: '8405',
    quantity: 2,
    unit: 'Nos',
    rate: 45000,
    tax_percent: 18,
    taxable_amount: 90000,
    cgst: 8100,
    sgst: 8100,
    igst: 0
  },
  {
    product_description: 'Installation, commissioning, and post-delivery support package.',
    hsn_code: '9987',
    quantity: 1,
    unit: 'Pkg',
    rate: 10000,
    tax_percent: 18,
    taxable_amount: 10000,
    cgst: 900,
    sgst: 900,
    igst: 0
  }
];

const outPath = path.join(__dirname, 'test_invoice_output.pdf');
const doc = buildInvoicePdf(invoice, items);
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);
doc.end();
stream.on('finish', () => {
  console.log('Generated:', outPath);
});
stream.on('error', (err) => {
  console.error('Write error:', err);
});
