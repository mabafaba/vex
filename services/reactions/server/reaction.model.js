const mongoose = require('mongoose');
// liveModel require
const liveModel = require('../../utils/livemodelelement');

const reactionLiveModel = (io) => {
  const reactionSchema = new mongoose.Schema({
    upvote: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
      }
    ],
    downvote: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
      }
    ],
    flagged: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
      }
    ],
    offtopic: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
      }
    ],
    join: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
      }
    ]
  });
  reactionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
  });

  reactionSchema.modelName = 'Reaction';

  const Reaction = liveModel('Reaction', reactionSchema, '/vex/reactions/', io);

  return Reaction;
};
module.exports = reactionLiveModel;
