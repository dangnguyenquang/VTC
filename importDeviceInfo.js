const mongoose = require('mongoose');

// Connection URL
const url = 'mongodb://localhost:27017/VTC';

// Connect to the database
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });

// Define the schema
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

// Create a document to insert
const document = new DeviceInfo({
  deviceID: 'P00028',
  serialNumber: 'A12345',
  IMEI: 'I12345',
  ngaySanXuat: '22/02/2022',
  feeStatus: 'Dang ki',
  wifiSSID: 'ngocbich',
  wifiPASS: '21240516',
  connectStatus: '4G',
  interval: 10
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
