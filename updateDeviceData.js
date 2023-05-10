const mongoose = require('mongoose');

// Connection URL
const url = 'mongodb://localhost:27017/VTC';

// Connect to the database
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });

// Define the schema
const deviceDataSchema = new mongoose.Schema({
    deviceID: String,
    payload: String,
    timestamp: Date
}, { collection: 'deviceData' });

// Create a model for the collection
const DeviceData = mongoose.model('deviceData', deviceDataSchema);

const deviceID = 'P00027';
const payload = 'INPUT-0';
const timestamp = new Date();

DeviceData.findOneAndUpdate(
    { deviceID: deviceID },
    { $set: { payload: payload, timestamp: timestamp } },
    { new: true }
)
    .then(updatedUser => {
        if (updatedUser) {
            console.log('Thành công');
            console.log(updatedUser);
        } else {
            console.log('Không tìm thấy deviceID');
        }
    })
    .catch(error => {
        console.error('Lỗi khi cập nhật:', err);
    });