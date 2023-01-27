export default class ForbiddenException {
  message: string;
  status: number;

  constructor() {
    this.status = 403;
    this.message = 'inactive_authentication_failure';
  }
}
