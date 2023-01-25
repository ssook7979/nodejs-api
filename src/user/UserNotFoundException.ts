export default class InvalidTokenException {
  message: string;
  status: number;

  constructor() {
    this.message = 'user_not_found';
    this.status = 404;
  }
}
