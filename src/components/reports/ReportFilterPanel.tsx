import React, { useState, useEffect } from 'react';
import {
  ReportFilterState,
  Accreditation,
  TeamPosition,
  Member,
  TeamEvent,
} from '../../types/index.ts';
import { BURSA_DISTRICTS, BLOOD_TYPES, SHIRT_SIZES, DRIVING_LICENSE_CLASSES } from '../../lib/formatters.ts';
import {
  Filter,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  Columns3,
  BookmarkPlus,
  Loader2,
  Calendar,
  Search,
  Check,
} from 'lucide-react';

interface Props {
  dataSource: 'members' | 'events' | 'participations';
  onDataSourceChange: (ds: 'members' | 'events' | 'participations') => void;
  filters: ReportFilterState;
  onFilterChange: (filters: ReportFilterState) => void;
  onApply: () => void;
  onClear: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onOpenColumnSelector: () => void;
  onOpenSaveModal: () => void;
  membersList?: Member[];
  eventsList?: TeamEvent[];
  accreditationsList?: Accreditation[];
  teamPositionsList?: TeamPosition[];
  userRole?: string;
  isExporting?: boolean;
}

export const ReportFilterPanel: React.FC<Props> = ({
  dataSource,
  onDataSourceChange,
  filters,
  onFilterChange,
  onApply,
  onClear,
  onExportExcel,
  onExportPdf,
  onOpenColumnSelector,
  onOpenSaveModal,
  membersList = [],
  eventsList = [],
  accreditationsList = [],
  teamPositionsList = [],
  userRole = 'ADMIN',
  isExporting = false,
}) => {
  const [localFilters, setLocalFilters] = useState<ReportFilterState>(filters);

  // Sync when external filters change (e.g. template loaded or reset)
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const update = (field: keyof ReportFilterState, value: any) => {
    const updated = {
      ...localFilters,
      [field]: value === '' || value === 'Tümü' || value === 'Tüm İlçeler' || value === 'Tüm Görevler' || value === 'Tüm Üyeler' || value === 'Tüm Etkinlikler'
        ? undefined
        : value,
    };
    setLocalFilters(updated);
    onFilterChange(updated);
  };

  const handleAccreditationSelect = (val: string) => {
    if (val === 'Tümü' || val === '') {
      update('hasAccreditation', undefined);
      update('specificAccreditationName', undefined);
    } else if (val === 'Akreditasyonu Olanlar') {
      update('hasAccreditation', 'yes');
      update('specificAccreditationName', undefined);
    } else if (val === 'Akreditasyonu Olmayanlar') {
      update('hasAccreditation', 'no');
      update('specificAccreditationName', undefined);
    } else {
      update('hasAccreditation', 'yes');
      update('specificAccreditationName', val);
    }
  };

  const currentAccreditationValue = () => {
    if (localFilters.specificAccreditationName) return localFilters.specificAccreditationName;
    if (localFilters.hasAccreditation === 'yes') return 'Akreditasyonu Olanlar';
    if (localFilters.hasAccreditation === 'no') return 'Akreditasyonu Olmayanlar';
    return 'Tümü';
  };

  const canViewSensitive = userRole === 'ADMIN' || userRole === 'MEMBER_MANAGER';

  // Common input styling: uniform h-10, dark navy styling, purple focus
  const inputClass =
    'w-full h-10 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-800/90 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition';
  const labelClass =
    'block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 truncate';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-5 sm:p-6 space-y-5">
      {/* 4-COLUMN RESPONSIVE FILTER GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ROW 1: GENEL FİLTRELER */}
        <div>
          <label className={labelClass}>Rapor Türü</label>
          <select
            value={dataSource}
            onChange={(e) => onDataSourceChange(e.target.value as any)}
            className={`${inputClass} font-bold text-purple-300 border-purple-500/40 bg-slate-800`}
          >
            <option value="members">Üyeler (Ekip & Personel)</option>
            <option value="events">Etkinlikler (Tatbikat & Operasyon)</option>
            <option value="participations">Katılımlar (Katılım Çizelgesi)</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Arama</label>
          <div className="relative">
            <input
              type="text"
              value={localFilters.search || ''}
              onChange={(e) => update('search', e.target.value)}
              placeholder="Ad, soyad, üye no veya etkinlik..."
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>
            {dataSource === 'members'
              ? 'Başlangıç Tarihi (Katılım)'
              : dataSource === 'events'
              ? 'Başlangıç Tarihi (Etkinlik)'
              : 'Başlangıç Tarihi'}
          </label>
          <input
            type="date"
            value={localFilters.startDate || ''}
            onChange={(e) => update('startDate', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            {dataSource === 'members'
              ? 'Bitiş Tarihi (Katılım)'
              : dataSource === 'events'
              ? 'Bitiş Tarihi (Etkinlik)'
              : 'Bitiş Tarihi'}
          </label>
          <input
            type="date"
            value={localFilters.endDate || ''}
            onChange={(e) => update('endDate', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* DYNAMIC SECTION 1: ÜYE FİLTRELERİ */}
        {dataSource === 'members' && (
          <>
            <div>
              <label className={labelClass}>Üye</label>
              <select
                value={localFilters.memberId || 'Tümü'}
                onChange={(e) => update('memberId', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tüm Üyeler</option>
                {membersList.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.memberNo}] {m.firstName} {m.lastName} ({m.teamPosition})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Üyelik Durumu</label>
              <select
                value={localFilters.status || 'Tümü'}
                onChange={(e) => update('status', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                <option value="Aktif">Aktif</option>
                <option value="Pasif">Pasif</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Ekip Görevi</label>
              <select
                value={typeof localFilters.teamPosition === 'string' ? localFilters.teamPosition : 'Tümü'}
                onChange={(e) => update('teamPosition', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tüm Görevler</option>
                <option value="Ekip Lideri">Ekip Lideri</option>
                <option value="Lider Yardımcısı">Lider Yardımcısı</option>
                <option value="Ekip Üyesi">Ekip Üyesi</option>
                <option value="Lojistik Sorumlusu">Lojistik Sorumlusu</option>
                <option value="İlkyardım Sorumlusu">İlkyardım Sorumlusu</option>
                <option value="Haberleşme Sorumlusu">Haberleşme Sorumlusu</option>
                {teamPositionsList
                  .filter(
                    (p) =>
                      ![
                        'Ekip Lideri',
                        'Lider Yardımcısı',
                        'Ekip Üyesi',
                        'Lojistik Sorumlusu',
                        'İlkyardım Sorumlusu',
                        'Haberleşme Sorumlusu',
                      ].includes(p.name)
                  )
                  .map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Cinsiyet</label>
              <select
                value={localFilters.gender || 'Tümü'}
                onChange={(e) => update('gender', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                <option value="Erkek">Erkek</option>
                <option value="Kadın">Kadın</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Kan Grubu</label>
              <select
                value={localFilters.bloodType || 'Tümü'}
                onChange={(e) => update('bloodType', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>İlçe</label>
              <select
                value={localFilters.district || 'Tümü'}
                onChange={(e) => update('district', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tüm İlçeler</option>
                {BURSA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Görev Yeri (Okul/Kurum)</label>
              <input
                type="text"
                value={localFilters.dutyStation || ''}
                onChange={(e) => update('dutyStation', e.target.value)}
                placeholder="Örn: Anadolu Lisesi, RAM..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Görev Ünvanı</label>
              <input
                type="text"
                value={localFilters.dutyTitle || ''}
                onChange={(e) => update('dutyTitle', e.target.value)}
                placeholder="Örn: Öğretmen, Müdür Yrd..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Branş</label>
              <input
                type="text"
                value={localFilters.branch || ''}
                onChange={(e) => update('branch', e.target.value)}
                placeholder="Örn: Beden Eğitimi, Fizik..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Sorumluluk Alanı</label>
              <input
                type="text"
                value={localFilters.responsibilityArea || ''}
                onChange={(e) => update('responsibilityArea', e.target.value)}
                placeholder="Örn: Lojistik, İletişim..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Öğrenim Durumu</label>
              <select
                value={localFilters.educationLevel || 'Tümü'}
                onChange={(e) => update('educationLevel', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                <option value="İlköğretim">İlköğretim</option>
                <option value="Lise">Lise</option>
                <option value="Ön Lisans">Ön Lisans</option>
                <option value="Lisans">Lisans</option>
                <option value="Yüksek Lisans">Yüksek Lisans</option>
                <option value="Doktora">Doktora</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Akreditasyon</label>
              <select
                value={currentAccreditationValue()}
                onChange={(e) => handleAccreditationSelect(e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                <option value="Akreditasyonu Olanlar">Akreditasyonu Olanlar</option>
                <option value="Akreditasyonu Olmayanlar">Akreditasyonu Olmayanlar</option>
                <option value="Kentsel Arama Kurtarma">Kentsel Arama Kurtarma</option>
                <option value="Afetlerde Acil Barınma">Afetlerde Acil Barınma</option>
                <option value="Doğada Arama Kurtarma">Doğada Arama Kurtarma</option>
                {accreditationsList
                  .filter(
                    (a) =>
                      ![
                        'Kentsel Arama Kurtarma',
                        'Afetlerde Acil Barınma',
                        'Doğada Arama Kurtarma',
                      ].includes(a.name)
                  )
                  .map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Ehliyet Durumu</label>
              <select
                value={localFilters.drivingLicense || 'Tümü'}
                onChange={(e) => update('drivingLicense', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                <option value="Var">Var</option>
                <option value="Yok">Yok</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Ehliyet Sınıfı</label>
              <select
                value={localFilters.drivingLicenseClasses || 'Tümü'}
                onChange={(e) => update('drivingLicenseClasses', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                {DRIVING_LICENSE_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls} Sınıfı
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>SRC Belgesi</label>
              <select
                value={localFilters.srcCertificate || 'Tümü'}
                onChange={(e) => {
                  const val = e.target.value;
                  update('srcCertificate', val);
                  if (val === 'Yok') {
                    update('srcCertificateType', 'Tümü');
                  }
                }}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                <option value="Var">Var</option>
                <option value="Yok">Yok</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>SRC Belge Türü</label>
              <select
                value={localFilters.srcCertificateType || 'Tümü'}
                onChange={(e) => update('srcCertificateType', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tüm SRC Türleri</option>
                <option value="SRC1">SRC1 (Uluslararası Yolcu)</option>
                <option value="SRC2">SRC2 (Yurtiçi Yolcu)</option>
                <option value="SRC3">SRC3 (Uluslararası Eşya/Yük)</option>
                <option value="SRC4">SRC4 (Yurtiçi Eşya/Yük)</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Pasaport Durumu</label>
              <select
                value={localFilters.passportStatus || 'Tümü'}
                onChange={(e) => update('passportStatus', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                <option value="Var">Var</option>
                <option value="Yok">Yok</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Engel Durumu</label>
              <select
                value={localFilters.disabilityStatus || 'Tümü'}
                onChange={(e) => update('disabilityStatus', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                <option value="Var">Var</option>
                <option value="Yok">Yok</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Tişört Bedeni</label>
              <select
                value={localFilters.shirtSize || 'Tümü'}
                onChange={(e) => update('shirtSize', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                {SHIRT_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="4XL">4XL</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Ayakkabı Numarası</label>
              <select
                value={localFilters.shoeSize ? String(localFilters.shoeSize) : 'Tümü'}
                onChange={(e) => update('shoeSize', e.target.value ? Number(e.target.value) : undefined)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                {Array.from({ length: 13 }, (_, i) => 36 + i).map((num) => (
                  <option key={num} value={num}>
                    {num} Numara
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Yaş Aralığı (Min - Maks)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="18"
                  max="70"
                  value={localFilters.ageMin || ''}
                  onChange={(e) => update('ageMin', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Min"
                  className={inputClass}
                />
                <input
                  type="number"
                  min="18"
                  max="70"
                  value={localFilters.ageMax || ''}
                  onChange={(e) => update('ageMax', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Maks"
                  className={inputClass}
                />
              </div>
            </div>
          </>
        )}

        {/* DYNAMIC SECTION 2: ETKİNLİK FİLTRELERİ */}
        {dataSource === 'events' && (
          <>
            <div>
              <label className={labelClass}>Etkinlik Adı</label>
              <input
                type="text"
                value={localFilters.eventTitle || ''}
                onChange={(e) => update('eventTitle', e.target.value)}
                placeholder="Örn: Deprem Tatbikatı..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Etkinlik Türü</label>
              <select
                value={localFilters.eventType || 'Tümü'}
                onChange={(e) => update('eventType', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                <option value="Eğitim">Eğitim</option>
                <option value="Tatbikat">Tatbikat</option>
                <option value="Operasyon">Operasyon</option>
                <option value="Seminer">Seminer</option>
                <option value="Toplantı">Toplantı</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Etkinlik Durumu</label>
              <select
                value={localFilters.eventStatus || 'Tümü'}
                onChange={(e) => update('eventStatus', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                <option value="Planlanan">Planlanan</option>
                <option value="Devam Ediyor">Devam Ediyor</option>
                <option value="Tamamlandı">Tamamlandı</option>
                <option value="İptal Edildi">İptal Edildi</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>İl</label>
              <select
                value={localFilters.city || 'Tümü'}
                onChange={(e) => update('city', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tüm İller</option>
                <option value="Bursa">Bursa</option>
                <option value="İstanbul">İstanbul</option>
                <option value="Yalova">Yalova</option>
                <option value="Balıkesir">Balıkesir</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>İlçe</label>
              <select
                value={localFilters.district || 'Tümü'}
                onChange={(e) => update('district', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tüm İlçeler</option>
                {BURSA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Etkinlikteki Katılımcı</label>
              <select
                value={localFilters.memberId || 'Tümü'}
                onChange={(e) => update('memberId', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tüm Üyeler</option>
                {membersList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} ({m.teamPosition})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Etkinlik Rolü</label>
              <select
                value={localFilters.participantRole || 'Tümü'}
                onChange={(e) => update('participantRole', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                <option value="Ekip Sorumlusu">Ekip Sorumlusu</option>
                <option value="Ekip Üyesi">Ekip Üyesi</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Etkinlik Sorumlusu</label>
              <select
                value={localFilters.coordinatorId ? String(localFilters.coordinatorId) : 'Tümü'}
                onChange={(e) => update('coordinatorId', e.target.value ? Number(e.target.value) : undefined)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                {membersList
                  .filter((m) => ['Ekip Lideri', 'Lider Yardımcısı', 'Ekip Sorumlusu', 'Yönetici'].includes(m.teamPosition) || true)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.teamPosition})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Katılımcı Sayısı Aralığı (Min - Maks)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  value={localFilters.minParticipants || ''}
                  onChange={(e) => update('minParticipants', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Min"
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  value={localFilters.maxParticipants || ''}
                  onChange={(e) => update('maxParticipants', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Maks"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Katılımcısız Etkinlikler</label>
              <select
                value={localFilters.hasNoParticipants ? 'yes' : 'all'}
                onChange={(e) => update('hasNoParticipants', e.target.value === 'yes' ? true : undefined)}
                className={inputClass}
              >
                <option value="all">Tüm Etkinlikler</option>
                <option value="yes">Yalnızca Katılımcısı Olmayanlar</option>
              </select>
            </div>
          </>
        )}

        {/* DYNAMIC SECTION 3: KATILIM FİLTRELERİ */}
        {dataSource === 'participations' && (
          <>
            <div>
              <label className={labelClass}>Üye</label>
              <select
                value={localFilters.memberId || 'Tümü'}
                onChange={(e) => update('memberId', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tüm Üyeler</option>
                {membersList.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.memberNo}] {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Etkinlik</label>
              <select
                value={localFilters.eventId || 'Tümü'}
                onChange={(e) => update('eventId', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tüm Etkinlikler</option>
                {eventsList.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.eventType} - {ev.district})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Katılım Durumu</label>
              <select
                value={localFilters.attended || 'Tümü'}
                onChange={(e) => update('attended', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                <option value="Katıldı">Katıldı</option>
                <option value="Katılmadı">Katılmadı</option>
                <option value="İzinli">İzinli</option>
                <option value="Mazeretli">Mazeretli</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Etkinlik Türü</label>
              <select
                value={localFilters.eventType || 'Tümü'}
                onChange={(e) => update('eventType', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                <option value="Eğitim">Eğitim</option>
                <option value="Tatbikat">Tatbikat</option>
                <option value="Operasyon">Operasyon</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Etkinlikteki Rolü</label>
              <select
                value={localFilters.participantRole || 'Tümü'}
                onChange={(e) => update('participantRole', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tümü</option>
                <option value="Ekip Sorumlusu">Ekip Sorumlusu</option>
                <option value="Ekip Üyesi">Ekip Üyesi</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>İlçe</label>
              <select
                value={localFilters.district || 'Tümü'}
                onChange={(e) => update('district', e.target.value)}
                className={inputClass}
              >
                <option value="Tümü">Tüm İlçeler</option>
                {BURSA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* BOTTOM BUTTON BAR (FILTRELE, TEMİZLE, EXCEL İNDİR, PDF İNDİR + SÜTUNLAR, ŞABLON KAYDET) */}
      <div className="pt-4 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* FİLTRELE (Mor Vurgu) */}
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-purple-600 hover:bg-purple-500 active:scale-95 text-white shadow-md shadow-purple-950/40 transition cursor-pointer"
          >
            <Filter className="w-4 h-4" />
            <span>Filtrele</span>
          </button>

          {/* TEMİZLE */}
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Temizle</span>
          </button>

          {/* EXCEL İNDİR */}
          <button
            type="button"
            onClick={onExportExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-md shadow-emerald-950/30 transition disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span>Excel İndir</span>
          </button>

          {/* PDF İNDİR */}
          <button
            type="button"
            onClick={onExportPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-md shadow-rose-950/30 transition disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>PDF İndir</span>
          </button>
        </div>

        {/* Right Aux Buttons: Sütunları Düzenle & Rapor Şablonunu Kaydet */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenColumnSelector}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Tabloda görünecek sütunları seçin ve düzenleyin"
          >
            <Columns3 className="w-3.5 h-3.5 text-slate-400" />
            <span>Sütunları Düzenle</span>
          </button>

          <button
            type="button"
            onClick={onOpenSaveModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-amber-400 border border-slate-700 transition cursor-pointer"
            title="Mevcut filtre kriterlerini şablon olarak kaydedin"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Rapor Şablonunu Kaydet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
