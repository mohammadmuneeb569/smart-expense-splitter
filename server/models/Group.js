const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      minlength: [2, 'Group name must be at least 2 characters'],
      maxlength: [100, 'Group name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    defaultCurrency: {
      type: String,
      default: 'PKR',
      uppercase: true,
      enum: {
        values: ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR', 'CAD', 'AUD'],
        message: '{VALUE} is not a supported currency',
      },
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    icon: {
      type: String,
      default: '👥',
    },
    emailAlertsEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Ensure creator is always a member
groupSchema.pre('save', function (next) {
  if (!this.members.map(String).includes(String(this.createdBy))) {
    this.members.push(this.createdBy);
  }
  next();
});

module.exports = mongoose.model('Group', groupSchema);
