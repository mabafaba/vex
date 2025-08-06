
### preparing the data

1. download local osm dump (one country size works ok) from geofabrik pbf


2. install gdal in miniconda
```
curl -LO https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-x86_64.sh
bash Miniconda3-latest-MacOSX-x86_64.sh
conda create -n gdal-env gdal
conda activate gdal-env
```

5. filter with ogr2ogr and convert to geojson

```
ogr2ogr -f GeoJSON admin_boundaries.geojson germany-latest.osm.pbf multipolygons -where "boundary='administrative'"
```

### Next
Set the file path in services/administrativelevels/setup/initialize.js to the geojson file you created and run the script






