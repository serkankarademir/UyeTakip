import React, { useState, useEffect } from 'react';
import { TeamEvent } from '../../types/index.ts';
import { apiClient } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import { formatDateTR, formatPhoneTR, exportToExcel } from '../../lib/formatters.ts';
import {
  X,
  CalendarCheck2,
  MapPin,
  Clock,
  Printer,
  FileSpreadsheet,
  Users,
  Shield,
  Edit2,
  CheckCircle,
} from 'lucide-react';

interface Props {
  eventId: number;
  onClose: () => void;
  onEdit: (e: TeamEvent) => void;
}

export const EventDetailModal: React.FC<Props> = ({ eventId, onClose, onEdit }) => {
  const { currentUserRole, showToast } = useApp();
  const [event, setEvent] = useState<TeamEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetails();
  }, [eventId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getEventById(eventId);
      setEvent(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !event) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Etkinlik detayları yükleniyor...</p>
        </div>
      </div>
    );
  }

  const leader = event.participants?.find((p) => p.role === 'Ekip Sorumlusu');
  const otherParticipants = event.participants?.filter((p) => p.role !== 'Ekip Sorumlusu') || [];

  const handleExportRoster = () => {
    if (!event.participants || event.participants.length === 0) {
      showToast('Dışa aktarılacak katılımcı bulunmuyor.', 'info');
      return;
    }
    // Safe roster export (NO health, NO TC Kimlik data!)
    const exportData = event.participants.map((p, i) => ({
      'Sıra': i + 1,
      'Üye No': p.memberNo,
      'Ad Soyad': `${p.firstName} ${p.lastName}`,
      'Ekip Görevi': p.teamPosition,
      'Etkinlikteki Rolü': p.role,
      'İletişim Telefonu': formatPhoneTR(p.phone),
      'Branşı': p.branch || '-',
      'Katılım Durumu': p.attended ? 'Katıldı' : 'Mazeretli',
    }));

    exportToExcel(
      `${event.title.replace(/\s+/g, '_')}_Katilimci_Listesi`,
      'Katılımcılar',
      exportData
    );
    showToast('Etkinlik katılımcı listesi Excel formatında indirildi.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Top Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                    event.eventType === 'Operasyon'
                      ? 'bg-rose-500 text-white'
                      : event.eventType === 'Tatbikat'
                      ? 'bg-amber-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  {event.eventType}
                </span>

                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                    event.status === 'Planlanan'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : event.status === 'Devam Ediyor'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {event.status}
                </span>

                <span className="text-xs text-slate-300 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {event.participants?.length || 0} Katılımcı
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {event.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  {formatDateTR(event.startDateTime, true)} - {formatDateTR(event.endDateTime, true)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  {event.city} / {event.district}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex sm:flex-col gap-2 flex-shrink-0">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" /> Yazdır
              </button>
              <button
                onClick={handleExportRoster}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-xs transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel Listesi
              </button>
              {currentUserRole !== 'VIEWER' && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit(event);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition"
                >
                  Düzenle
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Details & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-slate-500 dark:text-slate-400 font-semibold block">
                Operasyon & Konum Alanı
              </span>
              <p className="text-slate-900 dark:text-white font-medium text-sm">
                {event.city} - {event.district}
              </p>
              {event.locationDetail && (
                <p className="text-slate-600 dark:text-slate-300 mt-1">
                  {event.locationDetail}
                </p>
              )}
            </div>

            {/* Ekip Sorumlusu Card */}
            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-1">
              <span className="text-rose-700 dark:text-rose-400 font-bold block flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> Faaliyet Ekip Sorumlusu
              </span>
              {leader ? (
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-9 h-9 rounded-full bg-rose-200 dark:bg-rose-800 flex items-center justify-center font-bold text-rose-900 dark:text-rose-100 overflow-hidden flex-shrink-0">
                    {leader.photoUrl ? (
                      <img src={leader.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      `${leader.firstName?.[0] || '?'}${leader.lastName?.[0] || '?'}`
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {leader.firstName} {leader.lastName}
                    </h4>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {leader.memberNo} • {leader.teamPosition} • {formatPhoneTR(leader.phone)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 pt-1">Henüz Ekip Sorumlusu atanmamış.</p>
              )}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-slate-500 dark:text-slate-400 font-semibold block">
                Etkinlik Açıklaması ve Senaryo
              </span>
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Participant Roster */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-600" /> Katılımcı Ekip Rosterı ({event.participants?.length || 0})
              </h3>
              <span className="text-[11px] text-slate-400">
                Güvenlik Uyarısı: Katılımcı çıktısında sağlık veya TC kimlik gibi kişisel veriler yer almaz.
              </span>
            </div>

            {(!event.participants || event.participants.length === 0) ? (
              <p className="text-center py-6 text-slate-400 border border-dashed rounded-2xl">
                Bu etkinliğe henüz katılımcı kaydedilmemiş.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2.5 px-3 w-10 text-center">Foto</th>
                      <th className="py-2.5 px-3">Üye No</th>
                      <th className="py-2.5 px-3">Adı Soyadı</th>
                      <th className="py-2.5 px-3">Ekip Görevi</th>
                      <th className="py-2.5 px-3">Etkinlikteki Rolü</th>
                      <th className="py-2.5 px-3">Telefon</th>
                      <th className="py-2.5 px-3 text-center">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {event.participants.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-center">
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-200 overflow-hidden">
                            {p.photoUrl ? (
                              <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              `${p.firstName?.[0] || '?'}${p.lastName?.[0] || '?'}`
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-600 dark:text-slate-400">
                          {p.memberNo}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                          {p.firstName} {p.lastName}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                          {p.teamPosition}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded ${
                              p.role === 'Ekip Sorumlusu'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {p.role}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
                          {formatPhoneTR(p.phone)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Katıldı
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
