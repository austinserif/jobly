const express = require('express');
const ExpressError = require('../helpers/expressError');
const router = express.Router();
const User = require('../models/user');
const jsonschema = require('jsonschema');
const userSchema = require('../schema/user-schema.json');

/** GET /users
 *  
 * Returns username first_name, last_name, and email for all of the user objects
 * 
 *      --> {users: [{username <string>, first_name <string>, last_name <string>, email <string>}, ...]}
 */
router.get('/', async function(request, response, next) {
    try {
        const { users } = await User.get(); //pass params, will be read by user.get() as an options obj and destructured within function.
        return response.json({users});
    } catch(err) {
        return next(err);
    }
});

/** POST /users
 *  
 * Creates a new user and returns JSON including user data.
 * 
 *      --> {user: {username <string>, name <string>, num_employees <integer>, description <string>, logo_url <string>}}
 */
router.post('/', async function(request, response, next) {
    try {
        //validate request.body
        const result = jsonschema.validate(request.body, userSchema);
        if (!result) {
          // pass a 400 error to the error-usernamer
          let listOfErrors = result.errors.map(err => err.stack);
          let err = new ExpressError(listOfErrors, 400);
          return next(err);
        }

        const { user } = await User.new(request.body);
        return response.status(201).json({user});

    } catch(err) {
        return next(err);
    }
});


/** GET /users/:username
 *  
 * Return a single user found by its username.
 *      --> {user: {username <string>, name <string>, num_employees <integer>, description <string>, logo_url <string>}}
 */
router.get('/:username', async function(request, response, next) {
    try {
        const { username } = request.params;
        const { user } = await User.getByUsername(username);
        return response.json({ user });
    } catch(err) {
        return next(err);
    }
});


/** PATCH /users/:username
 * 
 * Update user in database--corresponding to username passed as a url parameter--
 * with data passed in the body, return updated user and data.
 * 
 *      --> {user: {username <string>, name <string>, num_employees <integer>, description <string>, logo_url <string>}}
 * 
 */
router.patch('/:username', async function(request, response, next) {
    try {
        const { username } = request.params;
        const updatedObj = request.body;
        const { user } = await User.update(username, updatedObj);
        return response.json({user});
    } catch(err) {
        return next(err);
    }
});

/** DELETE /users/:username 
 * 
 * Delete user of corresponding username from database and return
 * a message confirming deletion
 * 
 *      --> {message: "user deleted"}
*/
router.delete('/:username', async function(request, response, next){
    try {
        const { username } = request.params;
        const { message } = await User.delete(username);
        return response.json({message});
    } catch(err) {
        return next(err);
    }
});

module.exports = router;