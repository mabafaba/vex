const path = require('path');
const mongoose = require('mongoose');
const { AdministrativeBoundary, importProgress: modelProgress } = require('./server/administrativeboundary.model');
const { importGeoJSON, importProgress } = require('./setup/import');
const ProgressBar = require('progress');
const connectDB = require('../database');

const GEOJSON_PATH = path.join(__dirname, '../../data', 'admin_boundaries_germany.geojson');
const DATABASE_NAME = 'vex';
const COLLECTION_NAME = 'admin_boundaries';
console.log('GEOJSON_PATH', GEOJSON_PATH);

let progressBar;
let currentOperation = '';

// Progress bar setup
modelProgress.on('total', (total) => {
  progressBar = new ProgressBar(':operation [:bar] :current/:total :status', {
    complete: '=',
    incomplete: ' ',
    width: 30,
    total
  });
});

modelProgress.on('progress', (current) => {
  if (progressBar) {
    progressBar.update(current / progressBar.total, {
      operation: currentOperation
    });
  }
});

modelProgress.on('status', (status) => {
  if (progressBar) {
    progressBar.tick(0, {
      operation: currentOperation,
      status
    });
  }
});

// Also listen to import progress
importProgress.on('status', (status) => {
  if (progressBar) {
    progressBar.tick(0, {
      operation: 'Import',
      status
    });
  }
});

async function initializeAdminBoundaries (geojsonFilePath = GEOJSON_PATH) {
  try {
    // First import the GeoJSON using mongoimport
    currentOperation = 'Import';
    await importGeoJSON(geojsonFilePath, DATABASE_NAME, COLLECTION_NAME);

    // delete all documents in the collection without properties.admin_level
    console.log('Deleting documents without properties.admin_level');
    // print out how many documents are being deleted
    const count = await AdministrativeBoundary.countDocuments({ 'properties.admin_level': { $exists: false } });
    console.log(`Deleting ${count} documents`);
    await AdministrativeBoundary.deleteMany({ 'properties.admin_level': { $exists: false } });
    // print out how many documents are left
    const count2 = await AdministrativeBoundary.countDocuments();
    console.log(`Documents left: ${count2}`);

    // Then update relationships
    currentOperation = 'Relations';
    await AdministrativeBoundary.updateRelationships();

    return true;
  } catch (error) {
    console.error('\nInitialization failed:', error);
    throw error;
  }
}

// If running this script directly
if (require.main === module) {
  connectDB(DATABASE_NAME)
    .then(() => initializeAdminBoundaries())
    .then(() => {
      console.log('\nInitialization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nFailed to initialize:', error);
      process.exit(1);
    });
}
