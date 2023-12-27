const axios = require('axios');

var success = 0;
var failed = 0;
var count = 0;

const apiUrl = 'http://localhost:3000/api/config';
const requestData = {
  requestId: 'a460ad08-3653-4449-b75c-0acfb496a9cc',
  deviceId: 'n_A0020',
  action: 'wifi',
  data: {
    ssid: 'nichietsu',
    pwd: 'Aa@123456'
  }
};

async function sendApiRequest() {
  try {
    const response = await axios.post(apiUrl, requestData);
    count++
    console.log(response.data.message);
    if (response.data.message === "Thành công") success++
    else failed++
    console.log(`count:${count}, success:${success}, failed:${failed}`);
  } catch (error) {
    console.error('Error sending API request:', error.message);
  }

  // Gửi lại yêu cầu sau 3 phút
  setTimeout(sendApiRequest, 180000); // 180000 milliseconds = 3 phút
}

// Bắt đầu gửi yêu cầu API
sendApiRequest();
