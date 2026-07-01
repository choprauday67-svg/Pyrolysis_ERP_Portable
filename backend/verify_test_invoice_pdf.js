const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const filePath = 'test_invoice_output.pdf';
const dataBuffer = fs.readFileSync(filePath);

(async () => {
  const pdfDoc = await PDFDocument.load(dataBuffer);
  console.log('pageCount =', pdfDoc.getPageCount());
  const raw = dataBuffer.toString('latin1');
  const rupeeCount = (raw.match(/₹/g) || []).length;
  console.log('rawRupeeSymbolCount =', rupeeCount);
  const taxableCount = (raw.match(/Taxable Value/gi) || []).length;
  const cgstCount = (raw.match(/CGST/gi) || []).length;
  const sgstCount = (raw.match(/SGST/gi) || []).length;
  const totalCount = (raw.match(/Grand Total/gi) || []).length;
  console.log('rawTokenCounts =', { taxableCount, cgstCount, sgstCount, totalCount });
  const termsFound = raw.includes('Terms & Conditions');
  const signatureFound = raw.includes('Authorized Signatory');
  console.log('termsFound =', termsFound);
  console.log('signatureFound =', signatureFound);
  const watermarkFound = raw.includes('HARIT MANGAL INDUSTRIES');
  console.log('watermarkPresentText=', watermarkFound);
  const invoiceNo = raw.includes('INV-1001');
  console.log('invoiceNumberPresent=', invoiceNo);
  console.log('sampleRawSnippet=', raw.slice(0, 800).replace(/\n/g, '\\n'));
})();
