const importGeoJson = require('./server/importGeoJson');
const GeoJsonFeature = require('./server/geoJsonFeature.model');

const express = require('express');
const router = express.Router();

// use json
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// if collection is empty, import data
// GeoJsonFeature.countDocuments({}).then((count) => {
//     if (count === 0) {
//         importGeoJson(
//             'mongodb://localhost:27017/vex',
//             'vex',
//             'geojson',
//             '/../../vex/client/brazil_admin_boundaries.geojson'
//         );
//     }
// });

// get all
router.get('/', async (req, res) => {
    GeoJsonFeature.find({})
        .then((features) => {
            res.status(200).send(features);
        })
        .catch((err) => {
            res.status(500).send(err);
        });

});



module.exports = {
    router: router,
    importGeoJson: importGeoJson,
    GeoJsonFeature: GeoJsonFeature
}