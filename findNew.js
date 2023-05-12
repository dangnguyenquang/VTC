const mongoose = require('mongoose');

const uri = 'mongodb://localhost:27017/VTC'; // Địa chỉ kết nối MongoDB
const collectionName = 'deviceData'; // Tên collection

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    const collection = mongoose.connection.collection(collectionName);

    collection
      .find()
      .sort({ timestamp: -1 }) // Sắp xếp theo thời gian giảm dần
      .limit(1) // Giới hạn kết quả chỉ lấy 1 bản ghi mới nhất
      .toArray()
      .then(result => {
        if (result.length > 0) {
          const latestRecord = result[0];
          console.log('Bản ghi mới nhất:', latestRecord);
        } else {
          console.log('Không tìm thấy bản ghi.');
        }

        mongoose.connection.close();
      })
      .catch(err => {
        console.error('Lỗi khi truy vấn MongoDB:', err);
        mongoose.connection.close();
      });
  })
  .catch(err => {
    console.error('Lỗi khi kết nối tới MongoDB:', err);
  });
