const mqtt = require("mqtt");

const mqtt_broker = "iot-solar.nichietsuvn.com";
const mqtt_port = 1884;
const mqtt_username = "guest";
const mqtt_password = "123456a@";

function connectToMQTTBroker(){
  mqtt.connect(`mqtt://${mqtt_broker}:${mqtt_port}`, {
    username: mqtt_username,
    password: mqtt_password,
  });
}

module.exports = { connectToMQTTBroker }

