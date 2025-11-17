#!/bin/bash

# Import places, groups, and actions data into MongoDB
# This script imports collections from BSON format in the vex-data-export directory

# Set the database name
DB_NAME="vex"

# Set the input directory
INPUT_DIR="./vex-data-export"

# Check if MongoDB is accessible
if ! command -v mongorestore &> /dev/null; then
    echo "Error: mongorestore is not installed or not in PATH"
    echo "Please install MongoDB Database Tools: https://www.mongodb.com/try/download/database-tools"
    exit 1
fi

# Check if input directory exists
if [ ! -d "${INPUT_DIR}/${DB_NAME}" ]; then
    echo "Error: Input directory does not exist: ${INPUT_DIR}/${DB_NAME}"
    echo "Please run export-data.sh first or ensure the data files are in the correct location"
    exit 1
fi

# Determine MongoDB URI based on environment
if [ "$DOCKER" = "true" ]; then
    MONGO_URI="mongodb://${DB_NAME}-mongodb:27017/${DB_NAME}"
    echo "Warning: Running in Docker mode. You may need to run this inside the container or use docker exec."
    echo "Example: docker exec -i vex-mongodb mongorestore --uri=\"${MONGO_URI}\" /tmp/vex"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    MONGO_URI="mongodb://localhost:27017/${DB_NAME}"
fi

echo "Importing data into MongoDB..."
echo "Database: ${DB_NAME}"
echo "URI: ${MONGO_URI}"
echo "Input directory: ${INPUT_DIR}/${DB_NAME}"
echo ""

# Check which collections exist
COLLECTIONS_TO_IMPORT=()

if [ -f "${INPUT_DIR}/${DB_NAME}/places.bson" ]; then
    COLLECTIONS_TO_IMPORT+=("places")
fi

if [ -f "${INPUT_DIR}/${DB_NAME}/groups.bson" ]; then
    COLLECTIONS_TO_IMPORT+=("groups")
fi

if [ -f "${INPUT_DIR}/${DB_NAME}/actions.bson" ]; then
    COLLECTIONS_TO_IMPORT+=("actions")
fi

if [ ${#COLLECTIONS_TO_IMPORT[@]} -eq 0 ]; then
    echo "Error: No collection files found in ${INPUT_DIR}/${DB_NAME}/"
    echo "Expected files: places.bson, groups.bson, actions.bson"
    exit 1
fi

echo "Found collections to import: ${COLLECTIONS_TO_IMPORT[*]}"
echo ""

# Ask for confirmation before importing
read -p "This will import/overwrite data in the database. Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Import cancelled."
    exit 0
fi

# Import each collection
# mongorestore expects the parent directory (containing the database subdirectory)
for collection in "${COLLECTIONS_TO_IMPORT[@]}"; do
    echo "Importing ${collection} collection..."
    mongorestore --uri="${MONGO_URI}" \
        --collection="${collection}" \
        --dir="${INPUT_DIR}" \
        --nsInclude="${DB_NAME}.${collection}" \
        --drop
    
    if [ $? -eq 0 ]; then
        echo "✓ Successfully imported ${collection}"
    else
        echo "✗ Failed to import ${collection}"
    fi
    echo ""
done

echo "Import complete!"
echo ""
echo "To verify, you can check the collections:"
echo "  mongosh ${MONGO_URI} --eval \"db.${COLLECTIONS_TO_IMPORT[0]}.countDocuments()\""

