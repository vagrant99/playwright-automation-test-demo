// Test-data for username, password, first name, last name, and postal code
module.exports = {
    users: {
        valid: { username: 'standard_user', password: 'secret_sauce' },
        locked: { username: 'locked_out_user', password: 'secret_sauce' },
        invalid: { username: 'standard_user', password: '1234' }
    },
    checkout: {
        firstName: 'tito',
        lastName: 'wibisono',
        postalCode: '12345'
    }
};