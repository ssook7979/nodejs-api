//TODO: type

type TError = {
  param: string;
  msg: string;
};

type TErrorObject = {
  status: number;
  message: string;
  errors: TError[];
};

type TValidationErrors = {
  [key: string]: string;
} | null;

type TErrorResponse = {
  path: string;
  timestamp: number;
  message: string;
  validationErrors?: TValidationErrors;
};

export default (err: any, req: any, res: any, next: any) => {
  const { status, message, errors }: TErrorObject = err;
  let validationErrors: TValidationErrors = null;
  if (errors) {
    validationErrors = {};
    errors.forEach(
      (error) => (validationErrors![error.param] = req.t(error.msg))
    );
  }
  const response: TErrorResponse = {
    path: req.originalUrl,
    timestamp: new Date().getTime(),
    message: req.t(message),
  };
  if (validationErrors?.length) {
    response.validationErrors = validationErrors;
  }
  res.status(status).send(response);
};
