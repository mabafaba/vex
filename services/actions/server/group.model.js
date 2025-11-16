const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  link: {
    type: String,
    trim: true
  },
  contact: {
    type: String,
    trim: true
  },
  places: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Place'
  }],
  partOf: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
groupSchema.index({ partOf: 1 });
groupSchema.index({ places: 1 });

groupSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;

