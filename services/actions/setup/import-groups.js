/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const https = require('https');
const connectDB = require('../../database');
const Group = require('../server/group.model');
const Place = require('../server/place.model');
const { AdministrativeBoundary } = require('../../administrativelevels/server/administrativeboundary.model');

// CSV column mapping
const CSV_COLUMNS = {
  PSEUDONYM: 0,
  NAME: 1,
  URL: 2,
  ACTION_PRACTICES: 3,
  TYPE: 4,
  PRACTICES_IMPACT: 5,
  ACTIVE_ACROSS: 6,
  PLACE_NAME: 7,
  PART_OF: 8,
  PUBLIC_CONTACT: 9,
  NOTES: 10
};

function parseCSVLine (line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim()); // Push last field

  return result;
}

function parseCSV (csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < CSV_COLUMNS.NAME + 1) {
      continue; // Skip if not enough columns
    }

    const name = values[CSV_COLUMNS.NAME]?.trim();
    if (!name) {
      continue; // Skip rows without a name
    }

    rows.push({
      pseudonym: values[CSV_COLUMNS.PSEUDONYM]?.trim() || '',
      name: name,
      url: values[CSV_COLUMNS.URL]?.trim() || '',
      actionPractices: values[CSV_COLUMNS.ACTION_PRACTICES]?.trim() || '',
      type: values[CSV_COLUMNS.TYPE]?.trim() || '',
      practicesImpact: values[CSV_COLUMNS.PRACTICES_IMPACT]?.trim() || '',
      activeAcross: values[CSV_COLUMNS.ACTIVE_ACROSS]?.trim() || '',
      placeName: values[CSV_COLUMNS.PLACE_NAME]?.trim() || '',
      partOf: values[CSV_COLUMNS.PART_OF]?.trim() || '',
      publicContact: values[CSV_COLUMNS.PUBLIC_CONTACT]?.trim() || '',
      notes: values[CSV_COLUMNS.NOTES]?.trim() || ''
    });
  }

  return rows;
}

function buildDescription (row) {
  const parts = [];

  if (row.actionPractices) {
    parts.push(`Actions/Practices: ${row.actionPractices}`);
  }
  if (row.type) {
    parts.push(`Type: ${row.type}`);
  }
  if (row.practicesImpact) {
    parts.push(`Practices try to impact directly: ${row.practicesImpact}`);
  }
  if (row.activeAcross) {
    parts.push(`Active across: ${row.activeAcross}`);
  }
  if (row.notes) {
    parts.push(`Notes: ${row.notes}`);
  }

  return parts.join('\n\n');
}

// Search Nominatim for a place name
async function searchNominatim (query) {
  return new Promise((resolve, reject) => {
    const baseUrl = 'nominatim.openstreetmap.org';
    const params = `format=json&polygon_geojson=1&q=${encodeURIComponent(query)}&limit=5`;

    const options = {
      hostname: baseUrl,
      path: `/search?${params}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Vex Group Import Script'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const results = JSON.parse(data);
            resolve(results);
          } catch (error) {
            reject(new Error(`Failed to parse Nominatim response: ${error.message}`));
          }
        } else {
          reject(new Error(`Nominatim API returned status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Helper function to find or create a Place from an AdministrativeBoundary
async function findOrCreatePlaceFromBoundary (boundary) {
  const osmId = boundary.properties.osm_id || boundary.properties.osm_way_id;
  const existingPlace = await Place.findOne({
    'properties.osmId': osmId
  });

  if (existingPlace) {
    return existingPlace;
  }

  let parentPlaceId = null;
  if (boundary.parents && boundary.parents.length > 0) {
    const parentBoundary = await AdministrativeBoundary.findById(boundary.parents[boundary.parents.length - 1]);
    if (parentBoundary) {
      const parentPlace = await findOrCreatePlaceFromBoundary(parentBoundary);
      parentPlaceId = parentPlace._id;
    }
  }

  const place = new Place({
    type: 'Feature',
    properties: {
      nominatimData: {
        osm_id: osmId,
        osm_type: 'way',
        display_name: boundary.properties.name || 'Administrative Boundary'
      },
      osmId: osmId,
      osmType: 'way',
      displayName: boundary.properties.name || 'Administrative Boundary'
    },
    geometry: boundary.geometry,
    parents: parentPlaceId ? [parentPlaceId] : []
  });

  await place.save();
  return place;
}

// Helper function to get parent places for a location
async function getParentPlaces (longitude, latitude) {
  const boundaries = await AdministrativeBoundary.find({
    geometry: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      }
    }
  })
    .sort({ 'properties.admin_level': -1 })
    .limit(1)
    .lean();

  if (boundaries.length > 0) {
    const place = await findOrCreatePlaceFromBoundary(boundaries[0]);
    return [place._id];
  }

  return [];
}

// Create or get places from Nominatim data (returns array of place IDs)
async function createOrGetPlaces (nominatimDataArray) {
  if (!nominatimDataArray || !Array.isArray(nominatimDataArray) || nominatimDataArray.length === 0) {
    return [];
  }

  const placeIds = [];

  for (const data of nominatimDataArray) {
    const osmId = data.osm_id?.toString();
    const osmType = data.osm_type;
    const displayName = data.display_name;
    const lat = parseFloat(data.lat);
    const lon = parseFloat(data.lon);

    // Skip entries without osm_id (required)
    if (!osmId) {
      continue;
    }

    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      continue;
    }

    let existingPlace = null;
    // Check if there's an admin boundary with this osm_id
    const adminBoundary = await AdministrativeBoundary.findOne({
      $or: [
        { 'properties.osm_id': osmId },
        { 'properties.osm_way_id': osmId }
      ]
    }).lean();

    if (adminBoundary) {
      existingPlace = await findOrCreatePlaceFromBoundary(adminBoundary);
    } else {
      // No admin boundary found, check if a Place already exists by osmId/osmType
      if (osmType) {
        existingPlace = await Place.findOne({
          'properties.osmId': osmId,
          'properties.osmType': osmType
        });
      }

      // If not found, try exact coordinate match
      if (!existingPlace) {
        existingPlace = await Place.findOne({
          'geometry.type': 'Point',
          'geometry.coordinates': [lon, lat],
          'properties.displayName': displayName
        });
      }
    }

    if (existingPlace) {
      placeIds.push(existingPlace._id);
    } else {
      const parentPlaces = await getParentPlaces(lon, lat);
      const place = new Place({
        type: 'Feature',
        properties: {
          nominatimData: data,
          osmId: osmId || null,
          osmType: osmType || null,
          displayName: displayName || 'Unknown Place'
        },
        geometry: {
          type: 'Point',
          coordinates: [lon, lat]
        },
        parents: parentPlaces
      });
      await place.save();
      placeIds.push(place._id);
    }
  }

  return placeIds;
}

async function importGroups () {
  try {
    // Connect to database
    console.log('Connecting to MongoDB...');
    await connectDB('vex');
    console.log('Connected to MongoDB');

    // Read CSV file
    const csvPath = path.join(__dirname, '../knitwork planning - groups.csv');
    console.log(`Reading CSV file: ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    // Parse CSV
    console.log('Parsing CSV...');
    const rows = parseCSV(csvContent);
    console.log(`Found ${rows.length} groups to import`);

    // Create a map of group names to IDs (for resolving partOf relationships)
    const nameToIdMap = new Map();

    // Step 1: Create all groups first (without partOf relationships and places)
    console.log('\nStep 1: Creating groups...');
    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      try {
        // Check if group already exists
        const existing = await Group.findOne({ name: row.name });
        if (existing) {
          console.log(`  Skipping "${row.name}" (already exists)`);
          nameToIdMap.set(row.name, existing._id);
          skipped++;
          continue;
        }

        // Build description from various fields
        const description = buildDescription(row);

        // Create group (places will be added in step 1.5)
        const group = new Group({
          name: row.name,
          description: description || undefined,
          link: row.url || undefined,
          contact: row.publicContact || undefined,
          places: [] // Will be populated in step 1.5
          // partOf will be set in step 2
        });

        await group.save();
        nameToIdMap.set(row.name, group._id);
        console.log(`  Created: "${row.name}" (ID: ${group._id})`);
        created++;
      } catch (error) {
        console.error(`  Error creating group "${row.name}":`, error.message);
      }
    }

    console.log(`\nCreated ${created} groups, skipped ${skipped} existing groups`);

    // Step 1.5: Search for places and update groups with place IDs
    console.log('\nStep 1.5: Searching for places and updating groups...');
    let placesFound = 0;
    let placesNotFound = 0;

    for (const row of rows) {
      if (!row.placeName || row.placeName.trim() === '') {
        continue;
      }

      try {
        const groupId = nameToIdMap.get(row.name);
        if (!groupId) {
          continue; // Skip if group wasn't created
        }

        console.log(`  Searching for place: "${row.placeName}" (for group "${row.name}")`);

        // Search Nominatim
        const nominatimResults = await searchNominatim(row.placeName);

        if (!nominatimResults || nominatimResults.length === 0) {
          console.log(`    ⚠️  No results found for "${row.placeName}"`);
          placesNotFound++;
          continue;
        }

        // Filter to only include results with osm_id (required)
        const validResults = nominatimResults.filter(result => result.osm_id !== null && result.osm_id !== undefined);

        if (validResults.length === 0) {
          console.log(`    ⚠️  No results with osm_id found for "${row.placeName}"`);
          placesNotFound++;
          continue;
        }

        // Use the first valid result (best match)
        const selectedResult = validResults[0];
        console.log(`    ✓ Found: ${selectedResult.display_name} (osm_id: ${selectedResult.osm_id})`);

        // Create or get places from Nominatim data
        const placeIds = await createOrGetPlaces([selectedResult]);

        if (placeIds.length > 0) {
          const group = await Group.findById(groupId);
          if (group) {
            group.places = placeIds;
            await group.save();
            console.log(`    ✓ Updated group "${row.name}" with place ID: ${placeIds[0]}`);
            placesFound++;
          }
        } else {
          console.log(`    ⚠️  Failed to create place for "${row.placeName}"`);
          placesNotFound++;
        }

        // Add a small delay to respect Nominatim's rate limiting (1 request per second)
        await new Promise(resolve => setTimeout(resolve, 1100));
      } catch (error) {
        console.error(`  Error processing place "${row.placeName}" for group "${row.name}":`, error.message);
        placesNotFound++;
      }
    }

    console.log(`\nFound and set ${placesFound} places, ${placesNotFound} places not found or failed`);

    // Step 2: Update ALL groups with partOf relationships (FINAL STEP)
    // This must happen at the end to ensure all groups exist before linking them
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('Step 2: Setting up partOf relationships (FINAL STEP)...');
    console.log('═══════════════════════════════════════════════════════════');
    let relationshipsSet = 0;
    let relationshipsSkipped = 0;
    const relationshipSummary = [];

    for (const row of rows) {
      if (!row.partOf || row.partOf.trim() === '') {
        continue;
      }

      try {
        const groupId = nameToIdMap.get(row.name);
        if (!groupId) {
          console.log(`  ⚠️  Warning: Could not find group "${row.name}" for partOf update`);
          relationshipsSkipped++;
          continue;
        }

        // Parse comma-separated partOf names
        const partOfNames = row.partOf
          .split(',')
          .map(name => name.trim())
          .filter(name => name.length > 0);

        if (partOfNames.length === 0) {
          continue;
        }

        // Resolve partOf names to IDs
        const partOfIds = [];
        const missingParents = [];
        for (const partOfName of partOfNames) {
          const partOfId = nameToIdMap.get(partOfName);
          if (partOfId) {
            partOfIds.push(partOfId);
          } else {
            missingParents.push(partOfName);
            console.log(`  ⚠️  Warning: Could not find parent group "${partOfName}" for "${row.name}"`);
          }
        }

        if (partOfIds.length > 0) {
          const group = await Group.findById(groupId);
          if (group) {
            // Update partOf relationships (this will overwrite existing relationships)
            group.partOf = partOfIds;
            await group.save();
            const relationshipInfo = `"${row.name}" → [${partOfNames.join(', ')}]`;
            console.log(`  ✓ Set partOf for "${row.name}": ${partOfNames.join(', ')}`);
            relationshipSummary.push(relationshipInfo);
            relationshipsSet++;
          } else {
            console.log(`  ⚠️  Warning: Group "${row.name}" not found in database (ID: ${groupId})`);
            relationshipsSkipped++;
          }
        } else if (missingParents.length > 0) {
          console.log(`  ⚠️  Skipped "${row.name}" - all parent groups missing: ${missingParents.join(', ')}`);
          relationshipsSkipped++;
        }
      } catch (error) {
        console.error(`  ❌ Error updating partOf for "${row.name}":`, error.message);
        relationshipsSkipped++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('Relationship Summary:');
    console.log('═══════════════════════════════════════════════════════════');
    if (relationshipSummary.length > 0) {
      relationshipSummary.forEach(rel => console.log(`  ${rel}`));
    } else {
      console.log('  No relationships to set.');
    }
    console.log(`\n✓ Successfully set ${relationshipsSet} partOf relationships`);
    if (relationshipsSkipped > 0) {
      console.log(`⚠️  Skipped ${relationshipsSkipped} relationships (missing groups or errors)`);
    }

    console.log('\n✅ Import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during import:', error);
    process.exit(1);
  }
}

// Run the import
importGroups();
