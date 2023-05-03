const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const requestId = uuidv4().toUpperCase().replace(/-/g, '');
const deviceId = "P00028";
const action = "tindinhky";
const ScretKey = "ScretKey";

const data = `${deviceId}${requestId}${ScretKey}`;
const sign = crypto.createHash('sha256').update(data).digest('hex');

const URL = `http://nodejs-api-iot.app-provider.xyz/requestdevice?requestId=${requestId}&deviceId=${deviceId}&action=${action}&sign=${sign}`; // URL của JSON Server

axios.get(`${URL}`)
  .then(response => {
    console.log(`Response: ${JSON.stringify(response.data)}`);
  })
  .catch(error => {
    console.error('ERR:', error);
  });

// const data = {
//   "requestId": requestId,
//   "deviceId": "P00028",
//   "status": 0
// }
// const URL = `http://nodejs-api-iot.app-provider.xyz/api/active`;
// axios.post(URL, data)
//   .then((response) => {
//     console.log(`${JSON.stringify(data)}`)
//     console.log(`Đã gửi tin nhắn tới API thành công. Response: ${JSON.stringify(response.data)}`);
//   })
//   .catch((error) => {
//     console.error("Lỗi khi gửi tin nhắn tới API", error);
//   });
