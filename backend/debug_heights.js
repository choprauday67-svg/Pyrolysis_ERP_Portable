const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const FONT_PATHS = {
  regular: [
    path.join(__dirname, 'fonts', 'Inter-Regular.ttf'),
    'C:\\Windows\\Fonts\\arial.ttf',
    'C:\\Windows\\Fonts\\Calibri.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
  ],
  bold: [
    path.join(__dirname, 'fonts', 'Inter-Bold.ttf'),
    'C:\\Windows\\Fonts\\arialbd.ttf',
    'C:\\Windows\\Fonts\\Calibri-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
  ]
};
const resolveFontPath = (paths) => paths.find((fontPath) => fs.existsSync(fontPath)) || null;
const fonts = { regular: resolveFontPath(FONT_PATHS.regular), bold: resolveFontPath(FONT_PATHS.bold) };
const doc = new PDFDocument({ size: 'A4', margins: { top: 28, bottom: 28, left: 28, right: 28 } });
if (fonts.regular) doc.font(fonts.regular);
const itemDesc = 'Industrial-grade carbon steel reactor vessel with automated temperature control and pressure monitoring system.';
console.log('font', fonts.regular);
const h = doc.heightOfString(itemDesc, { width: 168, align: 'left' });
console.log('desc height', h);
const words = 'Rupees One Lakh Eighteen Thousand Only.';
const h2 = doc.heightOfString(words, { width: 320 - 32, lineGap: 2 });
console.log('amount words height', h2);
