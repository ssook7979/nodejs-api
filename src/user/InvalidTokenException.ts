export default class InvalidTokenException {
  message: string;
  status: number;

  constructor() {
    this.message = 'account_activation_failure';
    this.status = 400;
  }
}
