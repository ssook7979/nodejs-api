import IException from '../error/IException';

export default class InvalidTokenException implements IException {
  message: string;
  status: number;

  constructor() {
    this.message = 'user_not_found';
    this.status = 404;
  }
}
