//User Model file

const db = require('../db');
const ExpressError = require('../helpers/expressError');
const { sqlForPartialUpdate } = require('../helpers/partialUpdate');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {BCRYPT_WORK_FACTOR, SECRET_KEY } = require('../config');

/** class specification for User object*/
class User {

    /** return instance of db client 
     * 
     * @returns {Client} - pg database Client instance
    */
    static returnDB() {
        return db;
    }

    /** Return array of all users.
     * 
     * @returns {Promise{Object{String, String, String, String}}} - object containing {users: [{username <string>, first_name <string>, last_name <string>, email <string>}, ...]}
     */
    static async get() {
        try {
            const result = await db.query(`
                SELECT username, first_name, last_name, email
                FROM users;
            `);
            return {users: result.rows};            
        } catch(err) {
            err.status = 400;
            throw err;
        }
    }

    /** given username, return single user
     * 
     * @param {String} username - unique user identification string
     * 
     * @returns {Promise{Object{String, String, String, String}}} - object containing {user: {username <string>, first_name <string>, last_name <integer>, email <string>}}
     */
    static async getByUsername(username) {
        try {
            const result = await db.query(`
                SELECT username, first_name, last_name, email
                FROM users
                WHERE username=$1`, [username]);

            if (!result.rowCount) {
                throw new ExpressError(`No user found with username: ${username}`, 400);
            }

            const user = result.rows[0];
            return { user };

        } catch(err) {
            throw err;
        }
    }

    /** given an integer, function returns a parameterized query string of commensurate length.
     * 
     * @param {Number} num - number of needed sanitized query string parameters
     * 
     * @returns {String} - string like '$1, $2, $3, $4, ...' (if num is >= 4)
    */
    static parameterizedString(num) {
        let string = '';
        for (let i=1; i<=num; i++) {
            string += `$${i}`;
            if (i!=num) {
                string+=`, `;
            }
        }
        return string
    }

    /** Take password string and return new hashed password
     * 
     * @param {String} password - password string
     * 
     * @returns {String} - hashed password string
     * 
     */
    static async hashPassword(password) {
        const salt = await bcrypt.genSalt(Number(BCRYPT_WORK_FACTOR));
        const hashed = await bcrypt.hash(password, salt);
        return hashed;
    }

    /** given newUser object, create user if info is valid and return JWT
     * 
     * @param {Object} newUser - information about a new user as a set of key-value pairs
     * @param {String} newUser.username - unique user identification string
     * @param {String} newUser.first_name - user first name string
     * @param {String} newUser.last_name - user last name string
     * @param {String} newUser.email - user email string
     * @param {String} newUser.password - user's HASHED password. 
     * @param {String} newUser.photo_url - url for users profile photo
     * @param {String} newUser.is_admin - user admin status: boolean value
     * 
     * @returns {Promise{Object{String}}} - object containing {token: token <string>}
     * 
     */
    static async new(newUser) {

        //replace plain text password with hashed password
        newUser.password = this.hashPassword(newUser.password);

        //filter object entries for defined vals only
        const filteredArr = Object.entries(newUser).filter(function(val) {
            if (val[1]) {
                return [val[0], val[1]];
            }
        });

        const parameterizedString = User.parameterizedString(filteredArr.length);
        const tableVars = [].concat(...filteredArr.map(x => x[0]));
        const parameterizedArray = [].concat(...filteredArr.map(x => x[1]));

        try {
            const result = await db.query(`
                INSERT INTO users (${tableVars.toString()})
                VALUES (${parameterizedString})
                RETURNING username, is_admin;`, parameterizedArray);
            const user = result.rows[0];
            let token = jwt.sign({ user }, SECRET_KEY);
            return { token };

        } catch(err) {
            if (err.message === `duplicate key value violates unique constraint "users_pkey"`) {
                throw new ExpressError(`User with username ${parameterizedArray[0]} already exists`, 400);
            } else {
                console.error(err);
                throw new ExpressError(err.message, err.status);
            }
        }
    }

    /** If the passed username exists, update the corresponding user in database 
     * with information contained in updateObj. Return object containing data
     * from the updated user.
     * 
     * @param {String} uname - unique user identification string
     * @param {Object} updateObj - object containing fields to be updated in user corresponding to uname param
     * @param {String} updateObj.username - unique user identification string
     * @param {String} updateObj.first_name - user first name string
     * @param {String} updateObj.last_name - user last name string
     * @param {String} updateObj.email - user email string
     * @param {String} updateObj.password - user's HASHED password. 
     * @param {String} updateObj.photo_url - url for users profile photo
     * @param {String} updateObj.is_admin - user admin status: boolean value
     * 
     * @returns {Promise{Object{String, String, String, String}}} - object containing {user: {username <string>, first_name <string>, last_name <string>, email <string>}}
    * 
    */
    static async update(uname, updateObj) {
        try {
            const table = `users`;
            const items = updateObj;
            const key = `username`;

            const { query, values } = sqlForPartialUpdate(table, items, key, uname);
            const result = await db.query(query, values);

            if (!result.rowCount) {
                throw new ExpressError(`No user found with username: ${uname}`, 400);
            }

            const { username, first_name, last_name, email } = result.rows[0];

            return { user: { username, first_name, last_name, email } };

        } catch(err) {
            throw err;
        }
    }

    /** If the passed username exists, delete corresponding user and information from
     * the database and return message confirming deletion.
     * 
     * @param {String} username - unique user identification string
     * 
     * @returns {Promise{Object{String}}} - object containing {message: "User deleted"}
     */
    static async delete(username) {
        try {
            const result = await db.query(`
                DELETE FROM users
                WHERE username=$1
                RETURNING *`, [username]);
                
            if (!result.rowCount) {
                throw new ExpressError(`No user found with username: ${username}`, 400)
            }
            return {message: "user deleted"};
        } catch(err) {
            throw err;
        }
    }

    /** Takes an object containing username and password. If credentials match a user in database, return a token
     * 
     * @param {Object} credentials - object containing username and password
     * @param {String} credentials.username - unique user identifier string
     * @param {String} credentials.password - plain text password to compare
     * 
     * @returns {Promise{Object}} - object containing token
     */
    static async login(credentials) {
        try {

            const { username, password } = credentials;

            const result = await db.query(`
                SELECT password
                FROM users
                WHERE username=$1`, [username]);

            const user = result.rows[0];

            if (user) {
                if (await bcrypt.compare(password, user.password)) {
                    const token = jwt.sign({username}, SECRET_KEY);
                    return {token};
                }
            }

            throw new ExpressError('Invalid username or password', 400);   
        } catch(err) {
            throw(err);
        }
    }
}

module.exports = User;