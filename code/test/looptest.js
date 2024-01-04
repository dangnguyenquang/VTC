const axios = require('axios');
const fs = require('fs');

const filePath = './log.txt';

var success = 0;
var failed = 0;
var count = 0;

function generateRandomString() {
  const length = Math.floor(Math.random() * (20 - 8 + 1)) + 8; // Độ dài từ 8 đến 20 kí tự
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

const apiUrl = 'http://localhost:3000/api/config';

async function sendApiRequest() {
  try {
    const requestData = {
      requestId: 'a460ad08-3653-4449-b75c-0acfb496a9cc',
      deviceId: 'n_A0012',
      action: 'wifi',
      data: {
        ssid: generateRandomString(),
        pwd: generateRandomString()
      }
    };
    const response = await axios.post(apiUrl, requestData);
    count++
    console.log(response.data.message);
    if (response.data.message === "Thành công") success++
    else {
      failed++;
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Lỗi khi đọc tệp tin:', err);
          return;
        }
      
        // Sửa đổi nội dung tệp tin (ví dụ: thêm dòng mới)
        const modifiedContent = data + `\n ${requestData.data.ssid} - ${requestData.data.pwd} | ${requestData.data.ssid.length} - ${requestData.data.pwd.length}`;
      
        // Ghi lại nội dung đã sửa đổi vào tệp tin
        fs.writeFile(filePath, modifiedContent, 'utf8', (err) => {
          if (err) {
            console.error('Lỗi khi ghi lại tệp tin:', err);
            return;
          }
      
          console.log('Tệp tin đã được chỉnh sửa thành công.');
        });
      });
    }
    console.log(`count:${count}, success:${success}, failed:${failed} | ${requestData.data.ssid} - ${requestData.data.pwd}`);
  } catch (error) {
    console.error('Error sending API request:', error.message);
  }

  // Gửi lại yêu cầu sau 3 phút
  setTimeout(sendApiRequest, 180000); // 180000 milliseconds = 3 phút
}

// Bắt đầu gửi yêu cầu API
sendApiRequest();
