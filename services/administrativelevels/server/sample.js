const mongoose = require('mongoose');
const { AdministrativeBoundary } = require('./server/administrativeboundary.model');
const connectDB = require('../database');

const DATABASE_NAME = 'vex';

async function getSampleBoundaries (admin_level = 3, n = 10 ) {
  try {
    await connectDB(DATABASE_NAME);

    const boundaries = await AdministrativeBoundary
      .aggregate([{ $match: { 'properties.admin_level': admin_level } }, { $sample: { size: n } }])
      .exec();

    console.log('found:', boundaries.length);

    const boundaryIds = boundaries.map(b => b._id);

    const populatedBoundaries = await AdministrativeBoundary
      .find({ _id: { $in: boundaryIds } })
      .populate('children')
      .populate('parents')
      .lean();

    console.log('\nSample Administrative Boundaries:');
    populatedBoundaries.forEach(boundary => {
      console.log('\n-------------------');
      console.log(`Name: ${boundary.properties.name}`);
      console.log(`Admin Level: ${boundary.properties.admin_level}`);
      console.log(`Parent Regions: ${boundary.parents.map(p => `${p.properties.name} (${p.properties.admin_level})`).join(', ') || 'None'}`);
    //   console.log(`Child Regions: ${boundary.children.map(c => `${c.properties.name} (${c.properties.admin_level})`).join(', ') || 'None'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

async function getFeatureCounts () {
  try {
    await connectDB(DATABASE_NAME);

    const counts = await AdministrativeBoundary.aggregate([
      { $group: { _id: '$properties.admin_level', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).exec();

    console.log('\nFeature Counts by Admin Level:');
    counts.forEach(count => {
      console.log(`Admin Level ${count._id}: ${count.count} features`);
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  getSampleBoundaries('9', 15);
//   getFeatureCounts();
}
