const mongoose = require('mongoose');
const express = require('express');
const sanitizeHtml = require('sanitize-html');
const path = require('path');
const Vertex = require('./vertex.model');
const VexList = require('./vexlist.model');
const Reaction = mongoose.model('Reaction'); // Adjust the path as necessary
const router = require('express').Router();
const io = require('../utils/io')();
// console log the pre hooks on reaction
// use json
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Create a new vertex
router.post('/', async (req, res) => {
  try {
    const sanitizedContent = sanitizeHtml(req.body.content);

    // find all parents
    const parents = await Vertex.find({ _id: { $in: req.body.parents } });
    if (parents.length !== req.body.parents.length) {
      return res.status(400).json({ error: 'Some parent IDs are invalid' });
    }

    const reactions = new Reaction();
    await reactions.save();
    const vertex = new Vertex({
      content: sanitizedContent,
      parents: req.body.parents || [],
      children: req.body.children || [],
      subscribers: req.body.subscribers || [],
      reactions: reactions._id,
      createdBy: req.user.id,
      locations: req.body.locations
    });

    await vertex.save();

    // add this vertex to the parents' children array
    for (const parent of parents) {
      parent.children.push(vertex._id);
      await parent.save();
      // Emit socket event for each parent to notify listeners that a new child was added

      if (io) {
        // Get all sockets in the room
        const room = io.sockets.adapter.rooms.get(`vex-${parent._id}`);
        if (room) {
          // For each socket in the room, verify it's authenticated before sending
          for (const socketId of room) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket && socket.user) {
              console.log('sending newChild to socket', socketId);
              // Only send the new vex ID
              socket.emit('newChild', {
                parentId: parent._id,
                childId: vertex._id
              });
            }
          }
        }
      }
    }
    res.status(201).json(vertex);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route for a user to subscribe to a vex
router.post('/:id/subscribe', async (req, res) => {
  try {
    const userId = req.user.id;
    const vertexId = req.params.id;

    // Find the vexlist named 'subscribed' for the current user
    let vexlist = await VexList.findOne({ name: 'subscribed', user: userId });

    // If the vexlist doesn't exist, create it
    if (!vexlist) {
      vexlist = new VexList({
        name: 'subscribed',
        user: userId,
        vertices: []
      });
    }

    // Add the vertex ID to the vexlist if not already present
    if (!vexlist.vertices.includes(vertexId)) {
      vexlist.vertices.push(vertexId);
      await vexlist.save();
    }

    res.status(200).json({ message: 'Subscribed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//delete all vertices
router.get('/delete', async (req, res) => {
  try {
    await Vertex.deleteMany({});
    res.status(200).json({ message: 'All vertices deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all vertices
router.get('/', async (req, res) => {
  try {
    const vertices = await Vertex.find().populate('createdBy', 'username');
    res.status(200).json(vertices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get the initial vertex (first vertex created, typically "hello world")
router.get('/initial', async (req, res) => {
  try {
    const initialVertex = await Vertex.findOne().sort({ createdAt: 1 });
    if (!initialVertex) {
      return res.status(404).json({ error: 'No initial vertex found' });
    }
    res.status(200).json({ id: initialVertex._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single vertex by ID
router.get('/:id', async (req, res) => {
  try {
    const vertex = await Vertex.findById(req.params.id)
      .populate('createdBy', 'username')
      .populate('locations', 'properties.name');

    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }
    res.status(200).json(vertex);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all children of a vertex by ID
router.get('/:id/children/:sorting', async (req, res) => {
  try {
    const vertex = await Vertex.findById(req.params.id);
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }

    // Get user's administrative boundaries
    const userAdminBoundaries = req.user.data?.administrativeBoundaries || [];
    const userBoundaryIds = userAdminBoundaries.map(b => b._id.toString());

    // Fetch all children in a single query with populated fields
    const children = await Vertex.find({
      _id: { $in: vertex.children },
      $or: [
        { locations: { $in: userBoundaryIds } }, // Match user's boundaries
        { locations: { $size: 0 } } // Include vertices with no locations
      ]
    })
      .populate('createdBy', 'username')
      .populate('reactions', 'upvote downvote flagged offtopic join')
      .populate('locations', 'properties.name');

    // Sort based on path parameter
    const sortBy = req.params.sorting;
    if (sortBy === 'upvotes') {
      children.sort((a, b) => {
        // if one has no reactions, put it at the end
        if (!a.reactions || !b.reactions) {
          return 1;
        }

        const aUpvotes = (a.reactions.upvote || []).length;
        const bUpvotes = (b.reactions.upvote || []).length;
        const aDownvotes = (a.reactions.downvote || []).length;
        const bDownvotes = (b.reactions.downvote || []).length;
        const aScore = aUpvotes - aDownvotes;
        const bScore = bUpvotes - bDownvotes;
        return bScore - aScore;
      });
    } else if (sortBy === 'hot') {
      children.sort((a, b) => {
        const aUpvotes = (a.userReactions?.upvote || []).length;
        const bUpvotes = (b.userReactions?.upvote || []).length;
        const aScore = Math.log10(aUpvotes + 1) * 287015 + a.createdAt.getTime() / 1000;
        const bScore = Math.log10(bUpvotes + 1) * 287015 + b.createdAt.getTime() / 1000;
        return bScore - aScore;
      });
    } else {
      // Default sort by date (newest first)
      children.sort((a, b) => b.createdAt - a.createdAt);
    }

    // unpopulate the reactions field
    children.forEach(child => {
      if (!child.reactions) {
        return;
      }
      child.reactions = child.reactions._id;
    });

    res.status(200).json(children);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all parents of a vertex by ID
router.get('/:id/parents', async (req, res) => {
  try {
    const vertex = await Vertex.findById(req.params.id);
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }

    // Fetch all parents in a single query with populated createdBy
    const parents = await Vertex.find({ _id: { $in: vertex.parents } }).populate('createdBy', 'username');
    res.status(200).json(parents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// get ancestry (the ids and content of all parents, grandparents, etc.)
router.get('/:id/ancestry', async (req, res) => {
  try {
    const vertex = await Vertex.findById(req.params.id);
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }

    // first, find { _id: req.params.id }
    const thisone = await Vertex.find({ _id: req.params.id });

    const ancestry = await Vertex.aggregate([
      {
        $match: { _id: thisone[0]._id }
      },
      {
        $graphLookup: {
          from: 'vertexes',
          startWith: '$parents',
          connectFromField: 'parents',
          connectToField: '_id',
          as: 'ancestry',
          depthField: 'depth'
        }
      },
      {
        $unwind: '$ancestry'
      },
      {
        $sort: { 'ancestry.depth': -1 }
      },
      {
        $project: {
          'ancestry._id': 1,
          'ancestry.content': 1
        }
      }
    ]);

    const formattedAncestry = ancestry.map(item => ({
      id: item.ancestry._id,
      content: item.ancestry.content
    }));
    // dont include the root vertex
    ancestry.pop();

    res.status(200).json(formattedAncestry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a vertex by ID
router.put('/:id', async (req, res) => {
  try {
    const sanitizedContent = sanitizeHtml(req.body.content);
    const vertex = await Vertex.findByIdAndUpdate(
      req.params.id,
      {
        content: sanitizedContent,
        parents: req.body.parents || [],
        subscribers: req.body.subscribers || [],
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }
    res.status(200).json(vertex);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all vexes in the vexlist named 'subscribed' for the current user
router.get('/list/:user/subscribed', async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the vexlist named 'subscribed' for the current user
    let vexlist = await VexList.findOne({ name: 'subscribed', user: userId });

    // If the vexlist doesn't exist, create it and return an empty array
    if (!vexlist) {
      vexlist = new VexList({
        name: 'subscribed',
        user: userId,
        vertices: []
      });
      await vexlist.save();
      return res.status(200).json([]);
    }

    // Fetch all vexes in the vexlist
    const vexes = await Vertex.find({ _id: { $in: vexlist.vertices } }).populate('createdBy', 'username');

    res.status(200).json(vexes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a vertex by ID
router.delete('/:id', async (req, res) => {
  try {
    const vertex = await Vertex.findByIdAndDelete(req.params.id);
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }
    res.status(200).json({ message: 'Vertex deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// mount client to /static
router.use('/static', express.static(path.join(__dirname, 'client')));

// return router
module.exports = {
  router: router,
  Vertex: Vertex
};
