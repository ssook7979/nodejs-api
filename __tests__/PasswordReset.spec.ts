import { describe, expect, test, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import en from '../locales/en/translation.json';
import ko from '../locales/ko/translation.json';

const postPasswordReset = async (
  email = 'user1@mail.com',
  options: any = {}
) => {
  const agent = request(app).post('/api/1.0/password-reset');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return await agent.send({ email });
};

describe('Password Reset Request', () => {
  test('returns 404 when a password reset request is sent for unknown e-mail', async () => {
    const response = await postPasswordReset();
    expect(response.status).toBe(404);
  });
  test.each`
    language | message
    ${'ko'}  | ${ko.email_not_inuse}
    ${'en'}  | ${en.email_not_inuse}
  `(
    'returns $message for unknown email for password reset request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await postPasswordReset('user1@mail.com', { language });
      expect(response.body.path).toBe('/api/1.0/password-reset');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );
  test.each`
    language | message
    ${'ko'}  | ${ko.email_invalid}
    ${'en'}  | ${en.email_invalid}
  `(
    'returns 400 with validation error response having $message when request has invalid email and language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await postPasswordReset('user1@mail', { language });
      expect(response.body.validationErrors.email).toBe(message);
      expect(response.status).toBe(400);
    }
  );
});
