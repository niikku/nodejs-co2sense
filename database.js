const level = require('level')
const fs = require('fs')
const uuid = require('uuid');
let rimraf = require("rimraf");

let databases = {}; //Object that holds levelDB objects

function addRecord(timestamp, deviceID, username, co2, temperature, humidity) {

    //If no DB object exists yet for this UUID, create one
    if (databases[deviceID] === undefined) {
        return false;
    }

    databases[deviceID].put(timestamp, {
        timeStamp: timestamp,
        deviceID: deviceID,
        username: username,
        co2: co2,
        temperature: temperature,
        humidity: humidity
    }, (err) => {
        if (err) {
            console.log(error);
            return false;
        }

        databases[deviceID].get(timestamp, function (err, value) {
            if (err) console.log(err);
            //console.log(value);
        })
    });
}

function getLatestRecord(deviceID) {

    return new Promise((resolve, reject) => {

        let sensorReading = {};

        try {
            let stream = databases[deviceID].createReadStream({ reverse: true, limit: 1 })
            stream.on('data', (data) => {
                sensorReading = data.value;
            })
            stream.on('end', function () {
                if(sensorReading['timeStamp'] === undefined) {
                    reject('Could not fetch latest sensor record, no sensor readings available');
                } else {
                resolve(sensorReading);
                }
            })
        } catch (error) {
            reject(error);
        }
    });
}

//Returns an array with a series of device sensor records
function getRecords(deviceID, recordLimit) {

    return new Promise((resolve, reject) => {

        const maxRecords = 100; //We want to send an array with max 100 samples
        let records = [];
        let sensorReading = {};

        //Calculate the ratio between the records requested and the set limit
        let recordRatio = Math.round(recordLimit/maxRecords);
        
        let i = 1;

        try {
            let stream = databases[deviceID].createReadStream({ reverse: true, limit: recordLimit })
            stream.on('data', (data) => {

                //If the amount of records requested is under the limit, just add them all as normal
                if(recordLimit <= maxRecords) {
                    sensorReading = data.value;
                    records.push(sensorReading);
                } else {
                    //If the amount of records requested is above the limit, we skip some data samples

                    //If i == 1, then we push the sensor reading into the array
                    if(i == 1) {
                        sensorReading = data.value;
                        records.push(sensorReading);
                    } 
                    //Increment i
                    if(i < recordRatio) {
                        i++
                    //i is now equal to the ratio which means we've skipped enough samples, reset back to 1
                    } else {
                        i = 1;
                    }
                }
            })
            stream.on('end', function () {
                resolve(records);
            })
        } catch (error) {
            reject(error);
        }
    });
}

function addDatabaseTable(deviceID) {
    databases[deviceID] = level(`./db/${deviceID}`, { valueEncoding: 'json' })
}

/**
 * Initialize the database by loading all existing tables from ./db/
 */
function initializeDB() {

    console.log('Database initializing...');

    let directories = fs.readdirSync('./db/');

    for (let i = 0; i < directories.length; i++) {
        //Validate to see if this is a valid UUID
        if (uuid.validate(directories[i])) {
            databases[directories[i]] = level(`./db/${directories[i]}`, { valueEncoding: 'json' })
            console.log(`Loading DB: ${directories[i]}`);
        } else {
            console.log(`Found folder '${directories[i]}' in DB folder that does not match a UUID`);
        }
    }

    console.log('Finished initializing database');
}

function removeDatabaseTable(deviceID) {
    databases[deviceID].close();
    delete databases[deviceID];
    rimraf(`./db/${deviceID}`, (err) => {
        if (err) console.log(err);
    });
}


module.exports.addRecord = addRecord;
module.exports.initializeDB = initializeDB;
module.exports.addDatabaseTable = addDatabaseTable;
module.exports.removeDatabaseTable = removeDatabaseTable;
module.exports.getLatestRecord = getLatestRecord;
module.exports.getRecords = getRecords;