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

// Create a document to insert
const document = new DeviceData({
    deviceID: 'P00027',
    payload: 'INPUT-0',
    timestamp: new Date()
});

// Save the document
document.save()
    .then(result => {
        console.log(`${result} inserted!`);
        // Close connection
        mongoose.connection.close();
    })
    .catch(err => {
        console.error(err);
        // Close connection
        mongoose.connection.close();
    });
