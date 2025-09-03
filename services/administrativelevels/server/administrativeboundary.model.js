const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const turf = require('@turf/turf');

class ImportProgress extends EventEmitter {}
const importProgress = new ImportProgress();

const AdministrativeBoundarySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Feature'],
    required: true
  },
  properties: {
    osm_way_id: String,
    name: String,
    admin_level: String,
    boundary: {
      type: String,
      enum: ['administrative'],
      required: true
    },
    other_tags: String
  },
  parents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdministrativeBoundary'
  }],
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdministrativeBoundary'
  }],
  geometry: {
    type: {
      type: String,
      enum: ['MultiPolygon'],
      required: true
    },
    coordinates: {
      type: [[[[Number]]]], // Array of arrays of arrays of coordinates [lng, lat]
      required: true
    }
  }
}, {
  timestamps: true,
  collection: 'admin_boundaries' // Explicitly set collection name
});

// Indexes
AdministrativeBoundarySchema.index({ 'geometry': '2dsphere' });
AdministrativeBoundarySchema.index({ 'properties.osm_way_id': 1 });
AdministrativeBoundarySchema.index({ 'properties.admin_level': 1 });
AdministrativeBoundarySchema.index({ 'properties.name': 1 });
AdministrativeBoundarySchema.index({ parents: 1 });
AdministrativeBoundarySchema.index({ children: 1 });
AdministrativeBoundarySchema.index({
  geometry: '2dsphere',
  'properties.admin_level': 1
});
// Static method to update parent-child relationships
AdministrativeBoundarySchema.statics.updateRelationships = async function () {
  // 1. Get all boundaries
  // const boundaries = await this.find({}).lean();
  // no, get all boundaries that dont yet have parents or children
  const boundaries = await this.find({ parents: { $exists: false }, children: { $exists: false } }).lean();
  importProgress.emit('total', boundaries.length);
  importProgress.emit('status', 'Calculating centroids...');

  // 2. Calculate centroids and organize by admin level
  const boundariesByLevel = new Map();
  const centroids = new Map();

  importProgress.emit('status', `Processing ${boundaries.length} boundaries for centroids...`);
  let count = 0;
  boundaries.forEach(boundary => {
    count++;
    if (count % 500 === 0) {
      importProgress.emit('status', `Calculated ${count} centroids...`);
    }

    // Calculate centroid
    const multiPolygon = turf.multiPolygon(boundary.geometry.coordinates);
    const centroid = turf.centroid(multiPolygon);
    centroids.set(boundary._id.toString(), centroid);

    // Group by admin level
    const level = parseInt(boundary.properties.admin_level);
    if (!boundariesByLevel.has(level)) {
      boundariesByLevel.set(level, []);
    }
    boundariesByLevel.get(level).push(boundary);
  });

  // Sort admin levels from lowest to highest number
  importProgress.emit('status', 'Sorting admin levels...');
  const adminLevels = Array.from(boundariesByLevel.keys()).sort((a, b) => a - b);

  // 3. Calculate relationships
  importProgress.emit('status', 'Starting relationship calculations...');
  const relationships = new Map(boundaries.map(b => [b._id.toString(), { parents: [], children: [] }]));
  let processedCount = 0;

  // Process each admin level
  for (const currentLevel of adminLevels) {
    const currentBoundaries = boundariesByLevel.get(currentLevel);
    importProgress.emit('status', `Processing admin level ${currentLevel}...`);

    // For each boundary at current level
    for (const boundary of currentBoundaries) {
      const boundaryId = boundary._id.toString();
      const multiPolygon = turf.multiPolygon(boundary.geometry.coordinates);

      // Create a FeatureCollection of all centroids from higher admin levels
      const higherLevelCentroids = [];
      const centroidIdMap = new Map(); // Keep track of which point belongs to which boundary

      for (const childLevel of adminLevels.filter(l => l > currentLevel)) {
        const potentialChildren = boundariesByLevel.get(childLevel) || [];
        potentialChildren.forEach(child => {
          const childId = child._id.toString();
          const centroid = centroids.get(childId);
          higherLevelCentroids.push(centroid);
          centroidIdMap.set(centroid.geometry.coordinates.join(','), childId);
        });
      }

      if (higherLevelCentroids.length > 0) {
        const points = turf.featureCollection(higherLevelCentroids);
        const pointsWithin = turf.pointsWithinPolygon(points, multiPolygon);

        // Add relationships for all points found within the polygon
        pointsWithin.features.forEach(point => {
          const childId = centroidIdMap.get(point.geometry.coordinates.join(','));
          relationships.get(boundaryId).children.push(childId);
          relationships.get(childId).parents.push(boundaryId);
        });
      }

      processedCount++;
      importProgress.emit('progress', processedCount);
      importProgress.emit('status',
        `Processing boundary ${processedCount}/${boundaries.length}: ${boundary.properties.name}`);
    }
  }

  // 4. Update database
  importProgress.emit('status', 'Updating database...');

  const bulkOps = Array.from(relationships.entries()).map(([id, rels]) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(id) },
      update: {
        $set: {
          parents: rels.parents.map(p => new mongoose.Types.ObjectId(p)),
          children: rels.children.map(c => new mongoose.Types.ObjectId(c))
        }
      }
    }
  }));

  // Process bulk operations in chunks to avoid memory issues
  const CHUNK_SIZE = 1000;
  for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
    const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
    await this.bulkWrite(chunk, { ordered: false });
  }

  // update world boundary with all level 2 boundaries as children
  const world = await AdministrativeBoundary.findOne({ 'properties.name': '🌍' });
  const level2Boundaries = await AdministrativeBoundary.find({ 'properties.admin_level': '2' });
  world.children = level2Boundaries.map(boundary => boundary._id);
  await world.save();

  // update all level 2 boundaries with the world boundary as a parent (make sure not twice in array)
  level2Boundaries.forEach(boundary => {
    boundary.parents = boundary.parents.filter(parent => parent._id.toString() !== world._id.toString());
    boundary.parents.push(world._id);
    boundary.save();
  });

  importProgress.emit('progress', boundaries.length);
  importProgress.emit('status', 'Relationship updates completed');
};

const AdministrativeBoundary = mongoose.model('AdministrativeBoundary', AdministrativeBoundarySchema);

// create element for entire world

// Create world boundary if it doesn't exist
AdministrativeBoundary.findOne({ 'properties.name': '🌍' }).then(async (existingWorld) => {
  if (!existingWorld) {
    const worldBoundary = {
      type: 'Feature',
      properties: {
        name: '🌍',
        admin_level: '0',
        boundary: 'administrative'
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [[[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]]]
      }
    };
    const world = new AdministrativeBoundary(worldBoundary);
    await world.save();

    // all level 2 boundaries should have the world boundary as a parent
    // and the world boundary should have all level 2 boundaries as children
    const level2Boundaries = await AdministrativeBoundary.find({ 'properties.admin_level': '2' });
    level2Boundaries.forEach(boundary => {
      boundary.parents.push(world._id);
      world.children.push(boundary._id);
    });
    await world.save();
    await Promise.all(level2Boundaries.map(boundary => boundary.save()));
  } else {
    console.log('World boundary already exists');
  }
});

module.exports = {
  AdministrativeBoundary,
  importProgress
};
