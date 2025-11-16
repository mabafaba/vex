const connectDB = require('../../database');
const Place = require('../server/place.model');
const Action = require('../server/action.model');
const Group = require('../server/group.model');

async function fixDuplicateGermany () {
  try {
    // Connect to database
    console.log('Connecting to MongoDB...');
    await connectDB('vex');
    console.log('Connected to MongoDB');

    // Find all places with displayName "Deutschland" (case-insensitive, exact match)
    const deutschlandPlaces = await Place.find({
      'properties.displayName': /^Deutschland$/i
    });

    console.log(`\nFound ${deutschlandPlaces.length} place(s) with displayName "Deutschland":`);

    if (deutschlandPlaces.length <= 1) {
      console.log('No duplicates found. Nothing to fix.');
      process.exit(0);
    }

    // Display all found entries
    deutschlandPlaces.forEach((place, index) => {
      console.log(`\n${index + 1}. ID: ${place._id}`);
      console.log(`   displayName: ${place.properties.displayName}`);
      console.log(`   osmId: ${place.properties.osmId || '(none)'}`);
      console.log(`   osmType: ${place.properties.osmType || '(none)'}`);
      console.log(`   geometry.type: ${place.geometry?.type || '(none)'}`);
      console.log(`   createdAt: ${place.createdAt}`);
    });

    // Find the one with osm_id
    const withOsmId = deutschlandPlaces.find(p => p.properties.osmId);
    const withoutOsmId = deutschlandPlaces.filter(p => !p.properties.osmId);

    if (!withOsmId) {
      console.log('\n⚠️  WARNING: No Deutschland entry with osm_id found!');
      console.log('Cannot determine which one to keep. Aborting.');
      process.exit(1);
    }

    const keepId = withOsmId._id;
    const deleteIds = withoutOsmId.map(p => p._id);

    console.log(`\n✓ Keeping: ID ${keepId} (has osmId: ${withOsmId.properties.osmId})`);
    console.log(`✗ Will delete: ${deleteIds.length} duplicate(s) without osm_id`);

    if (deleteIds.length === 0) {
      console.log('No duplicates to remove.');
      process.exit(0);
    }

    // Update all references in Actions
    console.log('\nUpdating references in Actions...');
    const actionsUpdated = await Action.updateMany(
      { places: { $in: deleteIds } },
      { $set: { 'places.$[elem]': keepId } },
      { arrayFilters: [{ elem: { $in: deleteIds } }] }
    );
    // Also need to remove duplicates and ensure only keepId remains
    const actionsWithDuplicates = await Action.find({ places: { $in: deleteIds } });
    let actionsFixed = 0;
    for (const action of actionsWithDuplicates) {
      const originalPlaces = action.places.map(id => id.toString());
      const hasDeleteId = deleteIds.some(id => originalPlaces.includes(id.toString()));
      const hasKeepId = originalPlaces.includes(keepId.toString());

      if (hasDeleteId) {
        // Remove deleteIds and ensure keepId is present
        action.places = action.places.filter(id => !deleteIds.some(delId => delId.toString() === id.toString()));
        if (!hasKeepId) {
          action.places.push(keepId);
        }
        await action.save();
        actionsFixed++;
      }
    }
    console.log(`  Updated ${actionsFixed} action(s)`);

    // Update all references in Groups
    console.log('\nUpdating references in Groups...');
    const groupsWithDuplicates = await Group.find({ places: { $in: deleteIds } });
    let groupsFixed = 0;
    for (const group of groupsWithDuplicates) {
      const originalPlaces = group.places.map(id => id.toString());
      const hasDeleteId = deleteIds.some(id => originalPlaces.includes(id.toString()));
      const hasKeepId = originalPlaces.includes(keepId.toString());

      if (hasDeleteId) {
        // Remove deleteIds and ensure keepId is present
        group.places = group.places.filter(id => !deleteIds.some(delId => delId.toString() === id.toString()));
        if (!hasKeepId) {
          group.places.push(keepId);
        }
        await group.save();
        groupsFixed++;
      }
    }
    console.log(`  Updated ${groupsFixed} group(s)`);

    // Update all references in Places.parents
    console.log('\nUpdating references in Places.parents...');
    const placesWithDuplicates = await Place.find({ parents: { $in: deleteIds } });
    let placesFixed = 0;
    for (const place of placesWithDuplicates) {
      const originalParents = place.parents.map(id => id.toString());
      const hasDeleteId = deleteIds.some(id => originalParents.includes(id.toString()));
      const hasKeepId = originalParents.includes(keepId.toString());

      if (hasDeleteId) {
        // Remove deleteIds and ensure keepId is present
        place.parents = place.parents.filter(id => !deleteIds.some(delId => delId.toString() === id.toString()));
        if (!hasKeepId) {
          place.parents.push(keepId);
        }
        await place.save();
        placesFixed++;
      }
    }
    console.log(`  Updated ${placesFixed} place(s)`);

    // Delete the duplicates
    console.log(`\nDeleting ${deleteIds.length} duplicate(s) without osm_id:`);
    for (const deleteId of deleteIds) {
      console.log(`  - Deleting ID: ${deleteId}`);
      await Place.findByIdAndDelete(deleteId);
    }

    console.log('\n✓ Successfully fixed duplicate Deutschland entries!');
    console.log(`  Kept: ${keepId}`);
    console.log(`  Removed: ${deleteIds.length} duplicate(s)`);
    console.log(`  Updated references: ${actionsFixed} actions, ${groupsFixed} groups, ${placesFixed} places`);

    process.exit(0);
  } catch (error) {
    console.error('Error fixing duplicate Germany:', error);
    process.exit(1);
  }
}

// Run the script
fixDuplicateGermany();

