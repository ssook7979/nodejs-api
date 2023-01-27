import IException from './IException';

export default class ValidationExceptinon implements IException {
  errors: any;
  status: number;
  message: string; // TODO: declare ValidationError type

  constructor(errors: any) {
    console.log(errors);
    this.status = 400;
    this.errors = errors;
    this.message = 'validation_failure';
  }
}
