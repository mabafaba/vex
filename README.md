# vex

A location-based discussion platform built as a Progressive Web App (PWA).

## 📋 Prerequisites

Before setting up vex, ensure you have the following installed:

### 1. Node.js and npm
vex requires Node.js

**Install Node.js using nvm (recommended):**
```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# or
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart your terminal or run:
source ~/.bashrc

# Install and use Node.js 22
nvm install 22
nvm use 22
nvm alias default 22
```



vex uses MongoDB for data storage.


## Installation

### Clone the Repository
```bash
git clone https://github.com/your-username/vex.git
cd vex
```

###  Install Dependencies
```bash
npm install
```
### Generate JWT Secret (generate using the provided script)
```bash
sh generate_secret_JWT.sh
```

### Start the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3005/vex`

## Architecture Overview

vex follows a **vertical full-stack organization** principle where features are organized as self-contained modules rather than traditional frontend/backend separation.

### Core Architecture Principles
- **Vanilla-first approach**: Minimal external dependencies
- **Tree dependency structure**: No circular dependencies
- **Feature-based organization**: Related code stays together


### Project Structure
```
vex/
├── server.js              # Main application entry point
├── services/              # Feature modules (full-stack)
│   ├── users/            # User authentication & management
│   ├── vertex/           # Core discussion threads
│   ├── reactions/        # Like/dislike system
│   ├── administrativelevels/ # Geographic boundaries
│   ├── database/         # MongoDB connection
│   └── utils/            # Shared utilities
├── data/                 # Static data files
└── icons/                # PWA icons for all platforms
```

### Technology Stack
- **Backend**: Node.js + Express.js + MongoDB (Mongoose)
- **Frontend**: Vanilla JavaScript + Web Components
- **Real-time**: Socket.io
- **Authentication**: JWT + bcryptjs
- **PWA**: Service Worker + Web App Manifest

### Dependency Tree
```
server.js
├── users
├── vertex
│   ├── users
│   ├── reactions
│   │   └── utils
│   └── utils
├── utils
├── administrativelevels (geodata)
└── database
```
### vex service web component hierarchy
   ```
   vex-app
   |-- user-status (login/logout)
   |-- location-picker-dialog (select location)
   |-- vex-thread (main thread)
   |   |-- vex-breadcrumbs (breadcrumb navigation)
   |   |-- vex-display (shows a single post content & reaction buttons)
   |   |   |-- vex-reactions (reaction buttons)
   |   |-- vex-input (text area to create new post)
   |   |-- vex-list (list of posts / vex-display's)

   ```


## 🌟 PWA Features

This application is a fully functioning PWA with:

- ✅ **Web App Manifest** - Installable on mobile and desktop
- ✅ **Service Worker** - Offline functionality and caching
- ✅ **Responsive Design** - Works on all device sizes
- ✅ **App-like Experience** - Standalone display mode
- ✅ **Install Prompts** - Native install experience
- ✅ **Offline Support** - Basic functionality works offline
- ✅ **Fast Loading** - Cached assets for quick startup

### User Installation
Users can install the app by:
1. Visiting the website in a PWA-compatible browser
2. Looking for the "Install App" button that appears
3. Or using the browser's "Add to Home Screen" option

## Geographic Data Setup

vex supports administrative boundaries for location-based discussions. To set up geodata:

### Prerequisites
```bash
# macOS
brew install osmium-tool gdal

# Ubuntu/Debian
sudo apt install osmium-tool gdal-bin
```

### Import Process
1. Download data from [Geofabrik](https://download.geofabrik.de/)
2. Extract admin boundaries:
   ```bash
   osmium tags-filter germany-latest.osm.pbf r/admin_level -o admin_boundaries.osm.pbf
   ```
3. Convert to GeoJSON:
   ```bash
   ogr2ogr -f GeoJSON admin_boundaries.geojson admin_boundaries.osm.pbf
   ```
4. Import to MongoDB:
   ```bash
   mongoimport --uri mongodb://localhost:27017/vex --collection admin_boundaries --file admin_boundaries.geojson
   ```

## 🤝 Contributing

We welcome contributions from developers of all experience levels!

### Getting Started
1. **First-time contributors**: Look for issues labeled `good-first-issue` or `beginner-friendly` in our issue tracker
2. **Read the code**: Start by exploring the `services/` directory to understand how features are organized
3. **Follow the philosophy**: Review our [development principles](#core-architecture-principles) above

### Development Guidelines
- Keep it as vanilla as possible
- Keep all logic (back to front) related to a feature in one place
- Dependency graph must be a tree - no circular dependencies
- Test your changes with `npm run dev` before submitting

### Code Organization
Each service in `services/` contains:
- `index.js` - Main service export
- `client/` - Frontend components and logic
- `server/` - Backend routes and models (if applicable)
- `README.md` - Service-specific documentation

### Shared Services
The following services are exceptions to the tree rule and can be used by multiple other services:
- `services/utils/livemodelelement`
- `services/utils/reactive`
- `services/utils/io`
- `services/users`

### Finding Issues
- **Beginner issues**: Look for `good-first-issue` labels
- **Feature requests**: Check `enhancement` labels
- **Bug fixes**: Look for `bug` labels
- **Documentation**: Search for `documentation` labels

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Error:**
- Ensure MongoDB is running locally or check your Atlas connection string
- Verify your `.env` file has the correct `MONGODB_URI`

**Port Already in Use:**
- The app runs on port 3005 by default
- Kill existing processes: `lsof -ti:3005 | xargs kill -9`

**npm install fails:**
- Ensure you're using Node.js 18+: `node --version`
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

## 📄 License

ISC License - see the project for details.
