const express = require('express');
const ActivityLog = require('../models/ActivityLog');
const Group = require('../models/Group');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/groups/:id/activities
// @desc    Get activity feed for a group
// @access  Private
router.get('/:id/activities', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.map(String).includes(String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const activities = await ActivityLog.find({ group: req.params.id })
      .populate('performedBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments({ group: req.params.id });

    res.json({
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get activities error:', err);
    res.status(500).json({ message: 'Failed to fetch activities' });
  }
});

module.exports = router;
