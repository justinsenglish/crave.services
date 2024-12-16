import { Request, Response, NextFunction } from 'express';

export const bigIntMiddleware = (_request: Request, response: Response, next: NextFunction) => {
  const originalJson = response.json;

  response.json = function (data) {
    const transformedData = JSON.parse(JSON.stringify(data, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)));
    return originalJson.call(this, transformedData);
  };

  next();
};
