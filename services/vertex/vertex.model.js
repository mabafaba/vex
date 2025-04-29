const mongoose = require('mongoose');

const vertexSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => value.length > 0,
      message: 'Content cannot be empty'
    }
  },
  parents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vertex'
    }
  ],
  children: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vertex'
    }
  ],
  subscribers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    }
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  userReactions:
    {
      flagged: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      offtopic: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      upvote: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      downvote: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

vertexSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Vertex = mongoose.model('Vertex', vertexSchema);

module.exports = Vertex;
