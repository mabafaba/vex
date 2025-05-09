const mongoose = require('mongoose');
// liveModel require
const liveModel = require('../../utils/livemodelelement');

reactionLiveModel = (io) => {
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

  reactionSchema.methods.addReaction = function (userId, type) {
    if (this[type]) {
      if (!this[type].includes(userId)) {
        this[type].push(userId);
      }
    } else {
      throw new Error(`Invalid reaction type: ${type}`);
    }
  };

  const Reaction = liveModel('Reaction', reactionSchema, io,

    onSend = (doc) => {
    // Add any additional processing before sending the document
      console.log('Sending document:', doc);
      return doc;
    },

    onReceive = (document, liveObject) => {
    // Add any additional processing when receiving the document
    // console.log('Received live data:', liveObject);
    // update mongoose document to be identical to liveObject
      for (const key in liveObject) {
        if (key !== '_id' && key !== '__v') {
          document[key] = liveObject[key];
        }
      }

      return document;
    }
  );

  return Reaction;
};
module.exports = reactionLiveModel;
