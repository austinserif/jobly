process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../../app");
const db = require("../../db");
const bcrypt = require('bcrypt');
const { SECRET_KEY, BCRYPT_WORK_FACTOR } = require('../../config');
const jwt = require('jsonwebtoken');
let firstId;
let testUserToken;

/** define instructions to be executed before each test is run
 *  instruction: delete all data in the companies table (this is a redundancy)
 *  instruction: insert mock data into table
 */
beforeEach(async function() {
    await db.query(`DELETE FROM users`);
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
    firstId = await db.query(`
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

    const salt = await bcrypt.genSalt(Number(BCRYPT_WORK_FACTOR));
    const hashedPassword = await bcrypt.hash("secret", salt);
    const result = await db.query(`
        INSERT INTO users
            (username, first_name, last_name, password, email, photo_url, is_admin)
        VALUES 
            ('firstTester', 'first', 'tester', $1, 'fakie@faker.com', 'https://photobooth.com', true)
        RETURNING username, is_admin;
    `, [hashedPassword]);

    const { username, is_admin } = result.rows[0];
    const testUser = {username, is_admin};
    testUserToken = jwt.sign(testUser, SECRET_KEY);
    console.log(testUserToken);
});

/** define instructions to be executed after each test is run
 * - delete everything!
 */
afterEach(async function() {
    await db.query(`DELETE FROM users`);
    await db.query("DELETE FROM jobs");
    await db.query("DELETE FROM companies");
});


describe('test POST /jobs', function() {
    test('test single new job posting', async function() {
        const response = await request(app)
            .post(`/jobs?_token=${testUserToken}`)
            .send({
                title: 'CTO',
                salary: 3000000.0,
                equity: 0.03,
                company_handle: 'apple'
            });

        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual({
            job: {
                title: 'CTO',
                salary: 3000000.0,
                equity: 0.03,
                company_handle: 'apple'
            }
        });
    });

    test('test error response when company_handle does not exist in database', async function() {
        const response = await request(app)
            .post(`/jobs?_token=${testUserToken}`)
            .send({
                title: 'pilot',
                salary: 3000000.0,
                equity: 0.03,
                company_handle: 'usairways'
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe(`No company exists corresponding to handle: "usairways"`);
    });
});

describe('test GET /jobs', function() {
    test('test GET /jobs with no params', async function() {
        const response = await request(app)
            .get(`/jobs?_token=${testUserToken}`);
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            jobs: [
                {
                    job: {
                        title: 'designer',
                        company_handle: 'nike'
                    }
                },
                {
                    job: {
                        title: 'CEO',
                        company_handle: 'sans-serif-labs'
                    }
                },
                {
                    job: {
                        title: 'software engineer 2',
                        company_handle: 'apple'
                    }
                },
                {
                    job: {
                        title: 'software engineer 1',
                        company_handle: 'apple'
                    }
                }
            ]
        });
    });

    test('test GET /jobs with search param', async function() {
        const response = await request(app)
            .get('/jobs?search=software')
            .send({_token: testUserToken});
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            jobs: [
                {
                    job: {
                        title: 'software engineer 2',
                        company_handle: 'apple'
                    }
                },
                {
                    job: {
                        title: 'software engineer 1',
                        company_handle: 'apple'
                    }
                }
            ]
        });
    });

    test('test GET /jobs with min_salary param', async function() {
        const response = await request(app)
            .get('/jobs?min_salary=100000')
            .send({_token: testUserToken});
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            jobs: [
                {
                    job: {
                        title: 'CEO',
                        company_handle: 'sans-serif-labs'
                    }
                },
                {
                    job: {
                        title: 'software engineer 2',
                        company_handle: 'apple'
                    }
                }
            ]
        });
    });

    test('test GET /jobs with min_equity param', async function() {
        const response = await request(app)
            .get('/jobs?min_equity=0.1')
            .send({_token: testUserToken});
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            jobs: [
                {
                    job: {
                        title: 'CEO',
                        company_handle: 'sans-serif-labs'
                    }
                }
            ]
        });
    });

    test('test GET /jobs with search param and min_salary param', async function() {
        const response = await request(app)
            .get('/jobs?search=er&min_salary=100000')
            .send({_token: testUserToken});
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            jobs: [
                {
                    job: {
                        title: 'software engineer 2',
                        company_handle: 'apple'
                    }
                }
            ]
        });
    });

    test('test GET /jobs with search param, min_salary param, and min_equity param', async function() {
        const response = await request(app)
            .get('/jobs?search=er&min_salary=81000&min_equity=.004')
            .send({_token: testUserToken});
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            jobs: [
                {
                    job: {
                        title: 'software engineer 2',
                        company_handle: 'apple'
                    }
                }
            ]
        });
    });

    test('test error response when passed value for min_equity is greater than 1 or negative', async function() {
        const response = await request(app)
            .get('/jobs?min_equity=1.1')
            .send({_token: testUserToken});
        
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("invalid min_equity parameter value, must be between 0 and 1 inclusive.");
    });
});

describe('test GET /jobs/:id', function() {
    test('test get single job by id', async function() {
        const response = await request(app)
            .get(`/jobs/${firstId.rows[0].id}`)
            .send({_token: testUserToken});

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            job: {
                title: "software engineer 1",
                salary: 80000.0,
                equity: 0.001,
                company_handle: "apple"
            }
        });
    });

    test('test error response where no id exists', async function() {
        const id = 10235;
        const response = await request(app)
            .get(`/jobs/${id}`)
            .send({_token: testUserToken});

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe(`No job found with id "${id}"`);
    });
});

describe('test PATCH /jobs/:id', function() {
    test('test single update', async function() {
        const id = firstId.rows[0].id;
        const response = await request(app)
            .patch(`/jobs/${id}?_token=${testUserToken}`)
            .send({
                title: "changed this!",
                salary: 800000.0,
                equity: 0.40,
                company_handle: "apple"
            });
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            job: {
                title: "changed this!",
                salary: 800000.0,
                equity: 0.40,
                company_handle: "apple"  
            }
        });
    });
});

describe('test DELETE /jobs/:id', function() {
    test('test that a job is deleted', async function() {
        const id = firstId.rows[0].id;
        const response = await request(app)
        .delete(`/jobs/${id}?_token=${testUserToken}`);

        expect(response.body).toEqual({
            message: "Job deleted"
        });
    });

    test('test error response when id does not exist', async function() {
        const id = 432943;
        const response = await request(app)
        .delete(`/jobs/${id}?_token=${testUserToken}`);

        expect(response.body.message).toBe(`No job found with id 432943`);
    });
});

afterAll(function() {
    db.end();
});
