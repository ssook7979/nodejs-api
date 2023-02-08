export default class ForbiddenException {
  message: string;
  status: number;

  constructor(message?: string) {
    this.status = 403;
    this.message = message || 'inactive_authentication_failure';
  }
}
