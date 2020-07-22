const { sqlForPartialUpdate, mockParams } = require('../../helpers/partialUpdate');

describe("partialUpdate()", () => {
  it("should generate a proper partial update query with just 1 field", function () {

	const { table, items, key, id } = mockParams;

    	// FIXME: write real tests!	
	const result = sqlForPartialUpdate(table, items, key, id);
	const { query, values } = result;
	
	expect(query).toEqual('UPDATE addresses SET city=$1, state=$2 WHERE id=$3 RETURNING *');
	expect(values).toEqual(['Portland', 'Oregon', 1]);
	});
});
