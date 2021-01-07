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

### Adding a CO2 sensor

4. View your server at (http://localhost:3000)

5. Navigate to the 'Devices' tab and create a new device. Choose a suitable name and the location where the device will be mounted

6. You will now see your device in the list, copy the unique device ID

### Burning firmware to the CO2 sensor
The firmware is written for the [ESP32 development kit](https://www.espressif.com/en/products/devkits/esp32-devkitc/overview) and requires the [Sensirion SCD30](https://www.sensirion.com/en/environmental-sensors/carbon-dioxide-sensors/carbon-dioxide-sensors-co2/) to be connected over the I2C pins.

1. [Download the firmware here](https://github.com/niikku/ESP32-co2sensor)
2. Make sure you have the [Arduino IDE](https://www.arduino.cc/en/software) installed
3. Start Arduino, go to File -> Preferences and make paste the following into the Board Manager URLs: ```https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json```
