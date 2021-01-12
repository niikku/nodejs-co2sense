require('dotenv').config()
const logger = require('./logger.js');
const express = require('express');
const crypto = require('crypto');
const session = require('express-session');
const app = express();
const database = require('./database.js');
const userManagement = require('./userManagement.js');
const mqttClient = require('./MQTTclient.js');
const port = process.env.EXPRESS_PORT;

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(express.static(__dirname + '/public'));
app.use(session({ secret: crypto.randomBytes(32).toString("hex"), resave: false, saveUninitialized: false }));

console.log("Starting CO2 backend...");
console.log(`NODE_ENV=${process.env.NODE_ENV}`);

database.initializeDB();
mqttClient.connect();

/*
Homepage and dashboard
*/
app.get('/', async (req, res) => {

  //If user is not logged in, redirect
  if (!loggedIn(req)) {
    res.redirect('/login');
    return;
  }

  //Fetch data in URL to display device and timescale
  let queryDeviceID = req.query.d;
  let queryTimescale = req.query.t;

  //Fetch devices of user
  let userDevices = await userManagement.getDevices(req.session.username)
    .catch((err) => {
      res.render('./pages/index', { hasDevices: false });
      return
    });

  //If user has no devices, then we dont render sensor data and we give a welcome message
  if (userDevices.length == 0) {
    res.render('./pages/index', { hasDevices: false });
    return
  }

  //If the user has devices but there is no deviceID in the URL, redirect them to the first device
  if (userDevices.length > 0 && queryDeviceID === undefined) {
    res.redirect(`/?d=${userDevices[0]['deviceID']}&t=10`);
    return;
  }

  //If user has devices AND they have a query in the URL, check if it's their device,
  //If it's not their device, then redirect them to the correct URL (their first device)
  let deviceVerified = await userManagement.verifyDevice(req.session.username, queryDeviceID)
    .catch((err) => {
      res.render('./pages/index', { hasDevices: false });
      return;
    });

  if (!deviceVerified) {
    res.redirect(`/?d=${userDevices[0]['deviceID']}&t=10`);
    return;
  }

  //If user has a query in the URL and it's their device, proceed to fetch data etc.
  let deviceID = queryDeviceID;

  //Normally the timescale (in minutes) should be in the URL, if not, set default value
  let timeScale = 10;

  if (queryTimescale === undefined || queryTimescale > 10080) {
    timeScale = 10;
  } else {
    timeScale = Number(queryTimescale);
  }

  try {

    //Fetch sensor records
    let records = await database.getRecords(deviceID, timeScale)

    let currentDeviceName = "";

    //Get the name of the currently selected user device
    for (let i = 0; i < userDevices.length; i++) {
      if (userDevices[i]['deviceID'] === deviceID) {
        currentDeviceName = userDevices[i]['deviceName'];
      }
    }

    //If there are no records but there is a valid device, just show some placeholders
    if (records.length == 0) {
      res.render('./pages/index', {
        hasDevices: true,
        timeScale: timeScale,
        devices: userDevices,
        currentDeviceName: currentDeviceName,
        currentDeviceID: deviceID,
        lastUpdated: 'Still waiting for sensor data...',
        co2: '0',
        temperature: '0',
        humidity: '0',
        sensorRecords: []
      });
      return;
    }

    //If there are sensor records, proceed rendering the whole page as normal
    let dataRecord = records[records.length - 1];
    let timeStamp = Number(dataRecord['timeStamp']);
    let date = new Date(timeStamp);
    let lastUpdated = date.toLocaleString('en-GB').split(',')[1].trim();

    res.render('./pages/index', {
      hasDevices: true,
      timeScale: timeScale,
      devices: userDevices,
      currentDeviceName: currentDeviceName,
      currentDeviceID: deviceID,
      hasSensorRecords: true,
      lastUpdated: lastUpdated,
      co2: dataRecord['co2'],
      temperature: dataRecord['temperature'],
      humidity: dataRecord['humidity'],
      sensorRecords: records
    });

  } catch (err) {
    console.log(err);
    res.render('./pages/index', { hasDevices: false });
    return;
  }

});

app.get('/devices', async (req, res) => {

  //If user is not logged in, redirect
  if (!loggedIn(req)) {
    res.redirect('/login');
    return;
  }

  //Fetch devices of user
  try {
    let userDevices = await userManagement.getDevices(req.session.username)
    res.render('./pages/devices', { devices: userDevices });
  } catch (err) {
    res.render('./pages/devices', { devices: [] });
    return
  }

});

app.get('/login', (req, res) => {
  res.render('./pages/login', {});
});

app.get('/register', (req, res) => {
  res.render('./pages/register', {});
});

app.get('/logout', (req, res) => {
  if (loggedIn(req)) {

    let username = req.session.username;

    req.session.destroy(function (err) {
      logger.info(`User '${username}' has logged out.`);
    });
  }

  res.redirect("/login");
});

app.get('/admin', async (req, res) => {

  if (!req.session.loggedIn || req.session.loggedIn == 0 || req.session.username !== 'admin') {
    res.redirect('/login');
    return;
  }

  try {
    let usernames = await userManagement.getAllUsers();
    res.render('./pages/admin', { usernames: usernames });
  } catch (err) {
    console.log(new Error(err));
    res.render('./pages/admin', { usernames: [] });
  }

});

app.post('/deleteUser', async (req, res) => {

  //Check if user is authorized
  if (!req.session.loggedIn || req.session.loggedIn == 0 || req.session.username !== 'admin') {
    res.status(401).send('UNAUTHORIZED');
    return;
  }

  //Check if form data is valid
  let userToDelete = req.body['username'];
  if (userToDelete === undefined) {
    res.status(400).send('UNAUTHORIZED');
    return;
  }

  //Delete user
  try {
    await userManagement.deleteUser(userToDelete);
    res.redirect('/admin');
    logger.info(`User '${userToDelete}' has been deleted by admin.`);
  } catch (err) {
    console.log(new Error(err));
    res.redirect('/admin');
  }

});

//This is called after sending the login form
app.post('/login', async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  if (username === undefined || password === undefined) {
    res.render('./pages/login', { errorMessage: "Username / password not filled in" });
    return;
  }

  username = username.toLowerCase();

  try {
    let authenticated = await userManagement.authenticate(username, password);

    if (authenticated) {
      req.session.username = username;
      req.session.loggedIn = 1;
      req.session.cookie.maxAge = (24 * 60 * 60 * 1000 * 7);

      res.redirect("/");
      logger.info(`User '${username}' has logged in.`);
      return;

    } else {
      res.render('./pages/login', { errorMessage: "Username / password do not match" })
      return;
    }
  } catch (err) {
    res.render('./pages/login', { errorMessage: "Username / password do not match" });
    return;
  }
});

app.post('/api', async (req, res) => {
  let deviceID = req.body['deviceid'];
  let username = req.body['username'];
  let co2 = req.body['co2'];
  let temperature = req.body['temperature'];
  let humidity = req.body['humidity'];

  if (deviceID === undefined || username === undefined || co2 === undefined || temperature === undefined || humidity === undefined) {
    res.status(400).send('ERROR: Bad request');
    return;
  }

  //Sometimes a device can send a CO2 value of 0 when booting up for the first time, in that case we send OK back but we don't log it
  if (co2 == 0) {
    res.status(200).send('OK');
    return;
  }

  //Check to see if this device actually exists and belongs to the user
  try {
    let deviceVerified = await userManagement.verifyDevice(username, deviceID);

    if (deviceVerified) {
      let currentTime = String(Date.now());
      database.addRecord(currentTime, deviceID, username, co2, temperature, humidity);
      res.status(200).send('OK');
      mqttClient.publish(deviceID,`${co2},${temperature},${humidity}`);
    } else {
      res.status(401).send('ERROR: This device is not authenticated');
    }

  } catch (err) {
    console.log(new Error(err));
    res.status(400).send('ERROR: Bad request');
  }
});

app.post('/register', async (req, res) => {

  let username = req.body['username'];
  let password = req.body['password'];
  let password2 = req.body['password-repeat'];
  let recaptcha = req.body['g-recaptcha-response'];

  if (recaptcha === undefined || recaptcha == '') {
    res.render('./pages/register', { errorMessage: "Please fill in the recaptcha." });
    logger.warning(`Someone tried to register with username ${username}, but the reCAPTCHA was empty!`);
    return;
  }

  if (username === undefined || password === undefined || password2 === undefined) {
    res.render('./pages/register', { errorMessage: "Something went wrong, please try again later." });
    return;
  }

  username = username.toLowerCase();

  let usernameRegex = new RegExp('^([a-z0-9]){4,24}$');
  let passwordRegex = new RegExp('^[\x21-\x7E]{8,32}$');

  if (!usernameRegex.test(username)) {
    res.render('./pages/register', { errorMessage: "Username does not match the requirements." });
    return;
  }

  if (!passwordRegex.test(password)) {
    res.render('./pages/register', { errorMessage: "Password does not match the requirements." });
    return;
  }

  if (password !== password2) {
    res.render('./pages/register', { errorMessage: "Passwords don't match." });
    return;
  }

  try {
    if (await userManagement.userExists(username)) {
      res.render('./pages/register', { errorMessage: "I'm sorry, this username already exists" });
      return;
    }

    await userManagement.addUser(username, password, '');
    res.render('./pages/login', { successMessage: "Your account has been created, you can now sign in." });
    logger.info(`A new user has been created under the name '${username}'`);
    return;

  } catch (err) {
    console.log(new Error(err));
    res.render('./pages/register', { errorMessage: "I'm sorry, something went wrong." });
  }

});

app.post('/addDevice', async (req, res) => {
  if (req.body.devicePublicName === undefined || req.body.deviceLocation === undefined || !loggedIn(req)) {
    res.status(400).send('ERROR');
    return;
  }

  try {
    await userManagement.addDevice(req.body.devicePublicName, req.body.deviceLocation, req.session.username);
    res.redirect('/devices');
    logger.info(`User '${req.session.username}' has created a new device.`);
  } catch (err) {
    console.log(new Error(err));
    res.redirect('/devices');
  }

});

app.post('/removeDevice', async (req, res) => {
  if (req.body.deviceID === undefined || !loggedIn(req)) {
    res.status(400).send('ERROR');
    return;
  }

  try {
    await userManagement.deleteDevice(req.session.username, req.body.deviceID);
    res.redirect('/devices');
    logger.info(`User '${req.session.username}' has deleted a device.`);
  } catch (err) {
    console.log(new Error(err));
    res.status(400).send('ERROR');
  }
});

app.listen(port, () => {
  console.log(`Server listening at port ${port}...`);
})

function loggedIn(req) {
  if (req.session.loggedIn === undefined || req.session.loggedIn == 0) {
    return false;
  } else {
    return true;
  }
}