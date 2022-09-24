const path = require('path');
const lambdaFunction = require(path.resolve(__dirname, './index.js'));

lambdaFunction.handler({
    url: 'https://ft.com/login',
    email: 'alistair.divorty24@law.ac.uk',
    password: 'hints8'
});
