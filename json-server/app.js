const jsonServer = require('json-server');
const server = jsonServer.create();
const middlewares = jsonServer.defaults();
const crypto = require('crypto');
const mqtt = require('mqtt');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const moment = require('moment');

const db_url = 'mongodb://localhost:27017/VTC';
const ScretKey = "ScretKey"; // VTC cung cấp
const mqtt_broker = "iot-solar.nichietsuvn.com";
const mqtt_port = 1884;
const mqtt_username = "guest";
const mqtt_password = "123456a@";

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
const DeviceInfo = mongoose.model('deviceInfo', deviceInfoSchema);

let timerId = null;
mongoose.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true }); // Kết nối với db

server.use(middlewares);
server.use(bodyParser.json());

// ************************************************* //
// 1. Đồng bộ thiết bị
server.get('/api/syncdevice', (req, res) => {
    function faile_1(message, sentResponse) {
        var resdev = [
            {
                "result": -1,
                "message": message,
                "data": null,
            }
        ];
        if (!sentResponse) { // Kiểm tra đã gửi response chưa
            res.json(resdev); // Sử dụng return để đảm bảo chỉ gửi headers một lần
        }
    }

    function success_1(data, message, sentResponse) {
        var resdev = [
            {
                "result": 1,
                "message": message,
                "data": data,
            }
        ];
        if (!sentResponse) { // Kiểm tra đã gửi response chưa
            res.json(resdev); // Sử dụng return để đảm bảo chỉ gửi headers một lần
        }
    }

    var sentResponse = false; // Biến để kiểm tra đã gửi response chưa
    var res_message;

    DeviceInfo.find({})
        .then(result => {
            const total = result.length;
            const data = {
                "total": total,
                "device": []
            };

            // POST thông tin từng thiết bị thông qua total
            for (let i = 0; i < total; i++) {
                var deviceId = `n_${result[i].deviceID}`
                var serial = result[i].serialNumber;
                var IMEI = result[i].IMEI;
                var dateParts = result[i].ngaySanXuat.split('-');
                var ngaysanxuat = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                const newDevice = {
                    "deviceId": deviceId,
                    "serial": serial,
                    "IMEI": IMEI,
                    "ngaysanxuat": ngaysanxuat
                };

                data.device.push(newDevice);
            }
            res_message = "Thành công";
            console.log(data);
            success_1(data, res_message, sentResponse);
            sentResponse = true;
        })
        .catch(err => {
            console.error(err);
            res_message = "Lỗi khi kết nối với cơ sở dữ liệu" + err;
            faile_1(res_message, sentResponse);
            sentResponse = true;
        });
});

// 2. Kích hoạt ngưng dịch vụ
server.post('/api/active', (req, res) => {
    function faile_2(message, sentResponse) {
        var resdev = [
            {
                "result": -1,
                "message": message,
                "data": null,
            }
        ];
        if (!sentResponse) { // Kiểm tra đã gửi response chưa
            res.json(resdev); // Sử dụng return để đảm bảo chỉ gửi headers một lần
        }
    }

    function success_2(message, sentResponse) {
        var resdev = [
            {
                "result": 1,
                "message": message,
            }
        ];
        if (!sentResponse) { // Kiểm tra đã gửi response chưa
            res.json(resdev); // Sử dụng return để đảm bảo chỉ gửi headers một lần
        }
    }

    var res_message;
    var feeStatus;
    var sentResponse = false;
    const { requestId, deviceId, status } = req.body;
    mongoose.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true });
    const DeviceInfo = mongoose.model('deviceInfo', deviceInfoSchema);

    if (status === 0)
        feeStatus = "Dang ky";
    else if (status === 1)
        feeStatus = "Kich hoat";
    else if (status === 2)
        feeStatus = "Ngung dich vu";
    else if (status === 3)
        feeStatus = "Huy dich vu";

    DeviceInfo.findOneAndUpdate(
        { deviceID: deviceId.substring(2, 7) },
        { $set: { feeStatus: feeStatus } },
        { new: true }
    )
        .then(updatedUser => {
            if (updatedUser) {
                console.log('Thành công');
                res_message = "Thành công";
                success_2(res_message, sentResponse);
                sentResponse = true;
                console.log(updatedUser);
            } else {
                console.log('Không tìm thấy deviceID');
                res_message = "Không tìm thấy deviceID";
                faile_2(res_message, sentResponse);
                sentResponse = true;
            }
        })
        .catch(error => {
            console.error('Lỗi khi cập nhật:', err);
            res_message = err;
            faile_2(res_message, sentResponse);
            sentResponse = true;
        });
});

// 3. Thông tin thiết bị 
server.get('/api/deviceinfo', (req, res) => {
    const deviceId = req.query.deviceId
    var sentResponse = false; // Biến để kiểm tra đã gửi response chưa
    var res_message, state, status;
    var isSucces = true;
    const client = mqtt.connect(`mqtt://${mqtt_broker}:${mqtt_port}`, {
        username: mqtt_username,
        password: mqtt_password
    });
    const topicToPublish = `device/${deviceId.substring(2, 7)}/cmd`;
    const topicToSubscribe = `server/${deviceId.substring(2, 7)}/data`;

    client.on('connect', () => {
        console.log("Kết nối thành công tới MQTT broker");
        client.subscribe(topicToSubscribe);
    });

    client.on('error', (error) => {
        console.error('Lỗi khi kết nối tới MQTT broker:', error);
    }); // Kết nối với MQTT

    function response(message, sentResponse, deviceId = null, serial = null, IMEI = null, status = null,
        state = null, fee_status = null, ngaysanxuat = null, LastUpdated = null, isSucces) {
        client.end();
        var result, data = [];

        if (isSucces) result = 1;
        else result = -1;

        const newData = {
            "deviceId": deviceId,
            "serial": serial,
            "IMEI": IMEI,
            "status": status,
            "state": state,
            "fee_status": fee_status,
            "ngaysanxuat": ngaysanxuat,
            "LastUpdated": LastUpdated
        };
        data.push(newData);

        var resdev = [
            {
                "result": result,
                "message": message,
                "data": data
            }
        ];
        if (!sentResponse) { // Kiểm tra đã gửi response chưa
            res.json(resdev);
        }
    }

    DeviceInfo.findOne({ deviceID: deviceId.substring(2, 7) })
        .then(result => {
            var fee_status;
            var serial = result.serialNumber;
            var IMEI = result.IMEI;
            var dateParts = result.ngaySanXuat.split('-');
            var ngaysanxuat = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
            var LastUpdated = moment(result.lastUpdate).format('DD/MM/YYYY HH:mm:ss');

            if (result.feeStatus === "Dang ki")
                fee_status = 0;
            else if (result.feeStatus === "Kich hoat")
                fee_status = 1;
            else if (result.feeStatus === "Ngung dich vu")
                fee_status = 2;
            else if (result.feeStatus === "Huy dich vu")
                fee_status = 3;

            client.publish(topicToPublish, 'PING', (err) => {
                if (err) {
                    console.error('Lỗi khi gửi tin nhắn:', err);
                    status = 2;
                    state = 3;
                    res_message = "Lỗi khi gửi tin cho mqtt broker";
                    isSucces = false;
                    response(res_message, sentResponse, deviceId, serial, IMEI, status, state, fee_status, ngaysanxuat, LastUpdated, isSucces);
                    sentResponse = true;
                } else {
                    console.log('Đã gửi tin nhắn thành công');
                    timerId = setTimeout(() => {
                        res_message = "Không có phản hồi từ thiết bị trong 10s";
                        status = 2;
                        state = 3;
                        isSucces = false;
                        response(res_message, sentResponse, deviceId, serial, IMEI, status, state, fee_status, ngaysanxuat, LastUpdated, isSucces);
                        sentResponse = true;
                    }, 10000); // 10s
                    client.on('message', (topic, message) => {
                        clearTimeout(timerId);
                        console.log(`Nhận được tin nhắn từ topic ${topic}: ${message.toString()}`);
                        const strmess = message.toString();
                        if (strmess === "INPUT-0") {
                            res_message = "Thành công";
                            status = 1;
                            state = 1;
                            isSucces = true;
                            response(res_message, sentResponse, deviceId, serial, IMEI, status, state, fee_status, ngaysanxuat, LastUpdated, isSucces);
                            sentResponse = true;
                        } else if (strmess === "INPUT-1" || strmess === "BUTTO-1") {
                            res_message = "Thành công";
                            status = 1;
                            state = 2;
                            isSucces = true;
                            response(res_message, sentResponse, deviceId, serial, IMEI, status, state, fee_status, ngaysanxuat, LastUpdated, isSucces);
                            sentResponse = true;
                        } else {
                            isSucces = false;
                            res_message = "Thiết bị không phản hồi"
                            response(res_message, sentResponse, isSucces);
                            sentResponse = true
                        }
                    });
                }
            });
        })
        .catch(err => {
            console.error(err);
            isSucces = false;
            res_message = "Không kết nối được với database"
            response(res_message, sentResponse, isSucces);
            sentResponse = true;
        });
});

// 5. Gửi yêu cầu xuống thiết bị
server.get('/requestdevice', (req, res) => {

    function faile_5(message, sentResponse) {
        client.end();
        var resdev = [
            {
                "result": -1,
                "message": message,
                "data": null,
            }
        ];
        if (!sentResponse) { // Kiểm tra đã gửi response chưa
            res.json(resdev); // Sử dụng return để đảm bảo chỉ gửi headers một lần
        }
    }

    function success_5(message, sentResponse) {
        client.end();
        var resdev = [
            {
                "result": 1,
                "message": message,
                "data": null,
            }
        ];
        if (!sentResponse) { // Kiểm tra đã gửi response chưa
            res.json(resdev); // Sử dụng return để đảm bảo chỉ gửi headers một lần
        }
    }

    const requestId = req.query.requestId;
    const deviceId = req.query.deviceId;
    const action = req.query.action;
    const sign = req.query.sign;
    const client = mqtt.connect(`mqtt://${mqtt_broker}:${mqtt_port}`, {
        username: mqtt_username,
        password: mqtt_password
    });

    var res_message;

    const sign_check = `${deviceId}${requestId}${ScretKey}`;
    const check = crypto.createHash('sha256').update(sign_check).digest('hex');

    const topicToPublish = `device/${deviceId.substring(2, 7)}/cmd`;
    const topicToSubscribe = `server/${deviceId.substring(2, 7)}/data`;

    var sentResponse = false; // Biến để kiểm tra đã gửi response chưa
    client.on('connect', () => {
        console.log("Kết nối thành công tới MQTT broker");
        client.subscribe(topicToSubscribe);
    });

    client.on('error', (error) => {
        console.error('Lỗi khi kết nối tới MQTT broker:', error);
    }); // Kết nối với MQTT

    if (sign === check) { // Kiểm tra tính hợp lệ của API
        client.publish(topicToPublish, 'PING', (err) => {
            if (err) {
                console.error('Lỗi khi gửi tin nhắn:', err);
                res_message = "Lỗi khi gửi tin cho mqtt broker";
                faile_5(res_message, sentResponse);
                sentResponse = true;
            } else {
                console.log('Đã gửi tin nhắn thành công');
                timerId = setTimeout(() => {
                    res_message = "Không có phản hồi từ thiết bị trong 10s";
                    faile_5(res_message, sentResponse);
                    sentResponse = true;
                }, 10000); // 3s
                client.on('message', (topic, message) => {
                    clearTimeout(timerId);
                    console.log(`Nhận được tin nhắn từ topic ${topic}: ${message.toString()}`);
                    const strmess = message.toString();
                    if (strmess.substring(0, 5) === "INPUT") {
                        res_message = "Đã tiếp nhận";
                        success_5(res_message, sentResponse);
                        sentResponse = true;
                    }
                });
            }
        });
    } else {
        res_message = "sign không hợp lệ";
        faile_5(res_message, sentResponse);
        sentResponse = true;
    }
});

// 6. Cấu hình
server.post('/config', (req, res) => {
    function faile_6(message, sentResponse) {
        var resdev = [
            {
                "result": -1,
                "message": message,
                "data": null,
            }
        ];
        if (!sentResponse) { // Kiểm tra đã gửi response chưa
            res.json(resdev); // Sử dụng return để đảm bảo chỉ gửi headers một lần
        }
    }

    function success_6(data, message, sentResponse) {
        var resdev = [
            {
                "result": 1,
                "message": message,
                "data": data,
            }
        ];
        if (!sentResponse) { // Kiểm tra đã gửi response chưa
            res.json(resdev); // Sử dụng return để đảm bảo chỉ gửi headers một lần
        }
    }

    var res_message;
    var sentResponse = false;
    const { requestId, deviceId, action, data, sign } = req.body;
    const sign_check = `${requestId}${action}${deviceId}${ScretKey}`;
    const check = crypto.createHash('sha256').update(sign_check).digest('hex');
    if (sign === check) {
        const DeviceInfo = mongoose.model('deviceInfo', deviceInfoSchema);

        DeviceInfo.findOneAndUpdate(
            { deviceID: deviceId.substring(2, 7) },
            { $set: { wifiSSID: data.ssid, wifiPASS: data.pwd } },
            { new: true }
        )
            .then(updatedUser => {
                if (updatedUser) {
                    console.log('Thành công');
                    res_message = "Thành công";
                    success_6(data, res_message, sentResponse);
                    sentResponse = true;
                    console.log(updatedUser);
                } else {
                    console.log('Không tìm thấy deviceID');
                    res_message = "Không tìm thấy deviceID";
                    faile_6(res_message, sentResponse);
                    sentResponse = true;
                }
            })
            .catch(error => {
                console.error('Lỗi khi cập nhật:', err);
                res_message = err;
                faile_6(res_message, sentResponse);
                sentResponse = true;
            });
    } else {
        res_message = "sign không hợp lệ";
        faile_6(res_message, sentResponse);
        sentResponse = true;
    }
});

// ************************************************* //

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`JSON Server is running on port ${PORT}`);
});