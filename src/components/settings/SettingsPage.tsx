import React, { useState, useEffect } from 'react';
import { TeamPosition, EventType } from '../../types/index.ts';
import { apiClient } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import {
  Settings,
  Shield,
  CalendarCheck2,
  Download,
  Plus,
  Trash2,
  CheckCircle,
  Database,
  Lock,
  Sliders,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { refreshTrigger, triggerRefresh, showToast, currentUserRole } = useApp();

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [positions, setPositions] = useState<TeamPosition[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);

  // New Position state
  const [newPositionName, setNewPositionName] = useState('');
  const [newPositionDesc, setNewPositionDesc] = useState('');

  // New Event Type state
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#2563EB');

  useEffect(() => {
    loadSettings();
  }, [refreshTrigger]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getSettings();
      setSettings(res.settings);
      setPositions(res.positions);
      setEventTypes(res.eventTypes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSingleCoordinator = async () => {
    if (currentUserRole !== 'ADMIN') {
      showToast('Bu ayarı yalnızca Sistem Yöneticisi değiştirebilir.', 'error');
      return;
    }
    const current = settings['single_coordinator_per_event'] !== 'false';
    const nextVal = current ? 'false' : 'true';
    try {
      await apiClient.updateSetting('single_coordinator_per_event', nextVal);
      setSettings({ ...settings, single_coordinator_per_event: nextVal });
      showToast(`Etkinlik başına tek Ekip Sorumlusu kuralı ${nextVal === 'true' ? 'aktif edildi' : 'kaldırıldı'}.`, 'success');
    } catch (err: any) {
      showToast('Ayar güncellenemedi.', 'error');
    }
  };

  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPositionName.trim()) return;
    try {
      await apiClient.addTeamPosition(newPositionName.trim(), newPositionDesc.trim() || undefined);
      showToast('Yeni ekip görevi başarıyla eklendi.', 'success');
      setNewPositionName('');
      setNewPositionDesc('');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Eklenemedi.', 'error');
    }
  };

  const handleDeletePosition = async (id: number) => {
    if (!confirm('Bu görev tanımını silmek istediğinize emin misiniz?')) return;
    try {
      await apiClient.deleteTeamPosition(id);
      showToast('Görev tanımı silindi.', 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast('Silinemedi.', 'error');
    }
  };

  const handleAddEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    try {
      await apiClient.addEventType(newTypeName.trim(), newTypeColor);
      showToast('Yeni etkinlik türü eklendi.', 'success');
      setNewTypeName('');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Eklenemedi.', 'error');
    }
  };

  const handleDeleteEventType = async (id: number) => {
    if (!confirm('Bu etkinlik türünü silmek istediğinize emin misiniz?')) return;
    try {
      await apiClient.deleteEventType(id);
      showToast('Etkinlik türü silindi.', 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast('Silinemedi.', 'error');
    }
  };

  const handleBackupExport = async () => {
    try {
      const backup = await apiClient.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EkipTakip_SQL_Yedek_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Veritabanı yedeği JSON formatında başarıyla indirildi.', 'success');
    } catch (err: any) {
      showToast('Yedek indirilemedi.', 'error');
    }
  };

  const singleCoordinatorActive = settings['single_coordinator_per_event'] !== 'false';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-rose-600" /> Sistem Ayarları ve Yapılandırma
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ekip görevleri, etkinlik kuralları, KVKK gizlilik protokolleri ve veritabanı yedekleme.
          </p>
        </div>

        <button
          onClick={handleBackupExport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white border border-slate-700 shadow-xs transition"
        >
          <Database className="w-4 h-4 text-emerald-400" /> Tam Veritabanı Yedeği İndir (JSON)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: EVENT RULES & LOGIC */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Sliders className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Etkinlik ve Operasyon Kuralları
            </h3>
          </div>

          {/* Single Coordinator Rule Toggle */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-bold text-xs text-slate-900 dark:text-white block">
                Etkinlik Başına Tek Ekip Sorumlusu Kuralı
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Açık olduğunda, bir etkinliğe yalnızca 1 Ekip Sorumlusu atanabilir. Kapalı olduğunda birden fazla sorumlu atanmasına izin verilir.
              </p>
            </div>

            <button
              onClick={handleToggleSingleCoordinator}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                singleCoordinatorActive ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  singleCoordinatorActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Event Types Management */}
          <div className="space-y-3">
            <span className="font-bold text-xs text-slate-900 dark:text-white block">
              Tanımlı Etkinlik Türleri
            </span>
            <div className="space-y-1.5">
              {eventTypes.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: t.badgeColor || '#2563EB' }}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{t.name}</span>
                  </div>
                  {currentUserRole === 'ADMIN' && (
                    <button
                      onClick={() => handleDeleteEventType(t.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {currentUserRole === 'ADMIN' && (
              <form onSubmit={handleAddEventType} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Yeni etkinlik türü (örn: Seminer)"
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-500"
                >
                  Ekle
                </button>
              </form>
            )}
          </div>
        </div>

        {/* SECTION 2: TEAM POSITIONS (Ekip Görevleri) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Shield className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Tanımlı Ekip Görevleri ve Pozisyonlar
            </h3>
          </div>

          <p className="text-xs text-slate-500">
            Üye kayıtlarında seçilebilen dinamik görev listesi:
          </p>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {positions.map((pos) => (
              <div
                key={pos.id}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    {pos.name}
                  </span>
                  {pos.description && (
                    <span className="text-[11px] text-slate-400 block">{pos.description}</span>
                  )}
                </div>
                {currentUserRole === 'ADMIN' && (
                  <button
                    onClick={() => handleDeletePosition(pos.id)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {currentUserRole === 'ADMIN' && (
            <form onSubmit={handleAddPosition} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <input
                type="text"
                value={newPositionName}
                onChange={(e) => setNewPositionName(e.target.value)}
                placeholder="Yeni görev adı (örn: İHA / Dron Pilotu)"
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPositionDesc}
                  onChange={(e) => setNewPositionDesc(e.target.value)}
                  placeholder="Görev açıklaması (isteğe bağlı)"
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-500"
                >
                  Görev Ekle
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
