import IException from '../error/IException';

export default class InvalidTokenException implements IException {
  message: string;
  status: number;

  constructor() {
    this.message = 'account_activation_failure';
    this.status = 400;
  }
}
