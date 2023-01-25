export default class EmailException {
  message: string;
  status: number;

  constructor() {
    this.message = 'email_failure';
    this.status = 502;
  }
}
