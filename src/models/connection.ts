import * as mongoose from 'mongoose';
import { Mongoose } from 'mongoose';

export default (db: string): void => {
  if (!db) {
    throw new Error('MONGO_URL required');
  }

  const connect = async(): Promise<Mongoose> => {
    return await mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true });
  };
  connect().catch(error => console.error(error));

  mongoose.connection.on('connected', () => {
    console.log(`Successfully connected to ${new URL(db).hostname}`);
  });
  mongoose.connection.on('disconnected', () => {
    console.log(`Disconnected from ${new URL(db).hostname}, reconnecting`);
    connect().catch(error => console.error(error));
  });
};
