const fs = require('fs');
const usersFile = './data/users.json';
const database = require('./database.js');
const uuid = require('uuid');

//Object that holds all users in memory
var users = {};

//If the users.json file does not exist, create it with the default admin account
try {
    if (!fs.existsSync(usersFile)) {
        console.log(`File '${usersFile}' does not exist, but I'm creating it now...`);

        let userInfo = {
            'password': 'admin',
            'devices': []
        };

        users['admin'] = userInfo;

        let data = JSON.stringify(users);

        fs.writeFileSync(usersFile, data);
    }
} catch (err) {
    console.log(`Error: File '${usersFile}' does not exist and I'm having problems creating it...`);
}

/**
 * Pulls users from the users.json file and returns an object with all users and the contents
 */
function getUsers() {
    users = JSON.parse(fs.readFileSync(usersFile));
    return users;
}

function addDevice(publicName, location, username) {
    let uniqueID = uuid.v4();

    let newDevice = {
        'deviceID': uniqueID,
        'deviceName': publicName,
        'deviceLocation': location
    };

    console.log('New device added:');
    console.log(newDevice);

    getUsers();

    users[username].devices.push(newDevice);

    saveUsers();

    database.addDatabaseTable(uniqueID);
}

function saveUsers() {
    fs.writeFileSync(usersFile, JSON.stringify(users));
}

function getDevices(username) {
    getUsers();
    return users[username].devices;
}

/**
 * Deletes a device that belongs to a specific user, removes the DB table and returns true if successful, otherwise returns false
 */
function deleteDevice(username, deviceID) {

    getUsers();

    let devices = users[username].devices;

    for (let i = 0; i < devices.length; i++) {
        if (deviceID === devices[i].deviceID) {
            users[username].devices.splice(i, 1);
            saveUsers();
            database.removeDatabaseTable(deviceID);
            return true;
        }
    }

    return false;
}

/**
 * Returns true when this device belongs to that username, otherwise returns false
 */
function verifyDevice(deviceID, username) {

    let devices = users[username].devices;

    //If user has no devices, then obviously return false since it's not theirs
    if (devices.length == 0) {
        return false;
    }

    for (let i = 0; i < devices.length; i++) {
        if (deviceID === devices[i].deviceID) {
            return true;
        }
    }

    return false;
}

function initializeUsers() {
    console.log("Initializing users...");
    console.log("Loading users.json...");
    getUsers();
}

//Return true if this user exists in the JSON file
function userExists(username) {
    getUsers();
    let usernames = Object.keys(users);

    for (let i = 0; i < usernames.length; i++) {
        if (usernames[i] === username) {
            return true;
        }
    }
    return false;
}

//Add user to JSON file
function addUser(username, password) {
    getUsers();

    let userInfo = {
        'password': password,
        'devices': []
    };

    users[username] = userInfo;
    saveUsers();
}


//Permanently delete user from JSON file
function deleteUser(username) {
    getUsers();

    console.log(`Deleting user '${username}'`)

    delete users[username];

    console.log(users)

    saveUsers();
}


module.exports.getUsers = getUsers;
module.exports.addDevice = addDevice;
module.exports.getDevices = getDevices;
module.exports.deleteDevice = deleteDevice;
module.exports.verifyDevice = verifyDevice;
module.exports.initializeUsers = initializeUsers;
module.exports.userExists = userExists;
module.exports.addUser = addUser;
module.exports.deleteUser = deleteUser;