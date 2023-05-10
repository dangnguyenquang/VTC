import time
import datetime
import paho.mqtt.client as mqtt
from pymongo import MongoClient
from mongostream import MongoStream

# Cài đặt thông tin kết nối MQTT
mqtt_host = "iot-solar.nichietsuvn.com"
mqtt_port = 1884
mqtt_username = "guest"
mqtt_password = "123456a@"

# Cài đặt thông tin kết nối MongoDB
mongo_host = "localhost"
mongo_port = 27017
mongo_database = "VTC"
mongo_collection = "deviceData"
device_info_collection = "deviceInfo"

# MQTT topics
mqtt_topics = []

# Callback khi MQTT client kết nối thành công
def on_connect(client, userdata, flags, rc):
    print("Connected to MQTT broker")
    subscribe_to_topics(client)

# Callback khi nhận được message từ MQTT broker
def on_message(client, userdata, msg):
    try:
        # Kết nối tới cơ sở dữ liệu MongoDB
        mongo_client = MongoClient(mongo_host, mongo_port)
        db = mongo_client[mongo_database]
        collection = db[mongo_collection]
        
        # Lưu dữ liệu vào MongoDB cùng với thông tin thời gian nhận
        data = {
            "payload": msg.payload.decode(),
            "timestamp": datetime.datetime.now()
        }
        collection.insert_one(data)
        
        # Đóng kết nối tới cơ sở dữ liệu MongoDB
        mongo_client.close()
        
        print("Data saved to MongoDB")
    except Exception as e:
        print("Error saving data to MongoDB:", str(e))

# Callback khi có thay đổi trong collection deviceInfo
def on_change(change):
    print("Change detected in deviceInfo collection:", change)
    
    # Unsubscribe các topic cũ
    mqtt_client.unsubscribe(mqtt_topics)
    
    # Lấy danh sách các topic mới từ collection deviceInfo
    new_topics = change["fullDocument"]["topics"]
    
    # Subscribe lại các topic mới
    subscribe_to_topics(mqtt_client, new_topics)
    
    # Cập nhật danh sách các topic
    mqtt_topics.clear()
    mqtt_topics.extend(new_topics)

# Hàm để subscribe vào các topic
def subscribe_to_topics(client, topics):
    client.subscribe([(topic, 0) for topic in topics])
    print("Subscribed to topics:", topics)

# Tạo MQTT client và thiết lập callback functions
mqtt_client = mqtt.Client()
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

# Thiết lập thông tin đăng nhập MQTT
mqtt_client.username_pw_set(mqtt_username, mqtt_password)

