import IException from '../error/IException';

export default class EmailException implements IException {
  message: string;
  status: number;

  constructor() {
    this.message = 'email_failure';
    this.status = 502;
  }
}
