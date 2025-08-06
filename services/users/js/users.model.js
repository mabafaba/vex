const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  token: { type: String },
  role: [{ type: String, default: 'basic' }],
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  }
}, {
  strict: false,
  // Enable toJSON transform
  toJSON: { getters: true },
  // Enable toObject transform
  toObject: { getters: true }
});

// Ensure data modifications are detected
userSchema.pre('save', function (next) {
  this.markModified('data');
  next();
});

module.exports = mongoose.model('user', userSchema);
