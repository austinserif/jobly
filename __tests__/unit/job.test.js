//Job Model unit test file
process.env.NODE_ENV = "test";
const Job = require('../../models/Job');

describe('Job Class string-builder helper methods', function() {
    test('test searchString static method', function() {
        const index = 1;
        const searchString = Job.searchString(index);

        const expectedSearchString = `title LIKE '%' || $${index} || '%'`;
        expect(searchString).toBe(expectedSearchString);
    });

    test('test minEquityString static method', function() {
        const index = 1;
        const equityString = Job.minEquityString(index);

        const expectedEquityString = `equity >= $${index}`;
        expect(equityString).toBe(expectedEquityString);
    });

    test('test minSalaryString static method', function() {
        const index = 1;
        const minSalaryString = Job.minSalaryString(index);

        const expectedSalaryString = `salary >= $${index}`;
        expect(minSalaryString).toBe(expectedSalaryString);
    });
});

afterAll(function() {
    const db = Job.returnDB();
    db.end();
});