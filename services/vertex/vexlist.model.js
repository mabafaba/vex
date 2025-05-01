const mongoose = require('mongoose');

const VexListSchema = new mongoose.Schema({
  name: { type: String, required: true },
  vertices: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vertex' // Reference to the Vertex model
    }
  ],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

VexListSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('VexList', VexListSchema);
