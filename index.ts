import { app } from './src/app';
import { sync } from './src/config/database';
import { create } from './src/user/User';
import { hash as _hash } from 'bcrypt';

const addUsers = async (activeUserCount: number, inactiveUserCount = 0) => {
  const hash = await _hash('P4ssword', 10);
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    await create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      inactive: i >= activeUserCount,
      password: hash,
    });
  }
};
sync({ force: true }).then(async () => {
  await addUsers(25);
});

app.listen(3000, () => console.log('app is running.'));
