#!/bin/bash

# Export places, groups, and actions data from MongoDB
# This script exports the collections to BSON format in the vex-data-export directory

# Set the database name
DB_NAME="vex"

# Set the output directory
OUTPUT_DIR="./vex-data-export"

# Check if MongoDB is accessible
if ! command -v mongodump &> /dev/null; then
    echo "Error: mongodump is not installed or not in PATH"
    echo "Please install MongoDB Database Tools: https://www.mongodb.com/try/download/database-tools"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "${OUTPUT_DIR}/${DB_NAME}"

# Determine MongoDB URI based on environment
if [ "$DOCKER" = "true" ]; then
    MONGO_URI="mongodb://${DB_NAME}-mongodb:27017/${DB_NAME}"
else
    MONGO_URI="mongodb://localhost:27017/${DB_NAME}"
fi

echo "Exporting data from MongoDB..."
echo "Database: ${DB_NAME}"
echo "URI: ${MONGO_URI}"
echo "Output directory: ${OUTPUT_DIR}/${DB_NAME}"
echo ""

# Export places collection
echo "Exporting places collection..."
mongodump --uri="${MONGO_URI}" --collection=places --out="${OUTPUT_DIR}"

# Export groups collection
echo "Exporting groups collection..."
mongodump --uri="${MONGO_URI}" --collection=groups --out="${OUTPUT_DIR}"

# Export actions collection
echo "Exporting actions collection..."
mongodump --uri="${MONGO_URI}" --collection=actions --out="${OUTPUT_DIR}"

echo ""
echo "Export complete!"
echo "Files exported to: ${OUTPUT_DIR}/${DB_NAME}/"
echo ""
echo "Exported collections:"
ls -lh "${OUTPUT_DIR}/${DB_NAME}/" | grep -E "(places|groups|actions)"

