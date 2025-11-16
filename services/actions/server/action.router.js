const express = require('express');
const path = require('path');
const http = require('http');
const router = express.Router();
const Action = require('./action.model');
const sanitizeHtml = require('sanitize-html');

router.use(express.json({ limit: '12mb' }));

// Serve static files from client directory
router.use('/static', express.static(path.join(__dirname, '../client')));

// Helper function to get place IDs from places service
const getPlaceIds = async (locationDataArray, req) => {
  if (!locationDataArray || !Array.isArray(locationDataArray) || locationDataArray.length === 0) {
    return [];
  }

  return new Promise((resolve) => {
    const host = req.get('host') || 'localhost:3005';
    const protocol = req.protocol;
    let port = 3005; // Default port
    let hostname = 'localhost';

    if (host.includes(':')) {
      const parts = host.split(':');
      hostname = parts[0];
      port = parseInt(parts[1], 10) || (protocol === 'https' ? 443 : 80);
    } else {
      hostname = host;
      port = protocol === 'https' ? 443 : 80;
    }

    const postData = JSON.stringify({ nominatimData: locationDataArray });

    const options = {
      hostname: hostname,
      port: port,
      path: '/vex/places/create-or-get',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': req.headers.cookie || ''
      }
    };

    const httpReq = http.request(options, (httpRes) => {
      let data = '';
      httpRes.on('data', (chunk) => {
        data += chunk;
      });
      httpRes.on('end', () => {
        if (httpRes.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            resolve(result.placeIds || []);
          } catch (error) {
            console.error('Error parsing places service response:', error);
            resolve([]);
          }
        } else {
          console.error('Error getting place IDs from places service:', httpRes.statusCode, data);
          resolve([]);
        }
      });
    });

    httpReq.on('error', (error) => {
      console.error('Error calling places service:', error);
      resolve([]);
    });

    httpReq.write(postData);
    httpReq.end();
  });
};

// Create a new action
router.post('/', async (req, res) => {
  try {
    const { name, description, date, contact, picture, pictures, locationData, organisers, partOf } = req.body;

    if (!name || !date) {
      return res.status(400).json({ error: 'Name and date are required' });
    }

    // Get place IDs from places service
    const placeIds = await getPlaceIds(locationData || [], req);

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
      places: placeIds,
      organisers: organisers || [],
      partOf: partOf || [],
      createdBy: req.user?.id
    });

    await action.save();

    // Populate places for response
    await action.populate('places', 'properties.displayName geometry');

    res.status(201).json(action);
  } catch (error) {
    console.error('Error creating action:', error);
    res.status(400).json({ error: error.message });
  }
});

// Search actions by name
router.get('/search', async (req, res) => {
  try {
    const { q, excludeId } = req.query;
    if (!q || q.trim() === '') {
      return res.status(200).json([]);
    }

    const query = {
      name: { $regex: q, $options: 'i' }
    };

    // Exclude a specific action (useful when editing)
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const actions = await Action.find(query)
      .select('_id name date')
      .sort({ date: 1 })
      .limit(10);

    res.status(200).json(actions);
  } catch (error) {
    console.error('Error searching actions:', error);
    res.status(500).json({ error: error.message });
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
      .populate('places', 'properties.displayName geometry')
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
      .populate('partOf', 'name date places')
      .populate('places', 'properties.displayName geometry properties.nominatimData')
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
    const { name, description, date, contact, picture, pictures, locationData, organisers, partOf } = req.body;

    const action = await Action.findById(req.params.id);
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    // Update places if locationData is provided
    if (locationData !== undefined) {
      const placeIds = await getPlaceIds(locationData || [], req);
      action.places = placeIds;
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
    if (organisers !== undefined) {
      action.organisers = organisers;
    }
    if (partOf !== undefined) {
      action.partOf = partOf;
    }

    await action.save();

    // Populate places for response
    await action.populate('places', 'properties.displayName geometry');

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

