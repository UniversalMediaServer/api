import * as express from 'express';
import { Request, Response, NextFunction, Application } from 'express';
import * as helmet from 'helmet';
import * as Debug from 'debug';
const debug = Debug('universalmediaserver-api:server');

import indexRouter from './routes/index';
import mediaRouter  from './routes/media';

const app: Application = express();

import connect from './models/connection';

const db: string = process.env.MONGO_URL;
connect(db);

app.use((req: Request, res: Response, next: NextFunction) => {
  debug(`${req.method} ${req.url}`);
  next();
});

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use('/', indexRouter);
app.use('/api/media', mediaRouter);

// catch 404 and forward to error handler
app.use((req: Request, res: Response, next: NextFunction) => {
  const err: CustomError = new Error('Not found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err: CustomError, req: Request, res: Response, next: NextFunction) => {
  // set locals, only providing error in development
  const isDev = ['development', 'test'].includes(req.app.get('env'));
  res.locals.message = err.message;
  res.locals.error = isDev ? err : {};
  res.status(err.status || 500);
  if (isDev) {
    console.error(err);
  }
  res.send();
});

module.exports = app;
