#!/bin/bash

# Import places, groups, and actions data into MongoDB
# This script imports collections from BSON format in the vex-data-export directory
#
# Usage:
#   ./import-data.sh           # Import to local MongoDB
#   ./import-data.sh --docker  # Import to Docker MongoDB (handles /tmp/vex cleanup)
#   ./import-data.sh -d        # Short form for Docker import

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

# Check if we should use Docker import method
USE_DOCKER_IMPORT=false
if [ "$1" = "--docker" ] || [ "$1" = "-d" ]; then
    USE_DOCKER_IMPORT=true
fi

# Determine MongoDB URI based on environment
if [ "$DOCKER" = "true" ] && [ "$USE_DOCKER_IMPORT" = "false" ]; then
    MONGO_URI="mongodb://${DB_NAME}-mongodb:27017/${DB_NAME}"
    echo "Warning: Running in Docker mode. You may need to run this inside the container or use docker exec."
    echo "Example: docker exec -i vex-mongodb mongorestore --uri=\"${MONGO_URI}\" /tmp/vex"
    echo "Or use: ./import-data.sh --docker"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    MONGO_URI="mongodb://localhost:27017/${DB_NAME}"
fi

# Handle Docker import method
if [ "$USE_DOCKER_IMPORT" = "true" ]; then
    CONTAINER_NAME="${DB_NAME}-mongodb"
    DOCKER_TMP_DIR="/tmp/${DB_NAME}"
    
    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "Error: Docker container '${CONTAINER_NAME}' is not running"
        echo "Please start it with: docker-compose up -d"
        exit 1
    fi
    
    echo "Using Docker import method..."
    echo "Container: ${CONTAINER_NAME}"
    echo "Target directory in container: ${DOCKER_TMP_DIR}"
    echo ""
    
    # Check if directory already exists in container
    if docker exec "${CONTAINER_NAME}" test -d "${DOCKER_TMP_DIR}" 2>/dev/null; then
        echo "Warning: Directory ${DOCKER_TMP_DIR} already exists in the container."
        read -p "Remove existing files and continue? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Removing existing files in ${DOCKER_TMP_DIR}..."
            docker exec "${CONTAINER_NAME}" rm -rf "${DOCKER_TMP_DIR}"
        else
            echo "Import cancelled."
            exit 0
        fi
    fi
    
    # Copy files to container
    echo "Copying files to container..."
    docker cp "${INPUT_DIR}/${DB_NAME}" "${CONTAINER_NAME}:${DOCKER_TMP_DIR}"
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to copy files to container"
        exit 1
    fi
    
    echo "Files copied successfully."
    echo ""
    
    # Ask for confirmation before importing
    read -p "This will import/overwrite data in the database. Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Import cancelled."
        exit 0
    fi
    
    # Import using mongorestore inside container
    echo "Importing data into MongoDB..."
    docker exec "${CONTAINER_NAME}" mongorestore --db "${DB_NAME}" "${DOCKER_TMP_DIR}" --drop
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Import complete!"
        echo ""
        echo "Cleaning up temporary files in container..."
        docker exec "${CONTAINER_NAME}" rm -rf "${DOCKER_TMP_DIR}"
        echo "Done!"
    else
        echo ""
        echo "✗ Import failed!"
        exit 1
    fi
    
    exit 0
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

