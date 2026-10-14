import React, { useState, useEffect } from 'react';
import { TeamEvent, Member, EventParticipation } from '../../types/index.ts';
import { apiClient } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import { TURKEY_CITIES } from '../../lib/formatters.ts';
import {
  X,
  CalendarCheck2,
  MapPin,
  Clock,
  UserPlus,
  Trash2,
  AlertCircle,
  AlertTriangle,
  User,
  Shield,
  Check,
} from 'lucide-react';

interface Props {
  event: TeamEvent | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EventFormModal: React.FC<Props> = ({ event, onClose, onSuccess }) => {
  const { showToast } = useApp();
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('Tatbikat');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [city, setCity] = useState('İstanbul');
  const [district, setDistrict] = useState('Kadıköy');
  const [locationDetail, setLocationDetail] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Planlanan' | 'Devam Ediyor' | 'Tamamlandı' | 'İptal Edildi'>('Planlanan');

  // Participants
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [showPassiveMembers, setShowPassiveMembers] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<
    { memberId: number; role: 'Ekip Sorumlusu' | 'Ekip Üyesi'; notes?: string; member?: Member }[]
  >([]);

  // Member search for picker
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  useEffect(() => {
    loadMembers();
    if (event) {
      loadEventDetails(event.id);
    } else {
      // Default to today and tomorrow
      const now = new Date();
      const in2Hours = new Date(now.getTime() + 4 * 3600 * 1000);
      setStartDateTime(now.toISOString().slice(0, 16));
      setEndDateTime(in2Hours.toISOString().slice(0, 16));
    }
  }, [event]);

  const loadMembers = async () => {
    try {
      const data = await apiClient.getMembers();
      setAllMembers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadEventDetails = async (id: number) => {
    try {
      const ev = await apiClient.getEventById(id);
      setTitle(ev.title || '');
      setEventType(ev.eventType || 'Tatbikat');
      setStartDateTime(ev.startDateTime ? ev.startDateTime.slice(0, 16) : '');
      setEndDateTime(ev.endDateTime ? ev.endDateTime.slice(0, 16) : '');
      setCity(ev.city || 'İstanbul');
      setDistrict(ev.district || 'Kadıköy');
      setLocationDetail(ev.locationDetail || '');
      setDescription(ev.description || '');
      setStatus(ev.status || 'Planlanan');

      if (ev.participants && Array.isArray(ev.participants)) {
        const mapped = ev.participants.map((p) => {
          const m = allMembers.find((mem) => mem.id === p.memberId);
          return {
            memberId: p.memberId || 0,
            role: p.role,
            notes: p.notes || '',
            member: m,
          };
        });
        setSelectedParticipants(mapped);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Connected District list
  const availableDistricts = TURKEY_CITIES[city] || TURKEY_CITIES['İstanbul'] || [];

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    const firstDistrict = TURKEY_CITIES[newCity]?.[0] || 'Kadıköy';
    setDistrict(firstDistrict);
  };

  const handleAddParticipant = (member: Member) => {
    // Check if already added
    if (selectedParticipants.some((p) => p.memberId === member.id)) {
      showToast(`${member.firstName} ${member.lastName} zaten etkinliğe eklenmiştir.`, 'error');
      return;
    }

    // Default role: if no Ekip Sorumlusu exists, assign Ekip Sorumlusu or Ekip Üyesi
    const hasLeader = selectedParticipants.some((p) => p.role === 'Ekip Sorumlusu');
    const role: 'Ekip Sorumlusu' | 'Ekip Üyesi' = hasLeader ? 'Ekip Üyesi' : 'Ekip Sorumlusu';

    if (member.status === 'Pasif') {
      showToast(`Uyarı: ${member.firstName} ${member.lastName} pasif durumdadır.`, 'info');
    }

    setSelectedParticipants([
      ...selectedParticipants,
      { memberId: member.id, role, member },
    ]);
    setShowMemberPicker(false);
  };

  const handleRemoveParticipant = (memberId: number) => {
    setSelectedParticipants(selectedParticipants.filter((p) => p.memberId !== memberId));
  };

  const handleRoleChange = (memberId: number, role: 'Ekip Sorumlusu' | 'Ekip Üyesi') => {
    // If setting to Ekip Sorumlusu, ensure only 1 coordinator
    if (role === 'Ekip Sorumlusu') {
      const otherLeader = selectedParticipants.find((p) => p.role === 'Ekip Sorumlusu' && p.memberId !== memberId);
      if (otherLeader) {
        // Demote other leader to Ekip Üyesi
        setSelectedParticipants(
          selectedParticipants.map((p) => {
            if (p.memberId === memberId) return { ...p, role: 'Ekip Sorumlusu' };
            if (p.memberId === otherLeader.memberId) return { ...p, role: 'Ekip Üyesi' };
            return p;
          })
        );
        showToast('Ekip Sorumlusu güncellendi (önceki sorumlu üye yapıldı).', 'info');
        return;
      }
    }

    setSelectedParticipants(
      selectedParticipants.map((p) => (p.memberId === memberId ? { ...p, role } : p))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Etkinlik Adı zorunludur.', 'error');
      return;
    }
    if (!startDateTime || !endDateTime) {
      showToast('Başlangıç ve Bitiş tarihleri zorunludur.', 'error');
      return;
    }

    // Date validation
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (start > end) {
      showToast('Başlangıç tarihi ve saati, bitiş tarihinden sonra olamaz!', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        eventType,
        startDateTime,
        endDateTime,
        city,
        district,
        locationDetail: locationDetail.trim() || null,
        description: description.trim() || null,
        status,
        participants: selectedParticipants.map((p) => ({
          memberId: p.memberId,
          role: p.role,
          notes: p.notes || null,
          attended: true,
        })),
      };

      if (event) {
        await apiClient.updateEvent(event.id, payload);
        showToast('Etkinlik ve katılımcılar güncellendi.', 'success');
      } else {
        await apiClient.createEvent(payload);
        showToast('Yeni etkinlik başarıyla oluşturuldu.', 'success');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Etkinlik kaydedilemedi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filter members for picker
  const eligibleMembers = allMembers.filter((m) => {
    if (!showPassiveMembers && m.status === 'Pasif') return false;
    if (selectedParticipants.some((p) => p.memberId === m.id)) return false;
    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase();
      return (
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.memberNo.toLowerCase().includes(q) ||
        m.teamPosition.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarCheck2 className="w-5 h-5 text-rose-600" />
              {event ? `Etkinlik Düzenle: ${event.title}` : 'Yeni Faaliyet / Etkinlik Oluştur'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Eğitim, tatbikat veya saha arama kurtarma operasyonu tanımlayın.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Etkinlik / Operasyon Adı *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: 2026 Kentsel Arama Kurtarma Saha Tatbikatı"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Etkinlik Türü *
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="Eğitim">Eğitim</option>
                  <option value="Tatbikat">Tatbikat</option>
                  <option value="Operasyon">Operasyon</option>
                </select>
              </div>
            </div>

            {/* Dates (Start / End) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Başlangıç Tarihi ve Saati *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bitiş Tarihi ve Saati *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Connected City & District */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  İl *
                </label>
                <select
                  value={city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  {Object.keys(TURKEY_CITIES).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  İlçe (Bağlı Liste) *
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  {availableDistricts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Etkinlik Durumu *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="Planlanan">Planlanan</option>
                  <option value="Devam Ediyor">Devam Ediyor</option>
                  <option value="Tamamlandı">Tamamlandı</option>
                  <option value="İptal Edildi">İptal Edildi</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Açık Konum ve Alan Detayı
              </label>
              <input
                type="text"
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                placeholder="Örn: Kartal Afet Parkı, Enkaz Eğitim İstasyonu 3"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Etkinlik Açıklaması ve Senaryo
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Operasyon hedefleri, senaryo, lojistik ihtiyaçlar..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 4.3: PARTICIPANT MANAGEMENT */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-rose-600" /> Katılımcı Ekip Üyeleri ({selectedParticipants.length})
                </h4>
                <p className="text-xs text-slate-500">
                  Her faaliyete üyeler ekleyip rollerini (Ekip Sorumlusu veya Ekip Üyesi) belirleyin.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMemberPicker(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition"
              >
                <UserPlus className="w-3.5 h-3.5" /> Üye Seç ve Ekle
              </button>
            </div>

            {/* Selected participants table */}
            {selectedParticipants.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                Henüz katılımcı eklenmedi. 'Üye Seç ve Ekle' butonuna basarak katılımcıları atayınız.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedParticipants.map((p) => {
                  const m = p.member || allMembers.find((mem) => mem.id === p.memberId);
                  return (
                    <div
                      key={p.memberId}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs overflow-hidden flex-shrink-0">
                          {m?.photoUrl ? (
                            <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            `${m?.firstName[0] || '?'}${m?.lastName[0] || '?'}`
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 dark:text-white block truncate">
                            {m?.firstName} {m?.lastName}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                            {m?.memberNo} • {m?.teamPosition} • {m?.district}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Role Dropdown */}
                        <select
                          value={p.role}
                          onChange={(e) => handleRoleChange(p.memberId, e.target.value as any)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                            p.role === 'Ekip Sorumlusu'
                              ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800'
                              : 'bg-white text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <option value="Ekip Sorumlusu">Ekip Sorumlusu</option>
                          <option value="Ekip Üyesi">Ekip Üyesi</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(p.memberId)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition"
                          title="Katılımcıyı Çıkar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Member Picker Modal Layer */}
          {showMemberPicker && (
            <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Katılımcı Üye Seçimi
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowMemberPicker(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="py-3 space-y-2">
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Üye ara (Ad, soyad, no, görev)..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />

                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={showPassiveMembers}
                      onChange={(e) => setShowPassiveMembers(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>Pasif üyeleri de göster</span>
                  </label>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                  {eligibleMembers.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">Uygun üye bulunamadı.</p>
                  ) : (
                    eligibleMembers.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => handleAddParticipant(m)}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between gap-2 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 text-xs">
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-200 overflow-hidden flex-shrink-0">
                            {m.photoUrl ? (
                              <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              `${m.firstName[0]}${m.lastName[0]}`
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-white block truncate">
                              {m.firstName} {m.lastName}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {m.memberNo} • {m.teamPosition}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {m.status === 'Pasif' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                              Pasif
                            </span>
                          )}
                          <span className="text-xs font-bold text-rose-600 hover:text-rose-500">
                            Ekle +
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              İptal
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <span>{event ? 'Etkinliği Güncelle' : 'Etkinliği Kaydet'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
