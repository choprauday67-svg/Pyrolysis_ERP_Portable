const Invoice = require('../models/invoiceModel');
const InvoiceItem = require('../models/invoiceItemModel');
const { generateInvoicePdf } = require('../services/invoicePdfService');

const createInvoiceNumber = async () => {
  const lastNumber = await Invoice.getLastInvoiceNumber();
  const prefix = `INV${new Date().toISOString().slice(0, 7).replace('-', '')}`;
  if (!lastNumber || !lastNumber.startsWith(prefix)) {
    return `${prefix}-0001`;
  }
  const parts = lastNumber.split('-');
  const lastSeq = parseInt(parts[1], 10) || 0;
  return `${prefix}-${String(lastSeq + 1).padStart(4, '0')}`;
};

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value) => Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100;

const normalizeItem = (item) => {
  const quantity = safeNumber(item.quantity);
  const rate = safeNumber(item.rate);
  const taxable = round2(safeNumber(item.taxable_amount) || quantity * rate);
  let cgst = round2(safeNumber(item.cgst));
  let sgst = round2(safeNumber(item.sgst));
  let igst = round2(safeNumber(item.igst));
  const taxPercent = safeNumber(item.tax_percent);

  if (!cgst && !sgst && !igst) {
    if (igst > 0) {
      // keep provided IGST if explicitly set
    } else if (taxPercent > 0) {
      cgst = round2((taxPercent / 200) * taxable);
      sgst = round2((taxPercent / 200) * taxable);
    } else {
      cgst = round2(0.09 * taxable);
      sgst = round2(0.09 * taxable);
    }
  }

  if (igst > 0) {
    cgst = 0;
    sgst = 0;
  }

  const total_amount = round2(taxable + cgst + sgst + igst);

  return {
    quantity,
    rate,
    taxable_amount: taxable,
    cgst,
    sgst,
    igst,
    total_amount,
    hsn_code: item.hsn_code || '',
    unit: item.unit || ''
  };
};

const validateInvoicePayload = (body) => {
  const errors = [];
  if (!body.customer_name) errors.push('Customer name is required');
  if (!body.gst_number) errors.push('GST number is required');
  if (!body.address) errors.push('Address is required');
  if (!body.phone) errors.push('Phone is required');
  if (!body.invoice_date) errors.push('Invoice date is required');
  if (!Array.isArray(body.items) || body.items.length === 0) errors.push('At least one invoice item is required');
  if (!body.payment_status) body.payment_status = 'Pending';
  return errors;
};

const calculateTotals = (items) => {
  const totals = items.reduce(
    (acc, item) => {
      const normalized = normalizeItem(item);
      acc.taxable_amount += normalized.taxable_amount;
      acc.cgst += normalized.cgst;
      acc.sgst += normalized.sgst;
      acc.igst += normalized.igst;
      acc.total_amount += normalized.total_amount;
      return acc;
    },
    { taxable_amount: 0, cgst: 0, sgst: 0, igst: 0, total_amount: 0 }
  );

  return {
    taxable_amount: round2(totals.taxable_amount),
    cgst: round2(totals.cgst),
    sgst: round2(totals.sgst),
    igst: round2(totals.igst),
    total_amount: round2(totals.total_amount)
  };
};

exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.getAll();
    res.json({ success: true, invoices });
  } catch (err) {
    console.error('Invoices fetch error:', err);
    res.status(500).json({ success: false, message: 'Unable to fetch invoices' });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.getById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    const items = await InvoiceItem.getByInvoiceId(invoice.id);
    res.json({ success: true, invoice, items });
  } catch (err) {
    console.error('Invoice fetch error:', err);
    res.status(500).json({ success: false, message: 'Unable to fetch invoice' });
  }
};

exports.getInvoicePreview = async (req, res) => {
  try {
    const invoice = await Invoice.getById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    const items = await InvoiceItem.getByInvoiceId(invoice.id);
    res.json({ success: true, invoice, items, preview: true });
  } catch (err) {
    console.error('Invoice preview error:', err);
    res.status(500).json({ success: false, message: 'Unable to preview invoice' });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const errors = validateInvoicePayload(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    const invoiceNumber = await createInvoiceNumber();
    const computed = calculateTotals(req.body.items);

    const invoiceId = await Invoice.create({
      invoice_number: invoiceNumber,
      customer_id: req.body.customer_id,
      customer_name: req.body.customer_name,
      gst_number: req.body.gst_number,
      address: req.body.address,
      phone: req.body.phone,
      invoice_date: req.body.invoice_date,
      taxable_amount: computed.taxable_amount,
      cgst: computed.cgst,
      sgst: computed.sgst,
      igst: computed.igst,
      total_amount: computed.total_amount,
      payment_status: req.body.payment_status
    });

    await InvoiceItem.deleteByInvoiceId(invoiceId);
    await Promise.all(req.body.items.map((item) => {
      const normalized = normalizeItem(item);
      return InvoiceItem.create({
        invoice_id: invoiceId,
        product_description: item.product_description,
        quantity: normalized.quantity,
        rate: normalized.rate,
        taxable_amount: normalized.taxable_amount,
        cgst: normalized.cgst,
        sgst: normalized.sgst,
        igst: normalized.igst,
        total_amount: normalized.total_amount
      });
    }));

    const createdInvoice = await Invoice.getById(invoiceId);
    res.status(201).json({ success: true, invoice: createdInvoice, invoice_number: invoiceNumber });
  } catch (err) {
    console.error('Invoice create error:', err);
    res.status(500).json({ success: false, message: 'Unable to create invoice' });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.getById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const errors = validateInvoicePayload(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    const computed = calculateTotals(req.body.items);
    await Invoice.update(req.params.id, {
      customer_id: req.body.customer_id,
      customer_name: req.body.customer_name,
      gst_number: req.body.gst_number,
      address: req.body.address,
      phone: req.body.phone,
      invoice_date: req.body.invoice_date,
      taxable_amount: computed.taxable_amount,
      cgst: computed.cgst,
      sgst: computed.sgst,
      igst: computed.igst,
      total_amount: computed.total_amount,
      payment_status: req.body.payment_status
    });

    await InvoiceItem.deleteByInvoiceId(req.params.id);
    await Promise.all(req.body.items.map((item) => {
      const normalized = normalizeItem(item);
      return InvoiceItem.create({
        invoice_id: req.params.id,
        product_description: item.product_description,
        quantity: normalized.quantity,
        rate: normalized.rate,
        taxable_amount: normalized.taxable_amount,
        cgst: normalized.cgst,
        sgst: normalized.sgst,
        igst: normalized.igst,
        total_amount: normalized.total_amount
      });
    }));

    res.json({ success: true, message: 'Invoice updated' });
  } catch (err) {
    console.error('Invoice update error:', err);
    res.status(500).json({ success: false, message: 'Unable to update invoice' });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.getById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    await InvoiceItem.deleteByInvoiceId(req.params.id);
    await Invoice.delete(req.params.id);
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    console.error('Invoice delete error:', err);
    res.status(500).json({ success: false, message: 'Unable to delete invoice' });
  }
};

exports.downloadInvoicePdf = async (req, res) => {
  try {
    const invoice = await Invoice.getById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const items = await InvoiceItem.getByInvoiceId(invoice.id);
    const pdfBuffer = await generateInvoicePdf(invoice, items);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Invoice PDF error:', err);
    if (err.message && err.message.includes('Invoice reconciliation failed')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Unable to generate invoice PDF' });
  }
};
