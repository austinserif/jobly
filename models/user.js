//User Model file

const db = require('../db');
const ExpressError = require('../helpers/expressError');
const { sqlForPartialUpdate } = require('../helpers/partialUpdate');

/** class specification for User object instance, which is a model for 
 * the database table "users". This class defines five attributes,
 * in addition to several methods on the class and object. 
 */
class User {

    /** return instance of db client */
    static returnDB() {
        return db;
    }

    /** Return part of a valid SQL "WHERE statement" as a string containg the passed valued. It should assert 
     * assert that 'name 
     * 
     * param: number <Number>
     */
    static searchString(index) {
        // return `name LIKE '%$${index}%'`;
        return `name LIKE '%' || $${index} || '%'`
    }

    /** Return part of a valid SQL "WHERE statement" as a string containg the passed value. It should
     * assert that 'employees >= number'
     * 
     * param: number <Number>
     */
    static minEmployeesString(index) {
        return `num_employees >= $${index}`;
    }


    /** Return part of a valid SQL "WHERE statement" as a string containg the passed value. It should
     * assert that 'employees <= number'
     * 
     * param: number <Number>
     */
    static maxEmployeesString(index) {
        return `num_employees <= $${index}`;
    }

    /** take options obj as an argument, and return JSON contatining a sqlString and arr of values.
     * 
     *      --> {sqlString <string>, vals <arr>: [num <integer>, ...]}
     */
    static buildQuery(options) {
        let whereString = '';
        const { search, min_employees, max_employees } = options;

        if (Number(min_employees > max_employees)) {
            throw new ExpressError("Bad Request: max_employee query string parameter must be greater than min_employee.", 400);
        };

        let and = " AND ";
        let currIndex = 1;
        const vals = [];

        if (typeof(search) === 'string') {
            whereString += this.searchString(currIndex);
            vals.push(search);
            currIndex++;
        }

        if (!isNaN(min_employees)) {

            if (whereString.length) {
                whereString+=and;
            }

            whereString += this.minEmployeesString(currIndex);
            vals.push(min_employees);
            currIndex++;
        }

        if (!isNaN(max_employees)) {

            if (whereString.length) {
                whereString+=and;
            }

            whereString += this.maxEmployeesString(currIndex);
            vals.push(max_employees);
            currIndex++;
        }

        const sqlString = `SELECT username, name FROM users WHERE (${whereString});`; //**NOTE** changing format of this string will upset tests!
        
        return { sqlString, vals };
    }

    /** Return array of all users.
     *      --> {users: [{username <string>, first_name <string>, last_name <string>, email <string>}, ...]}
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
     *      --> {User: {username <string>, first_name <string>, last_name <integer>, email <string>}}
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
     *     --> '$1, $2, $3, $4, ...' <string>
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

    /** expects */
    static async new(newCo) {
        const filteredArr = Object.entries(newCo).filter(function(val) {
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
                RETURNING username, first_name, last_name, email;`, parameterizedArray);
            const user = result.rows[0];
            return { user };

        } catch(err) {
            if (err.message === `duplicate key value violates unique constraint "users_pkey"`) {
                throw new ExpressError(`User with username ${parameterizedArray[0]} already exists`, 400);
            } else {
                throw new ExpressError(err.message, err.status);
            }
        }
    }

    /** If the passed username exists, update the corresponding User in database 
     * with information contained in updateObj. Return object containing data
     * from the updated User.
     * 
     *      --> {User: {username <string>, name <string>, num_employees <integer>, description <string>, logo_url <string>}}
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

    /** If the passed username exists, delete corresponding User and information from
     * the database and return an object containing the deleted information.
     * 
     *      --> {deleted: {User: {username <string>, name <string>, num_employees <integer>, description <string>, logo_url <string>}}}
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
}

module.exports = User;