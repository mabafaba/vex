const fs = require('fs');
const mongoose = require('mongoose');
const GeoJsonFeature = require('./geoJsonFeature.model');

async function importGeoJson (mongo_uri, database_name, collection_name, geojson_file_path) {
  let client;

  try {
    // Read the GeoJSON file
    const fullPath = __dirname + geojson_file_path;
    const geojsonData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    // Connect to MongoDB using mongoose
    // await mongoose.connect(mongo_uri + '/' + database_name);

    // Define a schema and model for the collection
    // Insert GeoJSON data into the collection
    if (geojsonData.features && Array.isArray(geojsonData.features)) {
      await GeoJsonFeature.insertMany(geojsonData.features);
      console.log('GeoJSON data inserted successfully');
    } else {
      console.error('Invalid GeoJSON format: Missing "features" array.');
    }
  } catch (error) {
    console.error('Error loading GeoJSON to MongoDB:', error);
  } finally {
    // Close the MongoDB connection
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}
// log this dir
module.exports = importGeoJson;
