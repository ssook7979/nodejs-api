export class ValidationExceptinon {
  message: string;
  status: number;
  errors: any; // TODO: declare ValidationError type
  constructor(errors: any) {
    this.status = 400;
    this.errors = errors;
    this.message = 'validation_failure';
  }
}
