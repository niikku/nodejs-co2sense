<h1 align="center">NodeJS CO2sense</h1>
<div align="center">
A Node.js server to process and visualize data from ESP32-based CO2 sensors
</div>

## Table of Contents
- [Features](#features)
- [Getting started](#getting-started)
- [Folder structure](#folder-structure)
- [JS files](#js-files)
- [Objects](#objects)

## Features
- __Express framework:__ Responsible for handling all HTTP requests
- __User registration:__ Allowing people to easily register and view their sensor readings
- __LevelDB database:__ Simple and fast key-value storage for sensor readings
- __Bootstrap front-end:__ Simple and responsive UI
- __Amazon AWS MQTT:__ Push sensor readings to Amazon AWS and use this data in realtime

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
