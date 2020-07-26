const db = require('../db');
const ExpressError = require('../helpers/expressError');

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

        const sqlString = `SELECT handle, name FROM companies WHERE (${whereString});`;
        
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
            const result = await db.query('SELECT handle, name FROM companies;');
            return {companies: result.rows};
        }

        const { sqlString, vals } = this.buildQuery(options);
        
        const result = await db.query(sqlString, vals);

        return {companies: result.rows};
    }
}

module.exports = Company;