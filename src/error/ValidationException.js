module.exports = function ValidationExceptinon(errors) {
  this.status = 400;
  this.errors = errors;
};
