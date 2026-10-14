import React, { useState, useEffect } from 'react';
import { User, AuditLog, UserRole } from '../../types/index.ts';
import { apiClient } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import { formatDateTR } from '../../lib/formatters.ts';
import {
  ShieldCheck,
  UserCheck,
  Eye,
  Plus,
  Clock,
  Shield,
  Activity,
  CheckCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { refreshTrigger, triggerRefresh, showToast, currentUserRole } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [emailNotifications, setEmailNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New user modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('VIEWER');

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [uRes, aRes, nRes] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getAuditLogs(50),
        apiClient.getEmailNotifications().catch(() => []),
      ]);
      setUsers(uRes.users);
      setAuditLogs(aRes);
      setEmailNotifications(nRes);
    } catch (err: any) {
      showToast('Kullanıcılar veya loglar yüklenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      await apiClient.updateUserRole(userId, role);
      showToast('Kullanıcı yetkisi güncellendi.', 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast('Yetki güncellenemedi.', 'error');
    }
  };

  const handleApproveUser = async (userId: number, targetRole: UserRole) => {
    try {
      await apiClient.approveUser(userId, { role: targetRole, isApproved: true });
      showToast('Kullanıcı başarıyla onaylandı ve yetkilendirildi.', 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast('Kullanıcı onaylanamadı.', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), displayName: displayName.trim(), role: newRole }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Yeni sistem kullanıcısı eklendi.', 'success');
      setIsModalOpen(false);
      setEmail('');
      setDisplayName('');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Hata oluştu.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-rose-600" /> Kullanıcılar, Yetkiler ve Denetim Kayıtları
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rol tabanlı yetkilendirme (RBAC), hassas veri koruması ve KVKK uyumlu işlem denetim günlüğü.
          </p>
        </div>

        {currentUserRole === 'ADMIN' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Yeni Yetkili Ekle
          </button>
        )}
      </div>

      {/* RBAC Roles Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-1.5">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
            <ShieldCheck className="w-4 h-4" /> Sistem Yöneticisi (ADMIN)
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Tüm sistem ayarlarına, hassas sağlık kayıtlarına, üye ve etkinlik silme/düzenleme işlemlerine tam yetkili.
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-1.5">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-sm">
            <UserCheck className="w-4 h-4" /> Üye Yöneticisi (MEMBER_MANAGER)
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Üye kayıt, güncelleme ve etkinlik yönetimi yapabilir. Sistem çekirdek ayarlarını değiştiremez.
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
            <Eye className="w-4 h-4" /> Sınırlı Görüntüleyici (VIEWER)
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Yalnızca genel listeleri okuma yetkisi. Sağlık verileri ve T.C. kimlik numaraları maskelenir.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-2 p-5">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose-600" /> Yetkili Sistem Kullanıcıları & Başvurular
        </h3>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3">Kullanıcı Adı / E-posta</th>
                <th className="py-2.5 px-3">Tanımlı Rol</th>
                <th className="py-2.5 px-3">E-posta Doğrulama</th>
                <th className="py-2.5 px-3">Hesap Onayı</th>
                <th className="py-2.5 px-3">Kayıt Tarihi</th>
                {currentUserRole === 'ADMIN' && <th className="py-2.5 px-3 text-right">İşlem / Rol</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {u.displayName || u.email.split('@')[0]}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono block">{u.email}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`font-semibold px-2.5 py-1 rounded-md text-[11px] ${
                        u.role === 'ADMIN'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : u.role === 'MEMBER_MANAGER'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : u.role === 'PENDING'
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {u.role === 'ADMIN'
                        ? 'Sistem Yöneticisi'
                        : u.role === 'MEMBER_MANAGER'
                        ? 'Üye Yöneticisi'
                        : u.role === 'PENDING'
                        ? 'Beklemede'
                        : 'Sınırlı Görüntüleyici'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {u.isEmailVerified ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" /> Doğrulandı
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                        <Clock className="w-3.5 h-3.5" /> Doğrulama Bekliyor
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {u.isApproved ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Onaylı</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-rose-600 dark:text-rose-400">Onay Bekliyor</span>
                        {currentUserRole === 'ADMIN' && (
                          <button
                            onClick={() => handleApproveUser(u.id, 'VIEWER')}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition"
                            title="Hesabı onayla ve Görüntüleyici olarak yetkilendir"
                          >
                            Hızlı Onayla
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">
                    {formatDateTR(u.createdAt, true)}
                  </td>
                  {currentUserRole === 'ADMIN' && (
                    <td className="py-2.5 px-3 text-right">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-xs"
                      >
                        <option value="ADMIN">ADMIN (Yönetici)</option>
                        <option value="MEMBER_MANAGER">MEMBER_MANAGER (Üye Yöneticisi)</option>
                        <option value="VIEWER">VIEWER (Sınırlı)</option>
                        <option value="PENDING">PENDING (Beklemede)</option>
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatched Email Notifications (Doğrulama ve Şifre Sıfırlama E-postaları) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Sistem E-posta Bildirimleri (Doğrulama & Şifre Sıfırlama)
            </h3>
            <p className="text-xs text-slate-500">
              Kayıt olan üyelere ve şifre sıfırlama taleplerine gönderilen e-posta işlem bağlantıları.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500">
            {emailNotifications.length} Bildirim
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 px-3">Tarih</th>
                <th className="py-2 px-3">Alıcı E-posta</th>
                <th className="py-2 px-3">Bildirim Türü</th>
                <th className="py-2 px-3">Durum</th>
                <th className="py-2 px-3 text-right">İşlem Bağlantısı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {emailNotifications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400">
                    Henüz gönderilmiş e-posta kaydı bulunmuyor.
                  </td>
                </tr>
              ) : (
                emailNotifications.map((notif: any) => {
                  const actionUrl = `/?${notif.type === 'VERIFICATION' ? 'verifyToken' : 'resetToken'}=${notif.token}&email=${encodeURIComponent(notif.recipientEmail)}`;
                  return (
                    <tr key={notif.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {formatDateTR(notif.createdAt, true)}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {notif.recipientEmail}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`font-semibold text-[10px] px-2 py-0.5 rounded ${
                            notif.type === 'VERIFICATION'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {notif.type === 'VERIFICATION' ? 'E-posta Doğrulama' : 'Şifre Sıfırlama'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {notif.isUsed ? (
                          <span className="text-slate-400 font-medium text-[11px]">Kullanıldı</span>
                        ) : (
                          <span className="text-emerald-600 font-medium text-[11px]">Beklemede / Aktif</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <a
                          href={actionUrl}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-semibold text-[11px] transition"
                        >
                          Bağlantıyı Test Et →
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Audit Logs (Denetim Kayıtları) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-600" /> Sistem Denetim ve Güvenlik Kayıtları (Audit Logs)
            </h3>
            <p className="text-xs text-slate-500">
              Kullanıcıların gerçekleştirdiği veri oluşturma, güncelleme, silme ve sağlık kaydı erişimleri.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500">
            Son 50 İşlem
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3">Tarih & Saat</th>
                <th className="py-2.5 px-3">İşlem Türü</th>
                <th className="py-2.5 px-3">Etkilenen Varlık</th>
                <th className="py-2.5 px-3">Açıklama / Detay</th>
                <th className="py-2.5 px-3">İşlemi Yapan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    Henüz kayıtlı denetim logu bulunmuyor.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTR(log.createdAt, true)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                          log.action === 'CREATE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : log.action === 'UPDATE'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : log.action === 'DELETE'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {log.entityType}
                    </td>
                    <td className="py-2 px-3 text-slate-800 dark:text-slate-200">
                      {log.details || '-'}
                    </td>
                    <td className="py-2 px-3 text-slate-500 font-mono whitespace-nowrap">
                      {log.userEmail || 'Sistem'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
              Yeni Sistem Kullanıcısı Tanımla
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  E-posta Adresi *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kullanici@ekiptakip.org"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ad Soyad / Görünen İsim
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Örn: Serkan Karademir"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kullanıcı Rolü *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                >
                  <option value="VIEWER">Sınırlı Görüntüleyici (VIEWER)</option>
                  <option value="MEMBER_MANAGER">Üye Yöneticisi (MEMBER_MANAGER)</option>
                  <option value="ADMIN">Sistem Yöneticisi (ADMIN)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-500"
                >
                  Kullanıcıyı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
