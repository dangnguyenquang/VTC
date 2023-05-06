const jsonServer = require('json-server');
const server = jsonServer.create();
const middlewares = jsonServer.defaults();
const crypto = require('crypto');
const mqtt = require('mqtt');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const db_url = 'mongodb://localhost:27017/VTC';
const ScretKey = "ScretKey"; // VTC cung cấp
const mqtt_broker = "iot-solar.nichietsuvn.com";
const mqtt_port = 1884;
const mqtt_username = "guest";
const mqtt_password = "123456a@";
const topicToPublish = 'device/P00028/cmd';
const topicToSubscribe = 'server/P00028/data';

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

let timerId = null;

const client = mqtt.connect(`mqtt://${mqtt_broker}:${mqtt_port}`, {
    username: mqtt_username,
    password: mqtt_password
});

client.on('connect', () => {
    console.log("Kết nối thành công tới MQTT broker");
    client.subscribe(topicToSubscribe);
});

client.on('error', (error) => {
    console.error('Lỗi khi kết nối tới MQTT broker:', error);
});

server.use(middlewares);
server.use(bodyParser.json());
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
    mongoose.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true });
    const DeviceInfo = mongoose.model('deviceInfo', deviceInfoSchema);

    DeviceInfo.find({})
        .then(result => {
            const total = result.length;
            const data = {
                "total": total,
                "device": []
            };

            // POST thông tin từng thiết bị thông qua total
            for (let i = 0; i < total; i++) {
                var deviceId = `n_${result[i].deviceID.substring(1, 6)}`
                var serial = result[i].serialNumber;
                var IMEI = result[i].IMEI;
                var ngaysanxuat = result[i].ngaySanXuat;
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
            mongoose.connection.close();
        })
        .catch(err => {
            console.error(err);
            res_message = "Lỗi khi kết nối với cơ sở dữ liệu" + err;
            faile_1(res_message, sentResponse);
            sentResponse = true;
            mongoose.connection.close();
        });
});

server.get('/requestdevice', (req, res) => {

    function faile_5(message, sentResponse) {
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

    var res_message;

    const sign_check = `${deviceId}${requestId}${ScretKey}`;
    const check = crypto.createHash('sha256').update(sign_check).digest('hex');

    var sentResponse = false; // Biến để kiểm tra đã gửi response chưa
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
                    res_message = "Không có phản hồi từ thiết bị trong 3s";
                    faile_5(res_message, sentResponse);
                    sentResponse = true;
                }, 3000); // 3s
                client.on('message', (topic, message) => {
                    clearTimeout(timerId);
                    console.log(`Nhận được tin nhắn từ topic ${topic}: ${message.toString()}`);
                    const strmess = message.toString();
                    if (strmess.substring(0, 4) === "PING") {
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

server.post('/api/active', (req, res) => {
    res.json(
        {
            "result": 1,
            "message": "Thành công",
        }
    )
});

server.get('/api/deviceinfo', (req, res) => {
    const deviceId = req.query.deviceId
    var sentResponse = false; // Biến để kiểm tra đã gửi response chưa
    var res_message, convertState, status;
    var data = [];

    function faile_3(message, sentResponse, data) {
        var resdev = [
            {
                "result": -1,
                "message": message,
                "data": data,
            }
        ];
        if (!sentResponse) { // Kiểm tra đã gửi response chưa
            res.json(resdev); // Sử dụng return để đảm bảo chỉ gửi headers một lần
        }
    }

    function success_3(message, sentResponse, data) {
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

    timerId = setTimeout(() => {
        res_message = "Không có phản hồi từ thiết bị trong 15s";
        faile_3(res_message, sentResponse, data);
        sentResponse = true;
    }, 15000); // 3s
    client.on('message', (topic, message) => {
        clearTimeout(timerId);
        console.log(`Nhận được tin nhắn từ topic ${topic}: ${message.toString()}`);
        const strmess = message.toString();
        var kind = parseInt(strmess.substring(16, 18));
        var state = parseInt(strmess.substring(18, 20));

        status = 1;

        if (kind === 2 && state === 1 || kind === 1 && state === 3) convertState = 1;
        else if (kind === 1 && state === 1) convertState = 2;
        else convertState = 3;

        var newData = {
            "deviceId": deviceId,
            "serial": "A12345",
            "IMEI": "I12345",
            "status": status,
            "state": convertState,
            "fee_status": 1,
            "ngaysanxuat": "22/02/2022",
            "LastUpdated": "22/02/2022 22:22:22"
        }
        data.push(newData);

        res_message = "thành công";
        success_3(res_message, sentResponse, data);
        sentResponse = true;
    });


});

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
        mongoose.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true });
        const DeviceInfo = mongoose.model('deviceInfo', deviceInfoSchema);

        DeviceInfo.findOneAndUpdate(
            { deviceID: `P${deviceId.substring(2, 7)}` },
            { $set: { wifiSSID: data.ssid, wifiPASS: data.pwd } },
            { new: true }
        )
            .then(updatedUser => {
                if (updatedUser){
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
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`JSON Server is running on port ${PORT}`);
});