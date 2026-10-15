const express = require('express');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');
const { simplifyDebts } = require('../utils/simplifyDebts');
const { convertCurrency } = require('../utils/currencyConverter');
const { notifyDebtSettlement } = require('../utils/emailService');

const router = express.Router();

// @route   GET /api/groups/:id/settlements
// @desc    Run debt simplification algorithm and return optimized transactions
// @access  Private
router.get('/:id/settlements', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('members', 'name email avatar');
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some((m) => String(m._id) === String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const expenses = await Expense.find({ group: req.params.id })
      .populate('paidBy', 'name email avatar')
      .populate('splitBetween.user', 'name email avatar');

    // Build net balance map: userId -> balance (positive = owed to them, negative = they owe)
    const balanceMap = {};

    // Initialize all members with zero balance
    group.members.forEach((member) => {
      balanceMap[String(member._id)] = {
        userId: String(member._id),
        name: member.name,
        avatar: member.avatar,
        balance: 0,
      };
    });

    // Process each expense with currency conversion
    for (const expense of expenses) {
      const targetCurrency = group.defaultCurrency;

      // Convert total amount to group default currency
      const convertedTotal = await convertCurrency(
        expense.totalAmount,
        expense.currency,
        targetCurrency
      );

      const paidById = String(expense.paidBy._id);

      // The payer gets credited the full amount
      if (balanceMap[paidById]) {
        balanceMap[paidById].balance += convertedTotal;
      }

      // Each person in splitBetween gets debited their share
      for (const split of expense.splitBetween) {
        const splitUserId = String(split.user._id || split.user);
        const convertedShare = await convertCurrency(
          split.amount,
          expense.currency,
          targetCurrency
        );

        if (balanceMap[splitUserId]) {
          balanceMap[splitUserId].balance -= convertedShare;
        }
      }
    }

    const balances = Object.values(balanceMap);
    const transactions = simplifyDebts(balances);

    // Compute per-member summaries
    const memberSummaries = balances.map((b) => ({
      userId: b.userId,
      name: b.name,
      avatar: b.avatar,
      netBalance: parseFloat(b.balance.toFixed(2)),
      currency: group.defaultCurrency,
    }));

    res.json({
      transactions,
      memberSummaries,
      currency: group.defaultCurrency,
      totalExpenses: expenses.length,
    });
  } catch (err) {
    console.error('Settlement calculation error:', err);
    res.status(500).json({ message: 'Failed to calculate settlements' });
  }
});

// @route   POST /api/groups/:id/settle-up
// @desc    Record a payment settlement between two users
// @access  Private
router.post('/:id/settle-up', protect, async (req, res) => {
  try {
    const { fromUserId, toUserId, amount, currency } = req.body;

    if (!fromUserId || !toUserId || !amount) {
      return res.status(400).json({ message: 'fromUserId, toUserId, and amount are required' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.map(String).includes(String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const User = require('../models/User');
    const fromUser = await User.findById(fromUserId).select('name email');
    const toUser = await User.findById(toUserId).select('name email');

    if (!fromUser || !toUser) {
      return res.status(404).json({ message: 'One or both users not found' });
    }

    const settledCurrency = currency || group.defaultCurrency;

    // Record as a zero-split expense to track the settlement
    const settlementExpense = await Expense.create({
      group: req.params.id,
      description: `Settlement: ${fromUser.name} paid ${toUser.name}`,
      totalAmount: parseFloat(amount),
      currency: settledCurrency,
      paidBy: fromUserId,
      splitBetween: [{ user: toUserId, amount: parseFloat(amount) }],
      category: 'General',
      splitType: 'custom',
    });

    // Log activity
    await ActivityLog.create({
      group: req.params.id,
      performedBy: req.user._id,
      action: 'settled debt',
      details: `${fromUser.name} paid ${toUser.name} ${settledCurrency} ${parseFloat(amount).toFixed(2)}`,
      metadata: {
        fromUserId,
        toUserId,
        amount: parseFloat(amount),
        currency: settledCurrency,
        expenseId: settlementExpense._id,
      },
    });

    // Send confirmation emails to both sender and receiver (async non-blocking)
    if (group.emailAlertsEnabled !== false) {
      notifyDebtSettlement({
        groupName: group.name,
        fromUser: { name: fromUser.name, email: fromUser.email },
        toUser: { name: toUser.name, email: toUser.email },
        amount: parseFloat(amount),
        currency: settledCurrency,
      });
    }

    res.json({
      message: `Settlement recorded: ${fromUser.name} paid ${toUser.name} ${settledCurrency} ${parseFloat(amount).toFixed(2)}`,
      settlement: settlementExpense,
    });
  } catch (err) {
    console.error('Settle-up error:', err);
    res.status(500).json({ message: 'Failed to record settlement' });
  }
});

module.exports = router;
