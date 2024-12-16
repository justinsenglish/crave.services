import { Router } from 'express';
import { franchiseRouter } from './franchise';

export const routes = Router();

routes.get('/', (_req, res) => {
  res.status(401).send('Unauthorized');
});

routes.get('/health', (_req, res) => {
  res.status(200).send('Healthy');
});

routes.use('/franchises', franchiseRouter);
