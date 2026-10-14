import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { apiClient } from '../../services/api.ts';
import {
  ShieldAlert,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Send,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot' | 'verify' | 'reset';

export const AuthPage: React.FC = () => {
  const { setCurrentUser, showToast } = useApp();

  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email Verification & Reset States
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [debugActionUrl, setDebugActionUrl] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Handle URL query parameters on load (e.g. ?verifyToken=... or ?resetToken=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vToken = params.get('verifyToken');
    const rToken = params.get('resetToken');
    const emailParam = params.get('email');

    if (vToken) {
      setVerifyToken(vToken);
      if (emailParam) setEmail(emailParam);
      setMode('verify');
      handleVerifyTokenDirect(vToken, emailParam || undefined);
    } else if (rToken) {
      setResetToken(rToken);
      if (emailParam) setEmail(emailParam);
      setMode('reset');
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerifyTokenDirect = async (token: string, targetEmail?: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await apiClient.verifyEmail(token, targetEmail);
      setSuccessMessage(res.message || 'E-posta adresiniz başarıyla doğrulandı.');
    } catch (err: any) {
      setErrorMessage(err.error || 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.');
    } finally {
      setLoading(false);
    }
  };

  // Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setDebugActionUrl(null);

    if (!email.trim() || !password) {
      setErrorMessage('Lütfen e-posta adresinizi ve şifrenizi giriniz.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.login(email.trim(), password, rememberMe);
      showToast('Giriş başarılı. Hoş geldiniz!', 'success');
      setCurrentUser(res.user);
    } catch (err: any) {
      if (err.unverified) {
        setPendingVerificationEmail(err.email || email.trim());
        setErrorMessage(err.error || 'E-posta adresiniz henüz doğrulanmamıştır.');
      } else if (err.pendingApproval) {
        setErrorMessage(err.error || 'Hesabınız Bursa MEB AKUB yöneticisi tarafından henüz onaylanmamıştır.');
      } else {
        setErrorMessage(err.error || 'E-posta adresi veya şifre hatalı.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Admin Login
  const handleQuickAdminLogin = async () => {
    setEmail('admin@bursamebakub.gov.tr');
    setPassword('Akub2026!');
    setErrorMessage(null);
    try {
      setLoading(true);
      const res = await apiClient.login('admin@bursamebakub.gov.tr', 'Akub2026!', true);
      showToast('Yönetici olarak giriş yapıldı.', 'success');
      setCurrentUser(res.user);
    } catch (err: any) {
      setErrorMessage(err.error || 'Giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  // Register Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setDebugActionUrl(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Ad ve Soyad alanları zorunludur.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('E-posta adresi zorunludur.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Şifreler eşleşmiyor. Lütfen kontrol ediniz.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Şifre en az 8 karakter uzunluğunda olmalıdır.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.register({
        firstName,
        lastName,
        email: email.trim(),
        password,
        confirmPassword,
      });

      setPendingVerificationEmail(res.email || email.trim());
      setSuccessMessage(res.message);
      if (res.actionUrl) {
        setDebugActionUrl(res.actionUrl);
      }
      setResendCooldown(60);
      showToast('Kayıt oluşturuldu. Lütfen e-postanızı doğrulayınız.', 'info');
    } catch (err: any) {
      setErrorMessage(err.error || 'Kayıt işlemi başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  // Resend Verification Email
  const handleResendVerification = async () => {
    const targetEmail = pendingVerificationEmail || email.trim();
    if (!targetEmail) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await apiClient.resendVerification(targetEmail);
      setSuccessMessage(res.message);
      if (res.actionUrl) {
        setDebugActionUrl(res.actionUrl);
      }
      setResendCooldown(60);
      showToast('Doğrulama e-postası tekrar gönderildi.', 'info');
    } catch (err: any) {
      setErrorMessage(err.error || 'Tekrar gönderim başarısız.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Submit
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setDebugActionUrl(null);

    if (!email.trim()) {
      setErrorMessage('Lütfen e-posta adresinizi giriniz.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.forgotPassword(email.trim());
      setSuccessMessage(res.message);
      if (res.actionUrl) {
        setDebugActionUrl(res.actionUrl);
      }
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMessage(err.error || 'İşlem başarısız.');
    } finally {
      setLoading(false);
    }
  };

  // Reset Password Submit
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!password) {
      setErrorMessage('Yeni şifre zorunludur.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Şifreler birbiriyle eşleşmiyor.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Şifre en az 8 karakter olmalıdır.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.resetPassword({
        email: email.trim(),
        token: resetToken || '',
        newPassword: password,
        confirmPassword,
      });

      setSuccessMessage(res.message);
      showToast('Şifreniz güncellendi. Giriş yapabilirsiniz.', 'success');
      setTimeout(() => {
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.error || 'Şifre sıfırlanamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden font-sans">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 text-white">
        {/* Bursa MEB AKUB Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 shadow-xl shadow-rose-950/50 mx-auto">
            <ShieldAlert className="w-9 h-9 text-white" />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Bursa MEB AKUB
            </h1>
            <p className="text-xs font-semibold text-amber-400 mt-0.5">
              Üye ve Etkinlik Takip Sistemi
            </p>
          </div>
        </div>

        {/* Feedback Alert Messages */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5 animate-slide-up">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-start gap-2.5 animate-slide-up">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex-1 leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* Development Direct Action Link Banner */}
        {debugActionUrl && (
          <div className="mb-5 p-3 rounded-xl bg-blue-950/80 border border-blue-800 text-blue-200 text-xs space-y-2">
            <div className="font-semibold flex items-center gap-1.5 text-blue-300">
              <Mail className="w-3.5 h-3.5" /> E-posta Bağlantısı (Doğrudan Test)
            </div>
            <p className="text-[11px] text-blue-300/80">
              Simüle edilen e-postadaki işlem bağlantısını hemen test edebilirsiniz:
            </p>
            <a
              href={debugActionUrl}
              className="inline-block text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition"
            >
              Bağlantıyı Aç →
            </a>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 1: LOGIN (Giriş Yap) */}
        {/* ========================================================================= */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@bursamebakub.gov.tr"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Şifre
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 transition"
                >
                  Şifremi Unuttum
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition"
                  title={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 text-rose-600 focus:ring-rose-500 bg-slate-800"
                />
                <span>Beni Hatırla</span>
              </label>

              {pendingVerificationEmail && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendCooldown > 0 || loading}
                  className="text-[11px] text-amber-400 hover:text-amber-300 transition disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Yeniden Gönder (${resendCooldown}s)` : 'Doğrulama E-postası Gönder'}
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Giriş Yapılıyor...</span>
                </>
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick Demo Admin Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleQuickAdminLogin}
                disabled={loading}
                className="w-full py-2 rounded-xl text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center gap-2 transition"
                title="Varsayılan Bursa MEB AKUB Yöneticisi: admin@bursamebakub.gov.tr"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Yönetici Olarak Hızlı Giriş (admin@bursamebakub.gov.tr)</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
              Hesabınız yok mu?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="font-bold text-rose-400 hover:text-rose-300 transition"
              >
                Kayıt Ol
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: REGISTER (Kayıt Ol) */}
        {/* ========================================================================= */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Ad *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Örn: Ahmet"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Soyad *
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Örn: Yılmaz"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                E-posta Adresi *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ad.soyad@meb.gov.tr"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Şifre (En az 8 karakter, harf ve rakam) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Şifre Tekrar *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Hesap Oluşturuluyor...</span>
                </>
              ) : (
                <span>Kayıt Ol ve Doğrulama İste</span>
              )}
            </button>

            {pendingVerificationEmail && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendCooldown > 0 || loading}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Doğrulama e-postasını tekrar gönder (${resendCooldown}s)` : 'Doğrulama E-postasını Tekrar Gönder'}
                </button>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 text-center text-xs text-slate-400">
              Zaten hesabınız var mı?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="font-bold text-rose-400 hover:text-rose-300"
              >
                Giriş Yap
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* MODE 3: FORGOT PASSWORD (Şifremi Unuttum) */}
        {/* ========================================================================= */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
            <div className="text-center space-y-1">
              <KeyRound className="w-8 h-8 text-rose-500 mx-auto" />
              <h3 className="font-bold text-sm text-white">Şifre Sıfırlama Talebi</h3>
              <p className="text-[11px] text-slate-400">
                Hesabınıza ait e-posta adresini giriniz. Güvenli sıfırlama bağlantısı gönderilecektir.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@bursamebakub.gov.tr"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || resendCooldown > 0}
              className="w-full py-2.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Gönderiliyor...</span>
                </>
              ) : resendCooldown > 0 ? (
                <span>Tekrar denemek için bekleyin ({resendCooldown}s)</span>
              ) : (
                <span>Sıfırlama Bağlantısı Gönder</span>
              )}
            </button>

            <div className="pt-3 border-t border-slate-800 text-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ← Giriş Ekranına Dön
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* MODE 4: VERIFY EMAIL SCREEN (Doğrulama Ekranı) */}
        {/* ========================================================================= */}
        {mode === 'verify' && (
          <div className="text-center space-y-4 py-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-white">E-posta Doğrulaması</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {successMessage || errorMessage || 'Doğrulama işlemi kontrol ediliyor...'}
            </p>

            <button
              onClick={() => {
                window.history.replaceState({}, '', window.location.pathname);
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="px-6 py-2.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white text-xs transition shadow-lg"
            >
              Giriş Ekranına Geç
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 5: RESET PASSWORD SCREEN (Yeni Şifre Belirleme) */}
        {/* ========================================================================= */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
            <div className="text-center space-y-1 mb-2">
              <KeyRound className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="font-bold text-sm text-white">Yeni Şifrenizi Belirleyin</h3>
              <p className="text-[11px] text-slate-400">
                Lütfen en az 8 karakterli, harf ve rakam içeren güçlü bir şifre seçiniz.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Yeni Şifre *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Yeni Şifre Tekrar *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Şifre Güncelleniyor...</span>
                </>
              ) : (
                <span>Şifreyi Değiştir ve Giriş Yap</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
