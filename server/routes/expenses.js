const express = require('express');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');
const { notifyNewExpense } = require('../utils/emailService');

const router = express.Router();

// @route   POST /api/expenses
// @desc    Add a new expense with auto-split logic
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const {
      groupId,
      description,
      totalAmount,
      currency,
      paidBy,
      splitBetween,
      category,
      splitType,
    } = req.body;

    if (!groupId || !description || !totalAmount || !paidBy) {
      return res.status(400).json({ message: 'groupId, description, totalAmount, and paidBy are required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Verify user is group member
    const isMember = group.members.map(String).includes(String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let finalSplits = [];

    if (splitType === 'equal' || !splitBetween || splitBetween.length === 0) {
      // Equal split among all provided members or all group members
      const splitUserIds =
        splitBetween && splitBetween.length > 0
          ? splitBetween.map((s) => s.user || s)
          : group.members.map(String);

      const amountPerPerson = parseFloat((totalAmount / splitUserIds.length).toFixed(2));
      const remainder = parseFloat((totalAmount - amountPerPerson * splitUserIds.length).toFixed(2));

      finalSplits = splitUserIds.map((userId, index) => ({
        user: userId,
        amount: index === 0 ? parseFloat((amountPerPerson + remainder).toFixed(2)) : amountPerPerson,
      }));
    } else {
      // Custom split - validate amounts sum correctly
      const totalSplit = splitBetween.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
      const diff = Math.abs(totalSplit - parseFloat(totalAmount));

      if (diff > 0.05) {
        return res.status(400).json({
          message: `Split amounts (${totalSplit.toFixed(2)}) don't match total amount (${parseFloat(totalAmount).toFixed(2)})`,
        });
      }

      finalSplits = splitBetween.map((s) => ({
        user: s.user,
        amount: parseFloat(parseFloat(s.amount).toFixed(2)),
      }));
    }

    const expense = await Expense.create({
      group: groupId,
      description,
      totalAmount: parseFloat(totalAmount),
      currency: currency || group.defaultCurrency,
      paidBy,
      splitBetween: finalSplits,
      category: category || 'General',
      splitType: splitType || 'equal',
    });

    await expense.populate('paidBy', 'name email avatar');
    await expense.populate('splitBetween.user', 'name email avatar');

    const paidByUser = await require('../models/User').findById(paidBy).select('name');
    const paidByName = paidByUser ? paidByUser.name : 'Unknown';

    // Log activity
    await ActivityLog.create({
      group: groupId,
      performedBy: req.user._id,
      action: 'added expense',
      details: `${req.user.name} added expense "${description}" for ${currency || group.defaultCurrency} ${parseFloat(totalAmount).toFixed(2)} paid by ${paidByName}`,
      metadata: {
        expenseId: expense._id,
        amount: totalAmount,
        currency: currency || group.defaultCurrency,
        description,
      },
    });

    // Send email notifications to split members excluding the payer (async background)
    if (group.emailAlertsEnabled !== false) {
      const recipients = (expense.splitBetween || [])
        .filter((s) => String(s.user?._id || s.user) !== String(paidBy))
        .map((s) => ({
          email: s.user?.email,
          name: s.user?.name,
          amount: s.amount,
        }))
        .filter((r) => !!r.email);

      notifyNewExpense({
        groupName: group.name,
        expenseTitle: description,
        totalAmount: parseFloat(totalAmount),
        currency: currency || group.defaultCurrency,
        paidByName,
        recipients,
      });
    }

    res.status(201).json({ message: 'Expense added successfully', expense });
  } catch (err) {
    console.error('Add expense error:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Failed to add expense' });
  }
});

// @route   GET /api/expenses/group/:groupId
// @desc    Get all expenses for a group
// @access  Private
router.get('/group/:groupId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.map(String).includes(String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const expenses = await Expense.find({ group: req.params.groupId })
      .populate('paidBy', 'name email avatar')
      .populate('splitBetween.user', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ expenses });
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete an expense
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id).populate('paidBy', 'name');
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const group = await Group.findById(expense.group);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Only the person who added the expense (paidBy) or the group creator can delete
    const canDelete =
      String(expense.paidBy._id) === String(req.user._id) ||
      String(group.createdBy) === String(req.user._id);

    if (!canDelete) {
      return res.status(403).json({ message: 'Only the expense payer or group admin can delete this expense' });
    }

    const expenseDescription = expense.description;
    const expenseAmount = expense.totalAmount;
    const groupId = expense.group;

    await expense.deleteOne();

    // Log activity
    await ActivityLog.create({
      group: groupId,
      performedBy: req.user._id,
      action: 'deleted expense',
      details: `${req.user.name} deleted expense "${expenseDescription}" (${expenseAmount})`,
      metadata: { expenseId: req.params.id, description: expenseDescription },
    });

    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ message: 'Failed to delete expense' });
  }
});

module.exports = router;
