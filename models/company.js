//Company Model file

const db = require('../db');
const ExpressError = require('../helpers/expressError');
const { sqlForPartialUpdate } = require('../helpers/partialUpdate');

/** class specification for Company object instance, which is a model for 
 * the database table "companies". This class defines five attributes,
 * in addition to several methods on the class and object. 
 */
class Company {
    constructor() {
        this.handle;
        this.name;
        this.num_employees;
        this.description;
        this.logo_url;
    }

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

        const sqlString = `SELECT handle, name FROM companies WHERE (${whereString});`; //**NOTE** changing format of this string will upset tests!
        
        return { sqlString, vals };
    }

    /** check options object for parameters to consider, then retrieve list of companies from 
     * database that meet parameter specifications. Return JSON containing a list of companies.
     *      --> {companies: [{handle <string>, name <string>}, ...]}
     * 
     * Notable Errors:
     *      ?
     */
    static async get(options) {
        //if options obj is empty go ahead and return all results from companies table    

        if (typeof(options) === 'undefined' || !Object.keys(options).length) {
            const result = await db.query('SELECT handle, name FROM companies;')
            return {companies: result.rows};
        }

        const { sqlString, vals } = this.buildQuery(options);
        
        const result = await db.query(sqlString, vals);

        return {companies: result.rows};
    }

    /** given handle, return single company
     *      --> {company: {handle <string>, name <string>, num_employees <integer>, description <string>, logo_url <string>}}
     */
    static async getByHandle(handle) {
        try {

            const result = await db.query(`
                SELECT *
                FROM companies
                WHERE handle=$1`, [handle]);

            if (result.rows.length === 0) {
                throw new ExpressError(`No company found with handle "${handle}"`, 400);
            }
            return {company: result.rows[0]}

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
        const filteredArr = Object.entries(newCo).filter(function(val, index) {
            if (val[1]) {
                return [val[0], val[1]];
            }
        });

        const parameterizedString = Company.parameterizedString(filteredArr.length);
        const tableVars = [].concat(...filteredArr.map(x => x[0]));
        const parameterizedArray = [].concat(...filteredArr.map(x => x[1]));

        try {

            const result = await db.query(`
                INSERT INTO companies (${tableVars.toString()})
                VALUES (${parameterizedString})
                RETURNING *`, parameterizedArray);
            return {company: result.rows[0]};  

        } catch(err) {
            if (err.message === `duplicate key value violates unique constraint "companies_pkey"`) {
                throw new ExpressError(`Company with handle: "${parameterizedArray[0]}" already exists`, 400);
            } else {
                throw new ExpressError(err.message, err.status);
            }
        }
    }

    /** If the passed handle exists, update the corresponding company in database 
     * with information contained in updateObj. Return object containing data
     * from the updated company.
     * 
     *      --> {company: {handle <string>, name <string>, num_employees <integer>, description <string>, logo_url <string>}}
    * 
    */
    static async update(handle, updateObj) {
        try {
            const table = `companies`;
            const items = updateObj;
            const key = `handle`;
            const id = handle;

            const { query, values } = sqlForPartialUpdate(table, items, key, id);
            const result = await db.query(query, values);

            if (!result.rowCount) {
                throw new ExpressError(`No company found with handle "${id}"`, 400);
            }
            return {company: result.rows[0]}

        } catch(err) {
            throw err;
        }
    }

    /** If the passed handle exists, delete corresponding company and information from
     * the database and return an object containing the deleted information.
     * 
     *      --> {deleted: {company: {handle <string>, name <string>, num_employees <integer>, description <string>, logo_url <string>}}}
     */
    static async delete(handle) {
        try {
            const result = await db.query(`
                DELETE FROM companies
                WHERE handle=$1
                RETURNING *`, [handle]);
            if (!result.rowCount) {
                throw new ExpressError(`No company found with handle "${handle}"`, 400)
            }
            return {message: "Company deleted"};
        } catch(err) {
            throw err;
        }
    }
}

module.exports = Company;