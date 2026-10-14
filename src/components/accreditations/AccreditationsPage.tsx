import React, { useState, useEffect } from 'react';
import { Accreditation } from '../../types/index.ts';
import { apiClient } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import { exportToExcel } from '../../lib/formatters.ts';
import {
  Award,
  Plus,
  Trash2,
  FileSpreadsheet,
  Users,
  CheckCircle,
  Clock,
  Building2,
  X,
} from 'lucide-react';

export const AccreditationsPage: React.FC = () => {
  const { refreshTrigger, triggerRefresh, showToast, currentUserRole } = useApp();
  const [accreditations, setAccreditations] = useState<Accreditation[]>([]);
  const [loading, setLoading] = useState(true);

  // New Accreditation Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [organization, setOrganization] = useState('AFAD');
  const [validityMonths, setValidityMonths] = useState(36);
  const [description, setDescription] = useState('');

  // Selected Accreditation to view members
  const [selectedAcc, setSelectedAcc] = useState<Accreditation | null>(null);

  useEffect(() => {
    loadAccreditations();
  }, [refreshTrigger]);

  const loadAccreditations = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAccreditations();
      setAccreditations(data);
      if (selectedAcc) {
        const found = data.find((a) => a.id === selectedAcc.id);
        setSelectedAcc(found || null);
      }
    } catch (err: any) {
      showToast('Akreditasyonlar yüklenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      showToast('Ad ve kod alanları zorunludur.', 'error');
      return;
    }
    try {
      await apiClient.createAccreditation({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        organization: organization.trim(),
        validityMonths: Number(validityMonths),
        description: description.trim() || null,
      });
      showToast('Yeni akreditasyon başarıyla tanımlandı.', 'success');
      setIsModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Hata oluştu.', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu akreditasyon tanımını silmek istediğinize emin misiniz?')) return;
    try {
      await apiClient.deleteAccreditation(id);
      showToast('Akreditasyon silindi.', 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Silinemedi.', 'error');
    }
  };

  const handleExportExcel = () => {
    const exportData = accreditations.map((a) => ({
      'Akreditasyon Adı': a.name,
      'Kod': a.code,
      'Yetkili Kuruluş': a.organization || '-',
      'Geçerlilik (Ay)': a.validityMonths || '-',
      'Akredite Üye Sayısı': a.memberCount || 0,
      'Açıklama': a.description || '-',
    }));
    exportToExcel('Akreditasyon_Listesi', 'Akreditasyonlar', exportData);
    showToast('Akreditasyon listesi Excel formatında indirildi.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-rose-600" /> Eğitimler ve Akreditasyonlar
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Arama kurtarma, ilkyardım ve barınma uzmanlık belgeleri ve üye yetkinlik havuzu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel Raporu
          </button>

          {currentUserRole !== 'VIEWER' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition"
            >
              <Plus className="w-4 h-4" /> Yeni Akreditasyon Tanımla
            </button>
          )}
        </div>
      </div>

      {/* Grid of Accreditations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Yükleniyor...
          </div>
        ) : (
          accreditations.map((acc) => {
            const isSelected = selectedAcc?.id === acc.id;
            return (
              <div
                key={acc.id}
                onClick={() => setSelectedAcc(isSelected ? null : acc)}
                className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 shadow-md ring-2 ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {acc.code}
                    </span>
                    {currentUserRole === 'ADMIN' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(acc.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 transition"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3">
                    {acc.name}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {acc.description || 'Akreditasyon açıklaması bulunmuyor.'}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> {acc.organization}
                  </span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {acc.memberCount || 0} üye
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Accreditation Details & Member Roster */}
      {selectedAcc && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 animate-scale-up">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                {selectedAcc.code}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedAcc.name} – Yetkili Ekip Üyeleri ({selectedAcc.members?.length || 0})
              </h3>
            </div>
            <button
              onClick={() => setSelectedAcc(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {(!selectedAcc.members || selectedAcc.members.length === 0) ? (
            <p className="text-xs text-slate-400 py-6 text-center border border-dashed rounded-xl">
              Bu akreditasyon henüz hiçbir üyeye atanmamıştır. Üye düzenleme formundan akreditasyon atayabilirsiniz.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-3">Üye No</th>
                    <th className="py-2.5 px-3">Adı Soyadı</th>
                    <th className="py-2.5 px-3">Ekip Görevi</th>
                    <th className="py-2.5 px-3">Telefon</th>
                    <th className="py-2.5 px-3">Belge No</th>
                    <th className="py-2.5 px-3">Veriliş Tarihi</th>
                    <th className="py-2.5 px-3">Geçerlilik Bitiş</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedAcc.members.map((m: any) => (
                    <tr key={m.memberAccId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                        {m.memberNo}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                        {m.firstName} {m.lastName}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                        {m.teamPosition}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {m.phone}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500">
                        {m.certificateNumber || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-500">
                        {m.issueDate || '-'}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {m.expiryDate || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* New Accreditation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-rose-600" /> Yeni Akreditasyon Tanımı
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Akreditasyon / Yeterlilik Adı *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Kentsel Arama Kurtarma"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kod (Benzersiz) *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Örn: K-AK"
                    className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Geçerlilik Süresi (Ay)
                  </label>
                  <input
                    type="number"
                    min={6}
                    max={120}
                    value={validityMonths}
                    onChange={(e) => setValidityMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Düzenleyen Kuruluş
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Örn: AFAD / INSARAG"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Açıklama & Standartlar
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Eğitim ve akreditasyon kapsamı..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
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
                  className="px-5 py-2 font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-500 shadow-md"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
