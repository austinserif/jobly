//Company Model file

const db = require('../db');
const ExpressError = require('../helpers/expressError');
const { sqlForPartialUpdate } = require('../helpers/partialUpdate');


/** class specification for Company object.
 */
class Company {

    /** return instance of db client 
     * 
     * @returns {Client} - pg database client instance
    */
    static returnDB() {
        return db;
    }

    /** Return part of a valid SQL "WHERE statement" as a string containg the passed valued. It should assert 
     * assert that 'name LIKE '%' || $1 || '%' (if index == 1)
     * 
     * @param {Number} index - index of search parameter in SQL query
     * 
     * @returns {String} - substring of SQL "where" statement concatonated to include index
     */
    static searchString(index) {
        // return `name LIKE '%$${index}%'`;
        return `name LIKE '%' || $${index} || '%'`
    }

    /** Return part of a valid SQL "WHERE statement" as a string containg the passed value. It should
     * assert that 'employees >= $1' (if index == 1)
     * 
     * @param {Number} index - index of num_employees minimum value parameter in SQL query
     * 
     * @returns {String} - substring of SQL "where" statement concatonated to include index
     */
    static minEmployeesString(index) {
        return `num_employees >= $${index}`;
    }


    /** Return part of a valid SQL "WHERE statement" as a string containg the passed value. It should
     * assert that 'employees <= $1' (if index == 1)
     * 
     * @param {Number} index - index of num_employees maximum value parameter in SQL query
     * 
     * @returns {String} - substring of SQL "where" statement concatonated to include index
     */
    static maxEmployeesString(index) {
        return `num_employees <= $${index}`;
    }

    /** take options obj as an argument, and return JSON contatining a sqlString and arr of values.
     * 
     * @param {Object} options - object containing potential key-value pairs { search, min_employees, max_employees }
     * @param {String|undefined} options.search - search keyword
     * @param {Number|undefined} options.min_employees - minimum num_employee integer value
     * @param {Number|undefined} options.max_employees - maximum num_employee integer value
     *      
     * @returns {Object{String, Array[Number]}} - object containing {sqlString <string>, vals <arr>: [num <integer>, ...]}
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

    /** retrieve list of companies in database that meet parameter specifications detailed in the options argument. 
     * Return JSON containing the list of companies.
     * 
     * @param {Object} options - object containing potential key-value pairs { search, min_employees, max_employees }
     * @param {String|undefined} options.search - search keyword
     * @param {Number|undefined} options.min_employees - minimum num_employee integer value
     * @param {Number|undefined} options.max_employees - maximum num_employee integer value
     *      
     * @returns {Object{Array[Object{String, String}]}} - object containing {companies: [{handle <string>, name <string>}, ...]}
     * 
     */
    static async get(options) {
        //if options obj is empty go ahead and return all results from companies table    

        if (Object.values(options).every(val=>(!val))) {
            const result = await db.query('SELECT handle, name FROM companies;');
            return {companies: result.rows};
        }

        const { sqlString, vals } = this.buildQuery(options);
        
        const result = await db.query(sqlString, vals);

        return {companies: result.rows};
    }

    /** given handle, return data for corresponding company (if it exists)
     * 
     * @param {String} handle - unique company identification string
     * 
     * @returns {Object{Object{String, String, Number, String, String}}} - object containing {company: {handle <string>, name <string>, num_employees <integer>, description <string>, logo_url <string>}}
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

            const jobs_result = await db.query(`
                SELECT title, company_handle
                FROM jobs
                WHERE company_handle=$1
                ORDER BY date_posted desc;`, [handle]);
            const {name, num_employees, logo_url, description} = result.rows[0];
            const jobData = jobs_result.rows;
            
            return {company: {handle, name, logo_url, num_employees, description, jobs: jobData}}

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

    /** given newCo object containing company details, commit to database and return details
     *
     * @param {Object} newCo - information about a new company as a set of key-value pairs
     * @param {String} newCo.handle - unique company identification string
     * @param {String} newCo.name - name of company, not necessarily unique
     * @param {Number} newCo.num_employees - number of employees at company
     * @param {String} newCo.description - description of company
     * @param {String} newCo.logo_url - url for company's logo
     * 
     * @returns {Object{Object{String, String, Number, String, String}}} - object containing {company: {handle <string>, name <string>, num_employees <integer>, description <string>, logo_url <string>}}
     * 
    */
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
     * @param {String} handle - unique company identification string
     * @param {Object} updateObj - object containing fields to be updated in company corresponding to handle param
     * @param {String} updateObj.handle - unique company identification string
     * @param {String} updateObj.name - name of company, not necessarily unique
     * @param {Number} updateObj.num_employees - number of employees at company
     * @param {String} updateObj.description - description of company
     * @param {String} updateObj.logo_url - url for company's logo
     * 
     * @returns {Object{Object{String, String, Number, String, String}}} - object containing {company: {handle <string>, name <string>, num_employees <integer>, description <string>, logo_url <string>}}
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
     * the database and return message confirming deletion.
     * 
     * @param {String} handle - unique company identification string
     * 
     * @returns {Object{String}} - object containing {message: "Company deleted"}
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