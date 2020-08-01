//Job Model integration test file
process.env.NODE_ENV = "test";
const Job = require('../../models/job');

describe('Job.buildQuery integration tests', function() {
    test('test buildQuery with only searchString parameter', function() {
        const result = Job.buildQuery({search: "software"});

        const expectedSqlString = `SELECT title, company_handle FROM jobs WHERE (title LIKE '%' || $1 || '%') ORDER BY date_posted desc;`;
        const expectedVals = ["software"];
        expect(result.sqlString).toBe(expectedSqlString);
        expect(result.vals).toEqual(expectedVals);
    });

    test('test buildQuery with only min_salary parameter', function() {
        const result = Job.buildQuery({min_salary: 85000.0});

        const expectedSqlString = `SELECT title, company_handle FROM jobs WHERE (salary >= $1) ORDER BY date_posted desc;`;
        const expectedVals = [85000.0];
        expect(result.sqlString).toBe(expectedSqlString);
        expect(result.vals).toEqual(expectedVals);
    });

    test('test buildQuery with only max_employees parameter', function() {
        const result = Job.buildQuery({min_equity: 0.1});

        const expectedSqlString = `SELECT title, company_handle FROM jobs WHERE (equity >= $1) ORDER BY date_posted desc;`;
        const expectedVals = [0.1];
        expect(result.sqlString).toBe(expectedSqlString);
        expect(result.vals).toEqual(expectedVals);
    });
});

afterAll(function() {
    const db_client = Job.returnDB()
    db_client.end();
});