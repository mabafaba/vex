// exports a function similar to assert that throws an error if the condition is not met

module.exports = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};
