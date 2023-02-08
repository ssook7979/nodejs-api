export default {
  database: {
    database: 'hoaxify',
    username: 'my-db-user',
    password: 'db-pass',
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  },
  mail: {
    host: '127.0.0.1',
    port: Math.floor(Math.random() * 2000) + 10000,
    tls: {
      rejectUnauthorized: false,
    },
  },
  uploadDir: 'uploads-test',
  profileDir: 'profile',
};
