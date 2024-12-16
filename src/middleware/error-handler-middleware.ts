import HttpException from '../common/http-exception';
import { NextFunction, Request, Response } from 'express';

export const errorHandlerMiddleware = (error: HttpException, _request: Request, response: Response, _next: NextFunction) => {
  const status = error.statusCode || error.status || 500;

  response.status(status).send(error);
};
