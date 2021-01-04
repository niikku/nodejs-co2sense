const fs = require('fs');
const userStorage = require('./userManagement.js');

/**
 * Returns true when username and password match, otherwise returns false
 */
function authenticate(username, password) {
    const users = userStorage.getUsers();

    //If user does not exist, return false
    if (users[username] === undefined) {
        return false;
    } else {
        //If user does exist but password doesn't match, return false
        if (users[username].password !== password) {
            return false
        }
    }
    //This part is only reached if username exists and password matches, however we will still check it one more time
    if (users[username].password === password) {
        return true;
    }
}

module.exports.authenticate = authenticate;