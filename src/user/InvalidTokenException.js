module.exports = function InvalidTokenException() {
  this.message = 'token_failure';
  this.status = 400;
};
