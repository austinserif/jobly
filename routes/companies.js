const express = require('express');
const router = express.Router();
const Company = require('../models/company');

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
// router.post('/', function(request, response, next) {

// });


/** GET /companies
 *  
 * Return a single company found by its handle.
 *      --> {company: {handle <string>, name <string>, num_employees <integer>, description <string>, logo_url <string>}}
 */
// router.get('/:handle', function(request, response, next) {

// });

// router.patch('/:handle', function(request, response, next) {

// });

// router.delete('/:handle', function(request, response, next){

// });

module.exports = router;