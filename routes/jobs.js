const express = require('express');
const ExpressError = require('../helpers/expressError');
const router = express.Router();
const Job = require('../models/job');
const jsonschema = require('jsonschema');
const jobSchema = require('../schema/job-schema.json');
const { authorize, authorizeAdmin } = require('../middleware/route-protection');


/**POST /jobs
 * This route creates a new job and returns a new job.
 * It should return JSON of {job: jobData}
 * */
router.post('/', authorizeAdmin, async function(request, response, next) {
    try {
        //validate request.body
        const result = jsonschema.validate(request.body, jobSchema); //make middleware
        if (!result) {
          // pass a 400 error to the error-handler
            let listOfErrors = result.errors.map(err => err.stack);
            let err = new ExpressError(listOfErrors, 400);
            return next(err);
        }

        const { job } = await Job.new(request.body);
        return response.status(201).json({job});

    } catch(err) {
        return next(err);
    }
});

/**
 * GET /jobs
 * This route should list all the titles and company handles for all jobs, ordered by the most recently posted jobs. It should also allow for the following query string parameters
 * 
search: If the query string parameter is passed, a filtered list of titles and company handles should be displayed based on the search term and if the job title includes it.
min_salary: If the query string parameter is passed, titles and company handles should be displayed that have a salary greater than the value of the query string parameter.
min_equity: If the query string parameter is passed, a list of titles and company handles should be displayed that have an equity greater than the value of the query string parameter.
It should return JSON of {jobs: [job, ...]}
*/
router.get('/', authorize, async function(request, response, next) {
    try {
        const { search, min_salary, min_equity } = request.query;
        const { jobs } = await Job.get({search, min_salary, min_equity});
        return response.json({jobs});
    } catch(err) {
        return next(err);
    }
});
/**
GET /jobs/[id]
This route should show information about a specific job including a key of company which is an object that contains all of the information about the company associated with it.
*/
router.get('/:id', authorize, async function(request, response, next) {
    try {
        const { id } = request.params;
        const { job } = await Job.getById(id);
        return response.json({ job });
    } catch(err) {
        return next(err);
    }
});

/**
It should return JSON of {job: jobData}

PATCH /jobs/[id]
This route updates a job by its ID and returns an the newly updated job.
*/
router.patch('/:id', authorizeAdmin, async function(request, response, next) {
    try {
        const { id } = request.params;
        const updatedObj = request.body;
        const { job } = await Job.update(id, updatedObj);
        return response.json({job});
    } catch(err) {
        return next(err);
    }
});

/**
It should return JSON of {job: jobData}

DELETE /jobs/[id]
This route deletes a job and returns a message.

It should return JSON of { message: "Job deleted" }
*/
router.delete('/:id', authorizeAdmin, async function(request, response, next){
    try {
        const { id } = request.params;
        const { message } = await Job.delete(id);
        return response.json({message});
    } catch(err) {
        return next(err);
    }
});

/**
 * REMEMBER TO DO THIS!!!!
 * 
 * 
 * 
Update Routes from Part One
Update the following routes:

GET /companies/[handle]
This should return a single company found by its id. It should also return a key of jobs which is an array of jobs that belong to that company: {company: {...companyData, jobs: [job, ...]}}
*/

module.exports = router;