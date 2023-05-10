from pymongo import MongoClient
from pymongo.errors import PyMongoError
from threading import Thread
import threading
import time
import paho.mqtt.client as mqtt
import datetime

IOTIDs =[]
#mqtt
mqtt_host = "iot-solar.nichietsuvn.com"
mqtt_port = 1884
mqtt_username = "guest"
mqtt_password = "123456a@"

# Thiết lập kết nối đến MongoDB
mongo_client = MongoClient('mongodb://localhost:27017')
db = mongo_client['VTC']
deviceInfoCol = db['deviceInfo']
deviceDataCol = db['deviceData']

mqtt_client = mqtt.Client()

def on_connect(client, userdata, flags, rc):
    print("Connected to MQTT broker")

def subscribe_to_topics(client):
    #unsub truoc
    for ID in IOTIDs:
        mqtt_client.unsubscribe("server/"+ID+"/data")
    for ID in IOTIDs:
        mqtt_client.subscribe("server/"+ID+"/data")


def on_message(client, userdata, msg):
    try:
        # Lưu dữ liệu vào MongoDB cùng với thông tin thời gian nhận
        data = {
            "id": msg.topic.split("/")[1],
            "payload": msg.payload.decode(),
            "timestamp": datetime.datetime.now()
        }
        deviceDataCol.insert_one(data)
        
        # Đóng kết nối tới cơ sở dữ liệu MongoDB
        mongo_client.close()
        
        print("Data saved to MongoDB")
    except Exception as e:
        print("Error saving data to MongoDB:", str(e))




#vao db lay ID thiet bi
def getIOTIDs():
    IOTIDs = []
    document = deviceInfoCol.find()
    for doc in document:
        IOTIDs.append(doc['deviceID'])
    return IOTIDs

# Tạo một pipeline để xác định các thay đổi muốn theo dõi
def listenDeviceInfoChange():
    global IOTIDs
    try:
        # Bắt đầu stream watch
        with deviceInfoCol.watch() as stream:
            for change in stream:
                IOTIDs = getIOTIDs()
                IOTIDs = list(set(IOTIDs)) # loai bo cac phan tu trung nha
                subscribe_to_topics(mqtt_client)

    except PyMongoError as e:
        print("Lỗi xảy ra khi theo dõi thay đổi:", e)

def saveDataDB():
    global IOTIDs
    # Tạo MQTT client và thiết lập callback functions
    mqtt_client.username_pw_set(mqtt_username, mqtt_password)
    mqtt_client.on_message = on_message

    # Kết nối và lắng nghe dữ liệu từ MQTT broker
    mqtt_client.connect(mqtt_host, mqtt_port)
    IOTIDs = getIOTIDs()
    IOTIDs = list(set(IOTIDs)) # loai bo cac phan tu trung nha
    subscribe_to_topics(mqtt_client)
    mqtt_client.loop_forever()

if __name__ == '__main__':
    t1 = threading.Thread(target=listenDeviceInfoChange)
    t2 = threading.Thread(target=saveDataDB)
    
    t1.start()
    t2.start()
    t1.join()
    t2.join()

