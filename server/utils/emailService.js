const nodemailer = require('nodemailer');

/**
 * Configure Nodemailer SMTP Transporter
 */
function createTransporter() {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  // Check if configured with valid credentials
  const isConfigured =
    user &&
    pass &&
    !user.includes('your-email') &&
    !pass.includes('your-app-password');

  if (!isConfigured) {
    return null;
  }

  return nodemailer.createTransporter({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
    // Prevent hanging on DNS/network issues
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });
}

/**
 * Send an email asynchronously without blocking the calling handler
 */
async function sendEmailAsync({ to, subject, html, text }) {
  // Execute in background
  setImmediate(async () => {
    try {
      const transporter = createTransporter();
      if (!transporter) {
        console.log(`✉️  [EmailService Simulation] To: ${to} | Subject: "${subject}"`);
        return;
      }

      const sender = `"SplitSmart" <${process.env.EMAIL_USER}>`;
      const info = await transporter.sendMail({
        from: sender,
        to,
        subject,
        text: text || subject,
        html,
      });

      console.log(`✅ [EmailService] Email sent successfully to ${to} (MessageId: ${info.messageId})`);
    } catch (err) {
      console.error(`⚠️ [EmailService] Failed to send email to ${to}:`, err.message);
    }
  });
}

/**
 * Trigger: When a new expense is created
 * Notifies all members involved in the split (excluding the payer)
 *
 * @param {Object} params
 * @param {string} params.groupName
 * @param {string} params.expenseTitle
 * @param {number} params.totalAmount
 * @param {string} params.currency
 * @param {string} params.paidByName
 * @param {Array<{ email: string, name: string, amount: number }>} params.recipients
 */
function notifyNewExpense({ groupName, expenseTitle, totalAmount, currency, paidByName, recipients }) {
  if (!recipients || recipients.length === 0) return;

  recipients.forEach((rec) => {
    if (!rec.email) return;

    const subject = `💸 New Expense in "${groupName}": ${expenseTitle}`;
    const formattedTotal = `${currency} ${parseFloat(totalAmount).toFixed(2)}`;
    const formattedShare = `${currency} ${parseFloat(rec.amount).toFixed(2)}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #030712; color: #f1f5f9; margin: 0; padding: 24px; }
          .card { max-width: 540px; margin: 0 auto; background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 28px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .brand { font-size: 20px; font-weight: bold; color: #818cf8; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
          .header { font-size: 18px; font-weight: 600; color: #f8fafc; margin-bottom: 12px; }
          .detail-box { background: #1e293b; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #475569; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .label { color: #94a3b8; }
          .value { color: #f1f5f9; font-weight: 600; }
          .highlight { font-size: 20px; color: #f87171; font-weight: bold; }
          .footer { font-size: 12px; color: #64748b; margin-top: 24px; text-align: center; border-top: 1px solid #334155; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand">⚡ SplitSmart Notification</div>
          <div class="header">Hello ${rec.name || 'there'},</div>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
            A new expense has been added to <strong>${groupName}</strong> by <strong>${paidByName}</strong>.
          </p>
          <div class="detail-box">
            <div class="row">
              <span class="label">Expense Title:</span>
              <span class="value">${expenseTitle}</span>
            </div>
            <div class="row">
              <span class="label">Total Amount:</span>
              <span class="value">${formattedTotal}</span>
            </div>
            <div class="row">
              <span class="label">Paid By:</span>
              <span class="value">${paidByName}</span>
            </div>
            <div class="row" style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #475569;">
              <span class="label" style="font-size: 15px;">Your Share Owed:</span>
              <span class="highlight">${formattedShare}</span>
            </div>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">
            You can view this group and manage settlements directly on your SplitSmart dashboard.
          </p>
          <div class="footer">
            SplitSmart • Smart Expense Splitter & Group Debt Settlement System
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `SplitSmart: A new expense "${expenseTitle}" was added in ${groupName} by ${paidByName}.\nTotal: ${formattedTotal}\nYour share: ${formattedShare}`;

    sendEmailAsync({ to: rec.email, subject, html, text });
  });
}

/**
 * Trigger: When a debt is settled
 * Sends confirmation emails to both sender and receiver
 *
 * @param {Object} params
 * @param {string} params.groupName
 * @param {Object} params.fromUser { name, email }
 * @param {Object} params.toUser { name, email }
 * @param {number} params.amount
 * @param {string} params.currency
 */
function notifyDebtSettlement({ groupName, fromUser, toUser, amount, currency }) {
  const formattedAmount = `${currency} ${parseFloat(amount).toFixed(2)}`;

  // 1. Email to the Payer (Sender)
  if (fromUser && fromUser.email) {
    const subject = `✅ Debt Settlement Confirmed in "${groupName}"`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #030712; color: #f1f5f9; margin: 0; padding: 24px; }
          .card { max-width: 540px; margin: 0 auto; background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 28px; }
          .brand { font-size: 20px; font-weight: bold; color: #10b981; margin-bottom: 20px; letter-spacing: 1px; }
          .detail-box { background: #1e293b; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #475569; }
          .amount { font-size: 24px; color: #34d399; font-weight: bold; text-align: center; margin: 12px 0; }
          .footer { font-size: 12px; color: #64748b; margin-top: 24px; text-align: center; border-top: 1px solid #334155; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand">✅ Payment Confirmation</div>
          <p style="color: #e2e8f0; font-size: 15px;">Hello ${fromUser.name},</p>
          <p style="color: #cbd5e1; font-size: 14px;">
            Your payment settlement in <strong>${groupName}</strong> has been successfully recorded.
          </p>
          <div class="detail-box">
            <div style="color: #94a3b8; font-size: 13px; text-align: center;">You paid</div>
            <div class="amount">${formattedAmount}</div>
            <div style="color: #cbd5e1; font-size: 14px; text-align: center;">to <strong>${toUser.name}</strong></div>
          </div>
          <div class="footer">SplitSmart • Smart Expense Splitter System</div>
        </div>
      </body>
      </html>
    `;
    sendEmailAsync({
      to: fromUser.email,
      subject,
      html,
      text: `SplitSmart: Your settlement of ${formattedAmount} to ${toUser.name} in "${groupName}" was successfully recorded.`,
    });
  }

  // 2. Email to the Receiver
  if (toUser && toUser.email) {
    const subject = `💰 Payment Received in "${groupName}"`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #030712; color: #f1f5f9; margin: 0; padding: 24px; }
          .card { max-width: 540px; margin: 0 auto; background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 28px; }
          .brand { font-size: 20px; font-weight: bold; color: #38bdf8; margin-bottom: 20px; letter-spacing: 1px; }
          .detail-box { background: #1e293b; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #475569; }
          .amount { font-size: 24px; color: #38bdf8; font-weight: bold; text-align: center; margin: 12px 0; }
          .footer { font-size: 12px; color: #64748b; margin-top: 24px; text-align: center; border-top: 1px solid #334155; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand">💰 Payment Received</div>
          <p style="color: #e2e8f0; font-size: 15px;">Hello ${toUser.name},</p>
          <p style="color: #cbd5e1; font-size: 14px;">
            <strong>${fromUser.name}</strong> has recorded a payment settlement to you in <strong>${groupName}</strong>.
          </p>
          <div class="detail-box">
            <div style="color: #94a3b8; font-size: 13px; text-align: center;">Amount Received</div>
            <div class="amount">${formattedAmount}</div>
            <div style="color: #cbd5e1; font-size: 14px; text-align: center;">from <strong>${fromUser.name}</strong></div>
          </div>
          <div class="footer">SplitSmart • Smart Expense Splitter System</div>
        </div>
      </body>
      </html>
    `;
    sendEmailAsync({
      to: toUser.email,
      subject,
      html,
      text: `SplitSmart: ${fromUser.name} settled ${formattedAmount} with you in "${groupName}".`,
    });
  }
}

module.exports = {
  sendEmailAsync,
  notifyNewExpense,
  notifyDebtSettlement,
};
