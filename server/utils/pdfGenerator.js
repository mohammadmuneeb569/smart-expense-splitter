const PDFDocument = require('pdfkit');

/**
 * Generate a PDF Statement Report for a Group
 *
 * @param {Object} data
 * @param {Object} data.group
 * @param {Array} data.memberSummaries
 * @param {Array} data.transactions
 * @param {Array} data.expenses
 * @param {Object} res - Express response stream
 */
function generateGroupPdfReport({ group, memberSummaries, transactions, expenses }, res) {
  const doc = new PDFDocument({
    margin: 40,
    size: 'A4',
    bufferPages: true,
  });

  // Pipe directly to HTTP response
  doc.pipe(res);

  const primaryColor = '#4f46e5'; // Indigo 600
  const secondaryColor = '#06b6d4'; // Cyan 500
  const darkText = '#0f172a'; // Slate 900
  const mutedText = '#64748b'; // Slate 500
  const lightBg = '#f8fafc'; // Slate 50
  const tableBorder = '#e2e8f0'; // Slate 200

  // ─── HEADER BAR ───────────────────────────────────────────────────────────
  doc.rect(40, 40, 515, 60).fill('#0f172a');

  doc
    .fillColor('#ffffff')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('SplitSmart', 55, 52);

  doc
    .fillColor(secondaryColor)
    .fontSize(10)
    .font('Helvetica')
    .text('Group Financial Statement & Settlement Report', 55, 75);

  const genDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  doc
    .fillColor('#94a3b8')
    .fontSize(8)
    .text(`Generated on: ${genDate}`, 380, 75, { align: 'right', width: 160 });

  doc.moveDown(3);

  // ─── GROUP METADATA CARD ─────────────────────────────────────────────────
  let y = 115;
  doc.rect(40, y, 515, 65).fillAndStroke(lightBg, tableBorder);

  doc.fillColor(darkText).fontSize(14).font('Helvetica-Bold').text(group.name, 55, y + 12);

  if (group.description) {
    doc.fillColor(mutedText).fontSize(9).font('Helvetica').text(group.description, 55, y + 30, { width: 320 });
  }

  // Right column of card
  const createdDate = new Date(group.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' });
  doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor).text(`Default Currency: ${group.defaultCurrency}`, 380, y + 12, { align: 'right', width: 160 });
  doc.fontSize(8).font('Helvetica').fillColor(mutedText).text(`Created: ${createdDate}`, 380, y + 28, { align: 'right', width: 160 });
  doc.text(`Total Members: ${group.members?.length || 0}`, 380, y + 42, { align: 'right', width: 160 });

  // ─── 1. MEMBER BALANCE SUMMARY TABLE ─────────────────────────────────────
  y = 195;
  doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('1. Member Net Balance Summary', 40, y);

  y += 18;
  // Table Header
  doc.rect(40, y, 515, 20).fill('#1e293b');
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
  doc.text('Member Name', 50, y + 5);
  doc.text('Email', 190, y + 5);
  doc.text('Status', 360, y + 5);
  doc.text(`Net Balance (${group.defaultCurrency})`, 430, y + 5, { width: 115, align: 'right' });

  y += 20;

  memberSummaries.forEach((m, idx) => {
    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.rect(40, y, 515, 18).fill('#f1f5f9');
    }

    doc.font('Helvetica').fontSize(8.5);
    doc.fillColor(darkText).text(m.name, 50, y + 4);
    doc.fillColor(mutedText).text(m.email || '—', 190, y + 4, { width: 160, ellipsis: true });

    let statusText = 'Settled';
    let balanceColor = '#64748b';
    if (m.netBalance > 0.01) {
      statusText = 'Owed';
      balanceColor = '#16a34a'; // Green
    } else if (m.netBalance < -0.01) {
      statusText = 'Owes';
      balanceColor = '#dc2626'; // Red
    }

    doc.fillColor(balanceColor).font('Helvetica-Bold').text(statusText, 360, y + 4);
    const formattedBal = `${m.netBalance > 0.01 ? '+' : ''}${m.netBalance.toFixed(2)}`;
    doc.text(formattedBal, 430, y + 4, { width: 115, align: 'right' });

    y += 18;
  });

  // ─── 2. SIMPLIFIED SETTLEMENT DIRECTIONS ─────────────────────────────────
  y += 15;
  doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('2. Optimized Settlement Directions (Minimal Transactions)', 40, y);

  y += 18;
  doc.rect(40, y, 515, 18).fill('#1e293b');
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
  doc.text('From (Debtor)', 50, y + 4);
  doc.text('Direction', 200, y + 4);
  doc.text('To (Creditor)', 280, y + 4);
  doc.text(`Amount (${group.defaultCurrency})`, 430, y + 4, { width: 115, align: 'right' });

  y += 18;

  if (!transactions || transactions.length === 0) {
    doc.rect(40, y, 515, 22).fill(lightBg);
    doc.fillColor('#16a34a').fontSize(9).font('Helvetica-Bold').text('✓ All settled up! No outstanding debts in this group.', 50, y + 6);
    y += 24;
  } else {
    transactions.forEach((t, idx) => {
      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.rect(40, y, 515, 18).fill('#f1f5f9');
      }

      doc.font('Helvetica').fontSize(8.5);
      doc.fillColor('#b91c1c').font('Helvetica-Bold').text(t.from?.name || 'Debtor', 50, y + 4);
      doc.fillColor(mutedText).font('Helvetica').text('pays  ───►', 200, y + 4);
      doc.fillColor('#15803d').font('Helvetica-Bold').text(t.to?.name || 'Creditor', 280, y + 4);
      doc.fillColor(darkText).text(`${group.defaultCurrency} ${t.amount.toFixed(2)}`, 430, y + 4, { width: 115, align: 'right' });

      y += 18;
    });
  }

  // ─── 3. EXPENSE AUDIT FEED TABLE ─────────────────────────────────────────
  y += 15;

  // Check if we need page break before section 3
  if (y > 620) {
    doc.addPage();
    y = 40;
  }

  doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('3. Expense Audit Trail & History', 40, y);

  y += 18;
  doc.rect(40, y, 515, 20).fill('#1e293b');
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
  doc.text('Date', 50, y + 5);
  doc.text('Description', 120, y + 5);
  doc.text('Category', 280, y + 5);
  doc.text('Paid By', 370, y + 5);
  doc.text('Amount', 450, y + 5, { width: 95, align: 'right' });

  y += 20;

  if (!expenses || expenses.length === 0) {
    doc.rect(40, y, 515, 20).fill(lightBg);
    doc.fillColor(mutedText).fontSize(8.5).font('Helvetica').text('No recorded expenses in this group yet.', 50, y + 5);
    y += 20;
  } else {
    expenses.forEach((exp, idx) => {
      // Check if near bottom of page
      if (y > 740) {
        doc.addPage();
        y = 40;

        // Repeat table header on new page
        doc.rect(40, y, 515, 20).fill('#1e293b');
        doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
        doc.text('Date', 50, y + 5);
        doc.text('Description', 120, y + 5);
        doc.text('Category', 280, y + 5);
        doc.text('Paid By', 370, y + 5);
        doc.text('Amount', 450, y + 5, { width: 95, align: 'right' });
        y += 20;
      }

      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.rect(40, y, 515, 18).fill('#f1f5f9');
      }

      const expDate = new Date(exp.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      doc.font('Helvetica').fontSize(8);
      doc.fillColor(mutedText).text(expDate, 50, y + 4);
      doc.fillColor(darkText).font('Helvetica-Bold').text(exp.description, 120, y + 4, { width: 150, ellipsis: true });
      doc.fillColor(mutedText).font('Helvetica').text(exp.category || 'General', 280, y + 4);
      doc.fillColor(darkText).text(exp.paidBy?.name || 'Unknown', 370, y + 4, { width: 75, ellipsis: true });

      const expAmountFormatted = `${exp.currency} ${parseFloat(exp.totalAmount).toFixed(2)}`;
      doc.fillColor(darkText).font('Helvetica-Bold').text(expAmountFormatted, 450, y + 4, { width: 95, align: 'right' });

      y += 18;
    });
  }

  // ─── FOOTER (PAGINATION) ──────────────────────────────────────────────────
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);

    // Subtle divider
    doc.strokeColor(tableBorder).lineWidth(0.5).moveTo(40, 785).lineTo(555, 785).stroke();

    doc
      .fontSize(8)
      .fillColor(mutedText)
      .font('Helvetica')
      .text('SplitSmart System Report • Immutable Group Financial Log', 40, 792, { align: 'left' });

    doc.text(`Page ${i + 1} of ${pages.count}`, 450, 792, { align: 'right', width: 105 });
  }

  doc.end();
}

module.exports = { generateGroupPdfReport };
