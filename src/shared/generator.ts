import { randomBytes } from 'crypto';

const randomString = (length: number) => {
  return randomBytes(length).toString('hex').substring(0, length);
};

export { randomString };
