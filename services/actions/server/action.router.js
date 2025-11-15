const express = require('express');
const path = require('path');
const router = express.Router();
const Action = require('./action.model');
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

// Create a new action
router.post('/', async (req, res) => {
  try {
    const { name, description, date, contact, picture, pictures, location, organisers, partOf, selectedBoundaryId } = req.body;

    if (!name || !date) {
      return res.status(400).json({ error: 'Name and date are required' });
    }

    if (!location || !location.coordinates || location.coordinates.length !== 2) {
      return res.status(400).json({ error: 'Valid location coordinates are required' });
    }

    const [longitude, latitude] = location.coordinates;

    // Get administrative boundaries for the location
    let administrativeBoundaries = [];
    if (selectedBoundaryId) {
      // Store only the selected boundary
      administrativeBoundaries = [selectedBoundaryId];
    } else {
      // Fallback: get all boundaries (for backward compatibility)
      administrativeBoundaries = await getAdministrativeBoundaries(longitude, latitude);
    }

    // Validate organisers (groups) exist
    if (organisers && organisers.length > 0) {
      const Group = require('./group.model');
      const existingOrganisers = await Group.find({ _id: { $in: organisers } });
      if (existingOrganisers.length !== organisers.length) {
        return res.status(400).json({ error: 'Some organiser IDs are invalid' });
      }
    }

    // Validate partOf (actions) exist
    if (partOf && partOf.length > 0) {
      const existingActions = await Action.find({ _id: { $in: partOf } });
      if (existingActions.length !== partOf.length) {
        return res.status(400).json({ error: 'Some action IDs in partOf are invalid' });
      }
    }

    // Handle pictures - support both old 'picture' field and new 'pictures' array
    let picturesArray = [];
    if (pictures && Array.isArray(pictures)) {
      picturesArray = pictures;
    } else if (picture) {
      // Backward compatibility
      picturesArray = [picture];
    }

    const action = new Action({
      name: sanitizeHtml(name),
      description: description ? sanitizeHtml(description) : '',
      date: new Date(date),
      contact: contact ? sanitizeHtml(contact) : '',
      pictures: picturesArray,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      administrativeBoundaries,
      organisers: organisers || [],
      partOf: partOf || [],
      createdBy: req.user?.id
    });

    await action.save();

    res.status(201).json(action);
  } catch (error) {
    console.error('Error creating action:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all actions
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, organiser, partOf } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    if (organiser) {
      query.organisers = organiser;
    }

    if (partOf) {
      query.partOf = partOf;
    }

    const actions = await Action.find(query)
      .populate('organisers', 'name')
      .populate('partOf', 'name date')
      .populate('administrativeBoundaries', 'properties.name properties.admin_level')
      .populate('createdBy', 'username')
      .sort({ date: 1 });

    res.status(200).json(actions);
  } catch (error) {
    console.error('Error fetching actions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single action by ID
router.get('/:id', async (req, res) => {
  try {
    const action = await Action.findById(req.params.id)
      .populate('organisers', 'name description link contact')
      .populate('partOf', 'name date location')
      .populate('administrativeBoundaries', 'properties.name properties.admin_level')
      .populate('createdBy', 'username');

    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    res.status(200).json(action);
  } catch (error) {
    console.error('Error fetching action:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update an action
router.put('/:id', async (req, res) => {
  try {
    const { name, description, date, contact, picture, pictures, location, organisers, partOf, selectedBoundaryId } = req.body;

    const action = await Action.findById(req.params.id);
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    // Update location and administrative boundaries if location changed
    let administrativeBoundaries = action.administrativeBoundaries;
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

    // Validate organisers if provided
    if (organisers !== undefined) {
      const Group = require('./group.model');
      const existingOrganisers = await Group.find({ _id: { $in: organisers } });
      if (existingOrganisers.length !== organisers.length) {
        return res.status(400).json({ error: 'Some organiser IDs are invalid' });
      }
    }

    // Validate partOf if provided
    if (partOf !== undefined) {
      const existingActions = await Action.find({ _id: { $in: partOf } });
      if (existingActions.length !== partOf.length) {
        return res.status(400).json({ error: 'Some action IDs in partOf are invalid' });
      }
    }

    // Update fields
    if (name !== undefined) {
      action.name = sanitizeHtml(name);
    }
    if (description !== undefined) {
      action.description = sanitizeHtml(description);
    }
    if (date !== undefined) {
      action.date = new Date(date);
    }
    if (contact !== undefined) {
      action.contact = sanitizeHtml(contact);
    }
    if (pictures !== undefined) {
      action.pictures = Array.isArray(pictures) ? pictures : [];
    } else if (picture !== undefined) {
      // Backward compatibility
      action.pictures = picture ? [picture] : [];
    }
    if (location !== undefined && location.coordinates) {
      action.location = {
        type: 'Point',
        coordinates: location.coordinates
      };
      action.administrativeBoundaries = administrativeBoundaries;
    }
    if (organisers !== undefined) {
      action.organisers = organisers;
    }
    if (partOf !== undefined) {
      action.partOf = partOf;
    }

    await action.save();

    res.status(200).json(action);
  } catch (error) {
    console.error('Error updating action:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete an action
router.delete('/:id', async (req, res) => {
  try {
    const action = await Action.findByIdAndDelete(req.params.id);
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    // Remove this action from other actions' partOf arrays
    await Action.updateMany(
      { partOf: req.params.id },
      { $pull: { partOf: req.params.id } }
    );

    res.status(200).json({ message: 'Action deleted successfully' });
  } catch (error) {
    console.error('Error deleting action:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

