/**
 * Test script for Invoice PDF generation
 * Tests the new Puppeteer-based HTML-to-PDF conversion
 */

const { generateInvoicePdf } = require('./services/invoicePdfService');
const fs = require('fs');
const path = require('path');

// Sample Invoice Data
const sampleInvoice = {
  id: 1,
  invoice_number: 'INV202406-0001',
  invoice_date: new Date('2026-06-02').toISOString(),
  customer_name: 'Acme Industrial Solutions Pvt Ltd',
  customer_id: 1,
  address: 'Plot No. 45, Industrial Estate\nBhopal, Madhya Pradesh\nPin: 462001',
  gst_number: '23AABCU9603R1Z5',
  state: 'Madhya Pradesh',
  state_code: '23',
  phone: '+91 755-4062000',

  // Transport & Logistics
  transport_name: 'Excel Transporters',
  vehicle_number: 'MH-47-AB-1234',
  eway_bill_number: 'EWB12345678901',
  challan_number: 'CHL-001',
  challan_date: new Date('2026-06-02').toISOString(),

  // Bank Details
  bank_name: 'State Bank of India',
  account_holder: 'HARIT MANGAL PVT LTD',
  account_number: '12345678901234',
  ifsc_code: 'SBIN0123456',
  branch: 'Indore Branch',

  // Tax Details (will be computed from items)
  taxable_amount: 100000.00,
  cgst: 9000.00,
  sgst: 9000.00,
  igst: 0,
  total_amount: 118000.00,

  // Status & Signature
  payment_status: 'Pending',
  signature_image: null,  // Base64 signature image or data URL
  stamp_image: null,      // Base64 stamp image or data URL
  qr_code_image: null,    // Base64 QR code image or data URL
  upi_id: 'haritmangal@upi'
};

// Sample Invoice Items
const sampleItems = [
  {
    id: 1,
    product_description: 'Recycled Tyre Chips - Grade A (per MT)',
    hsn_code: '3915',
    quantity: 5,
    unit: 'MT',
    rate: 8000.00,
    tax_percent: 18,
    taxable_amount: 40000.00,
    cgst: 3600.00,
    sgst: 3600.00,
    igst: 0
  },
  {
    id: 2,
    product_description: 'Pyrolysis Oil - Industrial Grade (per Liter)',
    hsn_code: '2710',
    quantity: 500,
    unit: 'Ltr',
    rate: 100.00,
    tax_percent: 18,
    taxable_amount: 50000.00,
    cgst: 4500.00,
    sgst: 4500.00,
    igst: 0
  },
  {
    id: 3,
    product_description: 'Carbon Black - Fine Grade (per KG)',
    hsn_code: '2803',
    quantity: 200,
    unit: 'KG',
    rate: 100.00,
    tax_percent: 18,
    taxable_amount: 20000.00,
    cgst: 1800.00,
    sgst: 1800.00,
    igst: 0
  }
];

/**
 * Test the PDF generation
 */
async function testInvoicePdfGeneration() {
  try {
    console.log('🚀 Starting Invoice PDF Generation Test...\n');
    console.log('📄 Invoice Details:');
    console.log(`   Invoice #: ${sampleInvoice.invoice_number}`);
    console.log(`   Customer: ${sampleInvoice.customer_name}`);
    console.log(`   Items: ${sampleItems.length}`);
    console.log(`   Total: ₹${sampleInvoice.total_amount.toFixed(2)}\n`);

    console.log('⏳ Generating PDF using Puppeteer...');
    const startTime = Date.now();

    const pdfBuffer = await generateInvoicePdf(sampleInvoice, sampleItems);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ PDF Generated Successfully! (${duration}s)\n`);
    console.log(`📊 PDF Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB\n`);

    // Save the PDF to a file
    const outputPath = path.join(__dirname, 'test-invoice.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);

    console.log(`💾 PDF saved to: ${outputPath}`);
    console.log('\n📋 Test Summary:');
    console.log(`   ✓ PDF generation successful`);
    console.log(`   ✓ PDF size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   ✓ Generation time: ${duration}s`);
    console.log(`   ✓ File: test-invoice.pdf\n`);

    console.log('🎉 Invoice PDF Migration Test PASSED!\n');
  } catch (error) {
    console.error('❌ PDF Generation Test FAILED!\n');
    console.error('Error Details:');
    console.error(`  Type: ${error.constructor.name}`);
    console.error(`  Message: ${error.message}`);
    if (error.stack) {
      console.error(`\nStack Trace:\n${error.stack}`);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testInvoicePdfGeneration();
}

module.exports = { testInvoicePdfGeneration, sampleInvoice, sampleItems };
