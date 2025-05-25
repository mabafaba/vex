const madge = require('madge');

madge('./../vex')
  .then((res) => res.image('./../vex/dependencies.svg'))
  .then((writtenImagePath) => {
    console.log('Image written to ' + writtenImagePath);
  });
