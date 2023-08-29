const mongoose = require('mongoose');
const db_url = 'mongodb://localhost:27017/VTC'; // nodeJS mới thì thay localhost = 127.0.0.1

async function connect(){
    try {
        await mongoose.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connect to database successfully ...');
    } catch (err){
        console.log('Connect to database false: ', err);
    }
}

module.exports = { connect };