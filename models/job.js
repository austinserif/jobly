//Job Model file

const db = require('../db');
const ExpressError = require('../helpers/expressError');
const { sqlForPartialUpdate } = require('../helpers/partialUpdate');

/** class specification for Job object.
 */
class Job {

    /** return instance of db client 
     *
     * @returns {Client} - pg database client instance
    */
    static returnDB() {
        return db;
    }

    /** Return part of a valid SQL "WHERE statement" as a string containg the passed valued. It should 
     * assert that 'name LIKE '%' || $1 || '%' (if index == 1)
     * 
     * @param {Number} index - index of search parameter in SQL query
     * 
     * @returns {String} - substring of SQL "where" statement concatonated to include index
     */
    static searchString(index) {
        return `title LIKE '%' || $${index} || '%'`
    }

    /** Return part of a valid SQL "WHERE statement" as a string containg the passed value. It should
     * assert that 'salary >= $1' (if index == 1)
     * 
     * @param {Number} index - index of salary minimum value parameter in SQL query
     * 
     * @returns {String} - substring of SQL "where" statement concatonated to include index
     */
    static minSalaryString(index) {
        return `salary >= $${index}`;
    }


    /** Return part of a valid SQL "WHERE statement" as a string containg the passed value. It should
     * assert that 'equity >= $1' (if index == 1)
     * 
     * @param {Number} index - index of equity minimum value parameter in SQL query
     * 
     * @returns {String} - substring of SQL "where" statement concatonated to include index
     */
    static minEquityString(index) {
        return `equity >= $${index}`;
    }

    /** take options obj as an argument, and return JSON contatining a sqlString and arr of values.
     * 
     * @param {Object} options - object containing potential key-value pairs { search, min_salary, min_equity }
     * @param {String|undefined} options.search - search keyword
     * @param {Number|undefined} options.min_salary - minimum salary integer value
     * @param {Number|undefined} options.min_equity - maximum equity integer value
     *      
     * @returns {Object{String, Array[Number]}} - object containing {sqlString <string>, vals <arr>: [num <integer>, ...]}
     * 
     */
    static buildQuery(options) {
        let whereString = '';
        const { search, min_salary, min_equity } = options;

        if (Number(min_equity > 1)) {
            throw new ExpressError("invalid min_equity parameter value, must be between 0 and 1 inclusive.", 400);
        };

        let and = " AND ";
        let currIndex = 1;
        const vals = [];

        if (typeof(search) === 'string') {
            whereString += this.searchString(currIndex);
            vals.push(search);
            currIndex++;
        }

        if (!isNaN(min_salary)) {

            if (whereString.length) {
                whereString+=and;
            }

            whereString += this.minSalaryString(currIndex);
            vals.push(min_salary);
            currIndex++;
        }

        if (!isNaN(min_equity)) {

            if (whereString.length) {
                whereString+=and;
            }

            whereString += this.minEquityString(currIndex);
            vals.push(min_equity);
            currIndex++;
        }

        const sqlString = `SELECT title, company_handle FROM jobs WHERE (${whereString}) ORDER BY date_posted desc;`; //**NOTE** changing format of this string will upset tests!
        
        return { sqlString, vals };
    }

    /** check options object for parameters to consider, then retrieve list of jobs from 
     * database that meet parameter specifications. Return JSON containing a list of jobs.
     * 
     * @param {Object} options - object containing potential key-value pairs { search, min_salary, min_equity }
     * @param {String|undefined} options.search - search keyword
     * @param {Number|undefined} options.min_salary - minimum salary integer value
     * @param {Number|undefined} options.min_equity - maximum equity integer value
     *      
     * @returns {Promise{Array[Object{String, String}]}} - object containing {jobs: [{title <string>, company_handle <string>}, ...]}
     */
    static async get(options) {
        //if options obj is empty go ahead and return all results from jobs table    
        if (Object.values(options).every(val=>(!val))) {
            const result = await db.query('SELECT title, company_handle FROM jobs ORDER BY date_posted desc;');
            const jobsArr = result.rows.map(obj => ({job: obj}))
            return {jobs: jobsArr};
        }

        const { sqlString, vals } = this.buildQuery(options);
        
        const result = await db.query(sqlString, vals);
        const jobsArr = result.rows.map(obj => ({job: obj}))
        return {jobs: jobsArr};
    }

    /** given id, return single job
     * 
     * @param {Number} id - unique job identification integer
     * 
     * @returns {Promise{Object{String, String}}} - object containing {job: {title <string>, salary <float>, equity <float>, company_handle <string>}}
     */
    static async getById(id) {
        try {
            const result = await db.query(`
                SELECT title, salary, equity, company_handle
                FROM jobs
                WHERE id=$1`, [id]);

                if (!result.rowCount) {
                throw new ExpressError(`No job found with id "${id}"`, 400);
            }
            return {job: result.rows[0]}

        } catch(err) {
            throw err;
        }
    }

    /** given an integer, function returns a parameterized query string of commensurate length.
     * 
     * @param {Number} num - number of needed sanitized query string parameters
     * 
     * @returns {String} - string like '$1, $2, $3, $4, ...' (if num is >= 4)
     * 
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

    /** given newJob object containing job details, commit to database and return details
     *
     * @param {Object} newJob - information about a new job as a set of key-value pairs
     * @param {String} newJob.title - job title
     * @param {Number} newJob.salary - job salary
     * @param {String} newJob.equity - job equity
     * @param {String} newJob.company_handle - unique company idefification string
     * 
     * @returns {Promise{Object{String, Number, Number, String}}} - object containing {job: {title <string>, salary <float>, equity <float>, company_handle <string>}}
     * 
    */
    static async new(newJob) {
        const filteredArr = Object.entries(newJob).filter(function(val, index) {
            if (val[1]) {
                return [val[0], val[1]];
            }
        });

        const parameterizedString = Job.parameterizedString(filteredArr.length);
        const tableVars = [].concat(...filteredArr.map(x => x[0]));
        const parameterizedArray = [].concat(...filteredArr.map(x => x[1]));

        try {

            const result = await db.query(`
                INSERT INTO jobs (${tableVars.toString()})
                VALUES (${parameterizedString})
                RETURNING title, salary, equity, company_handle`, parameterizedArray);
            return {job: result.rows[0]};  

        } catch(err) {
            if (err.message === `insert or update on table "jobs" violates foreign key constraint "fk_jobs"`) {
                throw new ExpressError(`No company exists corresponding to handle: "${parameterizedArray[3]}"`, 400);
            } else {
                throw new ExpressError(err.message, err.status);
            }
        }
    }


    /** If the passed handle exists, update the corresponding company in database 
     * with information contained in updateObj. Return object containing data
     * from the updated company.
     * 
     * @param {String} jobId - unique job identification integer
     * @param {Object} updateObj - object containing fields to be updated in job corresponding to id param
     * @param {String} updateObj.id - unique job identification integer
     * @param {String} updateObj.title - title of job, not necessarily unique
     * @param {Number} updateObj.salary - job salary
     * @param {String} updateObj.equity - job equity
     * @param {String} updateObj.company_handle - unique company identification string
     * 
     * @returns {Promise{Object{String, String, Number, String, String}}} - object containing {job: {title <string>, salary <float>, equity <float>, company_handle <string}}
    * 
    */
   static async update(jobId, updateObj) {
        try {
            const table = `jobs`;
            const items = updateObj;
            const key = `id`;
            const id = jobId;

            const { query, values } = sqlForPartialUpdate(table, items, key, id);
            const result = await db.query(query, values);

            if (!result.rowCount) {
                throw new ExpressError(400);
            }

            const { title, salary, equity, company_handle } = result.rows[0];
            return {job: {title, salary, equity, company_handle}};

        } catch(err) {
            throw err;
        }
    }

    /** If the passed id exists, delete corresponding job and information from
     * the database and return message confirming deletion.
     * 
     * @param {Number} id - unique job identification integer
     * 
     * @returns {Promise{Object{String}}} - object containing {message: "Job deleted"}
     */
    static async delete(id) {
        try {
            const result = await db.query(`
                DELETE FROM jobs
                WHERE id=$1
                RETURNING *`, [id]);
            if (!result.rowCount) {
                throw new ExpressError(`No job found with id ${id}`, 400)
            }
            return {message: "Job deleted"};
        } catch(err) {
            throw err;
        }
    }
}

module.exports = Job;