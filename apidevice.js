const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const db_url = 'mongodb://localhost:27017/VTC';
const requestId = uuidv4().toUpperCase().replace(/-/g, '');
const token = 'dg-fDVjn2UCCp0VlJB9IIj3eeDnTud-crV9DroTKRB4OCkxC9qzqxbfH-0uor604hu6hsStS_hQUmVnmzeMfJuI4QdXbsMF88CU6PzLmt0A=';
const config = {
    headers: { Authorization: `Bearer ${token}` }
};
mongoose.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true });

function sendMessageToAPI(data, api_url) {
    axios.post(api_url, data, config)
        .then((response) => {
            console.log(`Đã gửi tin nhắn tới API thành công. Response: ${JSON.stringify(response.data)}`);
        })
        .catch((error) => {
            console.error("Lỗi khi gửi tin nhắn tới API", error);
        });
}

const deviceInfoSchema = new mongoose.Schema({
    deviceID: String,
    serialNumber: String,
    IMEI: String,
    ngaySanXuat: String,
    feeStatus: String,
    wifiSSID: String,
    wifiPASS: String,
    connectStatus: String,
    interval: Number
}, { collection: 'deviceInfo' });

// Create a model for the collection
const DeviceInfo = mongoose.model('deviceInfo', deviceInfoSchema);

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
            var deviceId = `n_${result[i].deviceID.substring(1, 6)}`
            var serial = result[i].serialNumber;
            var IMEI = result[i].IMEI;
            var ngaysanxuat = result[i].ngaySanXuat;
            const newDevice = {
                "deviceId": deviceId,
                "serial": serial,
                "IMEI": IMEI,
                "ngaysanxuat": ngaysanxuat
            };

            data.device.push(newDevice);
        }

        console.log(data);
        const api_url = "http://eoc-api.vtctelecom.com.vn/api" + "/device";
        sendMessageToAPI(data, api_url);
        mongoose.connection.close();
    })
    .catch(err => {
        console.error(err);
        mongoose.connection.close();
    });



