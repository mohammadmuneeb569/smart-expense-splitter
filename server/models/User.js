const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: function () {
        const colors = ['6366f1', '8b5cf6', '06b6d4', '10b981', 'f59e0b', 'ef4444'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=${color}&color=fff&size=128&bold=true`;
      },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update avatar when name changes
userSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.avatar) {
    const colors = ['6366f1', '8b5cf6', '06b6d4', '10b981', 'f59e0b', 'ef4444'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    this.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=${color}&color=fff&size=128&bold=true`;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);