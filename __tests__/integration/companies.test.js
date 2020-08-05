process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../../app");
const db = require("../../db");

/** define instructions to be executed before all tests are run
 *  instruction: delete all data in the companies table (this is a redundancy)
 *  instruction: insert mock data into table
 */
beforeEach(async function() {
    await db.query("DELETE FROM jobs");
    await db.query("DELETE FROM companies");
    await db.query(`
        INSERT INTO companies
            (handle, name, num_employees, description, logo_url)
        VALUES 
            ('nike', 'Nike, Inc', 30000, 'Designer, manufacturer, and vendor of athletic shoes', 'https://nike-logo-url.com/'),
            ('apple', 'Apple Computer, Inc', 100000, 'Manufacturer of computer hardware and software', 'https://apple-logo-url.com/'),
            ('sans-serif-labs', 'sans-serif, LLC', 1, 'Freelance Goon', 'https://sans-serif-logo-url.com/')
    `);
    await db.query(`
        INSERT INTO jobs
            (title, salary, equity, company_handle)
        VALUES
            ('software engineer 1', 80000.0, 0.001, 'apple')
        RETURNING id;
    `);

    await db.query(`
        INSERT INTO jobs
            (title, salary, equity, company_handle)
        VALUES
            ('software engineer 2', 100000.0, 0.005, 'apple');
    `);
    
    await db.query(`
        INSERT INTO jobs
            (title, salary, equity, company_handle)
        VALUES
            ('CEO', 800000.0, 0.99, 'sans-serif-labs');
    `)

    await db.query(`
        INSERT INTO jobs
            (title, salary, equity, company_handle)
        VALUES
            ('designer', 90000.0, 0.003, 'nike');
    `);
});

/** define instructions to be executed after all tests are run
 *  instruction: delete all data in the companies table (this is a redundancy)
 */
afterEach(async function() {
    await db.query("DELETE FROM companies");
});

/** test suite for GET '/companies' route
 * 
 * tests:
 *      retrieve a list of all companies
 *      retrieve a list of all companies whose name includes the letter 'n'
 *      retrieve a list of all companies where min_employees is equal to 2
 *      retrieve a list of all companies where max_employees is equal to 50000
 *      retrieve a list of all companies where min_employees is 2 and max_employees is 50000
 *      retrieve a list of all companies where min_emplyees is equal to max_employees, and there is no
 * company in the database with exactly that number of employees
 *      retrieve a list of all companies where min_employees is equal to max_employyes, and there IS
 * a company in the database with exactly that number of employees
 *      test error result where min_employees > max_employees
*/
describe("GET /companies", function() {
    test("retrieve a list of all companies", async function() {
        const response = await request(app).get('/companies');
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            companies: [
                {handle: "nike", name: "Nike, Inc"},
                {handle: "apple", name: "Apple Computer, Inc"},
                {handle: "sans-serif-labs", name: "sans-serif, LLC"}
            ]
        });
    });

    test("retrieve a list of all companies whose name includes the letter 'i'", async function() {
        const response = await request(app)
            .get(`/companies/?search=i`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            companies: [
                {handle: "nike", name: "Nike, Inc"},
                {handle: "sans-serif-labs", name: "sans-serif, LLC"}
            ]
        });
    });

    test("retrieve a list of all companies where min_employees is equal to 2", async function() {
        const response = await request(app)
            .get(`/companies/?min_employees=2`);
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            companies: [
                {handle: "nike", name: "Nike, Inc"},
                {handle: "apple", name: "Apple Computer, Inc"}
            ]
        });
    });

    test("retrieve a list of all companies where max_employees is equal to 50000", async function() {
        const response = await request(app)
            .get(`/companies?max_employees=50000`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            companies: [
                {handle: "nike", name: "Nike, Inc"},
                {handle: "sans-serif-labs", name: "sans-serif, LLC"}
            ]
        }); 
    });

    test("retrieve a list of all companies where min_employees is 2 and max_employees is 50000", async function() {
        const response = await request(app)
            .get(`/companies?max_employees=50000&min_employees=2`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            companies: [
                {handle: "nike", name: "Nike, Inc"}
            ]
        }); 
    });

    test(`retrieve a list of all companies where min_emplyees is equal to max_employees, and there is no 
          company in the database with exactly that number of employees`, async function() {
        const response = await request(app)
            .get(`/companies?max_employees=50&min_employees=50`);

        expect(response.statusCode).toBe(200); //best practice question: better to return 204 or empty array?
        expect(response.body).toEqual({
            companies: []
        }); 
    });

    test(`retrieve a list of all companies where min_emplyees is equal to max_employees, and there IS 
          a company in the database with exactly that number of employees`, async function() {
        const response = await request(app)
            .get(`/companies?max_employees=30000&min_employees=30000`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            companies: [
                {handle: "nike", name: "Nike, Inc"}
            ]
        }); 
    });

    test("test error result where min_employees is > max_employees", async function() {
        const response = await request(app)
            .get(`/companies?max_employees=10&min_employees=40`);

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Bad Request: max_employee query string parameter must be greater than min_employee."); 
    });
});

describe("POST /companies", function() {
    test("create a new company", async function() {

        const response = await request(app)
            .post(`/companies`)
            .send({
                handle: "newCo", 
                name: "New Company, Inc", 
                num_employees: 100, 
                description: "This is a new company!", 
                logo_url: "https://www.newcompany.co/"    
            });

        expect(response.statusCode).toBe(201);

        expect(response.body).toEqual({
            company: {
                handle: "newCo", 
                name: "New Company, Inc",
                num_employees: 100, 
                description: "This is a new company!", 
                logo_url: "https://www.newcompany.co/"
            }
        });
    });

    test("create a new company with partial information", async function() {

        const response = await request(app)
            .post(`/companies`)
            .send({
                handle: "newCo", 
                name: "New Company, Inc", 
                num_employees: 100 
            });

        expect(response.statusCode).toBe(201);

        expect(response.body).toEqual({
            company: {
                handle: "newCo", 
                name: "New Company, Inc",
                num_employees: 100, 
                description: null, 
                logo_url: null
            }
        });
    });

    test("test error on creating a new company that already exists", async function() {
        const response = await request(app)
            .post(`/companies`)
            .send({
                handle: "nike", 
                name: "Nike, Inc", 
                num_employees: 3000, 
                description: "Designer, manufacturer, and vendor of athletic shoes", 
                logo_url: "https://nike-logo-url.com/"    
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('Company with handle: "nike" already exists');
        console.log(response.body);

    });
});

describe('tests for GET /companies/:handle', function() {
    test('test that single company with data is returned given its handle', async function() {
        const response = await request(app)
            .get('/companies/apple');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            company: {
                handle: 'apple',
                name: 'Apple Computer, Inc',
                num_employees: 100000,
                description: 'Manufacturer of computer hardware and software',
                logo_url: 'https://apple-logo-url.com/',
                jobs: [
                    {
                        company_handle: "apple",
                        title: "software engineer 2",
                    },
                    {
                        company_handle: "apple",
                        title: "software engineer 1",
                    }
                ]
            }
        });
    });

    test('test error response for company handle that does not exist', async function() {
        const response = await request(app)
            .get('/companies/pear');

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('No company found with handle "pear"');
    });
});


describe('tests for PATCH /companies/:handle', function() {
    test('update single listing', async function() {
        const response = await request(app)
            .patch('/companies/nike')
            .send({
                description: 'The nike description has changed!'
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            company: { 
                handle: "nike", 
                name: "Nike, Inc", 
                num_employees: 30000, 
                description: "The nike description has changed!", 
                logo_url: "https://nike-logo-url.com/" 
            }
        });
    });

    test('test error response for attempted update of listing that doesnt exist', async function() {
        const response = await request(app)
            .patch('/companies/pear')
            .send({
                description: 'this shouldnt be read anyways, so it doesnt matter!'
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('No company found with handle "pear"');
    });
});

describe('test DELETE /companies/:handle', function() {
    test('test that a company can be deleted', async function() {
        const response = await request(app)
            .delete('/companies/apple');
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            message: "Company deleted"
        });
    });

    test('test error response when handle is invalid', async function() {
        const response = await request(app)
            .delete('/companies/pear');

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe(`No company found with handle "pear"`);
    });
});

afterAll(function() {
    db.end();
});