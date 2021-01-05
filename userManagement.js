const fs = require('fs');
const { resolve } = require('path');
const uuid = require('uuid');
const database = require('./database.js');
const userDirectory = './data/users/';

//Just for documentation
const userStructure = {
    password: 'myPassword',
    email: 'email@myemail.com',
    devices: []
}

//If the admin JSON file doens't exist, create it
if (!fs.existsSync(`${userDirectory}admin.json`)) {
    console.log(`This must be the first time running this program since I can't find admin.json, I'll create it now...`)

    let adminUser = {
        password: 'admin',
        email: '',
        devices: []
    }

    fs.writeFileSync('./data/users/admin.json', JSON.stringify(adminUser));
}

/**
 * Creates a brand new user in the 'users' directory, this is typically done after registration.
 * Returns a Promise.
 * @param username The username of the person that registered.
 * @param password The (ideally) hashed password, but unhashed is OK for development purposes.
 * @param email The email address of the user.
 */
function addUser(username, password, email) {
    return new Promise((resolve, reject) => {

        if (username === undefined || password === undefined || email === undefined) {
            reject(new Error('addUser() was called but not all arguments have been defined.'))
            return;
        }

        //Check if there is already a user file, if so, reject
        fs.access(`${userDirectory}${username}.json`, fs.constants.F_OK, (err) => {

            //If err is null, then that means the file exists
            if (err == null) {
                reject(new Error('addUser() was called but the user file already exists.'));
                return;
            }
        });

        let user = {
            password: password,
            email: email,
            devices: []
        }
        fs.writeFile(`${userDirectory}${username}.json`, JSON.stringify(user), (err) => {
            if (err) {
                reject(new Error(err));
            } else {
                resolve();
            }
        });
    });
}

/**
 * Deletes a user by removing the respective JSON file in the 'users' directory
 * Returns a Promise.
 * @param username The username of the user to delete
 */
function deleteUser(username) {
    return new Promise(async (resolve, reject) => {

        try {
            let userDevices = await getDevices(username);
            if (userDevices.length > 0) {
                for (let i = 0; i < userDevices.length; i++) {
                    database.removeDatabaseTable(userDevices[i]['deviceID']);
                }
            }
        } catch (err) {
            console.log(new Error(err));
            reject(err);
            return;
        }

        fs.unlink(`${userDirectory}${username}.json`, (err) => {
            if (err) {
                reject(new Error(err));
            } else {
                resolve();
            }
        });
    });
}

/**
 * Returns a user object which contains all information such as password, email, devices[].
 * @param username The username of the user to fetch
 */
function getUser(username) {
    return new Promise((resolve, reject) => {
        fs.readFile(`${userDirectory}${username}.json`, (err, data) => {
            if (err) {
                reject(new Error(err));
            } else {
                resolve(JSON.parse(data));
            }
        });
    });
}

/**
 * Returns true if this user exists in the /data/users directory, returns a Promise.
 * @param username The username of the user to check
 */
function userExists(username) {
    return new Promise((resolve, reject) => {
        fs.access(`${userDirectory}${username}.json`, fs.constants.F_OK, (err) => {
            if (err) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
};

/**
 * Creates and adds a device to a user, this function will calculate a UUID and save the device to the user file
 * Returns a Promise.
 * @param publicName The public name of the device which is visible in the dashboard
 * @param location The location where the device is placed
 * @param username The username which to add the device to
 */
function addDevice(publicName, location, username) {
    return new Promise(async (resolve, reject) => {

        //Check if parameters are filled in
        if (publicName === undefined || location === undefined || username === undefined) {
            reject(new Error('addDevice() was called but not all arguments have been defined.'))
            return;
        }

        let user = {};

        //Try to fetch the user, otherwise reject
        try {
            user = await getUser(username);
        } catch (err) {
            reject(err);
            return;
        }

        let uniqueID = uuid.v4();

        let newDevice = {
            'deviceID': uniqueID,
            'deviceName': publicName,
            'deviceLocation': location
        };

        user.devices.push(newDevice);

        fs.writeFile(`${userDirectory}${username}.json`, JSON.stringify(user), (err) => {
            if (err) {
                reject(new Error(err));
            } else {
                database.addDatabaseTable(uniqueID);
                resolve();
            }
        });
    });
}

/**
 * Deletes a device which belongs to a user
 * @param username The username of the user
 * @param deviceID The device ID of the device to remove
 */
function deleteDevice(username, deviceID) {
    return new Promise(async (resolve, reject) => {

        let user = {};

        //Try to fetch the user, otherwise reject
        try {
            user = await getUser(username);
        } catch (err) {
            reject(err);
            return;
        }

        if (user.devices.length == 0) {
            reject(new Error(`Can't remove a device if there are no devices.`));
            return;
        }

        //Loop through the devices to see if there is a match
        try {
            for (let i = 0; i < user.devices.length; i++) {
                //If there is a match, remove the device, save the user and then delete from the DB
                if (deviceID === user.devices[i].deviceID) {
                    user.devices.splice(i, 1);
                    await saveUser(username, user);
                    database.removeDatabaseTable(deviceID);
                    resolve();
                    return;
                }
            }

            //This point is only reached if the device cannot be found
            reject(new Error('Tried to delete a device but this device does not exist.'));
            return;
        } catch (err) {
            reject(err);
            return;
        }
    });
};

/**
 * Takes a user object and saves it to a JSON file, this method can be used to save a user after editing
 * @param username The username of the user
 * @param userObject The user object to save
 */
function saveUser(username, userObject) {
    return new Promise(async (resolve, reject) => {

        if (username === undefined || userObject === undefined) {
            reject(new Error('saveUser() was called but not all parameters have been defined'));
            return;
        }

        fs.writeFile(`${userDirectory}${username}.json`, JSON.stringify(userObject), (err) => {
            if (err) {
                reject(new Error(err));
            } else {
                resolve();
            }
        });

    });
};

/**
 * Checks if a deviceID belongs to a specific user.
 * @param username The username of the user
 * @param deviceID The device ID to check
 * @return Returns true if device belongs to user, otherwise returns false
 */
function verifyDevice(username, deviceID) {
    return new Promise(async (resolve, reject) => {

        //Try to fetch the user, otherwise reject
        let user = {};

        try {
            user = await getUser(username);
        } catch (err) {
            reject(err);
            return;
        }

        if (user.devices.length == 0) {
            reject(new Error(`Can't verify a device if the user has no devices.`));
            return;
        }

        //Loop through the devices to see if there is a match
        try {
            for (let i = 0; i < user.devices.length; i++) {

                //If there is a match, then we can resolve
                if (deviceID === user.devices[i].deviceID) {
                    resolve(true);
                    return;
                }
            }

            //This point is only reached if the device cannot be found
            resolve(false);
            return;

        } catch (err) {
            reject(err);
            return;
        }
    });
}

/**
 * Checks if this password belongs to the user, is used for authentication
 * @param username The username of the user
 * @param password The password to check
 * @return Returns true if username and password match, otherwise returns false
 */
function authenticate(username, password) {

    return new Promise(async (resolve, reject) => {

        if (username === undefined || password === undefined) {
            reject(new Error('authenticate() was called but not all parameters have been defined'));
            return;
        }

        try {
            let user = {};
            user = await getUser(username);

            if (user.password === password) {
                resolve(true);
            } else {
                resolve(false);
            }
        } catch (err) {
            reject(err);
            return;
        }
    });
}

/**
 * Returns an array with all the devices of a user
 * @param username The username of the user
 */
function getDevices(username) {

    return new Promise(async (resolve, reject) => {

        if (username === undefined) {
            reject(new Error('getDevices() was called but not all parameters have been defined'));
            return;
        }

        try {
            let user = {};
            user = await getUser(username);
            resolve(user.devices);
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Returns an array with all usernames registered
 */
function getAllUsers() {

    return new Promise(async (resolve, reject) => {

        fs.readdir(userDirectory, (err, files) => {
            if (err) {
                reject(new Error(`Could not fetch all users in directory`));
                return;
            } else {
                let userArray = [];
                files.forEach(file => {
                    userArray.push(file.slice(0, file.length - 5));
                });

                resolve(userArray);
            }
        });
    });
}

//User related functions
module.exports.addUser = addUser;
module.exports.deleteUser = deleteUser;
module.exports.getUser = getUser;
module.exports.saveUser = saveUser;
module.exports.userExists = userExists;
module.exports.authenticate = authenticate;
module.exports.getAllUsers = getAllUsers;

//Device related functions
module.exports.addDevice = addDevice;
module.exports.deleteDevice = deleteDevice;
module.exports.verifyDevice = verifyDevice;
module.exports.getDevices = getDevices;
