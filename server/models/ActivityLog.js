const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'created group',
        'added expense',
        'deleted expense',
        'added member',
        'settled debt',
        'updated group',
      ],
    },
    details: {
      type: String,
      required: true,
      maxlength: [500, 'Details cannot exceed 500 characters'],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Index for fast group activity lookups
activityLogSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
