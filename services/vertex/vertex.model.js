const mongoose = require('mongoose');
const Reaction = mongoose.model('Reaction'); // Adjust the path as necessary
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
    ref: 'user',
    required: false
  },
  reactions: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reaction',
    required: true
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
  // create a new reaction document if it doesn't exist
  if (!this.reactions) {
    const reaction = new Reaction();
    //save
    reaction.save()
      .then((savedReaction) => {
        this.reactions = savedReaction._id;
        next();
      })
      .catch((err) => {
        console.error('Error saving reaction document:', err);
        next(err);
      });
  }
  next();
});

const Vertex = mongoose.model('Vertex', vertexSchema);

// if no vertex is found, create an initial one now
Vertex.findOne({}).then( async (vertex) => {
  if (!vertex) {
    const reactions = new Reaction();
    await reactions.save();
    const initialVertex = new Vertex({
      content: 'hello world',
      parents: [],
      children: [],
      subscribers: [],
      createdBy: null,
      reactions: reactions._id
    });
    await initialVertex.save();
    console.log('Initial vertex created:', initialVertex);
  }
});

module.exports = Vertex;
