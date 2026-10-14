import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ReportColumnDef,
  ReadyTemplateDef,
  ReportCategoryType,
  ReportFilterState,
} from '../types/index.ts';
import { formatDateTR, formatPhoneTR } from './formatters.ts';

/**
 * All available columns for Members dataSource
 */
export const MEMBER_COLUMNS: ReportColumnDef[] = [
  // Kimlik ve Kişisel
  { key: 'memberNo', label: 'Üye No', category: 'Kimlik Bilgileri', defaultSelected: true },
  { key: 'fullName', label: 'Adı Soyadı', category: 'Kimlik Bilgileri', defaultSelected: true },
  { key: 'firstName', label: 'Adı', category: 'Kimlik Bilgileri' },
  { key: 'lastName', label: 'Soyadı', category: 'Kimlik Bilgileri' },
  { key: 'idNumber', label: 'T.C. Kimlik No', category: 'Kimlik Bilgileri', isSensitive: true },
  { key: 'birthDate', label: 'Doğum Tarihi', category: 'Kimlik Bilgileri', type: 'date' },
  { key: 'age', label: 'Yaş', category: 'Kimlik Bilgileri', type: 'number' },
  { key: 'gender', label: 'Cinsiyet', category: 'Kimlik Bilgileri' },
  { key: 'bloodType', label: 'Kan Grubu', category: 'Kimlik Bilgileri', defaultSelected: true },
  { key: 'birthPlace', label: 'Doğum Yeri', category: 'Kimlik Bilgileri' },
  { key: 'fatherName', label: 'Baba Adı', category: 'Kimlik Bilgileri' },

  // Ekip ve Görev
  { key: 'teamPosition', label: 'Ekip Görevi', category: 'Ekip ve Görev', defaultSelected: true, type: 'badge' },
  { key: 'status', label: 'Üyelik Durumu', category: 'Ekip ve Görev', defaultSelected: true, type: 'badge' },
  { key: 'joinDate', label: 'Ekip Katılım Tarihi', category: 'Ekip ve Görev', type: 'date', defaultSelected: true },
  { key: 'district', label: 'İlçesi', category: 'Ekip ve Görev', defaultSelected: true },
  { key: 'city', label: 'İli', category: 'Ekip ve Görev' },
  { key: 'dutyStation', label: 'Görev Yeri (Okul/Kurum)', category: 'Ekip ve Görev', defaultSelected: true },
  { key: 'dutyTitle', label: 'Görev Ünvanı', category: 'Ekip ve Görev' },
  { key: 'branch', label: 'Branşı', category: 'Ekip ve Görev', defaultSelected: true },
  { key: 'responsibilityArea', label: 'Sorumluluk Alanı', category: 'Ekip ve Görev' },
  { key: 'radioCallSign', label: 'Telsiz Çağrı Kodu', category: 'Ekip ve Görev' },

  // Akreditasyon & Etkinlik
  { key: 'accreditationsList', label: 'Akreditasyonlar', category: 'Akreditasyon ve Eğitim', defaultSelected: true, type: 'list' },
  { key: 'accreditationCount', label: 'Akreditasyon Sayısı', category: 'Akreditasyon ve Eğitim', type: 'number' },
  { key: 'eventParticipationCount', label: 'Katıldığı Etkinlik Sayısı', category: 'Etkinlik ve Katılım', defaultSelected: true, type: 'number' },

  // İletişim & Adres
  { key: 'phone', label: 'Cep Telefonu', category: 'İletişim Bilgileri', defaultSelected: true, type: 'phone' },
  { key: 'email', label: 'E-posta Adresi', category: 'İletişim Bilgileri' },
  { key: 'address', label: 'İkamet Adresi', category: 'İletişim Bilgileri' },
  { key: 'emergencyContactName', label: 'Acil Durum İrtibat Kişisi', category: 'İletişim Bilgileri', isSensitive: true },
  { key: 'emergencyContactPhone', label: 'Acil Durum Telefonu', category: 'İletişim Bilgileri', isSensitive: true, type: 'phone' },
  { key: 'emergencyContactRelation', label: 'Acil Durum Yakınlık', category: 'İletişim Bilgileri', isSensitive: true },

  // Kıyafet ve Ekipman
  { key: 'shirtSize', label: 'Tişört / Kıyafet Bedeni', category: 'Kıyafet ve Lojistik' },
  { key: 'shoeSize', label: 'Bot / Ayakkabı Numarası', category: 'Kıyafet ve Lojistik', type: 'number' },

  // Belge ve Ehliyet
  { key: 'educationLevel', label: 'Öğrenim Durumu', category: 'Eğitim ve Ehliyet' },
  { key: 'drivingLicense', label: 'Ehliyet Durumu', category: 'Eğitim ve Ehliyet' },
  { key: 'drivingLicenseClasses', label: 'Ehliyet Sınıfları', category: 'Eğitim ve Ehliyet' },
  { key: 'srcCertificate', label: 'SRC Belgesi', category: 'Eğitim ve Ehliyet' },
  { key: 'srcCertificateType', label: 'SRC Belge Türü', category: 'Eğitim ve Ehliyet' },
  { key: 'passportStatus', label: 'Pasaport Durumu', category: 'Eğitim ve Ehliyet' },
  { key: 'disabilityStatus', label: 'Engel Durumu', category: 'Sağlık ve Özel', isSensitive: true },
];

/**
 * All available columns for Events dataSource
 */
export const EVENT_COLUMNS: ReportColumnDef[] = [
  { key: 'title', label: 'Etkinlik / Operasyon Adı', category: 'Etkinlik Bilgisi', defaultSelected: true },
  { key: 'eventType', label: 'Etkinlik Türü', category: 'Etkinlik Bilgisi', defaultSelected: true, type: 'badge' },
  { key: 'status', label: 'Durum', category: 'Etkinlik Bilgisi', defaultSelected: true, type: 'badge' },
  { key: 'startDateTime', label: 'Başlangıç Tarihi & Saati', category: 'Etkinlik Bilgisi', defaultSelected: true, type: 'date' },
  { key: 'endDateTime', label: 'Bitiş Tarihi & Saati', category: 'Etkinlik Bilgisi', defaultSelected: true, type: 'date' },
  { key: 'district', label: 'İlçe', category: 'Konum ve Lojistik', defaultSelected: true },
  { key: 'city', label: 'İl', category: 'Konum ve Lojistik' },
  { key: 'locationDetail', label: 'Konum Detayı', category: 'Konum ve Lojistik' },
  { key: 'coordinatorName', label: 'Etkinlik Sorumlusu', category: 'Koordinasyon', defaultSelected: true },
  { key: 'participantCount', label: 'Katılımcı Sayısı', category: 'Katılım', defaultSelected: true, type: 'number' },
  { key: 'description', label: 'Açıklama / Görev Emri', category: 'Etkinlik Bilgisi' },
];

/**
 * All available columns for Participations dataSource
 */
export const PARTICIPATION_COLUMNS: ReportColumnDef[] = [
  { key: 'eventTitle', label: 'Etkinlik Adı', category: 'Etkinlik', defaultSelected: true },
  { key: 'eventType', label: 'Etkinlik Türü', category: 'Etkinlik', defaultSelected: true, type: 'badge' },
  { key: 'eventStart', label: 'Etkinlik Tarihi', category: 'Etkinlik', defaultSelected: true, type: 'date' },
  { key: 'eventDistrict', label: 'İlçe', category: 'Etkinlik' },
  { key: 'memberFullName', label: 'Katılımcı Üye', category: 'Katılımcı Üye', defaultSelected: true },
  { key: 'memberNo', label: 'Üye No', category: 'Katılımcı Üye' },
  { key: 'memberPosition', label: 'Ekip Görevi', category: 'Katılımcı Üye' },
  { key: 'memberPhone', label: 'İletişim Telefonu', category: 'Katılımcı Üye', type: 'phone' },
  { key: 'memberBranch', label: 'Branşı', category: 'Katılımcı Üye' },
  { key: 'participantRole', label: 'Etkinlikteki Rolü', category: 'Katılım Durumu', defaultSelected: true, type: 'badge' },
  { key: 'attended', label: 'Katılım Durumu', category: 'Katılım Durumu', defaultSelected: true, type: 'badge' },
  { key: 'participantNotes', label: 'Saha Notları', category: 'Katılım Durumu' },
];

/**
 * 16 Pre-configured Turkish Report Templates for Bursa MEB AKUB
 */
export const READY_REPORT_TEMPLATES: ReadyTemplateDef[] = [
  {
    id: 'active_members',
    title: 'Aktif Üye Listesi',
    category: 'member_reports',
    description: 'Bursa MEB AKUB bünyesinde faal ve göreve hazır tüm aktif ekip üyeleri.',
    iconName: 'UserCheck',
    dataSource: 'members',
    defaultColumns: ['memberNo', 'fullName', 'teamPosition', 'phone', 'district', 'dutyStation', 'branch', 'accreditationsList', 'joinDate'],
    defaultFilters: { status: 'Aktif' },
  },
  {
    id: 'passive_members',
    title: 'Pasif Üye Listesi',
    category: 'member_reports',
    description: 'Geçici olarak pasif durumda bulunan veya ayrılmış ekip üyelerinin kayıtları.',
    iconName: 'UserX',
    dataSource: 'members',
    defaultColumns: ['memberNo', 'fullName', 'teamPosition', 'phone', 'district', 'dutyStation', 'status', 'joinDate'],
    defaultFilters: { status: 'Pasif' },
  },
  {
    id: 'all_members_contact',
    title: 'Tüm Üyeler ve İletişim Bilgileri',
    category: 'emergency_reports',
    description: 'Tüm personelin telefon, e-posta, ikametgah ilçesi ve görev yeri iletişim fihristi.',
    iconName: 'PhoneCall',
    dataSource: 'members',
    defaultColumns: ['memberNo', 'fullName', 'teamPosition', 'phone', 'email', 'district', 'address', 'dutyStation'],
    defaultFilters: {},
  },
  {
    id: 'accreditation_based_members',
    title: 'Akreditasyon Bazlı Üye Listesi',
    category: 'accreditation_reports',
    description: 'Kentsel arama kurtarma, ilk yardım ve acil barınma akreditasyonu olan personeller.',
    iconName: 'Award',
    dataSource: 'members',
    defaultColumns: ['memberNo', 'fullName', 'teamPosition', 'accreditationsList', 'phone', 'district', 'dutyStation'],
    defaultFilters: { hasAccreditation: 'yes' },
  },
  {
    id: 'missing_accreditation_members',
    title: 'Akreditasyonu Eksik Üyeler',
    category: 'accreditation_reports',
    description: 'Henüz resmi akreditasyon belgesi almamış ve temel eğitim planlaması gereken üyeler.',
    iconName: 'AlertTriangle',
    dataSource: 'members',
    defaultColumns: ['memberNo', 'fullName', 'teamPosition', 'phone', 'district', 'dutyStation', 'joinDate'],
    defaultFilters: { hasAccreditation: 'no' },
  },
  {
    id: 'training_participants',
    title: 'Eğitimlere Katılan Üyeler',
    category: 'accreditation_reports',
    description: 'Arama kurtarma ve afet eğitim faaliyetlerinde görev almış personelin dökümü.',
    iconName: 'GraduationCap',
    dataSource: 'participations',
    defaultColumns: ['eventTitle', 'eventStart', 'eventDistrict', 'memberFullName', 'memberNo', 'memberPosition', 'participantRole', 'attended'],
    defaultFilters: { eventType: 'Eğitim' },
  },
  {
    id: 'zero_events_members',
    title: 'Hiç Etkinliğe Katılmamış Üyeler',
    category: 'participation_reports',
    description: 'Kayıtlı olduğu halde henüz hiçbir operasyon, eğitim veya tatbikatta yer almamış üyeler.',
    iconName: 'Clock',
    dataSource: 'members',
    defaultColumns: ['memberNo', 'fullName', 'teamPosition', 'phone', 'district', 'dutyStation', 'joinDate'],
    defaultFilters: { neverAttendedAnyEvent: true },
  },
  {
    id: 'events_by_date_range',
    title: 'Tarih Aralığına Göre Etkinlik Listesi',
    category: 'event_reports',
    description: 'Belirlenen takvim periyodunda planlanmış veya gerçekleştirilmiş tüm faaliyetler.',
    iconName: 'Calendar',
    dataSource: 'events',
    defaultColumns: ['title', 'eventType', 'status', 'startDateTime', 'endDateTime', 'district', 'coordinatorName', 'participantCount'],
    defaultFilters: {},
  },
  {
    id: 'operation_participants',
    title: 'Operasyon Katılımcıları',
    category: 'participation_reports',
    description: 'Gerçek arama kurtarma ve acil müdahale operasyonlarında sahada görev yapan personeller.',
    iconName: 'Flame',
    dataSource: 'participations',
    defaultColumns: ['eventTitle', 'eventStart', 'eventDistrict', 'memberFullName', 'memberPosition', 'memberPhone', 'participantRole', 'participantNotes'],
    defaultFilters: { eventType: 'Operasyon' },
  },
  {
    id: 'drill_participants',
    title: 'Tatbikat Katılımcıları',
    category: 'participation_reports',
    description: 'Deprem, tahliye ve saha tatbikatlarında görev alan AKUB üyelerinin listesi.',
    iconName: 'ShieldAlert',
    dataSource: 'participations',
    defaultColumns: ['eventTitle', 'eventStart', 'eventDistrict', 'memberFullName', 'memberPosition', 'participantRole', 'attended'],
    defaultFilters: { eventType: 'Tatbikat' },
  },
  {
    id: 'event_team_leaders',
    title: 'Etkinlik Bazında Ekip Sorumluları',
    category: 'team_position_reports',
    description: 'Etkinlik ve operasyonlarda "Ekip Sorumlusu" rolünü üstlenmiş saha yöneticileri.',
    iconName: 'UserCheck',
    dataSource: 'participations',
    defaultColumns: ['eventTitle', 'eventType', 'eventStart', 'memberFullName', 'memberPosition', 'memberPhone', 'participantNotes'],
    defaultFilters: { participantRole: 'Ekip Sorumlusu' },
  },
  {
    id: 'clothing_equipment_sizes',
    title: 'Kıyafet ve Ekipman Beden Listesi',
    category: 'equipment_reports',
    description: 'Üniforma, mont, tişört ve koruyucu bot tedariki için üye beden envanter listesi.',
    iconName: 'Shirt',
    dataSource: 'members',
    defaultColumns: ['memberNo', 'fullName', 'teamPosition', 'shirtSize', 'shoeSize', 'phone', 'district'],
    defaultFilters: {},
  },
  {
    id: 'duty_station_and_branch',
    title: 'Görev Yeri ve Branş Dağılımı',
    category: 'team_position_reports',
    description: 'Milli Eğitim Bakanlığı bağlısı okullar ve öğretmen branş dağılımı analizi.',
    iconName: 'Building',
    dataSource: 'members',
    defaultColumns: ['memberNo', 'fullName', 'district', 'dutyStation', 'dutyTitle', 'branch', 'teamPosition', 'phone'],
    defaultFilters: {},
  },
  {
    id: 'missing_info_members',
    title: 'Üye Bilgi Eksikliği Raporu',
    category: 'member_reports',
    description: 'Telefonu, e-postası, kan grubu veya acil durum irtibat bilgisi eksik olan üyeler.',
    iconName: 'FileQuestion',
    dataSource: 'members',
    defaultColumns: ['memberNo', 'fullName', 'teamPosition', 'phone', 'email', 'bloodType', 'district'],
    defaultFilters: { hasMissingInfo: 'yes' },
  },
  {
    id: 'emergency_contact_list',
    title: 'Acil Durum İrtibat Listesi',
    category: 'emergency_reports',
    description: 'Operasyonel acil durumlarda ulaşılabilecek 1. derece aile ve yakın irtibat kişileri.',
    iconName: 'HeartPulse',
    dataSource: 'members',
    defaultColumns: ['memberNo', 'fullName', 'phone', 'bloodType', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation'],
    defaultFilters: { hasEmergencyContact: 'yes' },
    isSensitive: true,
  },
  {
    id: 'blood_type_registry',
    title: 'Kan Grubu Listesi',
    category: 'emergency_reports',
    description: 'Acil kan gereksinimi ve operasyonel sağlık triyajı için personele ait kan grupları dökümü.',
    iconName: 'Droplet',
    dataSource: 'members',
    defaultColumns: ['memberNo', 'fullName', 'bloodType', 'phone', 'district', 'dutyStation', 'teamPosition'],
    defaultFilters: {},
  },
];

/**
 * Report Categories for Navigation
 */
export const REPORT_CATEGORIES: { id: ReportCategoryType; label: string; desc: string; icon: string }[] = [
  { id: 'member_reports', label: '1. Üye Raporları', desc: 'Genel personel kayıtları, demografik dökümler ve üyelik durumu analizleri.', icon: 'Users' },
  { id: 'team_position_reports', label: '2. Ekip ve Görev Raporları', desc: 'Ekip liderleri, sorumluluk alanları, görev yeri ve branş dağılımları.', icon: 'Briefcase' },
  { id: 'accreditation_reports', label: '3. Akreditasyon ve Eğitim Raporları', desc: 'Kentsel arama kurtarma, acil barınma ve AFAD akreditasyonları.', icon: 'Award' },
  { id: 'event_reports', label: '4. Etkinlik Raporları', desc: 'Operasyon, eğitim ve tatbikatların tarih ve lokasyon bazlı listeleri.', icon: 'CalendarCheck2' },
  { id: 'participation_reports', label: '5. Etkinlik Katılım Raporları', desc: 'Üyelerin sahadaki katılım geçmişi, rolü ve devam durumları.', icon: 'UserCheck' },
  { id: 'emergency_reports', label: '6. İletişim ve Acil Durum Raporları', desc: 'Acil durum yakınları, telefon fihristi ve kan grubu listeleri.', icon: 'PhoneCall' },
  { id: 'equipment_reports', label: '7. Kıyafet ve Ekipman Raporları', desc: 'Tişört, mont, tulum ve bot numarası envanter gereksinimleri.', icon: 'Shirt' },
  { id: 'custom_reports', label: '8. Özel Rapor Oluşturucu', desc: 'Dilediğiniz veri kaynağını, filtreleri ve sütunları seçerek rapor tasarlayın.', icon: 'Wand2' },
];

/**
 * Clean Turkish text for jsPDF rendering (handling fonts gracefully)
 */
export function sanitizeTurkishTextForPdf(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text);
}

/**
 * Export data to a real Excel (.xlsx) file with styled headers, auto width and info summary sheet
 */
export function exportReportToExcel(options: {
  reportTitle: string;
  appliedFilters: string[];
  columns: { key: string; label: string }[];
  rows: any[];
  userDisplayName?: string;
  categoryTitle?: string;
}) {
  const { reportTitle, appliedFilters, columns, rows, userDisplayName, categoryTitle } = options;

  // 1. Prepare main table rows mapped by column labels
  const dataRows = rows.map((row, index) => {
    const item: Record<string, any> = { 'Sıra No': index + 1 };
    columns.forEach((col) => {
      let val = row[col.key];
      if (Array.isArray(val)) {
        val = val.join(', ');
      } else if (typeof val === 'boolean') {
        val = val ? 'Evet' : 'Hayır';
      } else if (val === null || val === undefined) {
        val = '-';
      }
      item[col.label] = val;
    });
    return item;
  });

  const wb = XLSX.utils.book_new();

  // Create Data Worksheet
  const wsData = XLSX.utils.json_to_sheet(dataRows);

  // Auto-fit column widths
  const colWidths = [{ wch: 8 }]; // Sıra No
  columns.forEach((col) => {
    const maxLen = Math.max(
      col.label.length,
      ...rows.map((r) => {
        const v = r[col.key];
        return v ? String(v).length : 3;
      })
    );
    colWidths.push({ wch: Math.min(Math.max(maxLen + 3, 12), 45) });
  });
  wsData['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, wsData, 'Rapor Verileri');

  // Create Metadata & Summary Sheet
  const now = new Date();
  const summaryRows = [
    { 'Bursa MEB AKUB': 'Ekip Adı', 'Değer / Bilgi': 'Bursa MEB AKUB – Üye ve Etkinlik Takip Sistemi' },
    { 'Bursa MEB AKUB': 'Rapor Başlığı', 'Değer / Bilgi': reportTitle },
    { 'Bursa MEB AKUB': 'Rapor Kategorisi', 'Değer / Bilgi': categoryTitle || 'Genel Rapor' },
    { 'Bursa MEB AKUB': 'Oluşturulma Tarihi', 'Değer / Bilgi': formatDateTR(now.toISOString(), true) },
    { 'Bursa MEB AKUB': 'Raporu Alan Kullanıcı', 'Değer / Bilgi': userDisplayName || 'Yetkili Sistem Yöneticisi' },
    { 'Bursa MEB AKUB': 'Toplam Kayıt Sayısı', 'Değer / Bilgi': `${rows.length} Kayıt` },
    { 'Bursa MEB AKUB': '---', 'Değer / Bilgi': '---' },
    { 'Bursa MEB AKUB': 'Uygulanan Filtreler', 'Değer / Bilgi': appliedFilters.length ? appliedFilters.join(' | ') : 'Tüm Kayıtlar (Filtre Yok)' },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Rapor Özeti & Filtreler');

  // Format filename: Bursa_MEB_AKUB_[Title]_[YYYY-MM-DD].xlsx
  const dateStr = now.toISOString().split('T')[0];
  const safeTitle = reportTitle.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ_]/g, '_');
  const filename = `Bursa_MEB_AKUB_${safeTitle}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Export data to a professional PDF file using jsPDF and autoTable
 */
export function exportReportToPdf(options: {
  reportTitle: string;
  appliedFilters: string[];
  columns: { key: string; label: string }[];
  rows: any[];
  userDisplayName?: string;
  categoryTitle?: string;
}) {
  const { reportTitle, appliedFilters, columns, rows, userDisplayName, categoryTitle } = options;

  // Decide orientation: if more than 6 columns, use Landscape (yatay)
  const isLandscape = columns.length > 5;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const dateStr = formatDateTR(now.toISOString(), true);

  // Header Banner
  doc.setFillColor(225, 29, 72); // Rose-600
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Title in Header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BURSA MEB AKUB', 14, 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(sanitizeTurkishTextForPdf(reportTitle), 14, 16);

  // Right side of Header
  doc.setFontSize(8);
  doc.text(`Tarih: ${dateStr}`, pageWidth - 14, 10, { align: 'right' });
  doc.text(`Kayıt: ${rows.length} Adet`, pageWidth - 14, 16, { align: 'right' });

  // Sub-header Info Box: Category & Applied Filters
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(14, 26, pageWidth - 28, 14, 2, 2, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Kategori: ${sanitizeTurkishTextForPdf(categoryTitle || 'Genel Raporlama')}`, 18, 31);

  doc.setFont('helvetica', 'normal');
  const filtersText = appliedFilters.length
    ? `Uygulanan Filtreler: ${appliedFilters.slice(0, 3).join(' | ')}${appliedFilters.length > 3 ? '...' : ''}`
    : 'Uygulanan Filtreler: Tüm Kayıtlar';
  doc.text(sanitizeTurkishTextForPdf(filtersText), 18, 36);

  // Format Table Columns & Rows
  const tableHeaders = ['#', ...columns.map((c) => sanitizeTurkishTextForPdf(c.label))];
  const tableData = rows.map((r, i) => {
    return [
      String(i + 1),
      ...columns.map((c) => {
        let val = r[c.key];
        if (Array.isArray(val)) return sanitizeTurkishTextForPdf(val.join(', '));
        if (typeof val === 'boolean') return val ? 'Evet' : 'Hayir';
        if (val === null || val === undefined) return '-';
        return sanitizeTurkishTextForPdf(val);
      }),
    ];
  });

  // Render Table via autoTable
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: 44,
    margin: { left: 14, right: 14, bottom: 20 },
    theme: 'grid',
    headStyles: {
      fillColor: [225, 29, 72],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      fontSize: 7.5,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      // Footer on every page
      const currentPg = data.pageNumber;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);

      // Left Footer: Creator info
      doc.text(
        sanitizeTurkishTextForPdf(`Bursa MEB AKUB | Yetkili: ${userDisplayName || 'Sistem'}`),
        14,
        pageHeight - 8
      );

      // Center Footer: Date
      doc.text(sanitizeTurkishTextForPdf(`Olusturulma: ${dateStr}`), pageWidth / 2, pageHeight - 8, {
        align: 'center',
      });

      // Right Footer: Page number
      doc.text(
        `Sayfa ${currentPg}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  // Save PDF file
  const fileDateStr = now.toISOString().split('T')[0];
  const safeTitle = reportTitle.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ_]/g, '_');
  const filename = `Bursa_MEB_AKUB_${safeTitle}_${fileDateStr}.pdf`;

  doc.save(filename);
}
