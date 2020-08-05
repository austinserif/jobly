/** Express app for jobly. */

const express = require("express");

const ExpressError = require("./helpers/expressError");

const morgan = require("morgan");

const app = express();

const { authenticate } = require('./middleware/route-protection');

app.use(express.json());

app.use(express.urlencoded({extended: true}));

// add logging system
app.use(morgan("tiny"));

app.use(authenticate);

// include routes from companies.js, jobs.js, users.js, and auth.js; instantiate with prefix
const companies = require('./routes/companies');
const jobs = require('./routes/jobs');
const users = require('./routes/users');
const auth = require('./routes/auth');

app.use('/', auth);
app.use('/companies', companies);
app.use('/jobs', jobs);
app.use('/users', users);


/** 404 handler */
app.use(function(request, response, next) {
  const err = new ExpressError("Not Found", 404);

  // pass the error to the next piece of middleware
  return next(err);
});

/** general error handler */

app.use(function(err, request, response, next) {
  response.status(err.status || 500);
  console.error(err.stack);

  return response.json({
    status: err.status,
    message: err.message
  });
});

module.exports = app;
