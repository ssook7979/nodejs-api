import IException from '../error/IException';

export default class AuthenticationException implements IException {
  message: string;
  status: number;

  constructor() {
    this.status = 401;
    this.message = 'authentication_failure';
  }
}
