const mongoose = require('mongoose');
const express = require('express');
const sanitizeHtml = require('sanitize-html');
const path = require('path');

const vertexSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: (value) => value.length > 0,
            message: 'Content cannot be empty',
        },
    },
    parents: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vertex',
        },
    ],
    children: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vertex',
        },
    ],
    subscribers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
        },

    ],
    // createdBy: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'User',
    //     required: true,
    // },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

vertexSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Vertex = mongoose.model('Vertex', vertexSchema);


const router = require('express').Router();
// use json
router.use(express.json());
router.use(express.urlencoded({ extended: true }));


// Create a new vertex
router.post('/', async (req, res) => {
    console.log(req.body);
    try {
        const sanitizedContent = sanitizeHtml(req.body.content);

        // find all parents
        const parents = await Vertex.find({ _id: { $in: req.body.parents } });
        if (parents.length !== req.body.parents.length) {
            return res.status(400).json({ error: 'Some parent IDs are invalid' });
        }


        const vertex = new Vertex({
            content: sanitizedContent,
            parents: req.body.parents || [],
            children: req.body.children || [],
            subscribers: req.body.subscribers || [],
            createdBy: req.body.createdBy,
        });
        await vertex.save();

        // add this vertex to the parents' children array
        for (const parent of parents) {
            parent.children.push(vertex._id);
            await parent.save();
            
            // Emit socket event for each parent to notify listeners that a new child was added
            const io = req.app.get('io');
            if (io) {
                io.to(`vex-${parent._id}`).emit('newChild', {
                    parentId: parent._id,
                    child: vertex
                });
            }
        }
        res.status(201).json(vertex);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get all vertices
router.get('/', async (req, res) => {
    try {
        const vertices = await Vertex.find();
        res.status(200).json(vertices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get a single vertex by ID
router.get('/:id', async (req, res) => {
    try {
        const vertex = await Vertex.findById(req.params.id)
        if (!vertex) {
            return res.status(404).json({ error: 'Vertex not found' });
        }
        res.status(200).json(vertex);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all children of a vertex by ID
router.get('/:id/children', async (req, res) => {
    try {
        const vertex = await Vertex.findById(req.params.id);
        if (!vertex) {
            return res.status(404).json({ error: 'Vertex not found' });
        }

        // Fetch all children in a single query
        const children = await Vertex.find({ _id: { $in: vertex.children } });
        res.status(200).json(children);
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
                updatedAt: Date.now(),
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
    Vertex: Vertex,
};
