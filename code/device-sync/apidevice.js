const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const DeviceInfo = require('../models/deviceInfo');
const DeviceData = require('../models/deviceData');
const mongoose = require('mongoose');

const requestId = uuidv4().toUpperCase().replace(/-/g, '');
const token = 'dg-fDVjn2UCCp0VlJB9IIj3eeDnTud-crV9DroTKRB4OCkxC9qzqxbfH-0uor604hu6hsStS_hQUmVnmzeMfJuI4QdXbsMF88CU6PzLmt0A=';
const config = {
    headers: { Authorization: `Bearer ${token}` }
};
db.connect();

function sendMessageToAPI(data, api_url) {
    axios.post(api_url, data, config)
        .then((response) => {
            console.log(`Đã gửi tin nhắn tới API thành công. Response: ${JSON.stringify(response.data)}`);
        })
        .catch((error) => {
            console.error("Lỗi khi gửi tin nhắn tới API", error);
        });
}

DeviceInfo.find({})
    .then(result => {
        const total = result.length;
        const data = {
            "requestId": requestId,
            "total": total,
            "device": []
        };

        // POST thông tin từng thiết bị thông qua total
        for (let i = 0; i < total; i++) {
            var deviceId = `n_${result[i].deviceID}`
            var serial = result[i].serialNumber;
            var IMEI = result[i].IMEI;
            var dateParts = result[i].ngaySanXuat.split('-');
            var ngaysanxuat = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
            const newDevice = {
                "deviceId": deviceId,
                "serial": serial,
                "IMEI": IMEI,
                "ngaysanxuat": ngaysanxuat
            }

            data.device.push(newDevice);
        }

        console.log(data);
        // const api_url = "http://eoc-api.vtctelecom.com.vn/api/message"; url cũ 
        const api_url = "https://ialert.vnpt.vn/apivtc/conn/v1/api/device";
        sendMessageToAPI(data, api_url);
        mongoose.connection.close();
    })
    .catch(err => {
        console.error(err);
        mongoose.connection.close();
    });



