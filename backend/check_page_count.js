const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const data = fs.readFileSync('debug_text_calls_output.pdf');
(async () => {
  const pdfDoc = await PDFDocument.load(data);
  console.log('pageCount =', pdfDoc.getPageCount());
})();
