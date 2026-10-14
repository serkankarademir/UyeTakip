import express, { Request, Response, Router } from 'express';
import { eq, desc, asc, ilike, or, and, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import * as schema from '../db/schema.ts';
import { validateTCKimlik } from '../lib/formatters.ts';
import {
  normalizeEmail,
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  rateLimiter,
  sendEmailNotification,
} from './auth.ts';
import { executeReportQuery } from './reportEngine.ts';

export const apiRouter: Router = express.Router();

export const apiApp = express();
apiApp.use(express.json({ limit: '10mb' }));
apiApp.use(apiRouter);

// Ensure default admin user for Bursa MEB AKUB
async function ensureDefaultAdmin() {
  try {
    const [adminUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'admin@bursamebakub.gov.tr'));
    if (!adminUser) {
      const passwordHash = await hashPassword('Akub2026!');
      await db.insert(schema.users).values({
        uid: 'bursa_akub_admin_01',
        email: 'admin@bursamebakub.gov.tr',
        displayName: 'Bursa MEB AKUB Yöneticisi',
        passwordHash,
        role: 'ADMIN',
        isEmailVerified: true,
        isApproved: true,
        isActive: true,
      });
      console.log('Varsayılan Bursa MEB AKUB yöneticisi oluşturuldu: admin@bursamebakub.gov.tr / Akub2026!');
    }
  } catch (err) {
    console.error('Admin kontrol hatası:', err);
  }
}
ensureDefaultAdmin();

// Helper to log audit events
async function logAudit(
  userId: string | null,
  userEmail: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details: string | null,
  req?: Request
) {
  try {
    const ip = req?.ip || req?.socket.remoteAddress || null;
    await db.insert(schema.auditLogs).values({
      userId: userId || 'system',
      userEmail: userEmail || 'admin@bursamebakub.gov.tr',
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      details,
      ipAddress: ip,
    });
}

// Helper to validate and normalize SRC Certificate & Type
export function validateAndNormalizeSrc(
  srcCertificate?: string | null,
  srcCertificateType?: string | null
): { isValid: boolean; normalizedType: string | null; error?: string } {
  const isVar =
    srcCertificate === 'Var' ||
    (typeof srcCertificate === 'string' && srcCertificate.toLowerCase() === 'var');
  if (isVar) {
    const rawType = (srcCertificateType || '').trim().toUpperCase();
    if (!rawType) {
      return {
        isValid: false,
        normalizedType: null,
        error: 'SRC Belgesi "Var" olan üyeler için SRC Belge Türü (SRC1, SRC2, SRC3 veya SRC4) zorunludur.',
      };
    }
    const validTypes = ['SRC1', 'SRC2', 'SRC3', 'SRC4'];
    if (!validTypes.includes(rawType)) {
      return {
        isValid: false,
        normalizedType: null,
        error: `Geçersiz SRC Belge Türü: "${rawType}". Yalnızca SRC1, SRC2, SRC3 veya SRC4 kabul edilir.`,
      };
    }
    return { isValid: true, normalizedType: rawType };
  } else {
    // If not Var (Yok or empty), SRC certificate type is cleared to null
    return { isValid: true, normalizedType: null };
  }
}

// -------------------------------------------------------------
// BURSA MEB AKUB AUTHENTICATION API
// -------------------------------------------------------------

// 1. REGISTER (Kayıt Ol)
apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({ error: 'Ad ve Soyad alanları zorunludur.' });
    }
    if (!email?.trim()) {
      return res.status(400).json({ error: 'E-posta adresi zorunludur.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Geçersiz e-posta adresi biçimi.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Şifreler eşleşmiyor. Lütfen kontrol ediniz.' });
    }

    const passCheck = validatePasswordStrength(password);
    if (!passCheck.isValid) {
      return res.status(400).json({ error: passCheck.message });
    }

    // Check if email already registered
    const [existing] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, normalizedEmail));
    if (existing) {
      return res.status(400).json({ error: 'Bu e-posta adresiyle kayıtlı bir hesap zaten bulunmaktadır.' });
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = generateSecureToken();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const uid = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const [newUser] = await db
      .insert(schema.users)
      .values({
        uid,
        email: normalizedEmail,
        displayName: `${firstName.trim()} ${lastName.trim()}`,
        passwordHash,
        role: 'PENDING', // Default: not admin, pending approval
        isEmailVerified: false,
        isApproved: false,
        isActive: true,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: tokenExpires,
      })
      .returning();

    // Send verification email
    const appUrl = (req.protocol + '://' + req.get('host')) || process.env.APP_URL || '';
    const emailResult = await sendEmailNotification({
      to: normalizedEmail,
      type: 'VERIFICATION',
      token: verificationToken,
      appUrl,
    });

    await logAudit(
      newUser.uid,
      normalizedEmail,
      'REGISTER',
      'USER',
      String(newUser.id),
      `Yeni üye kaydı oluşturuldu (Doğrulama bekleniyor): ${newUser.displayName}`,
      req
    );

    res.status(201).json({
      success: true,
      message: 'Kayıt başvurunuz alındı. Lütfen e-posta adresinize gönderilen doğrulama bağlantısına tıklayarak hesabınızı onaylayınız.',
      email: normalizedEmail,
      actionUrl: emailResult.actionUrl,
    });
  } catch (err: any) {
    console.error('Kayıt hatası:', err);
    res.status(500).json({ error: 'Kayıt işlemi sırasında bir hata oluştu.' });
  }
});

// 2. VERIFY EMAIL (E-posta Doğrula)
apiRouter.post('/auth/verify-email', async (req: Request, res: Response) => {
  try {
    const { token, email } = req.body;
    if (!token) return res.status(400).json({ error: 'Doğrulama kodu/bağlantısı eksik.' });

    const normalizedEmail = email ? normalizeEmail(email) : undefined;
    const now = new Date();

    const usersQuery = normalizedEmail
      ? and(eq(schema.users.email, normalizedEmail), eq(schema.users.emailVerificationToken, token))
      : eq(schema.users.emailVerificationToken, token);

    const [user] = await db.select().from(schema.users).where(usersQuery);

    if (!user) {
      return res.status(400).json({
        error: 'Doğrulama bağlantısı geçersiz veya daha önce kullanılmış. Lütfen hesabınıza giriş yapmayı deneyiniz veya yeni doğrulama e-postası isteyiniz.',
      });
    }

    if (user.emailVerificationExpires && user.emailVerificationExpires < now) {
      return res.status(400).json({
        error: 'Doğrulama bağlantısının süresi dolmuş (24 saat). Lütfen yeni bir doğrulama bağlantısı talep ediniz.',
      });
    }

    // Update user as verified
    await db
      .update(schema.users)
      .set({
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    // Mark notification as used
    await db
      .update(schema.emailNotifications)
      .set({ isUsed: true })
      .where(eq(schema.emailNotifications.token, token));

    await logAudit(
      user.uid,
      user.email,
      'EMAIL_VERIFIED',
      'USER',
      String(user.id),
      'E-posta adresi başarıyla doğrulandı.',
      req
    );

    res.json({
      success: true,
      message: 'E-posta adresiniz başarıyla doğrulandı! Bursa MEB AKUB yöneticisi hesabınızı onayladığında tam yetkiyle sisteme erişebileceksiniz.',
      isApproved: user.isApproved,
      role: user.role,
    });
  } catch (err: any) {
    console.error('Doğrulama hatası:', err);
    res.status(500).json({ error: 'E-posta doğrulanırken hata oluştu.' });
  }
});

// 3. RESEND VERIFICATION (Doğrulama E-postasını Yeniden Gönder)
apiRouter.post('/auth/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'E-posta adresi zorunludur.' });

    const normalizedEmail = normalizeEmail(email);

    // Rate limiting cooldown
    const cooldown = rateLimiter.checkResendCooldown(normalizedEmail);
    if (!cooldown.allowed) {
      return res.status(429).json({
        error: `Lütfen tekrar denemeden önce ${cooldown.waitSeconds} saniye bekleyiniz.`,
      });
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, normalizedEmail));

    if (!user) {
      // Do not disclose user presence
      return res.json({
        success: true,
        message: 'Eğer bu e-posta adresi sistemde kayıtlı ise doğrulama bağlantısı tekrar gönderilmiştir.',
      });
    }

    if (user.isEmailVerified) {
      return res.json({
        success: true,
        message: 'Bu e-posta adresi zaten doğrulanmıştır. Giriş yapabilirsiniz.',
        alreadyVerified: true,
      });
    }

    const newToken = generateSecureToken();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db
      .update(schema.users)
      .set({
        emailVerificationToken: newToken,
        emailVerificationExpires: tokenExpires,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    const appUrl = (req.protocol + '://' + req.get('host')) || process.env.APP_URL || '';
    const emailResult = await sendEmailNotification({
      to: normalizedEmail,
      type: 'VERIFICATION',
      token: newToken,
      appUrl,
    });

    res.json({
      success: true,
      message: 'Doğrulama bağlantısı e-posta adresinize tekrar gönderildi.',
      actionUrl: emailResult.actionUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Doğrulama e-postası gönderilemedi.' });
  }
});

// 4. LOGIN (Giriş Yap)
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'E-posta adresi ve şifre zorunludur.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const rateLimitKey = `${clientIp}_${normalizedEmail}`;

    // Rate Limiting check
    const rateCheck = rateLimiter.checkLoginAttempt(rateLimitKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Çok fazla hatalı giriş denemesi yapıldı. Güvenliğiniz için lütfen ${rateCheck.waitSeconds} saniye bekleyiniz.`,
      });
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, normalizedEmail));

    if (!user || !user.passwordHash) {
      rateLimiter.recordFailedLogin(rateLimitKey);
      return res.status(401).json({ error: 'E-posta adresi veya şifre hatalı.' });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      rateLimiter.recordFailedLogin(rateLimitKey);
      await logAudit(user.uid, normalizedEmail, 'FAILED_LOGIN', 'USER', String(user.id), 'Hatalı şifre denemesi', req);
      return res.status(401).json({ error: 'E-posta adresi veya şifre hatalı.' });
    }

    // Check email verification status
    if (!user.isEmailVerified) {
      return res.status(403).json({
        error: 'E-posta adresiniz henüz doğrulanmamıştır. Lütfen e-postanıza gönderilen bağlantıyı onaylayınız.',
        unverified: true,
        email: user.email,
      });
    }

    // Check admin approval status
    if (!user.isApproved && user.role === 'PENDING') {
      return res.status(403).json({
        error: 'Hesabınız oluşturulmuş ve e-posta onayınız tamamlanmıştır. Ancak Bursa MEB AKUB yöneticisi tarafından henüz onaylanmamıştır.',
        pendingApproval: true,
      });
    }

    // Check if account active
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Hesabınız askıya alınmıştır. Lütfen Bursa MEB AKUB koordinasyonu ile iletişime geçiniz.',
      });
    }

    // Login successful: reset rate limiter
    rateLimiter.resetLogin(rateLimitKey);

    await db
      .update(schema.users)
      .set({
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
      })
      .where(eq(schema.users.id, user.id));

    await logAudit(user.uid, user.email, 'LOGIN', 'USER', String(user.id), 'Başarılı giriş yapıldı', req);

    res.json({
      success: true,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isApproved: user.isApproved,
        memberId: user.memberId,
      },
    });
  } catch (err: any) {
    console.error('Giriş hatası:', err);
    res.status(500).json({ error: 'Giriş işlemi sırasında sunucu hatası oluştu.' });
  }
});

// 5. FORGOT PASSWORD (Şifremi Unuttum)
apiRouter.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'E-posta adresi zorunludur.' });

    const normalizedEmail = normalizeEmail(email);

    // Rate limit cooldown
    const cooldown = rateLimiter.checkResetCooldown(normalizedEmail);
    if (!cooldown.allowed) {
      return res.status(429).json({
        error: `Lütfen tekrar denemeden önce ${cooldown.waitSeconds} saniye bekleyiniz.`,
      });
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, normalizedEmail));

    if (!user) {
      // Security: do not reveal email existence
      return res.json({
        success: true,
        message: 'Eğer bu e-posta adresi sistemimizde kayıtlı ise şifre sıfırlama bağlantısı gönderilmiştir.',
      });
    }

    const resetToken = generateSecureToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db
      .update(schema.users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpires: expires,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    const appUrl = (req.protocol + '://' + req.get('host')) || process.env.APP_URL || '';
    const emailResult = await sendEmailNotification({
      to: normalizedEmail,
      type: 'PASSWORD_RESET',
      token: resetToken,
      appUrl,
    });

    await logAudit(user.uid, user.email, 'FORGOT_PASSWORD_REQUEST', 'USER', String(user.id), 'Şifre sıfırlama talebi gönderildi', req);

    res.json({
      success: true,
      message: 'Eğer bu e-posta adresi sistemimizde kayıtlı ise şifre sıfırlama bağlantısı gönderilmiştir.',
      actionUrl: emailResult.actionUrl,
    });
  } catch (err: any) {
    console.error('Şifremi unuttum hatası:', err);
    res.status(500).json({ error: 'Şifre sıfırlama talebi işlenemedi.' });
  }
});

// 6. RESET PASSWORD (Yeni Şifre Belirleme)
apiRouter.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword, confirmPassword } = req.body;

    if (!token) return res.status(400).json({ error: 'Sıfırlama bağlantısı/token eksik.' });
    if (!newPassword) return res.status(400).json({ error: 'Yeni şifre zorunludur.' });

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Şifreler birbiriyle eşleşmiyor.' });
    }

    const passCheck = validatePasswordStrength(newPassword);
    if (!passCheck.isValid) {
      return res.status(400).json({ error: passCheck.message });
    }

    const normalizedEmail = email ? normalizeEmail(email) : undefined;
    const now = new Date();

    const query = normalizedEmail
      ? and(eq(schema.users.email, normalizedEmail), eq(schema.users.passwordResetToken, token))
      : eq(schema.users.passwordResetToken, token);

    const [user] = await db.select().from(schema.users).where(query);

    if (!user) {
      return res.status(400).json({
        error: 'Şifre sıfırlama bağlantısı geçersiz veya daha önce kullanılmış. Lütfen yeniden sıfırlama isteği gönderiniz.',
      });
    }

    if (user.passwordResetExpires && user.passwordResetExpires < now) {
      return res.status(400).json({
        error: 'Şifre sıfırlama bağlantısının geçerlilik süresi (1 saat) dolmuştur. Lütfen yeniden talepte bulununuz.',
      });
    }

    const newHash = await hashPassword(newPassword);

    await db
      .update(schema.users)
      .set({
        passwordHash: newHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    // Invalidate notification token
    await db
      .update(schema.emailNotifications)
      .set({ isUsed: true })
      .where(eq(schema.emailNotifications.token, token));

    await logAudit(user.uid, user.email, 'PASSWORD_RESET', 'USER', String(user.id), 'Şifre başarıyla yenilendi.', req);

    res.json({
      success: true,
      message: 'Şifreniz başarıyla güncellendi! Yeni şifreniz ile güvenle giriş yapabilirsiniz.',
    });
  } catch (err: any) {
    console.error('Şifre yenileme hatası:', err);
    res.status(500).json({ error: 'Şifre güncellenirken hata oluştu.' });
  }
});

// 7. ADMIN: APPROVE USER (Yönetici Kullanıcı Onayı & Rol Atama)
apiRouter.put('/users/:id/approve', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { role, isApproved, memberId } = req.body;

    const [updated] = await db
      .update(schema.users)
      .set({
        role: role || 'VIEWER',
        isApproved: isApproved !== false,
        memberId: memberId ? Number(memberId) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();

    await logAudit(
      null,
      null,
      'APPROVE_USER',
      'USER',
      String(userId),
      `Kullanıcı onayı güncellendi: Rol=${updated.role}, Onay=${updated.isApproved}`,
      req
    );

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Kullanıcı onayı güncellenemedi.' });
  }
});

// 8. ADMIN: LINK USER TO MEMBER (Kullanıcıyı Ekip Üyesi ile Eşleştir)
apiRouter.put('/users/:id/link-member', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { memberId } = req.body;

    const [updated] = await db
      .update(schema.users)
      .set({
        memberId: memberId ? Number(memberId) : null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Üye ilişkilendirme başarısız.' });
  }
});

// 9. RECENT EMAIL NOTIFICATIONS (Denetim ve İnceleme)
apiRouter.get('/email-notifications', async (_req: Request, res: Response) => {
  try {
    const list = await db
      .select()
      .from(schema.emailNotifications)
      .orderBy(desc(schema.emailNotifications.createdAt))
      .limit(30);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'Bildirimler alınamadı.' });
  }
});

// -------------------------------------------------------------
// USER & ROLE MANAGEMENT
// -------------------------------------------------------------
apiRouter.get('/users', async (_req: Request, res: Response) => {
  try {
    const usersList = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt));
    const rolesList = await db.select().from(schema.roles);
    res.json({ users: usersList, roles: rolesList });
  } catch (err: any) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Kullanıcılar alınırken hata oluştu.' });
  }
});

apiRouter.post('/users', async (req: Request, res: Response) => {
  try {
    const { email, displayName, role } = req.body;
    if (!email) return res.status(400).json({ error: 'E-posta zorunludur.' });
    const uid = 'usr_' + Date.now();
    const [newUser] = await db
      .insert(schema.users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        role: role || 'VIEWER',
        isActive: true,
      })
      .returning();
    await logAudit(null, null, 'CREATE', 'USER', String(newUser.id), `Yeni kullanıcı eklendi: ${email}`);
    res.status(201).json(newUser);
  } catch (err: any) {
    res.status(500).json({ error: 'Kullanıcı oluşturulamadı.' });
  }
});

apiRouter.put('/users/:id/role', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;
    const [updated] = await db
      .update(schema.users)
      .set({ role })
      .where(eq(schema.users.id, userId))
      .returning();
    await logAudit(null, null, 'UPDATE', 'USER', String(userId), `Yetki güncellendi: ${role}`);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Yetki güncellenemedi.' });
  }
});

// -------------------------------------------------------------
// MEMBERS API
// -------------------------------------------------------------
apiRouter.get('/members', async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string)?.trim();
    const status = req.query.status as string;
    const position = req.query.position as string;
    const district = req.query.district as string;
    const branch = req.query.branch as string;

    const allMembers = await db.select().from(schema.members).orderBy(asc(schema.members.firstName));
    const allAccreditations = await db.select().from(schema.memberAccreditations);
    const allAccreditationDefs = await db.select().from(schema.accreditations);

    const accMap = new Map<number, string>();
    allAccreditationDefs.forEach((a) => accMap.set(a.id, a.name));

    const memberAccMap = new Map<number, string[]>();
    allAccreditations.forEach((ma) => {
      const list = memberAccMap.get(ma.memberId) || [];
      const name = accMap.get(ma.accreditationId);
      if (name) list.push(name);
      memberAccMap.set(ma.memberId, list);
    });

    let filtered = allMembers.map((m) => ({
      ...m,
      accreditations: memberAccMap.get(m.id) || [],
    }));

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.firstName.toLowerCase().includes(q) ||
          m.lastName.toLowerCase().includes(q) ||
          m.memberNo.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          (m.idNumber && m.idNumber.includes(q))
      );
    }
    if (status && status !== 'Tümü') {
      filtered = filtered.filter((m) => m.status === status);
    }
    if (position && position !== 'Tümü') {
      filtered = filtered.filter((m) => m.teamPosition === position);
    }
    if (district && district !== 'Tümü') {
      filtered = filtered.filter((m) => m.district === district);
    }
    if (branch && branch !== 'Tümü') {
      filtered = filtered.filter((m) => m.branch === branch);
    }
    const srcCertificate = req.query.srcCertificate as string;
    if (srcCertificate && srcCertificate !== 'Tümü') {
      filtered = filtered.filter((m) => m.srcCertificate === srcCertificate);
    }
    const srcCertificateType = req.query.srcCertificateType as string;
    if (srcCertificateType && srcCertificateType !== 'Tümü') {
      if (srcCertificateType === 'Yok') {
        filtered = filtered.filter((m) => !m.srcCertificateType || m.srcCertificate !== 'Var');
      } else if (srcCertificateType === 'Belgesi Olanlar' || srcCertificateType === 'Var') {
        filtered = filtered.filter((m) => m.srcCertificate === 'Var');
      } else {
        filtered = filtered.filter((m) => m.srcCertificateType === srcCertificateType);
      }
    }

    res.json(filtered);
  } catch (err: any) {
    console.error('Error fetching members:', err);
    res.status(500).json({ error: 'Üyeler alınamadı.' });
  }
});

apiRouter.get('/members/:id', async (req: Request, res: Response) => {
  try {
    const memberId = Number(req.params.id);
    const [member] = await db.select().from(schema.members).where(eq(schema.members.id, memberId));
    if (!member) {
      return res.status(404).json({ error: 'Üye bulunamadı.' });
    }

    const emergencyContacts = await db
      .select()
      .from(schema.memberEmergencyContacts)
      .where(eq(schema.memberEmergencyContacts.memberId, memberId));

    const [healthRecord] = await db
      .select()
      .from(schema.memberHealthRecords)
      .where(eq(schema.memberHealthRecords.memberId, memberId));

    const memberAccs = await db
      .select({
        id: schema.memberAccreditations.id,
        accreditationId: schema.accreditations.id,
        name: schema.accreditations.name,
        code: schema.accreditations.code,
        organization: schema.accreditations.organization,
        issueDate: schema.memberAccreditations.issueDate,
        expiryDate: schema.memberAccreditations.expiryDate,
        certificateNumber: schema.memberAccreditations.certificateNumber,
      })
      .from(schema.memberAccreditations)
      .innerJoin(
        schema.accreditations,
        eq(schema.memberAccreditations.accreditationId, schema.accreditations.id)
      )
      .where(eq(schema.memberAccreditations.memberId, memberId));

    // Participated events
    const participations = await db
      .select({
        id: schema.eventParticipants.id,
        eventId: schema.events.id,
        title: schema.events.title,
        eventType: schema.events.eventType,
        startDateTime: schema.events.startDateTime,
        endDateTime: schema.events.endDateTime,
        city: schema.events.city,
        district: schema.events.district,
        role: schema.eventParticipants.role,
        status: schema.events.status,
        attended: schema.eventParticipants.attended,
      })
      .from(schema.eventParticipants)
      .innerJoin(schema.events, eq(schema.eventParticipants.eventId, schema.events.id))
      .where(eq(schema.eventParticipants.memberId, memberId))
      .orderBy(desc(schema.events.startDateTime));

    // Log health access audit if health record exists
    await logAudit(
      null,
      null,
      'VIEW_MEMBER_DETAILS',
      'MEMBER',
      String(memberId),
      `Üye detayları görüntülendi: ${member.firstName} ${member.lastName}`
    );

    res.json({
      ...member,
      emergencyContacts,
      healthRecord: healthRecord || null,
      accreditations: memberAccs,
      participations,
    });
  } catch (err: any) {
    console.error('Error fetching member detail:', err);
    res.status(500).json({ error: 'Üye bilgileri alınırken hata oluştu.' });
  }
});

// Member creation
apiRouter.post('/members', async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      idNumber,
      phone,
      district,
      teamPosition,
      joinDate,
      birthDate,
      birthPlace,
      fatherName,
      gender,
      bloodType,
      city,
      address,
      email,
      responsibilityArea,
      dutyStation,
      dutyTitle,
      branch,
      radioCallSign,
      status,
      educationLevel,
      drivingLicense,
      drivingLicenseClasses,
      srcCertificate,
      srcCertificateType,
      src_belge_turu,
      passportStatus,
      passportNumber,
      disabilityStatus,
      shoeSize,
      shirtSize,
      notes,
      photoUrl,
      emergencyContacts,
      healthRecord,
      accreditationIds,
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'Ad ve Soyad alanları zorunludur.' });
    }
    if (!idNumber) {
      return res.status(400).json({ error: 'T.C. Kimlik Numarası zorunludur.' });
    }

    // Validate T.C. Kimlik
    const tcValidation = validateTCKimlik(idNumber);
    if (!tcValidation.isValid) {
      return res.status(400).json({ error: tcValidation.message });
    }

    // Validate SRC Certificate and Type
    const srcValidation = validateAndNormalizeSrc(
      srcCertificate,
      srcCertificateType !== undefined ? srcCertificateType : src_belge_turu
    );
    if (!srcValidation.isValid) {
      return res.status(400).json({ error: srcValidation.error });
    }

    // Check duplicate T.C. Kimlik
    const [existingWithTC] = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.idNumber, idNumber.trim()));
    if (existingWithTC) {
      return res
        .status(400)
        .json({ error: 'Bu T.C. Kimlik Numarası ile kayıtlı başka bir üye zaten mevcut.' });
    }

    // Auto-generate memberNo if not provided
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.members);
    const nextNum = Number(countResult?.count || 0) + 1;
    const year = new Date().getFullYear();
    const memberNo = `EKP-${year}-${String(nextNum).padStart(3, '0')}`;

    const [newMember] = await db
      .insert(schema.members)
      .values({
        memberNo,
        photoUrl: photoUrl || null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        idNumber: idNumber.trim(),
        birthDate: birthDate || null,
        birthPlace: birthPlace || null,
        fatherName: fatherName || null,
        gender: gender || 'Erkek',
        bloodType: bloodType || '0 Rh+',
        city: city || 'Bursa',
        district: district || 'Osmangazi',
        address: address || null,
        phone: phone ? phone.trim() : '',
        email: email ? email.trim() : null,
        teamPosition: teamPosition || 'Ekip Üyesi',
        joinDate: joinDate || new Date().toISOString().slice(0, 10),
        responsibilityArea: responsibilityArea || null,
        dutyStation: dutyStation || null,
        dutyTitle: dutyTitle || null,
        branch: branch || null,
        radioCallSign: radioCallSign || null,
        status: status || 'Aktif',
        educationLevel: educationLevel || 'Lisans',
        drivingLicense: drivingLicense || 'Var',
        drivingLicenseClasses: drivingLicenseClasses || null,
        srcCertificate: srcCertificate || 'Yok',
        srcCertificateType: srcValidation.normalizedType,
        passportStatus: passportStatus || 'Yok',
        passportNumber: passportNumber || null,
        disabilityStatus: disabilityStatus || 'Yok',
        shoeSize: shoeSize ? Number(shoeSize) : null,
        shirtSize: shirtSize || 'L',
        notes: notes || null,
      })
      .returning();

    // Emergency contacts
    if (Array.isArray(emergencyContacts) && emergencyContacts.length > 0) {
      for (const ec of emergencyContacts) {
        if (ec.contactName && ec.contactPhone) {
          await db.insert(schema.memberEmergencyContacts).values({
            memberId: newMember.id,
            contactName: ec.contactName,
            contactPhone: ec.contactPhone,
            relationshipDegree: ec.relationshipDegree || 'Yakını',
            isPrimary: true,
          });
        }
      }
    }

    // Health records
    if (healthRecord) {
      await db.insert(schema.memberHealthRecords).values({
        memberId: newMember.id,
        chronicDiseases: healthRecord.chronicDiseases || 'Yok',
        allergies: healthRecord.allergies || 'Yok',
        pastSurgeries: healthRecord.pastSurgeries || 'Yok',
        prosthetics: healthRecord.prosthetics || 'Yok',
        regularMedications: healthRecord.regularMedications || 'Yok',
        bloodGroupVerified: !!healthRecord.bloodGroupVerified,
        additionalNotes: healthRecord.additionalNotes || null,
      });
    }

    // Accreditations
    if (Array.isArray(accreditationIds)) {
      for (const accId of accreditationIds) {
        await db.insert(schema.memberAccreditations).values({
          memberId: newMember.id,
          accreditationId: Number(accId),
          issueDate: new Date().toLocaleDateString('tr-TR'),
          expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000 * 3).toLocaleDateString('tr-TR'),
        });
      }
    }

    await logAudit(
      null,
      null,
      'CREATE',
      'MEMBER',
      String(newMember.id),
      `Yeni üye oluşturuldu: ${newMember.firstName} ${newMember.lastName} (${newMember.memberNo})`
    );

    res.status(201).json(newMember);
  } catch (err: any) {
    console.error('Error creating member:', err);
    res.status(500).json({ error: err.message || 'Üye oluşturulamadı.' });
  }
});

// -------------------------------------------------------------
// BATCH MEMBER IMPORT FROM EXCEL
// -------------------------------------------------------------
apiRouter.post('/members/batch-import', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const userRole = (req.headers['x-user-role'] as string) || 'ADMIN';
    if (userRole === 'VIEWER') {
      return res.status(403).json({ error: 'Toplu üye aktarımı için yönetici yetkisi gereklidir.' });
    }

    const { members, strategy = 'SKIP_EXISTING' } = req.body;
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'Aktarılacak üye verisi bulunamadı.' });
    }

    // 1. Fetch lookups & existing members
    const [allExistingMembers, allAccreditations] = await Promise.all([
      db.select().from(schema.members),
      db.select().from(schema.accreditations),
    ]);

    const existingByTC = new Map<string, typeof allExistingMembers[0]>();
    const existingByMemberNo = new Map<string, typeof allExistingMembers[0]>();
    allExistingMembers.forEach((m) => {
      if (m.idNumber) existingByTC.set(m.idNumber.trim(), m);
      if (m.memberNo) existingByMemberNo.set(m.memberNo.trim().toUpperCase(), m);
    });

    const accNameMap = new Map<string, number>();
    allAccreditations.forEach((a) => {
      accNameMap.set(a.name.trim().toLowerCase(), a.id);
      accNameMap.set(a.code.trim().toLowerCase(), a.id);
    });

    // Strategy ABORT check
    if (strategy === 'ABORT') {
      const hasDuplicate = members.some((m) => {
        const cleanTC = m.idNumber ? String(m.idNumber).trim() : '';
        return cleanTC && existingByTC.has(cleanTC);
      });
      if (hasDuplicate) {
        return res.status(400).json({
          error: 'Veritabanında eşleşen kayıt(lar) bulunduğu için "Aktarımı İptal Et" kuralı gereğince işlem durduruldu.',
        });
      }
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const failedRows: Array<{ rowNumber: number; fullName?: string; reason: string; fields: string[] }> = [];

    // Auto-numbering sequence base
    let nextNum = allExistingMembers.length + 1;
    const year = new Date().getFullYear();

    for (let i = 0; i < members.length; i++) {
      const item = members[i];
      const rowNum = item.rowNumber || (i + 2);
      const fullName = `${item.firstName || ''} ${item.lastName || ''}`.trim();

      // Check required fields
      if (!item.firstName || !item.lastName) {
        failedRows.push({
          rowNumber: rowNum,
          fullName,
          reason: 'Ad ve Soyad alanları zorunludur.',
          fields: ['firstName', 'lastName'],
        });
        continue;
      }

      const cleanTC = item.idNumber ? String(item.idNumber).replace(/\D/g, '') : '';
      if (!cleanTC) {
        failedRows.push({
          rowNumber: rowNum,
          fullName,
          reason: 'T.C. Kimlik Numarası boş bırakılamaz.',
          fields: ['idNumber'],
        });
        continue;
      }

      const tcValid = validateTCKimlik(cleanTC);
      if (!tcValid.isValid) {
        failedRows.push({
          rowNumber: rowNum,
          fullName,
          reason: tcValid.message || 'Geçersiz T.C. Kimlik Numarası.',
          fields: ['idNumber'],
        });
        continue;
      }

      // Validate SRC Certificate and Type
      const srcValidation = validateAndNormalizeSrc(
        item.srcCertificate,
        item.srcCertificateType !== undefined ? item.srcCertificateType : item.src_belge_turu
      );
      if (!srcValidation.isValid) {
        failedRows.push({
          rowNumber: rowNum,
          fullName,
          reason: srcValidation.error || 'SRC Belgesi ve Belge Türü doğrulama hatası.',
          fields: ['srcCertificateType'],
        });
        continue;
      }

      const existingMember = existingByTC.get(cleanTC) || (item.memberNo ? existingByMemberNo.get(String(item.memberNo).trim().toUpperCase()) : undefined);

      if (existingMember) {
        if (strategy === 'SKIP_EXISTING') {
          skippedCount++;
          continue;
        } else if (strategy === 'UPDATE_EXISTING') {
          try {
            await db
              .update(schema.members)
              .set({
                firstName: item.firstName.trim(),
                lastName: item.lastName.trim(),
                birthDate: item.birthDate || existingMember.birthDate,
                birthPlace: item.birthPlace || existingMember.birthPlace,
                fatherName: item.fatherName || existingMember.fatherName,
                gender: item.gender || existingMember.gender,
                bloodType: item.bloodType || existingMember.bloodType,
                phone: item.phone ? item.phone.trim() : existingMember.phone,
                email: item.email ? item.email.trim() : existingMember.email,
                district: item.district || existingMember.district,
                city: item.city || existingMember.city,
                address: item.address || existingMember.address,
                teamPosition: item.teamPosition || existingMember.teamPosition,
                dutyStation: item.dutyStation || existingMember.dutyStation,
                dutyTitle: item.dutyTitle || existingMember.dutyTitle,
                branch: item.branch || existingMember.branch,
                responsibilityArea: item.responsibilityArea || existingMember.responsibilityArea,
                radioCallSign: item.radioCallSign || existingMember.radioCallSign,
                status: item.status || existingMember.status,
                educationLevel: item.educationLevel || existingMember.educationLevel,
                drivingLicense: item.drivingLicense || existingMember.drivingLicense,
                drivingLicenseClasses: item.drivingLicenseClasses || existingMember.drivingLicenseClasses,
                srcCertificate: item.srcCertificate || existingMember.srcCertificate,
                srcCertificateType: item.srcCertificate !== undefined ? srcValidation.normalizedType : existingMember.srcCertificateType,
                passportStatus: item.passportStatus || existingMember.passportStatus,
                passportNumber: item.passportNumber || existingMember.passportNumber,
                disabilityStatus: item.disabilityStatus || existingMember.disabilityStatus,
                shoeSize: item.shoeSize ? Number(item.shoeSize) : existingMember.shoeSize,
                shirtSize: item.shirtSize || existingMember.shirtSize,
                updatedAt: new Date(),
              })
              .where(eq(schema.members.id, existingMember.id));

            // Emergency contact update / insert
            if (item.emergencyContactName && item.emergencyContactPhone) {
              const [existingContact] = await db
                .select()
                .from(schema.memberEmergencyContacts)
                .where(eq(schema.memberEmergencyContacts.memberId, existingMember.id));

              if (existingContact) {
                await db
                  .update(schema.memberEmergencyContacts)
                  .set({
                    contactName: item.emergencyContactName.trim(),
                    contactPhone: item.emergencyContactPhone.trim(),
                    relationshipDegree: item.emergencyContactRelation || existingContact.relationshipDegree,
                  })
                  .where(eq(schema.memberEmergencyContacts.id, existingContact.id));
              } else {
                await db.insert(schema.memberEmergencyContacts).values({
                  memberId: existingMember.id,
                  contactName: item.emergencyContactName.trim(),
                  contactPhone: item.emergencyContactPhone.trim(),
                  relationshipDegree: item.emergencyContactRelation || 'Yakını',
                  isPrimary: true,
                });
              }
            }

            // Health records update / insert
            if (item.chronicDiseases || item.allergies || item.pastSurgeries || item.prosthetics || item.regularMedications) {
              const [existingHealth] = await db
                .select()
                .from(schema.memberHealthRecords)
                .where(eq(schema.memberHealthRecords.memberId, existingMember.id));

              if (existingHealth) {
                await db
                  .update(schema.memberHealthRecords)
                  .set({
                    chronicDiseases: item.chronicDiseases || existingHealth.chronicDiseases,
                    allergies: item.allergies || existingHealth.allergies,
                    pastSurgeries: item.pastSurgeries || existingHealth.pastSurgeries,
                    prosthetics: item.prosthetics || existingHealth.prosthetics,
                    regularMedications: item.regularMedications || existingHealth.regularMedications,
                    updatedAt: new Date(),
                  })
                  .where(eq(schema.memberHealthRecords.id, existingHealth.id));
              } else {
                await db.insert(schema.memberHealthRecords).values({
                  memberId: existingMember.id,
                  chronicDiseases: item.chronicDiseases || 'Yok',
                  allergies: item.allergies || 'Yok',
                  pastSurgeries: item.pastSurgeries || 'Yok',
                  prosthetics: item.prosthetics || 'Yok',
                  regularMedications: item.regularMedications || 'Yok',
                });
              }
            }

            // Accreditations linking
            if (item.accreditations) {
              const accList = String(item.accreditations)
                .split(/[;,]/)
                .map((s: string) => s.trim().toLowerCase())
                .filter(Boolean);

              for (const accName of accList) {
                const accId = accNameMap.get(accName);
                if (accId) {
                  const [alreadyLinked] = await db
                    .select()
                    .from(schema.memberAccreditations)
                    .where(
                      and(
                        eq(schema.memberAccreditations.memberId, existingMember.id),
                        eq(schema.memberAccreditations.accreditationId, accId)
                      )
                    );
                  if (!alreadyLinked) {
                    await db.insert(schema.memberAccreditations).values({
                      memberId: existingMember.id,
                      accreditationId: accId,
                      issueDate: new Date().toLocaleDateString('tr-TR'),
                      expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000 * 3).toLocaleDateString('tr-TR'),
                    });
                  }
                }
              }
            }

            updatedCount++;
          } catch (err: any) {
            failedRows.push({
              rowNumber: rowNum,
              fullName,
              reason: 'Kayıt güncellenirken veritabanı hatası: ' + err.message,
              fields: [],
            });
          }
          continue;
        }
      }

      // If New Member: Insert
      try {
        let finalMemberNo = item.memberNo ? String(item.memberNo).trim() : '';
        if (!finalMemberNo || existingByMemberNo.has(finalMemberNo.toUpperCase())) {
          finalMemberNo = `EKP-${year}-${String(nextNum++).padStart(3, '0')}`;
        }

        const [createdMember] = await db
          .insert(schema.members)
          .values({
            memberNo: finalMemberNo,
            photoUrl: item.photoUrl || null,
            firstName: item.firstName.trim(),
            lastName: item.lastName.trim(),
            idNumber: cleanTC,
            birthDate: item.birthDate || null,
            birthPlace: item.birthPlace || null,
            fatherName: item.fatherName || null,
            gender: item.gender || 'Erkek',
            bloodType: item.bloodType || '0 Rh+',
            city: item.city || 'Bursa',
            district: item.district || 'Osmangazi',
            address: item.address || null,
            phone: item.phone ? String(item.phone).trim() : '',
            email: item.email ? String(item.email).trim() : null,
            teamPosition: item.teamPosition || 'Ekip Üyesi',
            joinDate: item.joinDate || new Date().toISOString().slice(0, 10),
            responsibilityArea: item.responsibilityArea || null,
            dutyStation: item.dutyStation || null,
            dutyTitle: item.dutyTitle || null,
            branch: item.branch || null,
            radioCallSign: item.radioCallSign || null,
            status: item.status || 'Aktif',
            educationLevel: item.educationLevel || 'Lisans',
            drivingLicense: item.drivingLicense || 'Var',
            drivingLicenseClasses: item.drivingLicenseClasses || null,
            srcCertificate: item.srcCertificate || 'Yok',
            srcCertificateType: srcValidation.normalizedType,
            passportStatus: item.passportStatus || 'Yok',
            passportNumber: item.passportNumber || null,
            disabilityStatus: item.disabilityStatus || 'Yok',
            shoeSize: item.shoeSize ? Number(item.shoeSize) : null,
            shirtSize: item.shirtSize || 'L',
            notes: item.notes || null,
          })
          .returning();

        // Remember newly created member in mapping
        existingByTC.set(cleanTC, createdMember);
        existingByMemberNo.set(finalMemberNo.toUpperCase(), createdMember);

        // Emergency contact insert
        if (item.emergencyContactName && item.emergencyContactPhone) {
          await db.insert(schema.memberEmergencyContacts).values({
            memberId: createdMember.id,
            contactName: item.emergencyContactName.trim(),
            contactPhone: item.emergencyContactPhone.trim(),
            relationshipDegree: item.emergencyContactRelation || 'Yakını',
            isPrimary: true,
          });
        }

        // Health record insert
        if (item.chronicDiseases || item.allergies || item.pastSurgeries || item.prosthetics || item.regularMedications) {
          await db.insert(schema.memberHealthRecords).values({
            memberId: createdMember.id,
            chronicDiseases: item.chronicDiseases || 'Yok',
            allergies: item.allergies || 'Yok',
            pastSurgeries: item.pastSurgeries || 'Yok',
            prosthetics: item.prosthetics || 'Yok',
            regularMedications: item.regularMedications || 'Yok',
          });
        }

        // Accreditations linking
        if (item.accreditations) {
          const accList = String(item.accreditations)
            .split(/[;,]/)
            .map((s: string) => s.trim().toLowerCase())
            .filter(Boolean);

          for (const accName of accList) {
            const accId = accNameMap.get(accName);
            if (accId) {
              await db.insert(schema.memberAccreditations).values({
                memberId: createdMember.id,
                accreditationId: accId,
                issueDate: new Date().toLocaleDateString('tr-TR'),
                expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000 * 3).toLocaleDateString('tr-TR'),
              });
            }
          }
        }

        addedCount++;
      } catch (err: any) {
        failedRows.push({
          rowNumber: rowNum,
          fullName,
          reason: 'Veritabanına kayıt eklenirken hata: ' + err.message,
          fields: [],
        });
      }
    }

    const durationMs = Date.now() - startTime;

    await logAudit(
      null,
      null,
      'BATCH_IMPORT',
      'MEMBER',
      String(addedCount + updatedCount),
      `Toplu üye aktarımı yapıldı: ${addedCount} yeni üye eklendi, ${updatedCount} güncellendi, ${skippedCount} atlandı, ${failedRows.length} hatalı.`,
      req
    );

    res.json({
      success: true,
      totalProcessed: members.length,
      addedCount,
      updatedCount,
      skippedCount,
      failedCount: failedRows.length,
      durationMs,
      failedRows,
      message: `Toplu aktarım tamamlandı: ${addedCount} üye eklendi, ${updatedCount} güncellendi, ${skippedCount} atlandı.`,
    });
  } catch (err: any) {
    console.error('Batch member import error:', err);
    res.status(500).json({ error: 'Toplu üye aktarımı sırasında beklenmeyen hata oluştu: ' + (err.message || '') });
  }
});

// Member update
apiRouter.put('/members/:id', async (req: Request, res: Response) => {
  try {
    const memberId = Number(req.params.id);
    const {
      firstName,
      lastName,
      idNumber,
      phone,
      district,
      teamPosition,
      joinDate,
      birthDate,
      birthPlace,
      fatherName,
      gender,
      bloodType,
      city,
      address,
      email,
      responsibilityArea,
      dutyStation,
      dutyTitle,
      branch,
      radioCallSign,
      status,
      educationLevel,
      drivingLicense,
      drivingLicenseClasses,
      srcCertificate,
      srcCertificateType,
      src_belge_turu,
      passportStatus,
      passportNumber,
      disabilityStatus,
      shoeSize,
      shirtSize,
      notes,
      photoUrl,
      emergencyContacts,
      healthRecord,
      accreditationIds,
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'Ad ve Soyad alanları zorunludur.' });
    }

    if (idNumber) {
      const tcValidation = validateTCKimlik(idNumber);
      if (!tcValidation.isValid) {
        return res.status(400).json({ error: tcValidation.message });
      }

      // Check duplicate TC
      const [existing] = await db
        .select()
        .from(schema.members)
        .where(and(eq(schema.members.idNumber, idNumber.trim()), sql`${schema.members.id} != ${memberId}`));
      if (existing) {
        return res.status(400).json({ error: 'Bu T.C. Kimlik Numarası başka bir üyeye ait.' });
      }
    }

    // Validate SRC Certificate and Type
    const srcValidation = validateAndNormalizeSrc(
      srcCertificate,
      srcCertificateType !== undefined ? srcCertificateType : src_belge_turu
    );
    if (!srcValidation.isValid) {
      return res.status(400).json({ error: srcValidation.error });
    }

    const [updated] = await db
      .update(schema.members)
      .set({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        idNumber: idNumber ? idNumber.trim() : undefined,
        photoUrl: photoUrl !== undefined ? photoUrl : undefined,
        birthDate,
        birthPlace,
        fatherName,
        gender,
        bloodType,
        city,
        district,
        address,
        phone,
        email,
        teamPosition,
        joinDate,
        responsibilityArea,
        dutyStation,
        dutyTitle,
        branch,
        radioCallSign,
        status,
        educationLevel,
        drivingLicense,
        drivingLicenseClasses,
        srcCertificate: srcCertificate || 'Yok',
        srcCertificateType: srcValidation.normalizedType,
        passportStatus,
        passportNumber,
        disabilityStatus,
        shoeSize: shoeSize ? Number(shoeSize) : null,
        shirtSize,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(schema.members.id, memberId))
      .returning();

    // Update emergency contacts
    if (Array.isArray(emergencyContacts)) {
      await db.delete(schema.memberEmergencyContacts).where(eq(schema.memberEmergencyContacts.memberId, memberId));
      for (const ec of emergencyContacts) {
        if (ec.contactName && ec.contactPhone) {
          await db.insert(schema.memberEmergencyContacts).values({
            memberId,
            contactName: ec.contactName,
            contactPhone: ec.contactPhone,
            relationshipDegree: ec.relationshipDegree || 'Yakını',
            isPrimary: true,
          });
        }
      }
    }

    // Update health records
    if (healthRecord) {
      await db
        .insert(schema.memberHealthRecords)
        .values({
          memberId,
          chronicDiseases: healthRecord.chronicDiseases || 'Yok',
          allergies: healthRecord.allergies || 'Yok',
          pastSurgeries: healthRecord.pastSurgeries || 'Yok',
          prosthetics: healthRecord.prosthetics || 'Yok',
          regularMedications: healthRecord.regularMedications || 'Yok',
          bloodGroupVerified: !!healthRecord.bloodGroupVerified,
          additionalNotes: healthRecord.additionalNotes || null,
        })
        .onConflictDoUpdate({
          target: schema.memberHealthRecords.memberId,
          set: {
            chronicDiseases: healthRecord.chronicDiseases || 'Yok',
            allergies: healthRecord.allergies || 'Yok',
            pastSurgeries: healthRecord.pastSurgeries || 'Yok',
            prosthetics: healthRecord.prosthetics || 'Yok',
            regularMedications: healthRecord.regularMedications || 'Yok',
            bloodGroupVerified: !!healthRecord.bloodGroupVerified,
            additionalNotes: healthRecord.additionalNotes || null,
            updatedAt: new Date(),
          },
        });
    }

    // Update accreditations
    if (Array.isArray(accreditationIds)) {
      await db.delete(schema.memberAccreditations).where(eq(schema.memberAccreditations.memberId, memberId));
      for (const accId of accreditationIds) {
        await db.insert(schema.memberAccreditations).values({
          memberId,
          accreditationId: Number(accId),
          issueDate: new Date().toLocaleDateString('tr-TR'),
          expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000 * 3).toLocaleDateString('tr-TR'),
        });
      }
    }

    await logAudit(
      null,
      null,
      'UPDATE',
      'MEMBER',
      String(memberId),
      `Üye güncellendi: ${updated.firstName} ${updated.lastName}`
    );

    res.json(updated);
  } catch (err: any) {
    console.error('Error updating member:', err);
    res.status(500).json({ error: err.message || 'Üye güncellenemedi.' });
  }
});

// Member deletion with relation safety check
apiRouter.delete('/members/:id', async (req: Request, res: Response) => {
  try {
    const memberId = Number(req.params.id);
    const [member] = await db.select().from(schema.members).where(eq(schema.members.id, memberId));
    if (!member) {
      return res.status(404).json({ error: 'Üye bulunamadı.' });
    }

    // Check if member has event participations
    const participations = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.eventParticipants)
      .where(eq(schema.eventParticipants.memberId, memberId));

    const count = Number(participations[0]?.count || 0);
    const force = req.query.force === 'true';

    if (count > 0 && !force) {
      return res.status(409).json({
        error: `Bu üye ${count} adet etkinliğe katılmış veya görev almıştır. Silmek yerine durumunu 'Pasif' yapabilir veya silmeyi onaylayabilirsiniz.`,
        hasRelations: true,
        eventCount: count,
      });
    }

    await db.delete(schema.members).where(eq(schema.members.id, memberId));

    await logAudit(
      null,
      null,
      'DELETE',
      'MEMBER',
      String(memberId),
      `Üye silindi: ${member.firstName} ${member.lastName} (${member.memberNo})`
    );

    res.json({ success: true, message: 'Üye başarıyla silindi.' });
  } catch (err: any) {
    console.error('Error deleting member:', err);
    res.status(500).json({ error: 'Üye silinirken hata oluştu.' });
  }
});

// -------------------------------------------------------------
// EVENTS API
// -------------------------------------------------------------
apiRouter.get('/events', async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string)?.trim();
    const type = req.query.type as string;
    const status = req.query.status as string;
    const district = req.query.district as string;

    const allEvents = await db.select().from(schema.events).orderBy(desc(schema.events.startDateTime));
    const allParticipants = await db
      .select({
        eventId: schema.eventParticipants.eventId,
        role: schema.eventParticipants.role,
        memberId: schema.eventParticipants.memberId,
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
        photoUrl: schema.members.photoUrl,
        memberNo: schema.members.memberNo,
      })
      .from(schema.eventParticipants)
      .innerJoin(schema.members, eq(schema.eventParticipants.memberId, schema.members.id));

    const participantMap = new Map<number, any[]>();
    allParticipants.forEach((p) => {
      const list = participantMap.get(p.eventId) || [];
      list.push(p);
      participantMap.set(p.eventId, list);
    });

    let mapped = allEvents.map((e) => {
      const participants = participantMap.get(e.id) || [];
      const leader = participants.find((p) => p.role === 'Ekip Sorumlusu');
      return {
        ...e,
        participantCount: participants.length,
        coordinatorName: leader ? `${leader.firstName} ${leader.lastName}` : 'Atanmamış',
        participants,
      };
    });

    if (search) {
      const q = search.toLowerCase();
      mapped = mapped.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.district.toLowerCase().includes(q) ||
          (e.locationDetail && e.locationDetail.toLowerCase().includes(q))
      );
    }
    if (type && type !== 'Tümü') {
      mapped = mapped.filter((e) => e.eventType === type);
    }
    if (status && status !== 'Tümü') {
      mapped = mapped.filter((e) => e.status === status);
    }
    if (district && district !== 'Tümü') {
      mapped = mapped.filter((e) => e.district === district);
    }

    res.json(mapped);
  } catch (err: any) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Etkinlikler alınamadı.' });
  }
});

apiRouter.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const [event] = await db.select().from(schema.events).where(eq(schema.events.id, eventId));
    if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadı.' });

    const participants = await db
      .select({
        id: schema.eventParticipants.id,
        memberId: schema.members.id,
        memberNo: schema.members.memberNo,
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
        teamPosition: schema.members.teamPosition,
        phone: schema.members.phone,
        status: schema.members.status,
        photoUrl: schema.members.photoUrl,
        branch: schema.members.branch,
        role: schema.eventParticipants.role,
        notes: schema.eventParticipants.notes,
        attended: schema.eventParticipants.attended,
      })
      .from(schema.eventParticipants)
      .innerJoin(schema.members, eq(schema.eventParticipants.memberId, schema.members.id))
      .where(eq(schema.eventParticipants.eventId, eventId))
      .orderBy(asc(schema.eventParticipants.role));

    res.json({
      ...event,
      participants,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Etkinlik detayları alınamadı.' });
  }
});

apiRouter.post('/events', async (req: Request, res: Response) => {
  try {
    const {
      title,
      eventType,
      startDateTime,
      endDateTime,
      city,
      district,
      locationDetail,
      description,
      status,
      participants,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Etkinlik Adı zorunludur.' });
    if (!startDateTime || !endDateTime) {
      return res.status(400).json({ error: 'Başlangıç ve Bitiş tarihleri zorunludur.' });
    }

    // Date validation: start <= end
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (start > end) {
      return res.status(400).json({ error: 'Başlangıç tarihi ve saati, bitiş tarihinden sonra olamaz.' });
    }

    // Auto-suggest status based on date if not specified
    let finalStatus = status || 'Planlanan';
    const now = new Date();
    if (!status) {
      if (now > end) finalStatus = 'Tamamlandı';
      else if (now >= start && now <= end) finalStatus = 'Devam Ediyor';
    }

    const [newEvent] = await db
      .insert(schema.events)
      .values({
        title: title.trim(),
        eventType: eventType || 'Tatbikat',
        startDateTime,
        endDateTime,
        city: city || 'İstanbul',
        district: district || 'Kadıköy',
        locationDetail: locationDetail || null,
        description: description || null,
        status: finalStatus,
      })
      .returning();

    // Check single coordinator rule if configured
    if (Array.isArray(participants) && participants.length > 0) {
      const coordinatorCount = participants.filter((p) => p.role === 'Ekip Sorumlusu').length;
      if (coordinatorCount > 1) {
        // Check setting
        const [setting] = await db
          .select()
          .from(schema.systemSettings)
          .where(eq(schema.systemSettings.settingKey, 'single_coordinator_per_event'));
        if (!setting || setting.settingValue === 'true') {
          return res.status(400).json({
            error: 'Bir etkinlikte yalnızca 1 Ekip Sorumlusu bulunabilir. Sistem Ayarları üzerinden bu kural değiştirilebilir.',
          });
        }
      }

      // Insert participants, ensuring no duplicates
      const seenMemberIds = new Set<number>();
      for (const p of participants) {
        const mId = Number(p.memberId);
        if (!seenMemberIds.has(mId)) {
          seenMemberIds.add(mId);
          await db.insert(schema.eventParticipants).values({
            eventId: newEvent.id,
            memberId: mId,
            role: p.role || 'Ekip Üyesi',
            notes: p.notes || null,
            attended: p.attended !== false,
          });
        }
      }
    }

    await logAudit(
      null,
      null,
      'CREATE',
      'EVENT',
      String(newEvent.id),
      `Yeni etkinlik oluşturuldu: ${newEvent.title} (${newEvent.eventType})`
    );

    res.status(201).json(newEvent);
  } catch (err: any) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: err.message || 'Etkinlik oluşturulamadı.' });
  }
});

apiRouter.put('/events/:id', async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const {
      title,
      eventType,
      startDateTime,
      endDateTime,
      city,
      district,
      locationDetail,
      description,
      status,
      participants,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Etkinlik Adı zorunludur.' });
    if (!startDateTime || !endDateTime) {
      return res.status(400).json({ error: 'Başlangıç ve Bitiş tarihleri zorunludur.' });
    }

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (start > end) {
      return res.status(400).json({ error: 'Başlangıç tarihi ve saati, bitiş tarihinden sonra olamaz.' });
    }

    const [updated] = await db
      .update(schema.events)
      .set({
        title: title.trim(),
        eventType,
        startDateTime,
        endDateTime,
        city,
        district,
        locationDetail,
        description,
        status,
        updatedAt: new Date(),
      })
      .where(eq(schema.events.id, eventId))
      .returning();

    if (Array.isArray(participants)) {
      // Check single coordinator rule
      const coordinatorCount = participants.filter((p) => p.role === 'Ekip Sorumlusu').length;
      if (coordinatorCount > 1) {
        const [setting] = await db
          .select()
          .from(schema.systemSettings)
          .where(eq(schema.systemSettings.settingKey, 'single_coordinator_per_event'));
        if (!setting || setting.settingValue === 'true') {
          return res.status(400).json({
            error: 'Bir etkinlikte yalnızca 1 Ekip Sorumlusu bulunabilir.',
          });
        }
      }

      await db.delete(schema.eventParticipants).where(eq(schema.eventParticipants.eventId, eventId));
      const seenMemberIds = new Set<number>();
      for (const p of participants) {
        const mId = Number(p.memberId);
        if (!seenMemberIds.has(mId)) {
          seenMemberIds.add(mId);
          await db.insert(schema.eventParticipants).values({
            eventId,
            memberId: mId,
            role: p.role || 'Ekip Üyesi',
            notes: p.notes || null,
            attended: p.attended !== false,
          });
        }
      }
    }

    await logAudit(
      null,
      null,
      'UPDATE',
      'EVENT',
      String(eventId),
      `Etkinlik güncellendi: ${updated.title}`
    );

    res.json(updated);
  } catch (err: any) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: err.message || 'Etkinlik güncellenemedi.' });
  }
});

apiRouter.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const [event] = await db.select().from(schema.events).where(eq(schema.events.id, eventId));
    if (!event) return res.status(404).json({ error: 'Etkinlik bulunamadı.' });

    await db.delete(schema.events).where(eq(schema.events.id, eventId));
    await logAudit(null, null, 'DELETE', 'EVENT', String(eventId), `Etkinlik silindi: ${event.title}`);
    res.json({ success: true, message: 'Etkinlik silindi.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Etkinlik silinemedi.' });
  }
});

// Participant management endpoints
apiRouter.post('/events/:id/participants', async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const { memberId, role, notes } = req.body;

    if (!memberId) return res.status(400).json({ error: 'Üye seçilmelidir.' });

    // Check if member already in event
    const [existing] = await db
      .select()
      .from(schema.eventParticipants)
      .where(
        and(
          eq(schema.eventParticipants.eventId, eventId),
          eq(schema.eventParticipants.memberId, Number(memberId))
        )
      );

    if (existing) {
      return res.status(400).json({ error: 'Bu üye zaten bu etkinliğe eklenmiştir.' });
    }

    const [member] = await db.select().from(schema.members).where(eq(schema.members.id, Number(memberId)));
    if (!member) return res.status(404).json({ error: 'Üye bulunamadı.' });

    if (role === 'Ekip Sorumlusu') {
      const [setting] = await db
        .select()
        .from(schema.systemSettings)
        .where(eq(schema.systemSettings.settingKey, 'single_coordinator_per_event'));
      if (!setting || setting.settingValue === 'true') {
        const [existingLeader] = await db
          .select()
          .from(schema.eventParticipants)
          .where(
            and(
              eq(schema.eventParticipants.eventId, eventId),
              eq(schema.eventParticipants.role, 'Ekip Sorumlusu')
            )
          );
        if (existingLeader) {
          return res.status(400).json({
            error: 'Bu etkinlikte zaten bir Ekip Sorumlusu tanımlı. Lütfen önce mevcut sorumluyu değiştirin.',
          });
        }
      }
    }

    const [participant] = await db
      .insert(schema.eventParticipants)
      .values({
        eventId,
        memberId: Number(memberId),
        role: role || 'Ekip Üyesi',
        notes: notes || null,
        attended: true,
      })
      .returning();

    await logAudit(
      null,
      null,
      'ADD_PARTICIPANT',
      'EVENT',
      String(eventId),
      `Etkinliğe katılımcı eklendi: ${member.firstName} ${member.lastName} (${role})`
    );

    res.status(201).json(participant);
  } catch (err: any) {
    res.status(500).json({ error: 'Katılımcı eklenemedi.' });
  }
});

apiRouter.delete('/events/:id/participants/:memberId', async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const memberId = Number(req.params.memberId);

    await db
      .delete(schema.eventParticipants)
      .where(
        and(
          eq(schema.eventParticipants.eventId, eventId),
          eq(schema.eventParticipants.memberId, memberId)
        )
      );

    await logAudit(
      null,
      null,
      'REMOVE_PARTICIPANT',
      'EVENT',
      String(eventId),
      `Etkinlikten katılımcı çıkarıldı: Üye ID ${memberId}`
    );

    res.json({ success: true, message: 'Katılımcı çıkarıldı.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Katılımcı çıkarılamadı.' });
  }
});

// -------------------------------------------------------------
// ACCREDITATIONS & TRAININGS
// -------------------------------------------------------------
apiRouter.get('/accreditations', async (_req: Request, res: Response) => {
  try {
    const accList = await db.select().from(schema.accreditations).orderBy(asc(schema.accreditations.name));
    const memberAccs = await db
      .select({
        memberAccId: schema.memberAccreditations.id,
        accreditationId: schema.memberAccreditations.accreditationId,
        memberId: schema.members.id,
        memberNo: schema.members.memberNo,
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
        teamPosition: schema.members.teamPosition,
        phone: schema.members.phone,
        status: schema.members.status,
        issueDate: schema.memberAccreditations.issueDate,
        expiryDate: schema.memberAccreditations.expiryDate,
        certificateNumber: schema.memberAccreditations.certificateNumber,
      })
      .from(schema.memberAccreditations)
      .innerJoin(schema.members, eq(schema.memberAccreditations.memberId, schema.members.id));

    const enriched = accList.map((a) => {
      const assigned = memberAccs.filter((ma) => ma.accreditationId === a.id);
      return {
        ...a,
        memberCount: assigned.length,
        members: assigned,
      };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: 'Akreditasyonlar alınamadı.' });
  }
});

apiRouter.post('/accreditations', async (req: Request, res: Response) => {
  try {
    const { name, code, organization, validityMonths, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Akreditasyon adı ve kodu zorunludur.' });
    }
    const [newAcc] = await db
      .insert(schema.accreditations)
      .values({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        organization: organization || 'AFAD',
        validityMonths: validityMonths ? Number(validityMonths) : 36,
        description: description || null,
      })
      .returning();

    await logAudit(null, null, 'CREATE', 'ACCREDITATION', String(newAcc.id), `Yeni akreditasyon: ${newAcc.name}`);
    res.status(201).json(newAcc);
  } catch (err: any) {
    res.status(500).json({ error: 'Akreditasyon kaydedilemedi. Kod benzersiz olmalıdır.' });
  }
});

apiRouter.delete('/accreditations/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await db.delete(schema.accreditations).where(eq(schema.accreditations.id, id));
    await logAudit(null, null, 'DELETE', 'ACCREDITATION', String(id), `Akreditasyon silindi ID: ${id}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Akreditasyon silinemedi.' });
  }
});

// -------------------------------------------------------------
// REPORTS & DASHBOARD SUMMARY
// -------------------------------------------------------------
apiRouter.get('/reports/summary', async (_req: Request, res: Response) => {
  try {
    const allMembers = await db.select().from(schema.members);
    const allEvents = await db.select().from(schema.events);
    const allParticipants = await db.select().from(schema.eventParticipants);
    const allAccreditations = await db.select().from(schema.accreditations);
    const allMemberAccs = await db.select().from(schema.memberAccreditations);

    const totalMembers = allMembers.length;
    const activeMembers = allMembers.filter((m) => m.status === 'Aktif').length;
    const passiveMembers = allMembers.filter((m) => m.status === 'Pasif').length;

    const totalEvents = allEvents.length;
    const now = new Date();
    const upcomingEvents = allEvents.filter((e) => new Date(e.startDateTime) > now && e.status !== 'İptal Edildi').length;
    const ongoingEvents = allEvents.filter((e) => e.status === 'Devam Ediyor').length;
    const completedEvents = allEvents.filter((e) => e.status === 'Tamamlandı').length;

    // Distributions
    const positionCounts: Record<string, number> = {};
    const bloodTypeCounts: Record<string, number> = {};
    const districtCounts: Record<string, number> = {};
    const shirtSizeCounts: Record<string, number> = {};
    const shoeSizeCounts: Record<string, number> = {};

    allMembers.forEach((m) => {
      positionCounts[m.teamPosition] = (positionCounts[m.teamPosition] || 0) + 1;
      if (m.bloodType) bloodTypeCounts[m.bloodType] = (bloodTypeCounts[m.bloodType] || 0) + 1;
      if (m.district) districtCounts[m.district] = (districtCounts[m.district] || 0) + 1;
      if (m.shirtSize) shirtSizeCounts[m.shirtSize] = (shirtSizeCounts[m.shirtSize] || 0) + 1;
      if (m.shoeSize) shoeSizeCounts[String(m.shoeSize)] = (shoeSizeCounts[String(m.shoeSize)] || 0) + 1;
    });

    // Recent events
    const recentEvents = [...allEvents]
      .sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime())
      .slice(0, 5);

    // Recent members
    const recentMembers = [...allMembers]
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, 5);

    // Top participants
    const memberEventCounts: Record<number, number> = {};
    allParticipants.forEach((p) => {
      memberEventCounts[p.memberId] = (memberEventCounts[p.memberId] || 0) + 1;
    });

    const topMembers = Object.entries(memberEventCounts)
      .map(([id, count]) => {
        const member = allMembers.find((m) => m.id === Number(id));
        return {
          memberId: Number(id),
          count,
          name: member ? `${member.firstName} ${member.lastName}` : `Üye #${id}`,
          position: member?.teamPosition || '',
          photoUrl: member?.photoUrl || null,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      totalMembers,
      activeMembers,
      passiveMembers,
      totalEvents,
      upcomingEvents,
      ongoingEvents,
      completedEvents,
      positionCounts,
      bloodTypeCounts,
      districtCounts,
      shirtSizeCounts,
      shoeSizeCounts,
      recentEvents,
      recentMembers,
      topMembers,
      totalAccreditedAssignments: allMemberAccs.length,
    });
  } catch (err: any) {
    console.error('Error getting report summary:', err);
    res.status(500).json({ error: 'Rapor özeti alınamadı.' });
  }
});

// -------------------------------------------------------------
// DYNAMIC REPORTING ENGINE API (BURSA MEB AKUB)
// -------------------------------------------------------------
apiRouter.post('/reports/query', async (req: Request, res: Response) => {
  try {
    const userRole = (req.headers['x-user-role'] as string) || 'ADMIN';
    const result = await executeReportQuery(req.body, userRole);

    // Audit log if this is an export or substantial query
    if (req.body.category || req.body.templateId) {
      await logAudit(
        null,
        null,
        'GENERATE_REPORT',
        'REPORT',
        req.body.category || req.body.templateId || 'CUSTOM',
        `Rapor sorgulandı: ${req.body.category || 'Özel'} (${result.totalCount} kayıt)`,
        req
      );
    }

    res.json(result);
  } catch (err: any) {
    console.error('Report query failure:', err);
    res.status(500).json({ error: 'Rapor sorgusu işlenirken hata oluştu: ' + (err.message || 'Bilinmeyen hata') });
  }
});

// Saved Reports CRUD
apiRouter.get('/reports/saved', async (_req: Request, res: Response) => {
  try {
    const saved = await db
      .select()
      .from(schema.savedReports)
      .orderBy(desc(schema.savedReports.createdAt));

    const parsed = saved.map((s) => ({
      ...s,
      selectedColumns: JSON.parse(s.selectedColumns || '[]'),
      filters: JSON.parse(s.filters || '{}'),
    }));

    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: 'Kayıtlı raporlar alınamadı.' });
  }
});

apiRouter.post('/reports/saved', async (req: Request, res: Response) => {
  try {
    const { name, description, category, dataSource, selectedColumns, filters, sortField, sortOrder, groupBy } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Rapor şablon adı zorunludur.' });

    const [created] = await db
      .insert(schema.savedReports)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        category: category || 'Özel Rapor Oluşturucu',
        dataSource: dataSource || 'members',
        selectedColumns: JSON.stringify(selectedColumns || []),
        filters: JSON.stringify(filters || {}),
        sortField: sortField || null,
        sortOrder: sortOrder || 'ASC',
        groupBy: groupBy || null,
        createdBy: 'Yetkili Yönetici',
      })
      .returning();

    await logAudit(null, null, 'CREATE_SAVED_REPORT', 'REPORT', String(created.id), `Yeni rapor şablonu kaydedildi: ${name}`, req);

    res.status(201).json({
      ...created,
      selectedColumns: JSON.parse(created.selectedColumns),
      filters: JSON.parse(created.filters),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Rapor kaydedilemedi.' });
  }
});

apiRouter.put('/reports/saved/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, description, category, dataSource, selectedColumns, filters, sortField, sortOrder, groupBy } = req.body;

    const [updated] = await db
      .update(schema.savedReports)
      .set({
        name: name ? name.trim() : undefined,
        description: description !== undefined ? description : undefined,
        category: category || undefined,
        dataSource: dataSource || undefined,
        selectedColumns: selectedColumns ? JSON.stringify(selectedColumns) : undefined,
        filters: filters ? JSON.stringify(filters) : undefined,
        sortField: sortField || undefined,
        sortOrder: sortOrder || undefined,
        groupBy: groupBy || undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.savedReports.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Rapor şablonu bulunamadı.' });

    res.json({
      ...updated,
      selectedColumns: JSON.parse(updated.selectedColumns),
      filters: JSON.parse(updated.filters),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Rapor şablonu güncellenemedi.' });
  }
});

apiRouter.delete('/reports/saved/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await db.delete(schema.savedReports).where(eq(schema.savedReports.id, id));
    await logAudit(null, null, 'DELETE_SAVED_REPORT', 'REPORT', String(id), `Kayıtlı rapor şablonu silindi (#${id})`, req);
    res.json({ success: true, message: 'Rapor şablonu silindi.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Rapor şablonu silinemedi.' });
  }
});

// -------------------------------------------------------------
// SYSTEM SETTINGS & AUDIT LOGS
// -------------------------------------------------------------
apiRouter.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settingsList = await db.select().from(schema.systemSettings);
    const positions = await db.select().from(schema.teamPositions).orderBy(asc(schema.teamPositions.name));
    const eventTypesList = await db.select().from(schema.eventTypes).orderBy(asc(schema.eventTypes.name));

    const settingsObj: Record<string, string> = {};
    settingsList.forEach((s) => {
      settingsObj[s.settingKey] = s.settingValue;
    });

    res.json({
      settings: settingsObj,
      positions,
      eventTypes: eventTypesList,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Ayarlar alınamadı.' });
  }
});

apiRouter.post('/settings', async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Ayar anahtarı zorunludur.' });

    await db
      .insert(schema.systemSettings)
      .values({
        settingKey: key,
        settingValue: String(value),
      })
      .onConflictDoUpdate({
        target: schema.systemSettings.settingKey,
        set: {
          settingValue: String(value),
          updatedAt: new Date(),
        },
      });

    await logAudit(null, null, 'UPDATE', 'SYSTEM', key, `Sistem ayarı güncellendi: ${key} = ${value}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Ayar kaydedilemedi.' });
  }
});

apiRouter.post('/team-positions', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Görev adı zorunludur.' });
    const [pos] = await db
      .insert(schema.teamPositions)
      .values({ name: name.trim(), description })
      .returning();
    await logAudit(null, null, 'CREATE', 'SYSTEM', String(pos.id), `Yeni ekip görevi tanımlandı: ${name}`);
    res.status(201).json(pos);
  } catch (err: any) {
    res.status(500).json({ error: 'Ekip görevi eklenemedi.' });
  }
});

apiRouter.delete('/team-positions/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await db.delete(schema.teamPositions).where(eq(schema.teamPositions.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Görev silinemedi.' });
  }
});

apiRouter.post('/event-types', async (req: Request, res: Response) => {
  try {
    const { name, badgeColor, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Etkinlik türü adı zorunludur.' });
    const [type] = await db
      .insert(schema.eventTypes)
      .values({
        name: name.trim(),
        badgeColor: badgeColor || '#2563EB',
        description,
      })
      .returning();
    res.status(201).json(type);
  } catch (err: any) {
    res.status(500).json({ error: 'Etkinlik türü eklenemedi.' });
  }
});

apiRouter.delete('/event-types/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await db.delete(schema.eventTypes).where(eq(schema.eventTypes.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Etkinlik türü silinemedi.' });
  }
});

apiRouter.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const logs = await db
      .select()
      .from(schema.auditLogs)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Denetim kayıtları alınamadı.' });
  }
});

// Full database backup export
apiRouter.get('/backup/export', async (_req: Request, res: Response) => {
  try {
    const [
      allMembers,
      allEvents,
      allParticipants,
      allContacts,
      allHealth,
      allAccreditations,
      allMemberAccs,
      allPositions,
      allSettings,
      allLogs,
    ] = await Promise.all([
      db.select().from(schema.members),
      db.select().from(schema.events),
      db.select().from(schema.eventParticipants),
      db.select().from(schema.memberEmergencyContacts),
      db.select().from(schema.memberHealthRecords),
      db.select().from(schema.accreditations),
      db.select().from(schema.memberAccreditations),
      db.select().from(schema.teamPositions),
      db.select().from(schema.systemSettings),
      db.select().from(schema.auditLogs).limit(500),
    ]);

    res.json({
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: {
        members: allMembers,
        events: allEvents,
        eventParticipants: allParticipants,
        memberEmergencyContacts: allContacts,
        memberHealthRecords: allHealth,
        accreditations: allAccreditations,
        memberAccreditations: allMemberAccs,
        teamPositions: allPositions,
        systemSettings: allSettings,
        auditLogs: allLogs,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Yedek alınamadı.' });
  }
});
