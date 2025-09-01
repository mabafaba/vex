# vex

A location-based discussion platform built as a Progressive Web App (PWA).

## PWA Features

This application is now a fully functioning PWA with:

- ✅ **Web App Manifest** - Installable on mobile and desktop
- ✅ **Service Worker** - Offline functionality and caching
- ✅ **Responsive Design** - Works on all device sizes
- ✅ **App-like Experience** - Standalone display mode
- ✅ **Install Prompts** - Native install experience
- ✅ **Offline Support** - Basic functionality works offline
- ✅ **Fast Loading** - Cached assets for quick startup

### Installation

Users can install the app by:
1. Visiting the website in a PWA-compatible browser
2. Looking for the "Install App" button that appears
3. Or using the browser's "Add to Home Screen" option

### PWA Development

To audit PWA compliance:
```bash
npm run pwa-audit
```



## Developer Guide

- keep it as vanilla as possible
- keep all logic (back to front) related to a feature in one place
- dependency graph must be a tree. Exceptions must be carefully discussed and justified.

## Shared services
(exceptions to the tree rule)
- services/utils/livemodelelement
- services/utils/reactive
- services/utils/io
- services/users

## Dependency tree

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

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker
```bash
npm run docker
```

The application will be available at `http://localhost:3005` and can be installed as a PWA.
