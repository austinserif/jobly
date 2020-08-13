const userSchema = require('../schema/user-schema.json');
const jsonschema = require('jsonschema');
const ExpressError = require('../helpers/expressError');

/** validate data in client request body with json schema */
function validateUserSchema(request, response, next) {
    try {
        const newUser = request.body;
        const result = jsonschema.validate(newUser, userSchema);
        if (!result) {
          // pass a 400 error to the error-usernamer
          let listOfErrors = result.errors.map(err => err.stack);
          throw new ExpressError(listOfErrors, 400);
        }
        return next();
    } catch(err) {
        return next(err);
    }
}

module.exports = validateUserSchema;