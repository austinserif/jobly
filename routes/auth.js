const express = require('express');
const ExpressError = require('../helpers/expressError');
const User = require('../models/user');
const router = express.Router();
const jsonschema = require('jsonschema');
const bcrypt = require('bcrypt');
const db = require('../db');
const jwt = require('jsonwebtoken');
const userSchema = require('../schema/user-schema.json');
const { SECRET_KEY, BCRYPT_WORK_FACTOR } = require('../config');

/** POST /login
 * authenticate a user and return JSON Web Token
 * w/ a payload including values for:
 * - username
 * - is_admin
 * 
 *      --> {token: token}
 */
router.post('/login', async function(request, response, next) {
    try {
        const { username, password } = request.body;
        const { token } = User.login({username, password});
        return response.json({token});
    } catch(err) {
        return next(err);
    }
});


/** POST /users 
 * create new user and return JSON Web Token
 * w/ a payload including values for:
 * - username
 * - is_admin
 *
 *      --> {token: token}
*/
router.post('/register', async function(request, response, next) {
    try {
        const newUser = request.body;
        const result = jsonschema.validate(newUser, userSchema);
        if (!result) {
          // pass a 400 error to the error-usernamer
          let listOfErrors = result.errors.map(err => err.stack);
          throw new ExpressError(listOfErrors, 400);
        }

        const { token } = await User.new(newUser);
        return response.status(201).json({token});

    } catch(err) {
        return next(err);
    }
});

module.exports = router;

