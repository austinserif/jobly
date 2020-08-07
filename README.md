## Jobly
### One-stop-shop for posting, parsing, and applying-to job openings.

#### 1. Summary
Jobly is a job listing application. The API is useful out of the box, including three sets of RESTful endpoints for defining, organizing manipulating companies, jobs, and users. Authorization and authentication are included for both users and admins. By default, authenticated users are authorized to view information of other users, but they cannot manipulate that information (obviously), unless it is their own. Admin status is required to create new job listings and companies, but admins cannot change user information. 

#### 2. Stack
Database: PostgreSQL\
SQL Driver: PG\
Event Queuing/Routing: Express.js\
Encryption + Auth: Bcrypt, JWT\
Other scripts: Node.js

#### 3. Quickstart

- Fork repo to local environment
- Install dependencies by running `npm install` from directory root

Let's take a second to look at our .gitignore, it should look like this:
```
node_modules/
package-lock.json
.env
```
Neither `node_modules/` nor `package-lock.json` existed in the directory at first, but they should have appeared after running `npm install`. Next we will define the environment variables `BCRYPT_WORK_FACTOR` and `SECRET_KEY` in a .env file. Once you have generated a secret key, go on the next steps.

- Run `echo "BCRYPT_WORK_FACTOR = 12" >> .env` in your directory root, followed by `echo "SECRET_KEY = your_secret_key_here" >> .env`

Check out your .env file, it should look like this:
```
BCRYPT_WORK_FACTOR = 12
SECRET_KEY = your_secret_key_here
```

Our environment variables are now set, but our code wont run smoothly yet, because we haven't yet initialized our databases. For the purposes of this demonstration, we will be using the SQL driver pg to connect with a postgreSQL database. If you haven't yet downloaded or installed postgreSQl on your machine, go ahead and do that now before moving on. Check out download instructions **[here](https://www.postgresql.org/download/)**.

Take a peek in `~/config.js` and you will see two database URLs, one for testing and one for production. Eventually, when we deploy our API to a production web server, we will probably want to declare these URLs as environment variables in our .env file, but for now it is enough just to recognize the *names* `jobly` and `jobly-test`. We need to create databases with these names *and* seed them with our table schematics before our application can run properly.

- From the directory root, run `createdb jobly` to create the database. Now seed the database with table definitions contained in `~/tables.sql` by running `psql jobly < tables.sql`.
- Next, let's run the same commands for our test database: `createdb jobly-test` and then `psql jobly-test < tables.sql`.
- To test our set up run the command `npm test`, if all the tests pass, you have a working API!

#### 4. Endpoints and User-flow

Jobly comes with three sets of RESTful endpoints out of the box: `/users`, `/companies`, `/jobs`, aswell as `GET /login` which supports authentication.

##### authentication
POST /users
POST /login

##### /users
GET /users
GET /users/:username
PATCH /users/:username
DELETE /users/:username

##### /companies
GET /companies
GET /companies/:handle
POST /companies
PATCH /companies/:handle
DELETE /companies/:handle

##### /jobs
GET /jobs
GET /jobs/:id
POST /jobs
PATCH /jobs/:id
DELETE /jobs/:id
