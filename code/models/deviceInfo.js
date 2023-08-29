const mongoose = require('mongoose');

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

module.exports = mongoose.model('deviceInfo', deviceInfoSchema);