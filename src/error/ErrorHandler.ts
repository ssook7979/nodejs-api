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

export default (err: any, req: any, res: any, next: any) => {
  const { status, message, errors }: TErrorObject = err;
  let validationErrors: TValidationErrors = null;
  if (errors) {
    validationErrors = {};
    errors.forEach(
      (error) => (validationErrors![error.param] = req.t(error.msg))
    );
  }
  res.status(status).send({
    path: req.originalUrl,
    timestamp: new Date().getTime(),
    message: req.t(message),
    validationErrors,
  });
};
