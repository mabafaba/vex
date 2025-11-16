const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  contact: {
    type: String,
    trim: true
  },
  pictures: [{
    type: String // URL or path to picture
  }],
  places: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Place'
  }],
  organisers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  partOf: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Action'
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
actionSchema.index({ date: 1 });
actionSchema.index({ organisers: 1 });
actionSchema.index({ partOf: 1 });
actionSchema.index({ places: 1 });

actionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Action = mongoose.model('Action', actionSchema);

module.exports = Action;

