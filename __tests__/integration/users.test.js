process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../../app");
const db = require("../../db");
const bcrypt = require('bcrypt');
const { BCRYPT_WORK_FACTOR, SECRET_KEY } = require('../../config');
const jwt = require('jsonwebtoken');
let testUserToken;
/** define instructions to be executed before each test is run
 *  instruction: delete all data in the companies table (this is a redundancy)
 *  instruction: insert mock data into table
 */
beforeEach(async function() {
    await db.query(`DELETE FROM users;`);
    await db.query("DELETE FROM jobs;");
    await db.query("DELETE FROM companies;");

    await db.query(`
        INSERT INTO companies
            (handle, name, num_employees, description, logo_url)
        VALUES 
            ('nike', 'Nike, Inc', 30000, 'Designer, manufacturer, and vendor of athletic shoes', 'https://nike-logo-url.com/'),
            ('apple', 'Apple Computer, Inc', 100000, 'Manufacturer of computer hardware and software', 'https://apple-logo-url.com/'),
            ('sans-serif-labs', 'sans-serif, LLC', 1, 'Freelance Goon', 'https://sans-serif-logo-url.com/');
    `);
    await db.query(`
        INSERT INTO jobs
            (title, salary, equity, company_handle)
        VALUES
            ('software engineer 1', 80000.0, 0.001, 'apple');
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
            (username, first_name, last_name, password, email, photo_url)
        VALUES 
            ('firstTester', 'first', 'tester', $1, 'fakie@faker.com', 'https://photobooth.com')
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
    await db.query("DELETE FROM users;");
    await db.query("DELETE FROM jobs;");
    await db.query("DELETE FROM companies;");
});

describe('test GET /users', function() {
    test('should return all users', async function() {
        const response = await request(app)
            .get('/users')
            .send({_token: testUserToken});
        
        // expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            users: [
                {
                    username: 'firstTester',
                    first_name: 'first',
                    last_name: 'tester',
                    email: 'fakie@faker.com'
                }
            ]
        });
    });
});

describe('test GET /users/:username', function() {
    test('test get user by username', async function() {
        const response = await request(app)
            .get(`/users/firstTester`)
            .send({_token: testUserToken});

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            user: {
                username: 'firstTester',
                first_name: 'first',
                last_name: 'tester',
                email: 'fakie@faker.com'
            }
        });
    });

    test('test error response where no username exists', async function() {
        const response = await request(app)
            .get(`/users/doesNotExist?_token=${testUserToken}`);

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe(`No user found with username: doesNotExist`);
    });
});

describe('test PATCH /users/:username', function() {
    test('test single update', async function() {
        const response = await request(app)
            .patch(`/users/firstTester?_token=${testUserToken}`)
            .send({
                username: "japple",
                first_name: "Johnny",
                last_name: "Appleseed",
                email: "japple@gmail.com"
            });
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            user: {
                username: "japple",
                first_name: "Johnny",
                last_name: "Appleseed",
                email: "japple@gmail.com"
            }
        });
    });
});

describe('test DELETE /users/:username', function() {
    test('test that a user is deleted', async function() {
        const response = await request(app)
            .delete(`/users/firstTester?_token=${testUserToken}`);

        expect(response.body).toEqual({
            message: "user deleted"
        });
    });

    test('test error response when username does not exist --> will return unauthorized because the user doesnt exist so current user cant have access', async function() {
        const response = await request(app)
            .delete(`/users/doesNotExist?_token=${testUserToken}`);

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe(`Unauthorized`);
    });
});

afterAll(function() {
    db.end();
});
