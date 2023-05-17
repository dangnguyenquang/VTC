const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const requestId = uuidv4().toUpperCase().replace(/-/g, '');
const deviceId = "n_00027";
const action = "wifi";
const ScretKey = "2adac38d834c4807b798bc844503c249";

const sign_check = `${requestId}${action}${deviceId}${ScretKey}`;
const sign = crypto.createHash('sha256').update(sign_check).digest('hex');

console.log(sign)

// const URL = `http://nodejs-api-iot.app-provider.xyz/requestdevice?requestId=${requestId}&deviceId=${deviceId}&action=${action}&sign=${sign}`; // URL của JSON Server

// axios.get(`${URL}`)
//   .then(response => {
//     console.log(`Response: ${JSON.stringify(response.data)}`);
//   })
//   .catch(error => {
//     console.error('ERR:', error);
//   });

const data = {
  "requestId": requestId,
  "deviceId": deviceId,
  "action": action,
  "data": {
    "ssid": "yyyy",
    "pwd": "12345678"
  },
  "sign": sign
}

const URL = `http://localhost:3000/config`;
axios.post(URL, data)
  .then((response) => {
    console.log(`${JSON.stringify(data)}`)
    console.log(`Đã gửi tin nhắn tới API thành công. Response: ${JSON.stringify(response.data)}`);
  })
  .catch((error) => {
    console.error("Lỗi khi gửi tin nhắn tới API", error);
  });
