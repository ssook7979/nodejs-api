export default class NotFoundException {
  message: string;
  status: number;

  constructor(message?: string) {
    this.status = 404;
    this.message = message || 'not_found';
  }
}
