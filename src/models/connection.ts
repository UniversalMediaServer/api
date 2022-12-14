import * as mongoose from 'mongoose';
import { Mongoose } from 'mongoose';
mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', false);

export default (db: string): void => {
  if (!db) {
    throw new Error('MONGO_URL required');
  }

  const connect = async(): Promise<Mongoose> => {
    const options = {
      maxPoolSize: 30,
      minPoolSize: 15,
    };
    return await mongoose.connect(db, options);
  };
  connect().catch(error => console.error(error));

  mongoose.connection.on('connected', () => {
    console.log(`Successfully connected to ${new URL(db).hostname}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.log(`Disconnected from ${new URL(db).hostname}, reconnecting`);
    connect().catch(error => console.error(error));
  });

  process.on('SIGINT', function() {   
    mongoose.connection.close(function() { 
      console.log('Mongoose default connection disconnected through app termination'); 
      process.exit(0); 
    }); 
  }); 
};
