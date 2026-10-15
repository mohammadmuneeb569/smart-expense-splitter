const express = require('express');
const Group = require('../models/Group');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');
const { simplifyDebts } = require('../utils/simplifyDebts');
const { convertCurrency } = require('../utils/currencyConverter');
const { generateGroupPdfReport } = require('../utils/pdfGenerator');

const router = express.Router();

// @route   GET /api/groups
// @desc    Get all groups for the current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ updatedAt: -1 });

    res.json({ groups });
  } catch (err) {
    console.error('Get groups error:', err);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
});

// @route   POST /api/groups
// @desc    Create a new group
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, defaultCurrency, icon } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const group = await Group.create({
      name,
      description: description || '',
      defaultCurrency: defaultCurrency || 'PKR',
      icon: icon || '👥',
      createdBy: req.user._id,
      members: [req.user._id],
    });

    await group.populate('members', 'name email avatar');
    await group.populate('createdBy', 'name email avatar');

    // Log activity
    await ActivityLog.create({
      group: group._id,
      performedBy: req.user._id,
      action: 'created group',
      details: `${req.user.name} created the group "${name}"`,
      metadata: { groupName: name, currency: defaultCurrency },
    });

    res.status(201).json({ message: 'Group created successfully', group });
  } catch (err) {
    console.error('Create group error:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Failed to create group' });
  }
});

// @route   GET /api/groups/:id
// @desc    Get a specific group by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member
    const isMember = group.members.some((m) => String(m._id) === String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    res.json({ group });
  } catch (err) {
    console.error('Get group error:', err);
    res.status(500).json({ message: 'Failed to fetch group' });
  }
});

// @route   POST /api/groups/:id/members
// @desc    Add a member to a group by email
// @access  Private
router.post('/:id/members', protect, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if requester is a member
    const isMember = group.members.map(String).includes(String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    if (!userToAdd) {
      return res.status(404).json({ message: 'No user found with that email address' });
    }

    if (group.members.map(String).includes(String(userToAdd._id))) {
      return res.status(409).json({ message: 'This user is already a member of the group' });
    }

    group.members.push(userToAdd._id);
    await group.save();
    await group.populate('members', 'name email avatar');
    await group.populate('createdBy', 'name email avatar');

    // Log activity
    await ActivityLog.create({
      group: group._id,
      performedBy: req.user._id,
      action: 'added member',
      details: `${req.user.name} added ${userToAdd.name} to the group`,
      metadata: { addedUserId: userToAdd._id, addedUserName: userToAdd.name },
    });

    res.json({ message: `${userToAdd.name} added to the group`, group });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ message: 'Failed to add member' });
  }
});

// @route   GET /api/groups/:id/export-pdf
// @desc    Generate and stream PDF Statement Report
// @access  Private
router.get('/:id/export-pdf', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some((m) => String(m._id) === String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    const expenses = await Expense.find({ group: req.params.id })
      .populate('paidBy', 'name email avatar')
      .populate('splitBetween.user', 'name email avatar')
      .sort({ createdAt: -1 });

    // Compute net balances with currency conversion
    const balanceMap = {};
    group.members.forEach((member) => {
      balanceMap[String(member._id)] = {
        userId: String(member._id),
        name: member.name,
        email: member.email,
        avatar: member.avatar,
        balance: 0,
      };
    });

    for (const expense of expenses) {
      const targetCurrency = group.defaultCurrency;
      const convertedTotal = await convertCurrency(
        expense.totalAmount,
        expense.currency,
        targetCurrency
      );

      const paidById = String(expense.paidBy._id);
      if (balanceMap[paidById]) {
        balanceMap[paidById].balance += convertedTotal;
      }

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

    const memberSummaries = balances.map((b) => ({
      userId: b.userId,
      name: b.name,
      email: b.email,
      netBalance: parseFloat(b.balance.toFixed(2)),
      currency: group.defaultCurrency,
    }));

    const safeGroupName = group.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Group_Statement_${safeGroupName}.pdf"`
    );

    generateGroupPdfReport(
      {
        group,
        memberSummaries,
        transactions,
        expenses,
      },
      res
    );
  } catch (err) {
    console.error('Export PDF error:', err);
    res.status(500).json({ message: 'Failed to generate PDF statement report', error: err.message });
  }
});

// @route   PATCH /api/groups/:id/settings
// @desc    Update group settings (e.g., email alerts toggle)
// @access  Private
router.patch('/:id/settings', protect, async (req, res) => {
  try {
    const { emailAlertsEnabled } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some((m) => String(m) === String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (emailAlertsEnabled !== undefined) {
      group.emailAlertsEnabled = Boolean(emailAlertsEnabled);
    }

    await group.save();
    await group.populate('members', 'name email avatar');
    await group.populate('createdBy', 'name email avatar');

    res.json({ message: 'Group settings updated successfully', group });
  } catch (err) {
    console.error('Update group settings error:', err);
    res.status(500).json({ message: 'Failed to update group settings' });
  }
});

module.exports = router;
