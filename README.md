<h1 align="center">NodeJS CO2sense</h1>
<div align="center">
A Node.js server to process and visualize data from ESP32-based CO2 sensors
</div>

## Table of Contents
- [Features](#features)
- [Getting started](#getting-started)
- [Directory structure](#directory-structure)
- [JS files](#js-files)
- [Objects](#objects)
- [Security and Performance](#security-and-performance)

## Features
- __Express framework:__ Responsible for handling all HTTP requests
- __User registration:__ Allowing people to easily register and view their sensor readings
- __LevelDB database:__ Simple and fast key-value storage for sensor readings
- __Bootstrap front-end:__ Simple and responsive UI
- __MQTT bridge:__ Push sensor readings to MQTT broker of your choice

## Getting started
### Installation
1. First of all, you need to download and install [Node.js](https://nodejs.org/en/download/)

2. Clone this repository 

3. Execute main.js either through: ```node main.js```
OR run a process manager like [PM2](https://pm2.keymetrics.io/)

4. View your server at (http://localhost:3000)

### Adding a CO2 sensor
1. Create a new account or log in with username: `admin` and password: `admin`

2. Navigate to the 'Devices' tab and create a new device. Choose a suitable name and the location where the device will be mounted

3. You will now see your device in the list, you will need the unique device ID later to burn the firmware

### Burning firmware to the CO2 sensor
The firmware is written for the [ESP32 development kit](https://www.espressif.com/en/products/devkits/esp32-devkitc/overview) and requires the [Sensirion SCD30](https://www.sensirion.com/en/environmental-sensors/carbon-dioxide-sensors/carbon-dioxide-sensors-co2/) to be connected over the I2C pins.

1. [Download the firmware here](https://github.com/niikku/ESP32-co2sensor)
2. Make sure you have the [Arduino IDE](https://www.arduino.cc/en/software) installed
3. Start Arduino, go to File -> Preferences and make paste the following into the Board Manager URLs: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
4. Go to Tools -> Board -> Board Manager and install `esp32`
5. Open the firmware `CO2-Sensor-to-server.ino`
6. You need to modify the following lines:
```c
/////////////////////////////////////////////////
////////////// WIFI ACCESS POINT ////////////////
const char *ssid = "YOUR-SSID";
const char *password = "YOUR-PASSWORD";
/////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////
////////////////////////////// API INFORMATION ////////////////////////////////////
const String deviceID = "YOUR-DEVICE-ID";               //Device ID of your device
const String username = "YOUR-USERNAME";                //Your username
const String serverURL = "http://localhost:3000/api";   //The IP address of the API
///////////////////////////////////////////////////////////////////////////////////
```
7. After you made the modifications, save the file and select your board under Tools -> Boards -> ESP32
8. Press the Upload button or `CTRL+U`

### Viewing your data
After a few seconds, the ESP32 will start transmitting data to your server. Make sure any potential firewall will allow HTTP requests to port 3000.
You can go to the dashboard to view the data.

## Directory structure

### /data/
The `data` directory is currently only used to store users in JSON format. This is in the /data/users/ directory

### /db/
The `db` directory stores all sensor readings with LevelDB. Each device has it's own directory where levelDB stores the data.

### /public/
The `public` directory stores all static content which Express will serve. This is used for serving the required CSS and JS files for the web page.

### /views/
The `views` directory contains EJS files which Express renders into HTML. In the sub-directory `pages` you will find all the full HTML pages which are used. There is also a folder called `partials` which are re-usable snippets of HTML code such as the footer, header, sidebar etc.

## JS files
The following chapter will try to explain with as few words as possible what the function is of each JS file

### main.js
This is the file that Node.js will execute, and this file is responsible for importing all requires modules, configuring Express and all the route handlers can also be found in this file. Most of the functionality is contained in this file. Express routes will eventually be put into a separate file for readability.

### userManagement.js
This module is responsible for handing everything related to devices and users. It has functions to add/remove users, add/remove devices and to perform certain authentication functions. This module is fully promise-based and will store each user under their own JSON file. Each device also gets stored with the corresponding users JSON file.

### database.js
This module is responsible for loading the LevelDB database and storing/retrieving data. During startup it will load all databases in the `db` directory. It has functions for storing sensor data but also retrieving a series of records with configurable timespan.

## Objects
This application uses certain object structures which might be useful to understand. The next chapter goes through a few of them to explain how data is stored.

### User object
Each user has its own JSON file in the `/data/users/` directory with the filename equal to their username. The file has the following structure:
```json
{
"password":"your-password",
"email":"yourname@email.com",
"devices":[]
}
```
As you can see, the `"devices"` property is an array which holds device objects, which are described below.

### Device object
When a user creates a device, a unique device ID is created, and a device object is added to the users JSON file. An example of a device object can be seen here:
```json
{
"deviceID":"51c36256-6fcd-4113-afa5-0d07a6781a93",
"deviceName":"Bedroom CO2 sensor",
"deviceLocation":"Bedroom"
}
```

## Security and Performance
This project was mostly built during my Christmas holiday and was a huge learning experience for me. Therefore, basic security features are currently available but not all implemented. The most important is that the web server should support HTTPS through TLS, and this is already supported in the firmware too. By using HTTPS, all the traffic between the server -> client is encrypted and can't be monitored to then later be exploited. I will write some of my current thoughts about security and performance choices below:

### Password storage
Currently all passwords are written in plaintext in the user JSON file, and this will have to eventually be a hashed version of the password using a salt. I have left this feature out for development purposes but this should not take long to implement using for example [Bcrypt](https://www.npmjs.com/package/bcrypt)

### Device security and authentication
Every time a CO2 sensor sends a HTTP/HTTPS request to the server, they need to also send their device ID and the username of the owner. The server will only allow sensor readings if the unique device ID matches the username. The worst thing that could happen is that someone sees your device ID and tries to impersonate you by sending messages under your username, but this will not happen unless you accidentally share your device ID (which you shouldn't). As long as they don't have access to your account, they won't be able to see your sensor readings.

### User account storage
Ideally, users and devices should perhaps be stored separately, using a database such as [MongoDB](https://www.mongodb.com/) or many other alternatives. I chose actively to avoid this because I wanted a NodeJS application that required minimum effort to set up. Installing MongoDB and having to worry about security and accounts is a step I wanted to avoid. Therefore all users and devices are now stored in JSON files

### Storage of sensor readings
I really wanted to use a time-series database such as [InfluxDB](https://www.influxdata.com/time-series-database/) but once again, did not want to bother people with setting up this database or having to pay money for their cloud service. A time-series database would be perfect for storing repetitive sensor readings, but since I was aiming for ease-of-use and simplicity, I opted for using LevelDB using the [Level](https://www.npmjs.com/package/level) package. Which requires no installation. I found LevelDB to be fast enough for now, however this solution is not suited for a production environment.

### Session-management
To authenticate users, I use session cookies using [express-session](https://www.npmjs.com/package/express-session).
I believe that under the current implementation, this solution is secure and doesn't allow for session hijacking. Every time the server starts, a random key is generated to sign each session cookie sent to the client. This prevents the common problem of using a session secret called 'my-secret' which can then allow manufacturing of session cookies. The downside is that every time you restart the server, every user has to log-in again, but this wasn't a big problem to me.
