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
        const result = await db.query(`
            SELECT password
            FROM users
            WHERE username=$1`, [username]);
        
        const user = result.rows[0];
        if (user) {
            if (await bcrypt.compare(password, user.password)) {
                const token = jwt.sign({username}, SECRET_KEY);
                return response.json({token});
            }
        }
        throw new ExpressError('Invalid username or password', 400);
    } catch(err) {
        return next(err);
    }
});


/** POST /users 
 * create n new user and return JSON Web Token
 * w/ a payload including values for:
 * - username
 * - is_admin
 *
 *      --> {token: token}
*/
router.post('/users', async function(request, response, next) {
    try {
        //validate request.body
        const result = jsonschema.validate(request.body, userSchema);
        if (!result) {
          // pass a 400 error to the error-usernamer
          let listOfErrors = result.errors.map(err => err.stack);
          throw new ExpressError(listOfErrors, 400);
        }
        //at this point, username, first_name, last_name, password, and email have been validated as valid entries
        const salt = await bcrypt.genSalt(Number(BCRYPT_WORK_FACTOR));
        const hashed = await bcrypt.hash(request.body.password, salt);
        request.body.password = hashed;

        const { token } = await User.new(request.body);
        return response.status(201).json({token});

    } catch(err) {
        return next(err);
    }
});
module.exports = router;

