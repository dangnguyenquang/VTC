const mongoose = require('mongoose');

const deviceDataSchema = new mongoose.Schema({
    id: String,
    payload: String,
    timestamp: Date
}, { collection: 'deviceData' });

module.exports = mongoose.model('deviceData', deviceDataSchema);