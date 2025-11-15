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
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: false
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    }
  },
  administrativeBoundaries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdministrativeBoundary'
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

// Index for geospatial queries (if location is provided)
groupSchema.index({ location: '2dsphere' });
groupSchema.index({ partOf: 1 });

groupSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;

