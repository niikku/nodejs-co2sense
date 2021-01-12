const mqtt = require('mqtt')

const MQTT_URL = process.env.MQTT_URL;
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const MQTT_TOPICNAME = process.env.MQTT_TOPICNAME;

var client = null;
var connected = false;

function connect() {
  if(MQTT_URL === undefined || MQTT_USERNAME === undefined || MQTT_PASSWORD === undefined || MQTT_TOPICNAME === undefined) {
    console.log('MQTT credentials are not configured, so MQTT will not be enabled.');
    return;
  }
  
  console.log('Connecting to MQTT broker...');

  client = mqtt.connect(MQTT_URL, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD
  })

  client.on('connect', function () {
    console.log('Connected to MQTT broker.');
    client.subscribe(MQTT_TOPICNAME, function (err) {
      if (err) {
        console.log('Error subscribing to MQTT topic!');
      } else {
        console.log('Subscribed to MQTT topic.');
        connected = true;
      }
    })
  })

  client.on('message', function (topic, message) {
    //console.log(message.toString())
  })

  client.on('error', function (topic, message) {
    console.log('Error connecting to MQTT!');
  })

}

function publish(message) {
  if (connected) {
    client.publish(MQTT_TOPICNAME, message);
  }

}

module.exports.connect = connect;
module.exports.publish = publish;