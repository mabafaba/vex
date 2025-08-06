#!/bin/bash

# Variables
GEOJSON_FILE="../../data/admin_boundaries_germany.geojson"
DATABASE_NAME="vex"
COLLECTION_NAME="admin_boundaries"
# check if the file exists
if [ ! -f $GEOJSON_FILE ]; then
    echo "GeoJSON file not found!"
    exit 1
fi
# Import GeoJSON file into MongoDB
mongoimport --db $DATABASE_NAME --collection $COLLECTION_NAME --file $GEOJSON_FILE --jsonArray

echo "GeoJSON file imported successfully into MongoDB."
