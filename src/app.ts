import * as createError from 'http-errors';
import * as express from 'express';
import { Request, Response, NextFunction, Application } from 'express';
import * as path from 'path';
import * as cookieParser from 'cookie-parser';

import indexRouter from './routes/index';
import usersRouter  from './routes/users';

const app: Application = express();

import connect from './models/connection';

const db: string = process.env.MONGO_URL;

connect(db);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req: Request, res: Response, next: NextFunction) {
  next(createError(404));
});

// error handler
app.use(function(err, req: Request, res: Response, next: NextFunction) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
