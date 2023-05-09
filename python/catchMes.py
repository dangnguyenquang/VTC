import time
import datetime
import paho.mqtt.client as mqtt
from pymongo import MongoClient

# Cài đặt thông tin kết nối MQTT
mqtt_host = "iot-solar.nichietsuvn.com"
mqtt_port = 1884
mqtt_username = "guest"
mqtt_password = "123456a@"
mqtt_topic = "server/P00027/data"

# Cài đặt thông tin kết nối MongoDB
mongo_host = "localhost"
mongo_port = 27017
mongo_database = "VTC"
mongo_collection = "deviceData"

# Callback khi MQTT client kết nối thành công
def on_connect(client, userdata, flags, rc):
	print("Connected to MQTT broker")
	client.subscribe(mqtt_topic)

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

# Tạo MQTT client và thiết lập callback functions
mqtt_client = mqtt.Client()
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

# Thiết lập thông tin đăng nhập MQTT
mqtt_client.username_pw_set(mqtt_username, mqtt_password)

# Kết nối và lắng nghe dữ liệu từ MQTT broker
mqtt_client.connect(mqtt_host, mqtt_port, 60)
mqtt_client.loop_start()

# Giữ chương trình chạy để lắng nghe dữ liệu từ MQTT
while True:
	time.sleep(1)
