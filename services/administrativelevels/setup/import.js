const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);
const EventEmitter = require('events');

class ImportProgress extends EventEmitter {}
const importProgress = new ImportProgress();

async function importGeoJSON (filePath, databaseName, collectionName) {
  const DATABASE_NAME = databaseName;
  const COLLECTION_NAME = collectionName;

  importProgress.emit('status', 'Starting mongoimport...');

  const command = `mongoimport --db ${DATABASE_NAME} \
    --collection ${COLLECTION_NAME} \
    --file ${filePath} \
    --jsonArray \
    --drop`;  // Drop existing collection before import

  try {
    const { stdout, stderr } = await execPromise(command);
    if (stderr) {
      importProgress.emit('status', 'Import completed with warnings');
      console.error('Import warnings:', stderr);
    }
    importProgress.emit('status', 'Import completed successfully');
    return { success: true, stdout, stderr };
  } catch (error) {
    importProgress.emit('status', 'Import failed');
    throw error;
  }
}

module.exports = {
  importGeoJSON,
  importProgress
};
