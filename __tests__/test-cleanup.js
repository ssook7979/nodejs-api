const fs = require('fs');
const path = require('path');
const config = require('config');

const uploadDir = config.get('uploadDir');
const profileDir = config.get('profileDir');
const profileFolder = path.join('.', uploadDir, profileDir);

afterAll(() => {
  const files = fs.readdirSync(profileFolder);
  for (const file of files) {
    fs.unlinkSync(path.join(profileFolder, file));
  }
});
