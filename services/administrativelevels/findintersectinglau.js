const Lau = require('./lau.model');
const findIntersectingLAU = async (geojson, except = []) => {
  console.log('finding intersecting LAU');
  console.log(geojson);
  const lau = await Lau.findOne({
    geometry: {
      $geoIntersects: {
        $geometry: geojson.geometry
      }
    }
  });
  console.log('found lau', lau);
  return lau;
};

module.exports = findIntersectingLAU;
