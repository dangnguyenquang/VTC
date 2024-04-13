const BatteryPercent = require('../models/batteryPercent')
const db = require('../config/database');

db.connect();

// Hàm để tạo các bản ghi
async function createBatteryRecords() {
  // Lặp qua các giá trị id từ 00001 đến 00120
  for (let i = 1; i <= 120; i++) {
    // Format id thành chuỗi 5 ký tự với số không bổ sung phía trước nếu cần
    const id = String(i).padStart(4, '0');
    // Tạo một thời điểm bây giờ
    const now = new Date();
    // Tạo một bản ghi mới với các giá trị tương ứng
    const record = new BatteryPercent({
      id: `A${id}`,
      CHANGEtyp: 0,
      startTime: now,
    });
    // Lưu bản ghi vào cơ sở dữ liệu
    await record.save();
    console.log(`Created record for id ${id}`);
  }
}

// Gọi hàm tạo các bản ghi
createBatteryRecords().then(() => {
  console.log('All records created successfully');
}).catch((error) => {
  console.error('Error creating records:', error);
});
