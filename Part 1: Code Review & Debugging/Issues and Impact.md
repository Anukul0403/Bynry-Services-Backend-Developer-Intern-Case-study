Issues Found in the Code
1. No Input Validation or Error Handling

Problem:
The code assumes all required fields are always present in the request JSON.

Impact:

If a field is missing then it will not work
Also if type check is not made then we can get a string in for a number in price

2. Missing Transaction Management

Problem:
There are two separate database commits without wrapping them in a proper transaction

Impact:

If the second commit fails, you end up with products without inventory records
There is no try catch for database transactions

3. No Duplicate SKU Check

Problem:
The code doesn’t validate SKU uniqueness.

Impact:

Business logic breaks because SKUs are meant to uniquely identify products

4. Missing Proper HTTP Status Codes

Problem:
The API always returns 200 OK, even on creation.

Impact:

The API does not return proper status code and in case of failure it would recieve 500 internal server error.
This goes against REST best practices.

5. No Authorization or Authentication

Problem:
There are no checks for whether the request is coming from an authorized or authenticated user.

Impact:

Anyone can create products in the system

This is a major security risk

6. Lack of Input Cleaning

Problem:
User input is used directly without cleaning.

Impact:

If user send invalid data then injection risks can exist if used improperly
