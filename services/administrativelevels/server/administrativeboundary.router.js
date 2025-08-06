const express = require('express');
const path = require('path');
const router = express.Router();
const { AdministrativeBoundary } = require('./administrativeboundary.model');

const findLowestAdminBoundary = async function (longitude, latitude) {
  console.log('findLowestAdminBoundary', longitude, latitude);
  // Find all boundaries that contain the point, sorted by admin_level in descending order (highest number first)
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
    .sort({ 'properties.admin_level': -1 }) // Highest admin_level (most specific) first
    // .limit(12) // We only need the first one since it's sorted
    .select('properties.name properties.admin_level geometry')
    .lean();

  console.log('boundaries', boundaries);

  return boundaries;
};

const findAdminBoundaries = async function (longitude, latitude) {
  console.log('findAdminBoundaries', longitude, latitude);

  // Find level 2 boundary containing the point
  const level2Boundary = await AdministrativeBoundary.findOne({
    geometry: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      }
    },
    'properties.admin_level': '2'
  }).select('_id properties.name properties.admin_level')
    .lean();

  if (!level2Boundary) {
    return [];
  }

  const results = [level2Boundary];
  let currentBoundary = level2Boundary;
  let currentLevel = 2;
  let possibleCandidates = false;
  while (currentLevel < 12) {
    currentLevel++;

    // First try direct children at next level
    const nextBoundary = await AdministrativeBoundary.findOne({
      ...(possibleCandidates !== false ? { _id: { $in: possibleCandidates } } : {}),
      'properties.admin_level': (currentLevel).toString(),
      geometry: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          }
        }
      }
    }).select('_id children properties.name properties.admin_level')
      .lean();
    console.log('nextBoundary at level', currentLevel, nextBoundary ? nextBoundary.properties.name : 'none');

    if (nextBoundary) {
      possibleCandidates = nextBoundary.children;
      results.push(nextBoundary);
      currentBoundary = nextBoundary;
    } else {
      currentBoundary = null;
    }
  }
  // remove children
  results.forEach(result => {
    delete result.children;
  });
  return results;
};

// serve static files
router.use('/static', express.static(path.join(__dirname, '../client')));
console.log('/static maps to', path.join(__dirname, '../client'));
/**
 * @route GET /api/admin-boundaries/lowest
 * @description Find the lowest (most specific) administrative boundary containing a point
 * @param {number} lat - Latitude of the point
 * @param {number} lng - Longitude of the point
 * @returns {Object} The administrative boundary containing the point
 */
router.get('/point', async (req, res) => {
  console.log('router.get /point');
  try {
    const { lat, lng } = req.query;

    // Validate parameters
    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Missing required parameters: lat and lng must be provided'
      });
    }

    // Convert to numbers and validate
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    console.log('latitude', latitude);
    console.log('longitude', longitude);
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid coordinates: lat and lng must be valid numbers'
      });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: 'Invalid coordinates: lat must be between -90 and 90, lng must be between -180 and 180'
      });
    }

    const boundaries = await findAdminBoundaries(longitude, latitude);

    if (!boundaries) {
      return res.status(404).json({
        error: 'No administrative boundary found containing these coordinates'
      });
    }

    res.json({
      boundaries
    });
  } catch (error) {
    console.error('Error finding admin boundary:', error);
    res.status(500).json({
      error: 'Internal server error while processing request'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Missing required parameter: id must be provided'
      });
    }

    const boundary = await AdministrativeBoundary.findById(id).select('-geometry');

    if (!boundary) {
      return res.status(404).json({
        error: 'No administrative boundary found with this id'
      });
    }

    res.json(boundary);
  } catch (error) {
    console.error('Error finding admin boundary by id:', error);
    res.status(500).json({
      error: 'Internal server error while processing request'
    });
  }
});

router.get('/:id/geometry', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Missing required parameter: id must be provided'
      });
    }

    const boundary = await AdministrativeBoundary.findById(id);

    if (!boundary) {
      return res.status(404).json({
        error: 'No administrative boundary found with this id'
      });
    }

    res.json(boundary);
  } catch (error) {
    console.error('Error finding admin boundary by id:', error);
    res.status(500).json({
      error: 'Internal server error while processing request'
    });
  }
});

router.get('/:id/name', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Missing required parameter: id must be provided'
      });
    }

    const boundary = await AdministrativeBoundary.findById(id);

    if (!boundary) {
      return res.status(404).json({
        error: 'No administrative boundary found with this id'
      });
    }

    res.json({
      name: boundary.properties.name
    });
  } catch (error) {
    console.error('Error finding admin boundary name by id:', error);
    res.status(500).json({
      error: 'Internal server error while processing request'
    });
  }
});

console.log('router', router);

module.exports = {
  router
};
