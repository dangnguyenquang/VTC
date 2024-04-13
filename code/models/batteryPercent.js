const mongoose = require('mongoose');

const batteryPercentSchema = new mongoose.Schema({
    id: String,
    CHANGEtyp: Number,
    startTime: Date
}, { collection: 'batteryPercent' });

module.exports = mongoose.model('batteryPercent', batteryPercentSchema);