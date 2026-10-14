import React, { useState } from 'react';
import { SavedReport, ReportFilterState } from '../../types/index.ts';
import { apiClient } from '../../services/api.ts';
import { X, BookmarkPlus, Check, Trash2, Calendar, FileText } from 'lucide-react';
import { formatDateTR } from '../../lib/formatters.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dataSource: 'members' | 'events' | 'participations';
  category: string;
  selectedColumns: string[];
  filters: ReportFilterState;
  savedReports: SavedReport[];
  onReportSaved: (report: SavedReport) => void;
  onReportLoaded: (report: SavedReport) => void;
  onReportDeleted: (id: number) => void;
}

export const SaveReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  dataSource,
  category,
  selectedColumns,
  filters,
  savedReports,
  onReportSaved,
  onReportLoaded,
  onReportDeleted,
}) => {
  const [reportName, setReportName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportName.trim()) {
      setError('Lütfen bir rapor şablon adı giriniz.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const created = await apiClient.createSavedReport({
        name: reportName.trim(),
        description: description.trim() || null,
        category,
        dataSource,
        selectedColumns,
        filters,
      });

      onReportSaved(created);
      setReportName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Rapor şablonu kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu kayıtlı rapor şablonunu silmek istediğinize emin misiniz?')) return;
    try {
      await apiClient.deleteSavedReport(id);
      onReportDeleted(id);
    } catch (err) {
      alert('Rapor silinemedi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <BookmarkPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Rapor Şablonunu Kaydet / Yönet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Oluşturduğunuz filtreleri ve sütun seçimini daha sonra tek tıkla kullanmak üzere kaydedin.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* New Report Form */}
          <form onSubmit={handleSave} className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <BookmarkPlus className="w-4 h-4 text-rose-600" /> Yeni Rapor Tanımı Oluştur
            </h4>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Rapor Şablon Adı *
              </label>
              <input
                type="text"
                required
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Örn: Osmangazi Aktif Kentsel Arama Ekibi"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Açıklama / Not (İsteğe Bağlı)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Bu raporun kullanım amacı veya periyodu..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                Seçili: {selectedColumns.length} sütun | Veri Kaynağı: {dataSource}
              </span>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Şablonu Kaydet
              </button>
            </div>
          </form>

          {/* Existing Saved Reports List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Kayıtlı Raporlarım ({savedReports.length})
            </h4>

            {savedReports.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Henüz kayıtlı özel rapor şablonu bulunmuyor.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {savedReports.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs hover:border-slate-300 dark:hover:border-slate-600 transition"
                  >
                    <div className="space-y-0.5 min-w-0 pr-3">
                      <h5 className="font-bold text-slate-900 dark:text-white truncate">
                        {r.name}
                      </h5>
                      {r.description && (
                        <p className="text-[11px] text-slate-500 truncate">
                          {r.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                        <span>{r.dataSource === 'members' ? 'Üyeler' : r.dataSource === 'events' ? 'Etkinlikler' : 'Katılımlar'}</span>
                        <span>•</span>
                        <span>{r.selectedColumns.length} Sütun</span>
                        <span>•</span>
                        <span>{formatDateTR(r.createdAt || '')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onReportLoaded(r);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg font-bold text-[11px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition"
                      >
                        Yükle ve Çalıştır →
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        title="Şablonu Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
