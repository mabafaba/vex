plan for this (not necessarily implemented:

- scripts to download osm data from geofabrik, extract all administrative boundary relations and import to mongodb
- endpoint to find all admin geometries intersecting with a given geojson
- endpoint to find smallest admin unit containing a given point


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



