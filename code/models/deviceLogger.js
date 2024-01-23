const mongoose = require('mongoose');

const deviceLoggerSchema = new mongoose.Schema({
    id: String,
    loggerData: Object,
    timestamp: Date
}, { collection: 'deviceLogger' });

module.exports = mongoose.model('deviceLogger', deviceLoggerSchema);