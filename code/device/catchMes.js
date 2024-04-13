const mqtt = require("mqtt");
const db = require('../config/database');
const DeviceInfo = require('../models/deviceInfo');
const DeviceData = require('../models/deviceData');
const BatteryPercent = require('../models/batteryPercent')

const mqtt_broker = "iot-vtc.nichietsuvn.com";
const mqtt_port = 1887;
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
db.connect();

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

function updateStartTimeById(deviceId, currentTime, CHANGEtyp) {
  return BatteryPercent.findOneAndUpdate(
    { id: deviceId }, // Điều kiện tìm kiếm dựa vào id
    { $set: { startTime: currentTime, CHANGEtyp: CHANGEtyp} }, // Giá trị mới của trường timeStart
    { new: true } // Tùy chọn để trả về bản ghi đã được cập nhật
  )
  .then((result) => {
    if (result) {
      console.log('Updated document:', result);
      return result;
    } else {
      throw new Error('Document not found');
    }
  })
  .catch((error) => {
    console.error('Error updating document:', error);
    throw error;
  });
}

// Lấy giá trị và trạng thái của pin
function getValueAndBatteryState(deviceId) {
  return BatteryPercent.findOne({ id: deviceId }) // Truy vấn dựa vào deviceId
    .then((device) => {
      if (device) {
        return device.CHANGEtyp;
      } else {
        throw new Error('Device not found'); // Ném lỗi nếu không tìm thấy device
      }
    })
    .catch((err) => {
      console.log(err);
      throw err; // Ném lỗi để xử lý ở phần gọi hàm getIntervalWithDeviceId
    });
}

function setValueAndBatteryState(deviceId, payload) {
  getValueAndBatteryState(deviceId)
    .then((batteryData) => {
      if (payload.type === "inf" && batteryData != payload.data.CHANGEtyp) {
        const currentTime = new Date();
        updateStartTimeById(deviceId, currentTime, payload.data.CHANGEtyp);
      }
    })
    .catch((err) => {
      console.log(err);
    })
}


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
    client.subscribe(topics, { qos: 0, rh: 0 }, (err) => {
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
    if (message.toString().substring(0, 1) === "{") {
      const data = JSON.parse(message.toString()); // Chuyển đổi dữ liệu từ Buffer sang chuỗi (tuỳ theo định dạng dữ liệu)
      // Tạo một bản ghi mới sử dụng model DeviceData
      const newDeviceData = new DeviceData({
        id: topic.substring(7, 12),
        payload: data,
        timestamp: new Date() // Thời gian hiện tại
      });
    
      setValueAndBatteryState(topic.substring(7, 12), data);

      // Lưu bản ghi mới vào cơ sở dữ liệu
      newDeviceData.save()
        .then(() => {
          console.log(topic.substring(7, 12) + ' saved new data to the database.');
        })
        .catch((error) => {
          console.error(topic.substring(7, 12) + 'Error saving data to the database:', error);
        });
    }
  });