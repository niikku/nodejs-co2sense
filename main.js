const express = require('express');
const cors = require("cors");
const crypto = require('crypto');
const session = require('express-session');
const app = express();

const userAuthentication = require('./user-authentication.js');
const database = require('./database.js');
const userManagement = require('./userManagement.js');

const port = 3000;

app.use(cors());
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(express.static(__dirname + '/public'));
app.use(session({ secret: crypto.randomBytes(32).toString("hex"), resave: false, saveUninitialized: false }));

database.initializeDB();
userManagement.initializeUsers();

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
  let userDevices = userManagement.getDevices(req.session.username);

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
  //If it's not their device, then redirect them to '/'
  if (!userManagement.verifyDevice(queryDeviceID, req.session.username)) {
    res.redirect('/');
    return;
  }

  //If user has a query in the URL and it's their device, proceed to fetch data etc.
  let deviceID = queryDeviceID;

  //Normally the timescale should be in the URL, if not, set default value
  let timeScale = 60; //Devices send every 10 seconds, so 60 samples = 10 minutes

  if (queryTimescale === undefined || queryTimescale > 10080) {
    timeScale = 60;
  } else {
    timeScale = Number(queryTimescale) * 6;
  }

  let records = await database.getRecords(deviceID, timeScale)
    .catch(e => {
      console.log(e);
      res.render('./pages/index', { hasDevices: false });
      return;
    })

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
      timeScale: timeScale / 6,
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
  let dataRecord = records[0];
  let timeStamp = Number(dataRecord['timeStamp']);
  let date = new Date(timeStamp);
  let lastUpdated = date.toLocaleString('en-GB').split(',')[1].trim();

  res.render('./pages/index', {
    hasDevices: true,
    timeScale: timeScale / 6,
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

});

app.get('/devices', (req, res) => {

  if (!req.session.loggedIn || req.session.loggedIn == 0) {
    res.redirect('/login');
    return;
  } else {
    res.render('./pages/devices', { devices: userManagement.getDevices(req.session.username) });
  }

});

app.get('/login', (req, res) => {
  res.render('./pages/login', {});
});

app.get('/register', (req, res) => {
  res.render('./pages/register', {});
});

app.get('/logout', (req, res) => {
  req.session.loggedIn = 0;

  res.redirect("/login");
});

app.get('/admin', (req, res) => {

  if (!req.session.loggedIn || req.session.loggedIn == 0 || req.session.username !== 'admin') {
    res.redirect('/login');
    return;
  }

  let usernames = Object.keys(userManagement.getUsers());
  res.render('./pages/admin', {usernames: usernames});
});

app.post('/deleteUser', (req, res) => {

    //Check if user is authorized
  if (!req.session.loggedIn || req.session.loggedIn == 0 || req.session.username !== 'admin') {
    res.status(401).send('UNAUTHORIZED');
    return;
  }

  //Check if form data is valid
  let userToDelete = req.body['username'];
  if(userToDelete === undefined) {
    res.status(400).send('UNAUTHORIZED');
    return;
  }

  //Delete user
  userManagement.deleteUser(userToDelete);
  res.redirect('/admin');
});

app.post('/auth', (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  if (userAuthentication.authenticate(username, password)) {
    req.session.username = username;
    req.session.loggedIn = 1;
    req.session.cookie.maxAge = (24 * 60 * 60 * 1000 * 7);

    res.redirect("/");
    return;

  } else {
    res.render('./pages/login', { errorMessage: "Username / password do not match" })
    res.end();
  }
});

app.post('/api', (req, res) => {
  let deviceID = req.body['deviceid'];
  let username = req.body['username'];
  let co2 = req.body['co2'];
  let temperature = req.body['temperature'];
  let humidity = req.body['humidity'];

  let currentTime = String(Date.now());

  //Sometimes a device can send a CO2 value of 0 when booting up for the first time, in that case we send OK back but we don't log it
  if(co2 == 0) {
    res.status(200).send('OK');
    return;
  }

  //Check to see if this device actually exists and belongs to the user
  if (userManagement.verifyDevice(deviceID, username)) {
    database.addRecord(currentTime, deviceID, username, co2, temperature, humidity);
    res.status(200).send('OK');
  } else {
    res.status(400).send('ERROR');
  }

});

app.post('/register-post', (req, res) => {
  let username = req.body['username'];
  let password = req.body['password'];
  let password2 = req.body['password-repeat'];

  if (username === undefined || password === undefined || password2 === undefined) {
    res.render('./pages/register', { errorMessage: "Something went wrong, please try again later." });
    return;
  }

  let usernameRegex = new RegExp('^([A-Za-z0-9]){4,24}$');
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

  if (userManagement.userExists(username)) {
    res.render('./pages/register', { errorMessage: "I'm sorry, this username already exists" });
    return;
  }

  userManagement.addUser(username, password);

  res.render('./pages/login', { successMessage: "Your account has been created, you can now sign in." });
});

app.post('/addDevice', (req, res) => {
  if (req.body.devicePublicName === undefined || req.body.deviceLocation === undefined || !loggedIn(req)) {
    res.status(400).send('ERROR');
    return;
  }

  userManagement.addDevice(req.body.devicePublicName, req.body.deviceLocation, req.session.username);

  res.redirect('/devices');
});

app.post('/removeDevice', (req, res) => {
  if (req.body.deviceID === undefined || !loggedIn(req)) {
    res.status(400).send('ERROR');
    return;
  }
  if (userManagement.deleteDevice(req.session.username, req.body.deviceID)) {
    res.redirect('/devices');
    return;
  }

  res.status(400).send('ERROR');
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