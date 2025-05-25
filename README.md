# vex


### Developer Guide

- keep it as vanilla as possible
- keep all logic (back to front) related to a feature in one place
- dependency graph must be a tree. Exceptions must be carefully discussed and justified.

### Shared services
(exceptions to the tree rule)
- services/utils/livemodelelement
- services/utils/reactive
- services/utils/io
- services/users

### Depenency tree

(nothing should show up more than once)
(lower levels must not know about upper levels)
```

server.js
├── users
|── vertex
|   ├── users
|   ├── reactions
|   |   ├── utils
|   |── utils
|-- utils
|-- geodata
|-- database


## Preparing geodata
- download planet file for relevant aras from geofabrik
``` 
brew install osmium-tool
```
Extract all admin_level relations

```
osmium tags-filter germany-latest.osm.pbf r/admin_level -o admin_boundaries.osm.pbf
```

Export to geojson
```
brew install gdal
```

```
ogr2ogr -f GeoJSON admin_boundaries.geojson admin_boundaries.osm.pbf
```

Save to mongodb
```
mongoimport --uri mongodb+srv://admin:admin@cluster0.mongodb.net/test --collection admin_boundaries --file admin_boundaries.geojson
```


