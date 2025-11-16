const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
  // GeoJSON Feature format
  type: {
    type: String,
    enum: ['Feature'],
    required: true,
    default: 'Feature'
  },
  properties: {
    // Nominatim data stored in properties
    nominatimData: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    osmId: {
      type: String, // From Nominatim: osm_id
      index: true
    },
    osmType: {
      type: String, // From Nominatim: osm_type (node, way, relation)
      index: true
    },
    displayName: {
      type: String, // From Nominatim: display_name
      required: true
    },
    // Additional metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: false
    }
  },
  geometry: {
    type: {
      type: String,
      enum: ['Point', 'MultiPolygon', 'Polygon'],
      required: true
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed, // Can be [lng, lat] for Point, or more complex for polygons
      required: true
    }
  },
  // Parents: Places (derived from admin boundaries) that contain this place
  parents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Place'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
placeSchema.index({ 'geometry': '2dsphere' });
placeSchema.index({ 'properties.osmId': 1, 'properties.osmType': 1 });
placeSchema.index({ parents: 1 });

placeSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Place = mongoose.model('Place', placeSchema);

module.exports = Place;
