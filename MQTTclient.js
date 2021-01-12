const mqtt = require('mqtt')

const MQTT_URL = process.env.MQTT_URL;
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const MQTT_TOPICNAME = process.env.MQTT_TOPICNAME;

var client = null;
var connected = false;

function connect() {

  console.log('Connecting to MQTT broker...');

  client = mqtt.connect(MQTT_URL);

  client.on('connect', function () {
    connected = true;
    console.log('Connected to MQTT broker.');
  })

  client.on('message', function (topic, message) {
    //console.log(message.toString())
  })

  client.on('error', function (topic, message) {
    console.log('Error connecting to MQTT!');
  })

}

function publish(deviceID, message) {
  if (connected) {
    let topicName = deviceID + "/co2";

    client.publish(topicName, message);
  }

}

module.exports.connect = connect;
module.exports.publish = publish;