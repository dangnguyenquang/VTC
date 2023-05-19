from pymongo import MongoClient
from datetime import datetime
# 
client = MongoClient('localhost', 27017)
db = client['VTC']
collection = db['deviceInfo']

now = datetime.utcnow()

# 
new_document = {
  'deviceID': '00027',
  'serialNumber': '00000',
  'IMEI': '000001',
  'ngaySanXuat': '2022-12-25',
  'feeStatus': 'Dang ki',
  'wifiSSID': 'ngocbich',
  'wifiPASS': '21240516',
  'connectStatus': '4G',
  'interval': 10,
  'lastUpdate': now
}

# Add 
result = collection.insert_one(new_document)
print(result.inserted_id)