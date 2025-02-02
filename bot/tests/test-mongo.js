const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
console.log('Testing MongoDB connection...');

mongoose.connect(uri)
  .then(() => {
    console.log('Successfully connected to MongoDB!');
    console.log('Database:', process.env.MONGODB_DB);
    // List collections to verify access
    return mongoose.connection.db.listCollections().toArray();
  })
  .then(collections => {
    console.log('\nAvailable collections:');
    collections.forEach(collection => console.log(`- ${collection.name}`));
  })
  .catch(err => {
    console.error('Connection error:', err);
  })
  .finally(() => {
    mongoose.disconnect();
  });
