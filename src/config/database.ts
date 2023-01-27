import { Sequelize } from 'sequelize';
import config from 'config';

// TODO: type
const dbConfig: any = config.get('database');

export default new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    dialect: dbConfig.dialect,
    storage: dbConfig.storage,
    logging: dbConfig.logging,
  }
);
