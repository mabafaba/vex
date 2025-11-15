const express = require('express');
const path = require('path');
const router = express.Router();
const Group = require('./group.model');
const { AdministrativeBoundary } = require('../../administrativelevels/server/administrativeboundary.model');
const sanitizeHtml = require('sanitize-html');

router.use(express.json({ limit: '12mb' }));

// Serve static files from client directory
router.use('/static', express.static(path.join(__dirname, '../client')));

// Helper function to get administrative boundaries for a location
const getAdministrativeBoundaries = async (longitude, latitude) => {
  const boundaries = await AdministrativeBoundary.find({
    geometry: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      }
    }
  })
    .sort({ 'properties.admin_level': -1 })
    .select('_id properties.name properties.admin_level')
    .lean();

  return boundaries.map(b => b._id);
};

// Create a new group
router.post('/', async (req, res) => {
  try {
    let { name, description, link, contact, location, partOf, selectedBoundaryId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    let administrativeBoundaries = [];
    if (location && location.coordinates && location.coordinates.length === 2) {
      if (selectedBoundaryId) {
        // Store only the selected boundary
        administrativeBoundaries = [selectedBoundaryId];
      } else {
        // Fallback: get all boundaries (for backward compatibility)
        const [longitude, latitude] = location.coordinates;
        administrativeBoundaries = await getAdministrativeBoundaries(longitude, latitude);
      }
    }

    // Validate partOf (groups) exist
    partOf = partOf ? partOf.filter(id => id.trim() !== '') : [];
    if (partOf && partOf.length > 0 ) {
      const existingGroups = await Group.find({ _id: { $in: partOf } });
      if (existingGroups.length !== partOf.length) {
        return res.status(400).json({ error: 'Some group IDs in partOf are invalid' });
      }
    }

    const group = new Group({
      name: sanitizeHtml(name),
      description: description ? sanitizeHtml(description) : '',
      link: link || '',
      contact: contact ? sanitizeHtml(contact) : '',
      location: location && location.coordinates ? {
        type: 'Point',
        coordinates: location.coordinates
      } : undefined,
      administrativeBoundaries,
      partOf: partOf || [],
      createdBy: req.user?.id
    });

    await group.save();

    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all groups
router.get('/', async (req, res) => {
  try {
    const { partOf } = req.query;
    const query = {};

    if (partOf) {
      query.partOf = partOf;
    }

    const groups = await Group.find(query)
      .populate('partOf', 'name')
      .populate('administrativeBoundaries', 'properties.name properties.admin_level')
      .populate('createdBy', 'username')
      .sort({ name: 1 });

    res.status(200).json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single group by ID
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('partOf', 'name description link contact')
      .populate('administrativeBoundaries', 'properties.name properties.admin_level')
      .populate('createdBy', 'username');

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a group
router.put('/:id', async (req, res) => {
  try {
    const { name, description, link, contact, location, partOf, selectedBoundaryId } = req.body;

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Update location and administrative boundaries if location changed
    let administrativeBoundaries = group.administrativeBoundaries;
    if (location && location.coordinates && location.coordinates.length === 2) {
      if (selectedBoundaryId) {
        // Store only the selected boundary
        administrativeBoundaries = [selectedBoundaryId];
      } else {
        // Fallback: get all boundaries (for backward compatibility)
        const [longitude, latitude] = location.coordinates;
        administrativeBoundaries = await getAdministrativeBoundaries(longitude, latitude);
      }
    }

    // Validate partOf if provided
    if (partOf !== undefined) {
      const existingGroups = await Group.find({ _id: { $in: partOf } });
      if (existingGroups.length !== partOf.length) {
        return res.status(400).json({ error: 'Some group IDs in partOf are invalid' });
      }
    }

    // Update fields
    if (name !== undefined) {
      group.name = sanitizeHtml(name);
    }
    if (description !== undefined) {
      group.description = sanitizeHtml(description);
    }
    if (link !== undefined) {
      group.link = link;
    }
    if (contact !== undefined) {
      group.contact = sanitizeHtml(contact);
    }
    if (location !== undefined) {
      if (location.coordinates && location.coordinates.length === 2) {
        group.location = {
          type: 'Point',
          coordinates: location.coordinates
        };
        group.administrativeBoundaries = administrativeBoundaries;
      } else {
        group.location = undefined;
        group.administrativeBoundaries = [];
      }
    }
    if (partOf !== undefined) {
      group.partOf = partOf;
    }

    await group.save();

    res.status(200).json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete a group
router.delete('/:id', async (req, res) => {
  try {
    const group = await Group.findByIdAndDelete(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Remove this group from other groups' partOf arrays
    await Group.updateMany(
      { partOf: req.params.id },
      { $pull: { partOf: req.params.id } }
    );

    // Remove this group from actions' organisers arrays
    const Action = require('./action.model');
    await Action.updateMany(
      { organisers: req.params.id },
      { $pull: { organisers: req.params.id } }
    );

    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

