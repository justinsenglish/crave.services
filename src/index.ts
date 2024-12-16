import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import ServerlessHttp from 'serverless-http';
import { bigIntMiddleware } from './middleware/big-int-middleware';
import { notFoundMiddleware } from './middleware/not-found-middleware';
import { errorHandlerMiddleware } from './middleware/error-handler-middleware';
import { routes } from './routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(bigIntMiddleware);

app.use('/', routes);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

if (process.env.ENVIRONMENT !== 'local') {
  exports.handler = ServerlessHttp(app);
} else {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
