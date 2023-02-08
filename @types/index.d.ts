declare namespace Express {
  interface Request {
    pagination: { page: number; size: number };
    params: {
      id: number;
    };
    authenticatedUser?: User;
  }
}

declare namespace JsonWebToken {
  interface JwtPayload {
    id: number;
  }
}
