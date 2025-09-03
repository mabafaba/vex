
### preparing the data

1. download local osm dump (one country size works ok) from geofabrik pbf

```
curl -o germany-latest.osm.pbf https://download.geofabrik.de/europe/germany-latest.osm.pbf
curl -o mexico-latest.osm.pbf https://download.geofabrik.de/north-america/mexico-latest.osm.pbf
```

2. install gdal in miniconda
```
curl -LO https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-x86_64.sh
bash Miniconda3-latest-MacOSX-x86_64.sh
conda create -n gdal-env gdal
conda activate gdal-env
```

5. filter with ogr2ogr and convert to geojson

```
ogr2ogr -f GeoJSON admin_boundaries_germany.geojson germany-latest.osm.pbf multipolygons -where "boundary='administrative'"
ogr2ogr -f GeoJSON admin_boundaries_mexico.geojson mexico-latest.osm.pbf multipolygons -where "boundary='administrative'"
```

### Next
Set the file path in services/administrativelevels/setup/initialize.js to the geojson file you created and run the script




### ALTERNATIVE: import existing mongodb database (i.e. from local version to remote server version)

1. export from local mongodb
```
mongodump --uri="mongodb://localhost:27017/vex" --out=./dump
```

2. transfer to server via ssh
```
scp -r dump/ user@192.168.1.100:~
```

IMPORT into dockerised database:

# 1. Make sure your containers are running
docker-compose up -d

# 2. Copy the dump directory into the MongoDB container
docker cp dump/vex vex-mongodb:/tmp/vex

# 3. Import the dump using mongorestore inside the container
docker exec -it vex-mongodb mongorestore /tmp/vex --db vex

# 4. Verify the import worked
docker exec -it vex-mongodb mongosh vex --eval "db.adminModerationStatus()"



