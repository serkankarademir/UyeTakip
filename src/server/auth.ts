import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.ts';
import * as schema from '../db/schema.ts';
import { eq, and, desc, sql } from 'drizzle-orm';

const BCRYPT_ROUNDS = 10;

/**
 * Normalizes email address
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Validates password strength (min 8 chars, at least 1 letter, at least 1 number)
 */
export function validatePasswordStrength(password: string): { isValid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, message: 'Şifre en az 8 karakter uzunluğunda olmalıdır.' };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { isValid: false, message: 'Şifre en az bir harf içermelidir.' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Şifre en az bir rakam içermelidir.' };
  }
  return { isValid: true };
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password with bcrypt
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate cryptographically secure token
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Rate Limiter (in-memory with IP/email tracking)
 */
interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();
const resendEmailCooldown = new Map<string, number>();
const resetPasswordCooldown = new Map<string, number>();

export const rateLimiter = {
  checkLoginAttempt(key: string): { allowed: boolean; waitSeconds?: number } {
    const now = Date.now();
    const entry = loginAttempts.get(key);
    if (!entry) return { allowed: true };

    if (entry.blockedUntil && now < entry.blockedUntil) {
      const waitSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
      return { allowed: false, waitSeconds };
    }

    // Reset after 15 minutes window
    if (now - entry.firstAttempt > 15 * 60 * 1000) {
      loginAttempts.delete(key);
      return { allowed: true };
    }

    if (entry.attempts >= 5) {
      entry.blockedUntil = now + 15 * 60 * 1000; // 15 min lock
      const waitSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
      return { allowed: false, waitSeconds };
    }

    return { allowed: true };
  },

  recordFailedLogin(key: string): void {
    const now = Date.now();
    const entry = loginAttempts.get(key) || { attempts: 0, firstAttempt: now };
    entry.attempts += 1;
    loginAttempts.set(key, entry);
  },

  resetLogin(key: string): void {
    loginAttempts.delete(key);
  },

  checkResendCooldown(email: string): { allowed: boolean; waitSeconds?: number } {
    const now = Date.now();
    const lastSent = resendEmailCooldown.get(email);
    if (lastSent && now - lastSent < 60 * 1000) {
      return { allowed: false, waitSeconds: Math.ceil((60 * 1000 - (now - lastSent)) / 1000) };
    }
    resendEmailCooldown.set(email, now);
    return { allowed: true };
  },

  checkResetCooldown(email: string): { allowed: boolean; waitSeconds?: number } {
    const now = Date.now();
    const lastSent = resetPasswordCooldown.get(email);
    if (lastSent && now - lastSent < 60 * 1000) {
      return { allowed: false, waitSeconds: Math.ceil((60 * 1000 - (now - lastSent)) / 1000) };
    }
    resetPasswordCooldown.set(email, now);
    return { allowed: true };
  },
};

/**
 * Email Dispatcher and Logger
 * Formats Turkish emails on behalf of "Bursa MEB AKUB"
 * Records to database so links can be tracked and used
 */
export async function sendEmailNotification(options: {
  to: string;
  type: 'VERIFICATION' | 'PASSWORD_RESET';
  token: string;
  appUrl: string;
}): Promise<{ id: number; actionUrl: string }> {
  const { to, type, token, appUrl } = options;
  const baseUrl = appUrl || process.env.APP_URL || 'http://localhost:3000';

  let subject = '';
  let content = '';
  let actionUrl = '';

  if (type === 'VERIFICATION') {
    subject = 'Bursa MEB AKUB – E-posta Adresi Doğrulama';
    actionUrl = `${baseUrl.replace(/\/$/, '')}/?verifyToken=${token}&email=${encodeURIComponent(to)}`;
    content = `Sayın Kullanıcı,

Bursa MEB AKUB – Üye ve Etkinlik Takip Sistemi'ne yaptığınız kayıt başvurusu için e-posta adresinizi doğrulamanız gerekmektedir.

Lütfen aşağıdaki bağlantıya tıklayarak hesabınızı doğrulayınız:
${actionUrl}

Bu bağlantı 24 saat boyunca geçerlidir. Başvuruyu siz yapmadıysanız bu e-postayı dikkate almayınız.

Saygılarımızla,
Bursa MEB AKUB Arama Kurtarma Birliği`;
  } else {
    subject = 'Bursa MEB AKUB – Şifre Sıfırlama Talebi';
    actionUrl = `${baseUrl.replace(/\/$/, '')}/?resetToken=${token}&email=${encodeURIComponent(to)}`;
    content = `Sayın Kullanıcı,

Bursa MEB AKUB – Üye ve Etkinlik Takip Sistemi hesabınız için şifre sıfırlama talebinde bulunuldu.

Şifrenizi yenilemek için aşağıdaki bağlantıyı kullanabilirsiniz:
${actionUrl}

Bu bağlantı 1 saat boyunca geçerlidir ve tek kullanımlıktır. Bu talebi siz gerçekleştirmediyseniz şifreniz değişmeyecektir.

Saygılarımızla,
Bursa MEB AKUB Arama Kurtarma Birliği`;
  }

  // Record in PostgreSQL email_notifications table
  const [record] = await db
    .insert(schema.emailNotifications)
    .values({
      email: to,
      type,
      token,
      subject,
      content,
      actionUrl,
      isUsed: false,
    })
    .returning();

  console.log(`[BURSA MEB AKUB E-POSTA] ${type} sent to ${to}:`);
  console.log(`-> Doğrulama/Sıfırlama Linki: ${actionUrl}`);

  return { id: record.id, actionUrl };
}
