/** Express app for jobly. */

const express = require("express");

const ExpressError = require("./helpers/expressError");

const morgan = require("morgan");

const app = express();

app.use(express.json());

app.use(express.urlencoded({extended: true}));

// add logging system
app.use(morgan("tiny"));

// include routes from ./routes/companies.js and instantiate with '/companies' prefix
const companies = require('./routes/companies');
const jobs = require('./routes/jobs');
const users = require('./routes/users');
app.use('/companies', companies);
app.use('/jobs', jobs);
app.use('/users', users);

/** 404 handler */

app.use(function(req, res, next) {
  const err = new ExpressError("Not Found", 404);

  // pass the error to the next piece of middleware
  return next(err);
});

/** general error handler */

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  console.error(err.stack);

  return res.json({
    status: err.status,
    message: err.message
  });
});

module.exports = app;
