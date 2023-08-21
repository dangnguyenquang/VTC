const mqtt = require("mqtt");
const mongoose = require("mongoose");
const db_url = "mongodb://localhost:27017/VTC";

const mqtt_broker = "iot-solar.nichietsuvn.com";
const mqtt_port = 1884;
const mqtt_username = "guest";
const mqtt_password = "123456a@";
var client = mqtt.connect(`mqtt://${mqtt_broker}:${mqtt_port}`, {
  username: mqtt_username,
  password: mqtt_password,
});

let deviceIds = [];
let topics = [];

// **************************************************************** //
// Database
mongoose.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true });

const deviceDataSchema = new mongoose.Schema(
  {
    id: String,
    payload: String,
    timestamp: Date,
  },
  { collection: "deviceData" }
);
const DeviceData = mongoose.model("deviceData", deviceDataSchema);

const deviceInfoSchema = new mongoose.Schema(
  {
    deviceID: String,
    serialNumber: String,
    IMEI: String,
    ngaySanXuat: String,
    feeStatus: String,
    wifiSSID: String,
    wifiPASS: String,
    connectStatus: String,
    interval: Number,
    lastUpdate: Date,
  },
  { collection: "deviceInfo" }
);
const DeviceInfo = mongoose.model("deviceInfo", deviceInfoSchema);

const changeStream = DeviceInfo.watch();

// Lắng nghe sự kiện thay đổi trên collection
changeStream.on("change", (change) => {
  DeviceInfo.find({})
    .then((devices) => {
      let newDeviceIds = devices.map((device) => device.deviceID);
      let newTopics = newDeviceIds.map((deviceId) => `server/${deviceId}/data`);

      updateTopics(newTopics);
      console.log("Initial devices", newDeviceIds);
      deviceIds = newDeviceIds;
    })
    .catch((err) => {
      console.log(err);
    });
});

// In ra các deviceId hiện có
DeviceInfo.find({})
  .then((devices) => {
    deviceIds = devices.map((device) => device.deviceID);
    topics = deviceIds.map((deviceId) => `server/${deviceId}/data`);
    var client = mqtt.connect(`mqtt://${mqtt_broker}:${mqtt_port}`, {
      username: mqtt_username,
      password: mqtt_password,
    });
    // Khi kết nối thành công tới MQTT broker
    client.on("connect", () => {
      console.log("Kết nối thành công tới MQTT broker");

      // Subscribe các topic ban đầu
      subscribeTopics();
    });
    console.log("Initial devices", deviceIds);
  })
  .catch((err) => {
    console.log(err);
  });

// **************************************************************** //
// MQTT
function subscribeTopics() {
  if (topics.length === 0) {
    console.log("Danh sách cách topics để subscribe rỗng");
  } else {
    client.subscribe(topics, (err) => {
      if (err) {
        console.error("Lỗi khi subscribe các topic:", err);
      } else {
        console.log("Đã subscribe các topic thành công:", topics);
      }
    });
  }
}

// Cập nhật mảng topics
function updateTopics(newTopics) {
  if (topics.length === 0) {
    topics = newTopics;
    subscribeTopics();
  } else {
    // Unsubscribe các topic hiện tại
    client.unsubscribe(topics, (err) => {
      if (err) {
        console.error("Lỗi khi unsubscribe các topic:", err);
      } else {
        console.log("Đã unsubscribe các topic thành công:", topics);
        topics = newTopics;

        // Subscribe các topic mới
        subscribeTopics();
      }
    });
  }
}

// Lắng nghe mqtt

client.on('message', (topic, message) => {
    // Xử lý tin nhắn từ MQTT ở đây
    const data = message.toString(); // Chuyển đổi dữ liệu từ Buffer sang chuỗi (tuỳ theo định dạng dữ liệu)
  
    // Tạo một bản ghi mới sử dụng model DeviceData
    const newDeviceData = new DeviceData({
      id: topic.substring(7, 12),
      payload: data,
      timestamp: new Date() // Thời gian hiện tại
    });
  
    // Lưu bản ghi mới vào cơ sở dữ liệu
    newDeviceData.save()
      .then(() => {
        console.log(topic.substring(7, 12) + ' saved new data to the database.');
      })
      .catch((error) => {
        console.error(topic.substring(7, 12) + 'Error saving data to the database:', error);
      });
  });