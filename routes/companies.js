const express = require('express');
const ExpressError = require('../helpers/expressError');
const router = express.Router();
const Company = require('../models/company');
const jsonschema = require('jsonschema');
const companySchema = require('../schema/company-schema.json');

/** GET /companies
 *  
 * Returns handle and name for all of the company objects, or a filtered list
 * of company objects if valid query string parameters are passed.
 *      --> {companies: [{handle <string>, name <string>}, ...]}
 * 
 * Query String Params:
 *      param: search <string>
 *          If the query string parameter is passed, a filtered list of handles 
 *          and names should be displayed based on the search term and if the 
 *          name includes it.
 *      
 *      param: min_employees <integer>
 *          If the query string parameter is passed, titles and company handles 
 *          should be displayed that have a number of employees greater than the 
 *          value of the query string parameter.
 * 
 *      param: max_employees <integer>
 *          If the query string parameter is passed, a list of titles and company 
 *          handles should be displayed that have a number of employees less than 
 *          the value of the query string parameter.
 * 
 * Noteable Errors:
 *      Throw error if min_employees is > max_employees. 
 */
router.get('/', async function(request, response, next) {
    try {
        const { companies } = await Company.get(request.query); //pass params, will be read by Company.get() as an options obj and destructured within function.
        return response.json({companies});
    } catch(err) {
        return next(err);
    }
});

/** POST /companies
 *  
 * Creates a new company and returns JSON including company data.
 *      --> {company: {handle <string>, name <string>, num_employees <integer>, description <string>, logo_url <string>}}
 */
router.post('/', async function(request, response, next) {
    try {
        //validate request.body
        const result = jsonschema.validate(request.body, companySchema);
        if (!result) {
          // pass a 400 error to the error-handler
          let listOfErrors = result.errors.map(err => err.stack);
          let err = new ExpressError(listOfErrors, 400);
          return next(err);
        }

        const { company } = await Company.new(request.body);
        return response.status(201).json({company});

    } catch(err) {
        return next(err);
    }
});


/** GET /companies/:handle
 *  
 * Return a single company found by its handle.
 *      --> {company: {handle <string>, name <string>, num_employees <integer>, description <string>, logo_url <string>}}
 */
router.get('/:handle', async function(request, response, next) {
    try {
        const { handle } = request.params;
        const { company } = await Company.getByHandle(handle);
        return response.json({ company });
    } catch(err) {
        return next(err);
    }
});


/** PATCH /companies/:handle
 * 
 * Update company in database--corresponding to handle passed as a url parameter--
 * with data passed in the body, return updated company and data.
 * 
 *      --> {company: {handle <string>, name <string>, num_employees <integer>, description <string>, logo_url <string>}}
 * 
 */
router.patch('/:handle', async function(request, response, next) {
    try {
        const { handle } = request.params;
        const updatedObj = request.body;
        const { company } = await Company.update(handle, updatedObj);
        return response.json({company});
    } catch(err) {
        return next(err);
    }
});

/** DELETE /companies/:handle 
 * 
 * Delete company of corresponding handle from database and return
 * a message confirming deletion
 * 
 *      --> {message: "Company deleted"}
*/
router.delete('/:handle', async function(request, response, next){
    try {
        const { handle } = request.params;
        const { message } = await Company.delete(handle);
        return response.json({message});
    } catch(err) {
        return next(err);
    }
});

module.exports = router;