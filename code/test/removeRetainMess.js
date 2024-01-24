const mqtt = require('mqtt');

const mqtt_broker = "iot-vtc.nichietsuvn.com";
const mqtt_port = 1887;
const mqtt_username = "guest";
const mqtt_password = "123456a@";
var client = mqtt.connect(`mqtt://${mqtt_broker}:${mqtt_port}`, {
  username: mqtt_username,
  password: mqtt_password,
});
const topic = "server/A0012/data";

// Xử lý sự kiện khi kết nối thành công
client.on('connect', () => {
  console.log('Đã kết nối đến MQTT broker');

  // Đăng ký vào chủ đề mà không nhận bản tin Retained
  client.subscribe(topic, { qos: 0, rh: 0 }, (err, granted) => {
    if (err) {
      console.error('Đăng ký thất bại', err);
    } else {
      console.log('Đã đăng ký vào chủ đề:', granted[0].topic);
    }
  });
});

// Xử lý bản tin nhận được
client.on('message', (receivedTopic, message) => {
  console.log(`Nhận được bản tin từ chủ đề ${receivedTopic}: ${message.toString()}`);
});

// Xử lý sự kiện khi mất kết nối
client.on('close', () => {
  console.log('Đã mất kết nối đến MQTT broker');
});

// Xử lý sự kiện khi lỗi
client.on('error', (err) => {
  console.error('Lỗi kết nối:', err);
});
