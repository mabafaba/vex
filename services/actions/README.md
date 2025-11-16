# Actions Service

A service for managing actions (events) and groups with location-based features, relationships, and visualizations.

## Features

### Actions
- Create actions with name, description, date, contact, picture, and location
- Link actions to one or more organizing groups
- Link actions to other actions (partOf relationship)
- Edit and delete actions
- Location-based on administrative boundaries

### Groups
- Create groups with name, description, link, contact, and optional location
- Link groups to other groups (partOf relationship)
- Edit and delete groups
- Location-based on administrative boundaries

### Views
- **Timeline**: Chronological view of all actions
- **Network**: Visual graph showing relationships between actions and groups
- **Map**: Leaflet map showing all actions and groups with location markers

## API Endpoints

### Actions

- `GET /vex/actions` - Get all actions (supports query params: startDate, endDate, organiser, partOf)
- `GET /vex/actions/:id` - Get a single action by ID
- `POST /vex/actions` - Create a new action
- `PUT /vex/actions/:id` - Update an action
- `DELETE /vex/actions/:id` - Delete an action

### Groups

- `GET /vex/groups` - Get all groups (supports query param: partOf)
- `GET /vex/groups/:id` - Get a single group by ID
- `POST /vex/groups` - Create a new group
- `PUT /vex/groups/:id` - Update a group
- `DELETE /vex/groups/:id` - Delete a group

## Client Components

### Action Form
```html
<!-- Create new action -->
<action-form></action-form>

<!-- Edit existing action -->
<action-form action-id="ACTION_ID"></action-form>
```

### Group Form
```html
<!-- Create new group -->
<group-form></group-form>

<!-- Edit existing group -->
<group-form group-id="GROUP_ID"></group-form>
```

### Action Edit (Modal)
A modal dialog component for editing existing actions. Opens a modal with the action form pre-populated.

```html
<!-- Add to your page -->
<action-edit></action-edit>

<!-- Open the edit modal programmatically -->
<script>
  const actionEdit = document.querySelector('action-edit');
  
  // Open with an action ID
  actionEdit.open('ACTION_ID');
  
  // Or set attributes
  actionEdit.setAttribute('action-id', 'ACTION_ID');
  actionEdit.setAttribute('open', '');
  
  // Listen for save events
  actionEdit.addEventListener('action-saved', (e) => {
    console.log('Action saved:', e.detail);
  });
</script>
```

### Group Edit (Modal)
A modal dialog component for editing existing groups. Opens a modal with the group form pre-populated.

```html
<!-- Add to your page -->
<group-edit></group-edit>

<!-- Open the edit modal programmatically -->
<script>
  const groupEdit = document.querySelector('group-edit');
  
  // Open with a group ID
  groupEdit.open('GROUP_ID');
  
  // Or set attributes
  groupEdit.setAttribute('group-id', 'GROUP_ID');
  groupEdit.setAttribute('open', '');
  
  // Listen for save events
  groupEdit.addEventListener('group-saved', (e) => {
    console.log('Group saved:', e.detail);
  });
</script>
```

### Timeline View
```html
<action-timeline></action-timeline>
```

### Network View
```html
<action-network></action-network>
```

### Map View
```html
<action-map></action-map>
```

## Usage Example

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="/vex/administrative/static/leafletlocationpicker.js"></script>
  <script type="module" src="/vex/actions/static/action-form.js"></script>
  <script type="module" src="/vex/actions/static/group-form.js"></script>
  <script type="module" src="/vex/actions/static/action-edit.js"></script>
  <script type="module" src="/vex/actions/static/group-edit.js"></script>
  <script type="module" src="/vex/actions/static/action-timeline.js"></script>
  <script type="module" src="/vex/actions/static/action-network.js"></script>
  <script type="module" src="/vex/actions/static/action-map.js"></script>
</head>
<body>
  <h1>Actions & Groups</h1>
  
  <h2>Create Action</h2>
  <action-form></action-form>
  
  <h2>Create Group</h2>
  <group-form></group-form>
  
  <!-- Edit components (modals) -->
  <action-edit></action-edit>
  <group-edit></group-edit>
  
  <h2>Timeline</h2>
  <action-timeline></action-timeline>
  
  <h2>Network</h2>
  <action-network></action-network>
  
  <h2>Map</h2>
  <action-map></action-map>
</body>
</html>
```

## Data Models

### Action
- `name` (required): String
- `description`: String
- `date` (required): Date
- `contact`: String
- `picture`: String (URL)
- `location` (required): GeoJSON Point { type: "Point", coordinates: [lng, lat] }
- `administrativeBoundaries`: Array of AdministrativeBoundary IDs (auto-populated)
- `organisers`: Array of Group IDs
- `partOf`: Array of Action IDs
- `createdBy`: User ID
- `createdAt`: Date
- `updatedAt`: Date

### Group
- `name` (required): String
- `description`: String
- `link`: String (URL)
- `contact`: String
- `location`: GeoJSON Point { type: "Point", coordinates: [lng, lat] } (optional)
- `administrativeBoundaries`: Array of AdministrativeBoundary IDs (auto-populated if location provided)
- `partOf`: Array of Group IDs
- `createdBy`: User ID
- `createdAt`: Date
- `updatedAt`: Date

