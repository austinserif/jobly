//Company Model unit test file
process.env.NODE_ENV = "test";
const Company = require('../../models/company');

describe('Company Class string-builder helper methods', function() {
    test('test searchString static method', function() {
        const index = 1;
        const searchString = Company.searchString(index);

        const expectedSearchString = `name LIKE '%' || $${index} || '%'`;
        expect(searchString).toBe(expectedSearchString);
    });

    test('test minEmployeesString static method', function() {
        const index = 1;
        const employeeString = Company.minEmployeesString(index);

        const expectedEmployeesString = `num_employees >= $${index}`;
        expect(employeeString).toBe(expectedEmployeesString);
    });

    test('test maxEmployeesString static method', function() {
        const index = 1;
        const employeeString = Company.maxEmployeesString(index);

        const expectedEmployeesString = `num_employees <= $${index}`;
        expect(employeeString).toBe(expectedEmployeesString);
    });
});

afterAll(function() {
    const db = Company.returnDB();
    db.end();
});