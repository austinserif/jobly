process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../../app");
const db = require("../../db");
const bcrypt = require('bcrypt');
const { SECRET_KEY, BCRYPT_WORK_FACTOR } = require('../../config');
const jwt = require('jsonwebtoken');
let testUserToken;

/** define instructions to be executed before all tests are run
 */
beforeEach(async function() {

    await db.query(`DELETE FROM users`);

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

/** define instructions to be executed after all tests are run
 *  instruction: delete all data in the companies table (this is a redundancy)
 */
afterEach(async function() {
    await db.query(`DELETE FROM users`);
});


describe("POST /register", function() {
    test("register a new user and return a token", async function() {
        const response = await request(app)
            .post(`/register`)
            .send({
                username: "aplese",
                first_name: "Alyssa",
                last_name: "Plese",
                password: "secret",
                email: "aplese1@yahoo.com"
            });

        expect(Object.keys(response.body)[0]).toBe("token");
    });


    test("throw error when user doesn'y comply with JSON schema", async function() {
        const response = await request(app)
            .post(`/register`)
            .send({
                username: "aplese",
                first_name: "Alyssa",
                password: "secret",
                email: "aplese1@yahoo.com"
            });

        expect(response.body.message).toBe(`null value in column "last_name" violates not-null constraint`);
    });
});

afterAll(function() {
    db.end();
});