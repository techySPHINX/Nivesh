import { registerAs } from '@nestjs/config';

/** Known insecure default values that must never be used in production */
const INSECURE_DEFAULTS = [
  'change-this-secret-key',
  'change-this-secret-key-to-something-secure',
  'change-this-32-char-key-now!!!!',
  'change-this-32-char-key-now!!!!!',
  'secret',
  'password',
];

function assertNotInsecureDefault(value: string | undefined, name: string): void {
  if (value && INSECURE_DEFAULTS.includes(value)) {
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      const generationHint =
        name === 'ENCRYPTION_KEY' ? 'openssl rand -hex 16' : 'openssl rand -hex 32';
      throw new Error(
        `FATAL: ${name} is using an insecure default value. ` +
        `Generate a secure value with: ${generationHint}`,
      );
    }
  }
}

export default registerAs('security', () => {
  const jwtSecret = process.env.JWT_SECRET;
  const encryptionKey = process.env.ENCRYPTION_KEY;

  // Fail-fast in production if secrets are missing or insecure
  assertNotInsecureDefault(jwtSecret, 'JWT_SECRET');
  assertNotInsecureDefault(encryptionKey, 'ENCRYPTION_KEY');

  return {
    jwt: {
      secret: jwtSecret, // No fallback — must be set via env
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      databaseURL: process.env.FIREBASE_DATABASE_URL || '',
    },
    encryption: {
      key: encryptionKey, // No fallback — must be set via env
      algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    },
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
    },
    rateLimit: {
      ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
      limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    },
  };
});
