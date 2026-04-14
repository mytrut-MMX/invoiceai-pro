function formatCurrency(amount, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(Number(amount || 0));
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolvePortalUrl(doc, template) {
  return doc?.portalUrl || doc?.portalURL || template?.portalUrl || template?.portalURL || '';
}

function getCurrencyCode(primary, fallback) {
  return primary?.currency || fallback?.currency || 'GBP';
}

function renderSummaryRows(rows) {
  return rows.map(({ label, value }) => `
    <tr>
      <td style="padding:6px 0;color:#6B7280;font-size:14px;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(label)}</td>
      <td align="right" style="padding:6px 0;color:#111110;font-size:14px;font-weight:700;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(value)}</td>
    </tr>`).join('');
}

function buildEmailLayout({ companyName, greetingName, bodyLines, ctaLabel, ctaUrl, summaryTitle, summaryRows, note, footerText, personalMessage }) {
  const trimmedPersonalMessage = String(personalMessage ?? '').trim();
  const personalMessageBlock = trimmedPersonalMessage ? `
                  <tr>
                    <td style="padding:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#333333;white-space:pre-line;">${escapeHtml(trimmedPersonalMessage)}</td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 12px;border-top:1px solid #E5E3DC;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>` : '';

  const noteBlock = note ? `
    <tr>
      <td style="padding:20px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#3F3F46;">
        <strong>Note:</strong> ${escapeHtml(note)}
      </td>
    </tr>` : '';

  const renderedBody = bodyLines.map((line) => `
    <tr>
      <td style="padding:0 32px 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#27272A;">${escapeHtml(line)}</td>
    </tr>`).join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>InvoiceSaga</title>
  </head>
  <body style="margin:0;padding:0;background:#F0EFE9;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#F0EFE9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="width:100%;max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td valign="middle">
                      <span style="display:inline-block;background:#111110;color:#D97706;border-radius:8px;padding:8px 10px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.04em;">IS</span>
                    </td>
                    <td align="right" valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#111110;">${escapeHtml(companyName)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 18px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#111110;">Hi ${escapeHtml(greetingName)},</td>
            </tr>${renderedBody}
            <tr>
              <td style="padding:0 32px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:18px 16px;">
                ${personalMessageBlock}
                  <tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.03em;color:#6B7280;text-transform:uppercase;padding-bottom:8px;">${escapeHtml(summaryTitle)}</td>
                  </tr>${renderSummaryRows(summaryRows)}
                </table>
              </td>
            </tr>${noteBlock}
            ${ctaUrl ? `
            <tr>
              <td style="padding:20px 32px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td bgcolor="#111110" style="border-radius:8px;">
                      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;">${escapeHtml(ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>` : ''}
            <tr>
              <td style="padding:28px 32px 30px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#71717A;">${escapeHtml(footerText)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildInvoiceEmail({ invoice = {}, company = {}, customer = {}, template = {}, personalMessage = '' }) {
  const currency = getCurrencyCode(invoice, company);
  const total = formatCurrency(invoice.total ?? invoice.amountDue ?? invoice.balanceDue ?? 0, currency);
  const portalUrl = resolvePortalUrl(invoice, template);

  return buildEmailLayout({
    companyName: company.name || company.companyName || 'Your Company',
    greetingName: customer.contactName || customer.companyName || 'there',
    bodyLines: [
      `Please find attached your invoice ${invoice.invoiceNumber || '—'} for ${total}.`,
      `Payment is due by ${formatDate(invoice.dueDate)}.`
    ],
    ctaLabel: 'View Invoice',
    ctaUrl: portalUrl,
    summaryTitle: 'Invoice Summary',
    summaryRows: [
      { label: 'Invoice No:', value: invoice.invoiceNumber || '—' },
      { label: 'Issue Date:', value: formatDate(invoice.issueDate || invoice.date) },
      { label: 'Due Date:', value: formatDate(invoice.dueDate) },
      { label: 'Amount Due:', value: total },
    ],
    note: invoice.notes,
    personalMessage,
    footerText: 'Sent via InvoiceSaga · invoicesaga.com',
  });
}

export function buildQuoteEmail({ quote = {}, company = {}, customer = {}, personalMessage = '' }) {
  const currency = getCurrencyCode(quote, company);
  const total = formatCurrency(quote.total ?? quote.amount ?? 0, currency);
  const portalUrl = resolvePortalUrl(quote);

  return buildEmailLayout({
    companyName: company.name || company.companyName || 'Your Company',
    greetingName: customer.contactName || customer.companyName || 'there',
    bodyLines: [
      `Please find your quote ${quote.quoteNumber || '—'} for ${total} attached.`,
      `This quote is valid until ${formatDate(quote.expiryDate)}.`
    ],
    ctaLabel: 'View Quote',
    ctaUrl: portalUrl,
    summaryTitle: 'Quote Summary',
    summaryRows: [
      { label: 'Quote No:', value: quote.quoteNumber || '—' },
      { label: 'Issue Date:', value: formatDate(quote.issueDate || quote.date) },
      { label: 'Valid Until:', value: formatDate(quote.expiryDate) },
      { label: 'Total:', value: total },
    ],
    personalMessage,
    footerText: 'Sent via InvoiceSaga · invoicesaga.com',
  });
}

function displayCisRate(rate) {
  switch (rate) {
    case 'standard_20':   return '20%';
    case 'unverified_30': return '30%';
    case 'gross_0':       return '0%';
    default:              return rate || '—';
  }
}

export function buildCISStatementEmail({
  contractor = {},
  subcontractor = {},
  period = {},
  amounts = {},
  personalMessage = '',
}) {
  const gross = formatCurrency(amounts.gross_amount ?? 0, 'GBP');
  const materials = formatCurrency(amounts.materials_amount ?? 0, 'GBP');
  const labour = formatCurrency(amounts.labour_amount ?? 0, 'GBP');
  const deducted = formatCurrency(amounts.cis_deducted ?? 0, 'GBP');
  const rate = displayCisRate(amounts.cis_rate_used);
  const periodLabel = period.label || '—';

  return buildEmailLayout({
    companyName: contractor.name || 'Your Contractor',
    greetingName: subcontractor.name || 'there',
    bodyLines: [
      `Please find attached your Payment and Deduction Statement for tax month ${periodLabel}, as required by HMRC under the Construction Industry Scheme (CIS340).`,
    ],
    summaryTitle: `CIS Statement — ${periodLabel}`,
    summaryRows: [
      { label: 'Gross amount (ex. VAT):',   value: gross },
      { label: 'Cost of materials:',        value: materials },
      { label: 'Amount liable to deduction:', value: labour },
      { label: 'Rate:',                     value: rate },
      { label: 'CIS deducted:',             value: deducted },
    ],
    note: 'Keep this statement for your records. You may need it for your Self Assessment or Corporation Tax return.',
    personalMessage,
    footerText: `Sent via InvoiceSaga on behalf of ${contractor.name || 'your contractor'} · invoicesaga.com`,
  });
}

export function buildPaymentConfirmationEmail({ invoice = {}, payment = {}, company = {}, customer = {}, personalMessage = '' }) {
  const currency = getCurrencyCode(payment, invoice) || getCurrencyCode(invoice, company);
  const amountPaid = formatCurrency(payment.amount ?? 0, currency);
  const balanceValue = invoice.balanceDue ?? invoice.remainingBalance ?? 0;
  const remainingBalance = formatCurrency(balanceValue, currency);
  const isFullyPaid = Number(balanceValue || 0) <= 0;

  const bodyLines = [
    `Thank you! We've received your payment of ${amountPaid} for invoice ${invoice.invoiceNumber || '—'}.`,
    `Your account balance is now ${remainingBalance}.`,
  ];

  if (isFullyPaid) {
    bodyLines.push('This invoice is now fully settled. Thank you for your business!');
  }

  return buildEmailLayout({
    companyName: company.name || company.companyName || 'Your Company',
    greetingName: customer.contactName || customer.companyName || 'there',
    bodyLines,
    summaryTitle: 'Payment Summary',
    summaryRows: [
      { label: 'Invoice No:', value: invoice.invoiceNumber || '—' },
      { label: 'Payment Date:', value: formatDate(payment.date || payment.paymentDate) },
      { label: 'Amount Paid:', value: amountPaid },
      { label: 'Balance Due:', value: remainingBalance },
    ],
    personalMessage,
    footerText: 'Sent via InvoiceSaga · invoicesaga.com',
  });
}
