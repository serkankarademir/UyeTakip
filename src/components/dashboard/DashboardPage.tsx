import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { apiClient } from '../../services/api.ts';
import { DashboardReport } from '../../types/index.ts';
import { formatDateTR, formatPhoneTR } from '../../lib/formatters.ts';
import {
  Users,
  UserCheck,
  UserX,
  CalendarCheck2,
  Clock,
  CheckCircle,
  PlusCircle,
  CalendarPlus,
  ArrowRight,
  Shield,
  MapPin,
  TrendingUp,
  Activity,
  AlertTriangle,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { setCurrentTab, refreshTrigger, setSelectedMemberId, setSelectedEventId } = useApp();
  const [data, setData] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getReportSummary();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Toplam Üye',
      value: data?.totalMembers ?? 0,
      sub: 'Kayıtlı Tüm Gönüllüler',
      icon: Users,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900',
    },
    {
      label: 'Aktif Üye',
      value: data?.activeMembers ?? 0,
      sub: 'Müdahaleye Hazır',
      icon: UserCheck,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    },
    {
      label: 'Pasif Üye',
      value: data?.passiveMembers ?? 0,
      sub: 'İzinli / Askıda',
      icon: UserX,
      color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800',
    },
    {
      label: 'Toplam Etkinlik',
      value: data?.totalEvents ?? 0,
      sub: 'Eğitim, Tatbikat & Operasyon',
      icon: CalendarCheck2,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900',
    },
    {
      label: 'Yaklaşan Etkinlik',
      value: data?.upcomingEvents ?? 0,
      sub: 'Planlanan Faaliyetler',
      icon: Clock,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    },
    {
      label: 'Tamamlanan Etkinlik',
      value: data?.completedEvents ?? 0,
      sub: 'Kapanan Görevler',
      icon: CheckCircle,
      color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/30 text-rose-300 border border-rose-500/40 mb-3">
            <Activity className="w-3.5 h-3.5" /> Canlı Sistem Durumu • Hazır
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Bursa MEB AKUB – Üye ve Etkinlik Takip Sistemi
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => setCurrentTab('members')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition"
            >
              <PlusCircle className="w-4 h-4" /> Üye Yönetimi
            </button>
            <button
              onClick={() => setCurrentTab('events')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition"
            >
              <CalendarPlus className="w-4 h-4" /> Etkinlikler ve Tatbikatlar
            </button>
          </div>
        </div>
      </div>

      {/* 6 Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between ${card.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {card.label}
                </span>
                <Icon className="w-4 h-4 opacity-80" />
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {card.value}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {card.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Split section: Recent / Upcoming Events & Recent Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent & Upcoming Events */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-slate-900 dark:text-white">
                Son ve Yaklaşan Etkinlikler
              </h3>
            </div>
            <button
              onClick={() => setCurrentTab('events')}
              className="text-xs font-semibold text-rose-600 hover:text-rose-500 flex items-center gap-1"
            >
              Tümünü Gör <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-3 flex-1">
            {(!data?.recentEvents || data.recentEvents.length === 0) ? (
              <p className="text-sm text-slate-400 py-6 text-center">Henüz etkinlik kaydı bulunmuyor.</p>
            ) : (
              data.recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => {
                    setSelectedEventId(evt.id);
                    setCurrentTab('events');
                  }}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          evt.eventType === 'Operasyon'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                            : evt.eventType === 'Tatbikat'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                        }`}
                      >
                        {evt.eventType}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {evt.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {evt.city} / {evt.district}
                      </span>
                      <span>•</span>
                      <span>{formatDateTR(evt.startDateTime, true)}</span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                      evt.status === 'Planlanan'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : evt.status === 'Devam Ediyor'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 animate-pulse'
                        : evt.status === 'Tamamlandı'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {evt.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Members Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-slate-900 dark:text-white">
                Kayıtlı Ekip Üyeleri
              </h3>
            </div>
            <button
              onClick={() => setCurrentTab('members')}
              className="text-xs font-semibold text-rose-600 hover:text-rose-500 flex items-center gap-1"
            >
              Tüm Üyeler <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-3 flex-1">
            {(!data?.recentMembers || data.recentMembers.length === 0) ? (
              <p className="text-sm text-slate-400 py-6 text-center">Henüz üye kaydı bulunmuyor.</p>
            ) : (
              data.recentMembers.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedMemberId(m.id);
                    setCurrentTab('members');
                  }}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-sm overflow-hidden flex-shrink-0">
                      {m.photoUrl ? (
                        <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        `${m.firstName[0]}${m.lastName[0]}`
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-slate-500">
                          {m.memberNo}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {m.firstName} {m.lastName}
                        </h4>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {m.teamPosition} • {m.district} • {formatPhoneTR(m.phone)}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                      m.status === 'Aktif'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Position Breakdown & Quick Stats */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-600" /> Ekip Görev Dağılımı
            </h4>
            <div className="space-y-2">
              {Object.entries(data.positionCounts || {}).map(([pos, count]) => (
                <div key={pos} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">{pos}</span>
                  <span className="font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {count} üye
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> En Aktif Katılımcılar
            </h4>
            <div className="space-y-2">
              {data.topMembers && data.topMembers.length > 0 ? (
                data.topMembers.map((tm) => (
                  <div key={tm.memberId} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {tm.name}
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {tm.count} faaliyet
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">Henüz katılım verisi yok.</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Kritik Kan Grubu Dağılımı
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(data.bloodTypeCounts || {}).map(([bt, count]) => (
                <div
                  key={bt}
                  className="p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 flex justify-between items-center"
                >
                  <span className="font-bold text-rose-700 dark:text-rose-300">{bt}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
