const mqtt = require('mqtt');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const mqtt_broker = "iot-solar.nichietsuvn.com";
const mqtt_port = 1884;
const mqtt_username = "guest";
const mqtt_password = "123456a@";
const mqtt_topic = "server/P00028/data";

const token = 'dg-fDVjn2UCCp0VlJB9IIj3eeDnTud-crV9DroTKRB4OCkxC9qzqxbfH-0uor604hu6hsStS_hQUmVnmzeMfJuI4QdXbsMF88CU6PzLmt0A=';
const config = {
  headers: { Authorization: `Bearer ${token}` }
};
const api_endpoint_type_1 = "/message"; // Nhận bản tin quản lý từ thiết bị
let timerId = null;

const client = mqtt.connect(`mqtt://${mqtt_broker}:${mqtt_port}`, {
  username: mqtt_username,
  password: mqtt_password
});

client.on('connect', () => {
  console.log("Kết nối thành công tới MQTT broker");

  client.subscribe(mqtt_topic);
});

function connectionLost(){
  console.log("Hết thời gian lắng nghe MQTT");
  const now = new Date();
  const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  const requestId = uuidv4().toUpperCase().replace(/-/g, '');  // uniqueidentifier

  var deviceId = `n_${(mqtt_topic.substring(8, 13))}`;
  var kind = 2;
  var state = 2;

  const data = {
    "requestId": requestId,
    "deviceId": deviceId,
    "kind": kind,
    "state": state,
    "time": formattedDate
  }

  const api_url = "http://eoc-api.vtctelecom.com.vn/api" + api_endpoint_type_1;
  axios.post(api_url, data, config)
    .then((response) => {
      console.log(`${JSON.stringify(data)}`)
      console.log(`Đã gửi tin nhắn tới API thành công. Response: ${JSON.stringify(response.data)}`);
    })
    .catch((error) => {
      console.error("Lỗi khi gửi tin nhắn tới API", error);
    });
}

client.on('message', (topic, message) => {
  console.log(`Nhận được tin nhắn từ topic ${topic}: ${message.toString()}`);
  const strmess = message.toString();
  const now = new Date();
  const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  const requestId = uuidv4().toUpperCase().replace(/-/g, '');  // uniqueidentifier

  // POST function
  function sendMessageToAPI(data, api_url) {
    axios.post(api_url, data, config)
      .then((response) => {
        console.log(`${JSON.stringify(data)}`)
        console.log(`Đã gửi tin nhắn tới API thành công. Response: ${JSON.stringify(response.data)}`);
      })
      .catch((error) => {
        console.error("Lỗi khi gửi tin nhắn tới API", error);
      });
  }

  clearTimeout(timerId);
  // Tiếp tục lắng nghe trong 15s
  timerId = setTimeout(() => {
    connectionLost();
  }, 15000); // 15s

  const type = strmess.substring(8, 10);
  if (strmess === "<X> No data") {
    connectionLost();
  } else if (strmess.substring(0, 3) != "<X>"){
    var deviceId = `n_${(topic.substring(8, 13))}`;
    var kind = parseInt(strmess.substring(16, 18));
    var state = parseInt(strmess.substring(18, 20));

    const data = {
      "requestId": requestId,
      "deviceId": deviceId,
      "kind": kind,
      "state": state,
      "time": formattedDate
    }

    const api_url = "http://eoc-api.vtctelecom.com.vn/api" + api_endpoint_type_1;
    sendMessageToAPI(data, api_url);
  } 
});

// TimeOut trước khi nhận data từ mqtt
timerId = setTimeout(() => {
  connectionLost();
}, 15000); // 15s