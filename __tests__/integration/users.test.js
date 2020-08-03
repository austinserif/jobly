process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../../app");
const db = require("../../db");
let firstusername;
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

    await db.query(`
        INSERT INTO users
            (username, first_name, last_name, password, email, photo_url)
        VALUES 
            ('firstTester', 'first', 'tester', 'fakePW', 'fakie@faker.com', 'https://photobooth.com');
    `);
});

/** define instructions to be executed after each test is run
 * - delete everything!
 */
afterEach(async function() {
    await db.query("DELETE FROM users;");
    await db.query("DELETE FROM jobs;");
    await db.query("DELETE FROM companies;");
});


describe('test POST /users', function() {
    test('test post new user', async function() {
        const response = await request(app)
            .post('/users')
            .send({
                username: 'testUsername',
                first_name: 'test',
                last_name: 'username',
                password: 'thisIsAFakePassword',
                email: 'this@fakeEmail.com'
            });

        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual({
            user: {
                username: 'testUsername',
                first_name: 'test',
                last_name: 'username',
                email: 'this@fakeEmail.com'
            }
        });
    });

    test('test error response when username of new user already exist', async function() {
        const response = await request(app)
            .post('/users')
            .send({
                username: 'firstTester',
                first_name: 'test',
                last_name: 'username',
                password: 'thisIsAFakePassword',
                email: 'this@fakeEmail.com'
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe(`User with username firstTester already exists`);
    });
});

describe('test GET /users', function() {
    test('should return all users', async function() {
        const response = await request(app)
            .get('/users');
        
        expect(response.statusCode).toBe(200);
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
            .get(`/users/firstTester`);

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
            .get(`/users/doesNotExist`);

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe(`No user found with username: doesNotExist`);
    });
});

describe('test PATCH /users/:username', function() {
    test('test single update', async function() {
        const response = await request(app)
            .patch(`/users/firstTester`)
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
            .delete(`/users/firstTester`);

        expect(response.body).toEqual({
            message: "user deleted"
        });
    });

    test('test error response when username does not exist', async function() {
        const response = await request(app)
            .delete(`/users/doesNotExist`);

        expect(response.body.message).toBe(`No user found with username: doesNotExist`);
    });
});

afterAll(function() {
    db.end();
});
