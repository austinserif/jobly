//Company Model integration test file
process.env.NODE_ENV = "test";
const Company = require('../../models/company');

describe('Company.buildQuery integration tests', function() {
    test('test buildQuery with only searchString parameter', function() {
        const result = Company.buildQuery({search: "i"});

        const expectedSqlString = `SELECT handle, name FROM companies WHERE (name LIKE '%' || $1 || '%');`;
        const expectedVals = ["i"];
        expect(result.sqlString).toBe(expectedSqlString);
        expect(result.vals).toEqual(expectedVals);
    });

    test('test buildQuery with only min_employees parameter', function() {
        const result = Company.buildQuery({min_employees: 2});

        const expectedSqlString = `SELECT handle, name FROM companies WHERE (num_employees >= $1);`;
        const expectedVals = [2];
        expect(result.sqlString).toBe(expectedSqlString);
        expect(result.vals).toEqual(expectedVals);
    });

    test('test buildQuery with only max_employees parameter', function() {
        const result = Company.buildQuery({max_employees: 10000});

        const expectedSqlString = `SELECT handle, name FROM companies WHERE (num_employees <= $1);`;
        const expectedVals = [10000];
        expect(result.sqlString).toBe(expectedSqlString);
        expect(result.vals).toEqual(expectedVals);
    });

    test('test buildQuery with searchString parameter and min_employees', function() {
        const result = Company.buildQuery({search: "n", min_employees: 2});

        const expectedSqlString = `SELECT handle, name FROM companies WHERE (name LIKE '%' || $1 || '%' AND num_employees >= $2);`;
        const expectedVals = ["n", 2];
        expect(result.sqlString).toBe(expectedSqlString);
        expect(result.vals).toEqual(expectedVals);
    });

    test('test buildQuery with searchString parameter, min_employees, and max_employees', function() {
        const result = Company.buildQuery({search: "n", min_employees: 2, max_employees: 60000});

        const expectedSqlString = `SELECT handle, name FROM companies WHERE (name LIKE '%' || $1 || '%' AND num_employees >= $2 AND num_employees <= $3);`;
        const expectedVals = ["n", 2, 60000];
        expect(result.sqlString).toBe(expectedSqlString);
        expect(result.vals).toEqual(expectedVals);
    });
});

const db = require('../../db');
/** define instructions to be executed before all tests are run
 *  instruction: delete all data in the companies table (this is a redundancy)
 *  instruction: insert mock data into table
 */
beforeEach(async function() {
    await db.query("DELETE FROM companies");
    await db.query(`
        INSERT INTO companies
            (handle, name, num_employees, description, logo_url)
        VALUES 
            ('nike', 'Nike, Inc', 30000, 'Designer, manufacturer, and vendor of athletic shoes', 'https://nike-logo-url.com/'),
            ('apple', 'Apple Computer, Inc', 100000, 'Manufacturer of computer hardware and software', 'https://apple-logo-url.com/'),
            ('sans-serif-labs', 'sans-serif, LLC', 1, 'Freelance Goon', 'https://sans-serif-logo-url.com/')
    `);
});

/** define instructions to be executed after all tests are run
 *  instruction: delete all data in the companies table (this is a redundancy)
 */
afterEach(async function() {
    await db.query("DELETE FROM companies");
});

describe('Company.get integration tests', function() {
    test('test get() with no string parameters', async function() {
        const result = await Company.get();
        
        expect(result).toEqual({
            companies: [
                {handle: "nike", name: "Nike, Inc"},
                {handle: "apple", name: "Apple Computer, Inc"},
                {handle: "sans-serif-labs", name: "sans-serif, LLC"},
            ]
        });
    });
});

describe('Company.new integration tests', function() {

    test('test parameterizedString helper method', async function() {
        const result = Company.parameterizedString(4);
        expect(result).toBe('$1, $2, $3, $4');
    });

    test('test the creation of a new company', async function() {
        const newCompany = {
            handle: "newCo", 
            name: "New Company, Inc", 
            num_employees: 100, 
            description: "This is a new company!", 
            logo_url: "https://www.newcompany.co/"
        };

        const result = await Company.new(newCompany);

        expect(result).toEqual({
            company: {
                handle: "newCo", 
                name: "New Company, Inc", 
                num_employees: 100, 
                description: "This is a new company!", 
                logo_url: "https://www.newcompany.co/"
            }
        });
    });
});

afterAll(function() {
    db.end();
});