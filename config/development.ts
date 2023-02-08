export default {
  database: {
    database: 'hoaxify',
    username: 'my-db-user',
    password: 'db-pass',
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false,
  },
  mail: {
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'nedra.johnston5@ethereal.email',
      pass: 'f5hqVfYYtfN5a9M3zU',
    },
  },
  uploadDir: 'uploads',
  profileDir: 'profile',
};
