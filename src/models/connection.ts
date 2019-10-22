import * as mongoose from 'mongoose';

export default (db: string) => {
  if (!db) throw new Error('MONGO_URL required');
  const connect = async() => {
    await mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true });
  };
  connect().catch(error => console.error(error))

  mongoose.connection.on('connected', () => {
    console.log(`Successfully connected to ${new URL(db).hostname}`);
  });
  mongoose.connection.on('disconnected', connect);
};
