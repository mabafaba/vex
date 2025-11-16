const express = require('express');
const path = require('path');
const http = require('http');
const router = express.Router();
const Group = require('./group.model');
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

// Create a new group
router.post('/', async (req, res) => {
  try {
    const { name, description, link, contact, locationData, partOf } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Get place IDs from places service
    const placeIds = await getPlaceIds(locationData || [], req);

    // Validate partOf (groups) exist
    const filteredPartOf = partOf ? partOf.filter(id => id.trim() !== '') : [];
    if (filteredPartOf && filteredPartOf.length > 0) {
      const existingGroups = await Group.find({ _id: { $in: filteredPartOf } });
      if (existingGroups.length !== filteredPartOf.length) {
        return res.status(400).json({ error: 'Some group IDs in partOf are invalid' });
      }
    }

    const group = new Group({
      name: sanitizeHtml(name),
      description: description ? sanitizeHtml(description) : '',
      link: link || '',
      contact: contact ? sanitizeHtml(contact) : '',
      places: placeIds,
      partOf: filteredPartOf || [],
      createdBy: req.user?.id
    });

    await group.save();

    // Populate places for response
    await group.populate('places', 'properties.displayName geometry');

    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(400).json({ error: error.message });
  }
});

// Search groups by name
router.get('/search', async (req, res) => {
  try {
    const { q, excludeId } = req.query;
    if (!q || q.trim() === '') {
      return res.status(200).json([]);
    }

    const query = {
      name: { $regex: q, $options: 'i' }
    };

    // Exclude a specific group (useful when editing)
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const groups = await Group.find(query)
      .select('_id name')
      .sort({ name: 1 })
      .limit(10);

    res.status(200).json(groups);
  } catch (error) {
    console.error('Error searching groups:', error);
    res.status(500).json({ error: error.message });
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
      .populate('places', 'properties.displayName geometry')
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
      .populate('places', 'properties.displayName geometry properties.nominatimData')
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
    const { name, description, link, contact, locationData, partOf } = req.body;

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Update places if locationData is provided
    if (locationData !== undefined) {
      const placeIds = await getPlaceIds(locationData || [], req);
      group.places = placeIds;
    }

    // Validate partOf if provided
    if (partOf !== undefined) {
      const filteredPartOf = partOf ? partOf.filter(id => id.trim() !== '') : [];
      const existingGroups = await Group.find({ _id: { $in: filteredPartOf } });
      if (existingGroups.length !== filteredPartOf.length) {
        return res.status(400).json({ error: 'Some group IDs in partOf are invalid' });
      }
      group.partOf = filteredPartOf;
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

    await group.save();

    // Populate places for response
    await group.populate('places', 'properties.displayName geometry');

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

