from pymongo import MongoClient
from datetime import datetime

client = MongoClient('localhost', 27017)
db = client['VTC']
collection = db['deviceInfo']

now = datetime.utcnow()

# Tạo các tài liệu từ A0001 đến A0120
for i in range(1, 121):
    device_id = f'A{str(i).zfill(4)}'

    new_document = {
        'deviceID': device_id,
        'serialNumber': '00000',
        'IMEI': '000001',
        'ngaySanXuat': '2022-12-25',
        'feeStatus': 'Dang ki',
        'wifiSSID': 'ngch',
        'wifiPASS': '2516',
        'connectStatus': '4G',
        'interval': 60,
        'lastUpdate': now
    }

    collection.insert_one(new_document)

print("Insertion completed.")
