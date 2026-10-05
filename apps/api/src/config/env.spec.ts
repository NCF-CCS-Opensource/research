import { validateEnv } from './env.js';

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/research';

describe('validateEnv', () => {
  it('parses valid configuration and applies defaults', () => {
    const env = validateEnv({ DATABASE_URL });
    expect(env.DATABASE_URL).toBe(DATABASE_URL);
    expect(env.PORT).toBe(3001);
    expect(env.WEB_ORIGIN).toBe('http://localhost:3000');
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('throws when PORT is not a number', () => {
    expect(() => validateEnv({ DATABASE_URL, PORT: 'abc' })).toThrow(/PORT/);
  });
});
