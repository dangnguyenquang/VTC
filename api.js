const mqtt = require('mqtt');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const db_url = 'mongodb://localhost:27017/VTC';

const mqtt_broker = "iot-solar.nichietsuvn.com";
const mqtt_port = 1884;
const mqtt_username = "guest";
const mqtt_password = "123456a@";

let deviceIds = [];
let topics = [];

// **************************************************************** //
// Database
mongoose.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true });
const deviceDataSchema = new mongoose.Schema({
  deviceID: String,
  payload: String,
  timestamp: Date
}, { collection: 'deviceData' });
const DeviceData = mongoose.model('deviceData', deviceDataSchema);

const deviceInfoSchema = new mongoose.Schema({
  deviceID: String,
  serialNumber: String,
  IMEI: String,
  ngaySanXuat: String,
  feeStatus: String,
  wifiSSID: String,
  wifiPASS: String,
  connectStatus: String,
  interval: Number,
  lastUpdate: Date
}, { collection: 'deviceInfo' });
const DeviceInfo = mongoose.model('deviceInfo', deviceInfoSchema);

const changeStream = DeviceInfo.watch();

// Lắng nghe sự kiện thay đổi trên collection
changeStream.on('change', (change) => {
  DeviceInfo.find({})
    .then((devices) => {
      let newDeviceIds = devices.map(device => device.deviceID);
      let newTopics = newDeviceIds.map(deviceId => `server/${deviceId}/data`);
      updateTopics(newTopics)
      console.log('Initial devices', newDeviceIds);
      deviceIds = newDeviceIds;
    })
    .catch((err) => {
      console.log(err);
    });
});

// In ra các deviceId hiện có
DeviceInfo.find({})
  .then((devices) => {
    deviceIds = devices.map(device => device.deviceID);
    topics = deviceIds.map(deviceId => `server/${deviceId}/data`);
    console.log('Initial devices', deviceIds);
  })
  .catch((err) => {
    console.log(err);
  });

// **************************************************************** //
// Server VTC
const token = 'dg-fDVjn2UCCp0VlJB9IIj3eeDnTud-crV9DroTKRB4OCkxC9qzqxbfH-0uor604hu6hsStS_hQUmVnmzeMfJuI4QdXbsMF88CU6PzLmt0A=';
const config = {
  headers: { Authorization: `Bearer ${token}` }
};
const api_url = "http://eoc-api.vtctelecom.com.vn/api/message";

// **************************************************************** //
// MQTT
const client = mqtt.connect(`mqtt://${mqtt_broker}:${mqtt_port}`, {
  username: mqtt_username,
  password: mqtt_password
});
function subscribeTopics() {
  if (topics.length === 0) {
    console.log('Danh sách cách topics để subscribe rỗng');
  } else {
    client.subscribe(topics, (err) => {
      if (err) {
        console.error('Lỗi khi subscribe các topic:', err);
      } else {
        console.log('Đã subscribe các topic thành công:', topics);
      }
    });
  }
}

// Khi kết nối thành công tới MQTT broker
client.on('connect', () => {
  console.log('Kết nối thành công tới MQTT broker');

  // Subscribe các topic ban đầu
  subscribeTopics();
});

// Cập nhật mảng topics
function updateTopics(newTopics) {
  if (topics.length === 0) {
    topics = newTopics;
    subscribeTopics();
  } else {
    // Unsubscribe các topic hiện tại
    client.unsubscribe(topics, (err) => {
      if (err) {
        console.error('Lỗi khi unsubscribe các topic:', err);
      } else {
        console.log('Đã unsubscribe các topic thành công:', topics);
        topics = newTopics;

        // Subscribe các topic mới
        subscribeTopics();
      }
    });
  }
}

// **************************************************************** //
// Hàm gửi API
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

// **************************************************************** //
// Tự động lấy data từ db và gửi đi
function fetchDataAndSendAPI(deviceId) {
  var state, kind;
  const interval = 60000;
  const now = new Date();
  const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  const requestId = uuidv4().toUpperCase().replace(/-/g, '');  // uniqueidentifier

  DeviceData.aggregate([
    { $match: { id: deviceId } },
    { $sort: { timestamp: -1 } }, // Sắp xếp theo thời gian giảm dần
    { $limit: 1 } // Giới hạn kết quả chỉ lấy 1 tài liệu
  ])
    .then(result => {
      if (result.length > 0) {
        const latestData = result[0];
        if (now.getTime() - latestData.timestamp.getTime() <= interval) {
          if (latestData.payload === "INPUT-0") {
            state = 1;
            kind = 2;
          } else if (latestData.payload === "INPUT-1" || latestData.payload === "BUTTO-1") {
            state = 1;
            kind = 1;
          } else {
            state = 2;
            kind = 2;
          }
        } else {
          console.log("Thiết bị không phản hồi");
          state = 2;
          kind = 2;
        }
        const data = {
          "requestId": requestId,
          "deviceId": `n_${deviceId}`,
          "kind": kind,
          "state": state,
          "time": formattedDate,
        }
        sendMessageToAPI(data, api_url);
      }

    })
    .catch(err => {
      console.error(err);
    });
}

setInterval(() => {
  if (deviceIds.length === 0) {
    console.log("Không tồn tại thiết bị nào trong database");
  } else {
    for (let i = 0; i < deviceIds.length; i++) {
      const deviceId = deviceIds[i]; // Lấy phần tử tương ứng từ mảng deviceIds
      fetchDataAndSendAPI(deviceId);
    }
  }
}, 15000);

// **************************************************************** //
// Nhận tin nhắn mới từ MQTT
client.on('message', (topic, message) => {
  console.log(`Nhận được tin nhắn từ topic ${topic}: ${message.toString()}`);
  const now = new Date();
  const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  const requestId = uuidv4().toUpperCase().replace(/-/g, '');  // uniqueidentifier
  const strmess = message.toString();
  var deviceId = `n_${(topic.substring(7, 12))}`;
  var kind = 0;

  if (strmess.substring(6, 7) == "1") {
    if (strmess === "INPUT-1") kind = 1;
    else if (strmess === "BUTTO-1") kind = 4;
    const data = {
      "requestId": requestId,
      "deviceId": deviceId,
      "kind": kind,
      "state": 1,
      "time": formattedDate
    }

    sendMessageToAPI(data, api_url);
  }
});

