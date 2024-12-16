import { Request, Response } from 'express';

export const notFoundMiddleware = (_request: Request, response: Response) => {
  response.status(404).send();
};
