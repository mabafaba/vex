const express = require('express');
const path = require('path');
const router = express.Router();
const Place = require('./place.model');
const { AdministrativeBoundary } = require('../../administrativelevels/server/administrativeboundary.model');

router.use(express.json({ limit: '12mb' }));

// Serve static files from client directory
router.use('/static', express.static(path.join(__dirname, '../client')));

// Helper function to find or create a Place from an AdministrativeBoundary
const findOrCreatePlaceFromBoundary = async (boundary) => {
  // Check if a Place already exists for this boundary (by osm_id)
  const osmId = boundary.properties.osm_id || boundary.properties.osm_way_id; // Support both for backward compatibility
  const existingPlace = await Place.findOne({
    'properties.osmId': osmId
  });

  if (existingPlace) {
    return existingPlace;
  }

  // Get the parent boundary (next bigger admin boundary)
  // Administrative boundaries have a parents array with the next bigger boundary
  let parentPlaceId = null;
  if (boundary.parents && boundary.parents.length > 0) {
    // Get the first parent (should be the next bigger admin boundary)
    const parentBoundary = await AdministrativeBoundary.findById(boundary.parents[boundary.parents.length - 1]);
    if (parentBoundary) {
      // Recursively find or create the parent place
      const parentPlace = await findOrCreatePlaceFromBoundary(parentBoundary);
      parentPlaceId = parentPlace._id;
    }
  }

  // Create a new Place from the boundary
  const place = new Place({
    type: 'Feature',
    properties: {
      nominatimData: {
        osm_id: osmId,
        osm_type: 'way',
        display_name: boundary.properties.name || 'Administrative Boundary'
      },
      osmId: osmId,
      osmType: 'way',
      displayName: boundary.properties.name || 'Administrative Boundary'
    },
    geometry: boundary.geometry,
    parents: parentPlaceId ? [parentPlaceId] : []
  });

  await place.save();
  return place;
};

// Helper function to get the parent place for a location
// Returns the smallest admin boundary (highest admin_level number) that contains the point
const getParentPlaces = async (longitude, latitude) => {
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
    .sort({ 'properties.admin_level': -1 }) // Sort descending: highest admin_level (smallest boundary) first
    .limit(1) // Only get the smallest boundary
    .lean();

  // If we found a boundary, find or create its Place and return as single parent
  if (boundaries.length > 0) {
    const place = await findOrCreatePlaceFromBoundary(boundaries[0]);
    return [place._id];
  }

  return [];
};

// Create or get places from Nominatim data (returns array of place IDs)
// Accepts either single nominatimData object or array of nominatimData objects
router.post('/create-or-get', async (req, res) => {
  try {
    const { nominatimData } = req.body;

    if (!nominatimData) {
      return res.status(400).json({ error: 'Nominatim data is required' });
    }

    // Handle both single object and array
    const dataArray = Array.isArray(nominatimData) ? nominatimData : [nominatimData];
    const placeIds = [];

    for (const data of dataArray) {
      const osmId = data.osm_id?.toString();
      const osmType = data.osm_type;
      const displayName = data.display_name;
      const lat = parseFloat(data.lat);
      const lon = parseFloat(data.lon);

      if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        continue; // Skip invalid entries
      }

      // First check if an admin boundary exists with this osm_id
      // If it does, use the Place created from that boundary instead of creating a Point
      let existingPlace = null;
      if (osmId) {
        // Check if there's an admin boundary with this osm_id (check both osm_id and osm_way_id for compatibility)
        const adminBoundary = await AdministrativeBoundary.findOne({
          $or: [
            { 'properties.osm_id': osmId },
            { 'properties.osm_way_id': osmId }
          ]
        }).lean();

        if (adminBoundary) {
          // Use the Place created from this admin boundary
          existingPlace = await findOrCreatePlaceFromBoundary(adminBoundary);
        } else {
          // No admin boundary found, check if a Place already exists by osmId/osmType
          if (osmType) {
            existingPlace = await Place.findOne({
              'properties.osmId': osmId,
              'properties.osmType': osmType
            });
          }

          // If not found, try exact coordinate match
          if (!existingPlace) {
            existingPlace = await Place.findOne({
              'geometry.type': 'Point',
              'geometry.coordinates': [lon, lat],
              'properties.displayName': displayName
            });
          }
        }
      }

      if (existingPlace) {
        placeIds.push(existingPlace._id);
      } else {
        // Create new Point place (no matching admin boundary found)
        const parentPlaces = await getParentPlaces(lon, lat);
        const place = new Place({
          type: 'Feature',
          properties: {
            nominatimData: data,
            osmId: osmId || null,
            osmType: osmType || null,
            displayName: displayName || 'Unknown Place'
          },
          geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          parents: parentPlaces
        });
        await place.save();
        placeIds.push(place._id);
      }
    }

    res.status(200).json({ placeIds });
  } catch (error) {
    console.error('Error creating/getting places:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create a new place
router.post('/', async (req, res) => {
  try {
    const { nominatimData } = req.body;

    if (!nominatimData) {
      return res.status(400).json({ error: 'Nominatim data is required' });
    }

    // Extract key data from Nominatim result
    const osmId = nominatimData.osm_id?.toString();
    const osmType = nominatimData.osm_type;
    const displayName = nominatimData.display_name;
    const lat = parseFloat(nominatimData.lat);
    const lon = parseFloat(nominatimData.lon);

    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Valid coordinates are required in Nominatim data' });
    }

    // Find all administrative boundaries that contain this point and get their Places
    const parentPlaces = await getParentPlaces(lon, lat);

    // Create the place as a GeoJSON Feature
    const place = new Place({
      type: 'Feature',
      properties: {
        nominatimData,
        osmId: osmId || null,
        osmType: osmType || null,
        displayName: displayName || 'Unknown Place',
        createdBy: req.user?.id
      },
      geometry: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      parents: parentPlaces
    });

    await place.save();

    // Populate parents for the response
    await place.populate('parents', 'properties.displayName geometry');

    res.status(201).json(place);
  } catch (error) {
    console.error('Error creating place:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all places
router.get('/', async (req, res) => {
  try {
    const places = await Place.find()
      // Exclude geometry and nominatimData to reduce payload size (15MB+ with geometries)
      .select('-geometry -properties.nominatimData')
      .populate('properties.displayName properties.osmId properties.osmType')
      .populate('properties.createdBy', 'username')
      .populate('parents', 'properties.displayName') // Only get displayName for parents, not geometry
      .sort({ createdAt: -1 });

    res.status(200).json(places);
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single place by ID
router.get('/:id', async (req, res) => {
  try {
    const place = await Place.findById(req.params.id)
      .populate( 'properties.displayName properties.osmId properties.osmType')
      .populate('properties.createdBy', 'username');

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.status(200).json(place);
  } catch (error) {
    console.error('Error fetching place:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a place
router.put('/:id', async (req, res) => {
  try {
    const { nominatimData } = req.body;

    const place = await Place.findById(req.params.id);
    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    // If nominatimData is provided, update the place
    if (nominatimData) {
      const osmId = nominatimData.osm_id?.toString();
      const osmType = nominatimData.osm_type;
      const displayName = nominatimData.display_name;
      const lat = parseFloat(nominatimData.lat);
      const lon = parseFloat(nominatimData.lon);

      if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: 'Valid coordinates are required in Nominatim data' });
      }

      // Find all administrative boundaries that contain this point and get their Places
      const parentPlaces = await getParentPlaces(lon, lat);

      place.properties.nominatimData = nominatimData;
      place.properties.osmId = osmId || null;
      place.properties.osmType = osmType || null;
      place.properties.displayName = displayName || 'Unknown Place';
      place.geometry = {
        type: 'Point',
        coordinates: [lon, lat]
      };
      place.parents = parentPlaces;
    }

    await place.save();

    // Populate for response
    await place.populate('parents', 'properties.displayName geometry');

    res.status(200).json(place);
  } catch (error) {
    console.error('Error updating place:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete a place
router.delete('/:id', async (req, res) => {
  try {
    const place = await Place.findByIdAndDelete(req.params.id);
    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.status(200).json({ message: 'Place deleted successfully' });
  } catch (error) {
    console.error('Error deleting place:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
