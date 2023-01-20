export class AuthenticationException {
  constructor() {
    this.status = 401;
    this.message = 'authentication_failure';
  }
}
