const jsonServer = require('json-server');
const server = jsonServer.create();
const middlewares = jsonServer.defaults();
const crypto = require('crypto');
const mqtt = require('mqtt');
const bodyParser = require('body-parser');
const moment = require('moment');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const DeviceInfo = require('../models/deviceInfo');
const DeviceData = require('../models/deviceData');
const db = require('../config/database');

const ScretKey = "2adac38d834c4807b798bc844503c249"; // VTC cung cấp
const mqtt_broker = "iot-vtc.nichietsuvn.com";
const mqtt_port = 1887;
const mqtt_username = "guest";
const mqtt_password = "123456a@";

// Server VTC
const token = 'dg-fDVjn2UCCp0VlJB9IIj3eeDnTud-crV9DroTKRB4OCkxC9qzqxbfH-0uor604hu6hsStS_hQUmVnmzeMfJuI4QdXbsMF88CU6PzLmt0A=';
const config = {
  headers: { Authorization: `Bearer ${token}` }
};
// const api_url = "http://eoc-api.vtctelecom.com.vn/api/message"; url cũ 
const api_url = "https://ialert.vnpt.vn/apivtc/conn/v1";

// Database

let timerId = null;
db.connect(); // Kết nối với db

server.use(middlewares);
server.use(bodyParser.json()); // Sử dụng để giải quyết yêu cầu post, put, ... biến JSON thành dữ liệu có thể xử lý được trong js

// Hàm gửi API
function sendMessageToAPI(data, api_url) {
    axios.post(api_url, data, config)
      .then((response) => {
        // console.log(`${JSON.stringify(data)}`)
        console.log(data.deviceId, `- Đã gửi tin nhắn tới API thành công (message: ${JSON.stringify(response.data.message)}, kind: ${data.kind}, state: ${data.state})`);
      })
      .catch((error) => {
        console.error("Lỗi khi gửi tin nhắn tới API", error);
      });
}

// Hàm lấy interval của thiết bị
function getIntervalWithDeviceId(deviceId) {
    return DeviceInfo.findOne({ deviceID: deviceId }) // Truy vấn dựa vào deviceId
        .then((device) => {
            if (device) {
                return device.interval; // Trả về giá trị trường interval của device
            } else {
                throw new Error('Device not found'); // Ném lỗi nếu không tìm thấy device
            }
        })
        .catch((err) => {
            console.log(err);
            throw err; // Ném lỗi để xử lý ở phần gọi hàm getIntervalWithDeviceId
        });
}

function fetchDataAndSendAPI(deviceId) {
    var state, kind;
    getIntervalWithDeviceId(deviceId)
        .then((interval) => {
            const adjustedInterval = interval * 1000 * 3;

            const now = new Date();
            const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            const requestId = uuidv4().toUpperCase().replace(/-/g, '');  // uniqueidentifier

            DeviceData.aggregate([
                { $match: { id: deviceId } },
                { $sort: { timestamp: -1 } }, // Sắp xếp theo thời gian giảm dần
                { $limit: 1 } // Giới hạn kết quả chỉ lấy 1 tài liệu
            ])
                .then(result => {
                    if (result.length > 0) {
                        const latestData = result[0];
                        if (now.getTime() - latestData.timestamp.getTime() <= adjustedInterval) {
                            state = 1;
                            kind = 3;
                        } else {
                            console.log(deviceId, " không phản hồi");
                            state = 2;
                            kind = 3;
                        }
                        const data = {
                            "requestId": requestId,
                            "deviceId": `n_${deviceId}`,
                            "kind": kind,
                            "state": state,
                            "time": formattedDate,
                        }
                        sendMessageToAPI(data, api_url + '/message');
                    }
                })
                .catch(err => {
                    console.error(err);
                });
        })
        .catch((err) => {
            console.log(err);
        });
}

async function getWifiInfoById(deviceId) {
    try {
      // Sử dụng Mongoose để truy vấn cơ sở dữ liệu
      const result = await DeviceInfo.findOne({ deviceID: deviceId });
  
      if (result) {
        // Nếu tìm thấy bản ghi với id tương ứng
        const wifiSSID = result.wifiSSID;
        const wifiPASS = result.wifiPASS;
        return { wifiSSID, wifiPASS };
      } else {
        // Nếu không tìm thấy bản ghi với id tương ứng
        throw new Error("Không tìm thấy thiết bị với ID này.");
      }
    } catch (error) {
      console.error("Lỗi khi truy vấn dữ liệu:", error);
      throw error;
    }
  }

function informationAPI(deviceId) {
    var conn_type;
    const requestId = uuidv4().toUpperCase().replace(/-/g, '');  // uniqueidentifier
    var LAN_state = 0;

    getWifiInfoById(deviceId)
    .then((wifiInfo) => {
        console.log(wifiInfo.wifiSSID);
        DeviceData.aggregate([
            { $match: { id: deviceId } },
            { $sort: { timestamp: -1 } }, // Sắp xếp theo thời gian giảm dần
            { $limit: 1 } // Giới hạn kết quả chỉ lấy 1 tài liệu
        ])
            .then(result => {
                if (result.length > 0) {
                    const latestData = result[0];
                    if (latestData.payload.split(' ')[1] == 'SIM') conn_type = 1;
                    else if (latestData.payload.split(' ')[1] == 'LAN') { 
                        conn_type = 2; 
                        LAN_state = 1; 
                    }
                    else if (latestData.payload.split(' ')[1] == 'WIFI') conn_type = 3;
                    const data = {
                        "requestId": requestId,
                        "deviceId": `n_${deviceId}`,
                        "data":
                        {
                            "FW_version": "Eoc_FW_V.01",
                            "conn_type": conn_type,
                            "conn_priority": [1,2,3],
                            "conn_speed": Math.floor(Math.random() * 26) + 70,
                            "cycle": 10,
                            "temperature": Math.floor(Math.random() * 6) + 27,
                            "state": 1,
                            "wifi": 
                            {
                                "ssid_name": wifiInfo.wifiSSID,
                                "password": wifiInfo.wifiPASS,
                                "status": 1
                            },
                            "sim": [
                                {
                                    "number": "0123556789",
                                    "status": 1
                                },
                                {
                                    "number": "0123556789",
                                    "status": 0
                                }],
                            "LAN_state": 0,
                            "charge_type": 1,
                            "battery": 
                            {
                                "percentage": 90,
                                "status": 1
                            }
                          }
                    }
                    console.log(data);
                    sendMessageToAPI(data, api_url + '/device/info');
                }
            })
            .catch(err => {
                console.error(err);
            });
    })
    .catch((err) => {
      console.error("Lỗi:", err.message);
    });
}
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
    else {
        res_message = "Sai status";
        faile_2(res_message, sentResponse);
        sentResponse = true;
    }

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
            res_message = "Không tìm thấy deviceID"
            response(res_message, sentResponse, isSucces);
            sentResponse = true;
        });
});

// 5. Gửi yêu cầu xuống thiết bị
server.get('/api/requestdevice', (req, res) => {

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

    var res_message;

    const requestId = req.query.requestId;
    const deviceId = req.query.deviceId;
    const action = req.query.action;
    // const sign = req.query.sign;
    var sentResponse = false; 

    if (action === 'tindinhky') {
        DeviceInfo.findOne({ deviceID: deviceId.substring(2, 7) }) // Truy vấn dựa vào deviceId
            .then((device) => {
                if (device) {
                    fetchDataAndSendAPI(deviceId.substring(2, 7));
                    res_message = 'Tiếp nhận thành công';
                    success_5(res_message, sentResponse);
                    sentResponse = true;
                } else {
                    res_message = 'deviceId không tồn tại';
                    faile_5(res_message, sentResponse);
                    sentResponse = true;
                    console.log('deviceId không tồn tại');
                }
            })
            .catch((err) => {
                console.log(err);
            });
    } else if (action == 'thongtin') {
        DeviceInfo.findOne({ deviceID: deviceId.substring(2, 7) }) // Truy vấn dựa vào deviceId
        .then((device) => {
            if (device) {
                informationAPI(deviceId.substring(2, 7));
                res_message = 'Tiếp nhận thành công';
                success_5(res_message, sentResponse);
                sentResponse = true;
            } else {
                res_message = 'deviceId không tồn tại';
                faile_5(res_message, sentResponse);
                sentResponse = true;
                console.log('deviceId không tồn tại');
            }
        })
        .catch((err) => {
            console.log(err);
        });
    } else {
        res_message = `Không tồn tại action: ${action}`;
        faile_5(res_message, sentResponse);
        sentResponse = true;
        console.log(`Không tồn tại action: ${action}`);
    }

    // const sign_check = `${deviceId}${requestId}${ScretKey}`;
    // const check = crypto.createHash('sha256').update(sign_check).digest('hex');

    // } 
    // else {
    //     res_message = "sign không hợp lệ";
    //     faile_5(res_message, sentResponse);
    //     sentResponse = true;
    // }
});

// 6. Cấu hình
server.post('/api/config', (req, res) => {
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
    const { requestId, deviceId, action, data } = req.body;
    // const { requestId, deviceId, action, data, sign } = req.body;
    // const sign_check = `${requestId}${action}${deviceId}${ScretKey}`;
    // const check = crypto.createHash('sha256').update(sign_check).digest('hex');
    // if (sign === check) {
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
    // } 
    // else {
    //     res_message = "sign không hợp lệ";
    //     faile_6(res_message, sentResponse);
    //     sentResponse = true;
    // }
});

// ************************************************* //

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`JSON Server is running on port ${PORT}`);
});