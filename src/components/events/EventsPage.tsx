import React, { useState, useEffect } from 'react';
import { TeamEvent } from '../../types/index.ts';
import { apiClient } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import { formatDateTR, exportToExcel, ISTANBUL_DISTRICTS } from '../../lib/formatters.ts';
import { EventFormModal } from './EventFormModal.tsx';
import { EventDetailModal } from './EventDetailModal.tsx';
import {
  CalendarCheck2,
  Search,
  Plus,
  FileSpreadsheet,
  Eye,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  Users,
  AlertTriangle,
} from 'lucide-react';

export const EventsPage: React.FC = () => {
  const { refreshTrigger, triggerRefresh, showToast, currentUserRole, selectedEventId, setSelectedEventId } = useApp();

  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('Tümü');
  const [filterStatus, setFilterStatus] = useState('Tümü');
  const [filterDistrict, setFilterDistrict] = useState('Tümü');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TeamEvent | null>(null);
  const [detailEventId, setDetailEventId] = useState<number | null>(null);

  // Deletion
  const [deletingEvent, setDeletingEvent] = useState<TeamEvent | null>(null);

  useEffect(() => {
    loadEvents();
  }, [refreshTrigger, search, filterType, filterStatus, filterDistrict]);

  useEffect(() => {
    if (selectedEventId) {
      setDetailEventId(selectedEventId);
      setSelectedEventId(null);
    }
  }, [selectedEventId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getEvents({
        search,
        type: filterType,
        status: filterStatus,
        district: filterDistrict,
      });
      setEvents(data);
    } catch (err: any) {
      showToast(err.message || 'Etkinlikler yüklenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = events.map((e) => ({
      'Etkinlik Adı': e.title,
      'Tür': e.eventType,
      'Başlangıç': formatDateTR(e.startDateTime, true),
      'Bitiş': formatDateTR(e.endDateTime, true),
      'İl': e.city,
      'İlçe': e.district,
      'Konum': e.locationDetail || '-',
      'Durum': e.status,
      'Ekip Sorumlusu': e.coordinatorName || '-',
      'Katılımcı Sayısı': e.participantCount || 0,
    }));
    exportToExcel('Ekip_Etkinlikleri_Listesi', 'Etkinlikler', exportData);
    showToast('Etkinlik listesi Excel olarak dışa aktarıldı.', 'success');
  };

  const confirmDelete = async () => {
    if (!deletingEvent) return;
    try {
      await apiClient.deleteEvent(deletingEvent.id);
      showToast('Etkinlik başarıyla silindi.', 'success');
      setDeletingEvent(null);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Silinemedi.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck2 className="w-6 h-6 text-rose-600" /> Etkinlikler ve Faaliyetler
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Toplam {events.length} operasyon, tatbikat veya eğitim kaydı listeleniyor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel'e Aktar
          </button>

          {currentUserRole !== 'VIEWER' && (
            <button
              onClick={() => {
                setEditingEvent(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition"
            >
              <Plus className="w-4 h-4" /> Yeni Etkinlik Oluştur
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Etkinlik adı, ilçe veya konum ile ara..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Tümü">Tüm Türler</option>
              <option value="Eğitim">Eğitim</option>
              <option value="Tatbikat">Tatbikat</option>
              <option value="Operasyon">Operasyon</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Tümü">Tüm Durumlar</option>
              <option value="Planlanan">Planlanan</option>
              <option value="Devam Ediyor">Devam Ediyor</option>
              <option value="Tamamlandı">Tamamlandı</option>
              <option value="İptal Edildi">İptal Edildi</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Tümü">Tüm İlçeler</option>
              {ISTANBUL_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Etkinlik Adı</th>
                <th className="py-3 px-3">Tür</th>
                <th className="py-3 px-3">Başlangıç Tarihi</th>
                <th className="py-3 px-3">Bitiş Tarihi</th>
                <th className="py-3 px-3">İl / İlçe</th>
                <th className="py-3 px-3">Ekip Sorumlusu</th>
                <th className="py-3 px-3 text-center">Katılımcı Sayısı</th>
                <th className="py-3 px-3 text-center">Durum</th>
                <th className="py-3 px-3 text-center w-28">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Etkinlikler yükleniyor...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Arama kriterlerine uygun etkinlik bulunamadı.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Title */}
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      <button
                        onClick={() => setDetailEventId(e.id)}
                        className="hover:text-rose-600 text-left font-bold transition truncate max-w-xs block"
                      >
                        {e.title}
                      </button>
                    </td>

                    {/* Type badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          e.eventType === 'Operasyon'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : e.eventType === 'Tatbikat'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {e.eventType}
                      </span>
                    </td>

                    {/* Start */}
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDateTR(e.startDateTime, true)}
                    </td>

                    {/* End */}
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDateTR(e.endDateTime, true)}
                    </td>

                    {/* Location */}
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {e.city} / {e.district}
                    </td>

                    {/* Coordinator */}
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {e.coordinatorName || '-'}
                    </td>

                    {/* Participant count */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {e.participantCount || 0}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          e.status === 'Planlanan'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : e.status === 'Devam Ediyor'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 animate-pulse'
                            : e.status === 'Tamamlandı'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDetailEventId(e.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Görüntüle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {currentUserRole !== 'VIEWER' && (
                          <>
                            <button
                              onClick={() => {
                                setEditingEvent(e);
                                setIsFormOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Düzenle"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingEvent(e)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Etkinliği Sil
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              <strong>{deletingEvent.title}</strong> isimli etkinliği silmek istediğinize emin misiniz? Katılımcı kayıtları da kaldırılacaktır.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingEvent(null)}
                className="px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                İptal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-500"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <EventFormModal
          event={editingEvent}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => triggerRefresh()}
        />
      )}

      {/* Detail Modal */}
      {detailEventId && (
        <EventDetailModal
          eventId={detailEventId}
          onClose={() => setDetailEventId(null)}
          onEdit={(e) => {
            setDetailEventId(null);
            setEditingEvent(e);
            setIsFormOpen(true);
          }}
        />
      )}
    </div>
  );
};
