const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group reference is required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [2, 'Description must be at least 2 characters'],
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    currency: {
      type: String,
      default: 'PKR',
      uppercase: true,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'PaidBy user reference is required'],
    },
    splitBetween: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: [0, 'Split amount cannot be negative'],
        },
        _id: false,
      },
    ],
    category: {
      type: String,
      default: 'General',
      enum: [
        'General',
        'Food & Drink',
        'Transportation',
        'Entertainment',
        'Utilities',
        'Shopping',
        'Healthcare',
        'Travel',
        'Rent',
        'Other',
      ],
    },
    splitType: {
      type: String,
      enum: ['equal', 'custom'],
      default: 'equal',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
