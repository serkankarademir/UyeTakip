import * as XLSX from 'xlsx';
import {
  BatchImportRow,
  BatchImportRowStatus,
  Member,
  Accreditation,
  TeamPosition,
} from '../types/index.ts';
import {
  validateTCKimlik,
  formatPhoneTR,
  BURSA_DISTRICTS,
  BLOOD_TYPES,
  SHIRT_SIZES,
  DRIVING_LICENSE_CLASSES,
} from './formatters.ts';

export interface MemberFieldDef {
  key: string;
  label: string;
  required?: boolean;
  category: 'Kimlik Bilgileri' | 'İletişim & Konum' | 'Görev & Ekip' | 'Sağlık & Acil' | 'Lojistik & Diğer';
  aliases: string[];
  sampleValue: string;
  description: string;
}

export const MEMBER_FIELD_DEFINITIONS: MemberFieldDef[] = [
  // 1. Kimlik Bilgileri
  {
    key: 'memberNo',
    label: 'Üye No',
    required: false,
    category: 'Kimlik Bilgileri',
    aliases: ['üye no', 'uye no', 'üye numarası', 'uye numarasi', 'sicil no', 'üye kodu'],
    sampleValue: 'EKP-2026-001',
    description: 'Boş bırakılırsa sistem tarafından otomatik oluşturulur.',
  },
  {
    key: 'firstName',
    label: 'Ad',
    required: true,
    category: 'Kimlik Bilgileri',
    aliases: ['ad', 'adı', 'adi', 'isim', 'first name', 'adınız'],
    sampleValue: 'Ahmet',
    description: 'Üyenin resmi adı (Zorunlu).',
  },
  {
    key: 'lastName',
    label: 'Soyad',
    required: true,
    category: 'Kimlik Bilgileri',
    aliases: ['soyad', 'soyadı', 'soyadi', 'last name', 'soyadınız'],
    sampleValue: 'Yılmaz',
    description: 'Üyenin resmi soyadı (Zorunlu).',
  },
  {
    key: 'idNumber',
    label: 'T.C. Kimlik Numarası',
    required: true,
    category: 'Kimlik Bilgileri',
    aliases: ['tc', 'tc no', 't.c.', 't.c. kimlik no', 't.c. no', 'tc kimlik', 'tc kimlik no', 't.c. kimlik numarası', 'tc kimlik numarasi', 'kimlik no', 'tcno'],
    sampleValue: '10000000146',
    description: '11 haneli geçerli T.C. Kimlik Numarası (Zorunlu).',
  },
  {
    key: 'birthDate',
    label: 'Doğum Tarihi',
    required: false,
    category: 'Kimlik Bilgileri',
    aliases: ['doğum tarihi', 'dogum tarihi', 'd.tarihi', 'dtarihi', 'birth date', 'doğum'],
    sampleValue: '1985-05-14',
    description: 'YYYY-AA-GG veya GG.AA.YYYY formatında tarih.',
  },
  {
    key: 'birthPlace',
    label: 'Doğum Yeri',
    required: false,
    category: 'Kimlik Bilgileri',
    aliases: ['doğum yeri', 'dogum yeri', 'd.yeri', 'dyeri', 'birth place'],
    sampleValue: 'Osmangazi',
    description: 'Doğduğu il veya ilçe.',
  },
  {
    key: 'fatherName',
    label: 'Baba Adı',
    required: false,
    category: 'Kimlik Bilgileri',
    aliases: ['baba adı', 'baba adi', 'baba'],
    sampleValue: 'Mehmet',
    description: 'Üyenin baba adı.',
  },
  {
    key: 'gender',
    label: 'Cinsiyet',
    required: false,
    category: 'Kimlik Bilgileri',
    aliases: ['cinsiyet', 'cinsiyeti', 'gender'],
    sampleValue: 'Erkek',
    description: 'Erkek veya Kadın.',
  },
  {
    key: 'bloodType',
    label: 'Kan Grubu',
    required: false,
    category: 'Kimlik Bilgileri',
    aliases: ['kan grubu', 'kan', 'kan gurubu', 'blood type'],
    sampleValue: 'A Rh+',
    description: '0 Rh+, A Rh+, B Rh+, AB Rh+, 0 Rh-, A Rh-, B Rh-, AB Rh-',
  },

  // 2. İletişim & Konum
  {
    key: 'phone',
    label: 'Cep Telefonu',
    required: true,
    category: 'İletişim & Konum',
    aliases: ['telefon', 'cep telefonu', 'cep tel', 'gsm', 'telefon no', 'iletisim no', 'phone', 'mobil'],
    sampleValue: '0532 111 22 33',
    description: 'Geçerli 10 veya 11 haneli cep telefonu (Zorunlu).',
  },
  {
    key: 'email',
    label: 'E-posta',
    required: false,
    category: 'İletişim & Konum',
    aliases: ['e-posta', 'eposta', 'email', 'e-mail', 'mail'],
    sampleValue: 'ahmet.yilmaz@meb.k12.tr',
    description: 'Geçerli e-posta adresi.',
  },
  {
    key: 'district',
    label: 'İlçe',
    required: false,
    category: 'İletişim & Konum',
    aliases: ['ilçe', 'ilce', 'ilçesi', 'ilcesi', 'görev ilçesi', 'ikamet ilçesi'],
    sampleValue: 'Osmangazi',
    description: 'Bursa ilçesi (Osmangazi, Nilüfer, Yıldırım vb.).',
  },
  {
    key: 'address',
    label: 'İkametgâh Adresi',
    required: false,
    category: 'İletişim & Konum',
    aliases: ['adres', 'adresi', 'ikametgah adresi', 'ikamet adresi', 'ev adresi'],
    sampleValue: 'Kükürtlü Mah. Çınar Cad. No:12 D:4 Osmangazi / Bursa',
    description: 'Açık ev veya ikametgah adresi.',
  },

  // 3. Görev & Ekip
  {
    key: 'dutyStation',
    label: 'Görev Yeri',
    required: false,
    category: 'Görev & Ekip',
    aliases: ['görev yeri', 'gorev yeri', 'okul', 'kurum', 'okulu', 'kurumu', 'calistigi kurum', 'çalıştığı kurum'],
    sampleValue: 'Bursa Anadolu Lisesi',
    description: 'Milli Eğitim Bakanlığına bağlı görev yaptığı okul veya kurum.',
  },
  {
    key: 'dutyTitle',
    label: 'Görev Ünvanı',
    required: false,
    category: 'Görev & Ekip',
    aliases: ['görev ünvanı', 'gorev unvani', 'unvan', 'ünvan', 'kadro ünvanı'],
    sampleValue: 'Öğretmen',
    description: 'Öğretmen, Müdür, Memur, VHKİ vb.',
  },
  {
    key: 'teamPosition',
    label: 'Ekip Üyeliği / Görevi',
    required: false,
    category: 'Görev & Ekip',
    aliases: ['ekip görevi', 'ekip gorevi', 'görev', 'gorev', 'ekipteki görevi', 'ekip uyeligi', 'ekip üyeliği / görevi', 'rol'],
    sampleValue: 'Ekip Üyesi',
    description: 'Ekip Lideri, Lider Yardımcısı, Ekip Üyesi, Lojistik Sorumlusu vb.',
  },
  {
    key: 'branch',
    label: 'Branşı',
    required: false,
    category: 'Görev & Ekip',
    aliases: ['branş', 'brans', 'branşı', 'bransi', 'uzmanlık branşı'],
    sampleValue: 'Beden Eğitimi',
    description: 'Öğretmenlik branşı veya mesleki uzmanlık alanı.',
  },
  {
    key: 'responsibilityArea',
    label: 'Sorumluluk Alanı',
    required: false,
    category: 'Görev & Ekip',
    aliases: ['sorumluluk alanı', 'sorumluluk alani', 'sorumluluk', 'uzmanlık alanı'],
    sampleValue: 'Kentsel Tahliye ve Lojistik',
    description: 'Ekip içindeki özel uzmanlık veya sorumluluk alanı.',
  },
  {
    key: 'radioCallSign',
    label: 'Telsiz Çağrı İşareti',
    required: false,
    category: 'Görev & Ekip',
    aliases: ['telsiz çağrı işareti', 'telsiz cagri isareti', 'telsiz kodu', 'çağrı işareti', 'cagri isareti', 'telsiz'],
    sampleValue: 'AKUB-16-04',
    description: 'Amatör telsizci veya AKUB telsiz operasyon kodu.',
  },
  {
    key: 'joinDate',
    label: 'Ekip Üyelik Tarihi',
    required: false,
    category: 'Görev & Ekip',
    aliases: ['ekip üyelik tarihi', 'ekip uyelik tarihi', 'katılım tarihi', 'katilim tarihi', 'üyelik tarihi', 'uyelik tarihi'],
    sampleValue: '2023-09-01',
    description: 'Ekibe resmi katılım tarihi (Boş ise bugün atanır).',
  },
  {
    key: 'status',
    label: 'Üyelik Durumu',
    required: false,
    category: 'Görev & Ekip',
    aliases: ['üyelik durumu', 'uyelik durumu', 'durum', 'durumu', 'status'],
    sampleValue: 'Aktif',
    description: 'Aktif veya Pasif.',
  },
  {
    key: 'accreditations',
    label: 'Akreditasyonlar',
    required: false,
    category: 'Görev & Ekip',
    aliases: ['akreditasyonlar', 'akreditasyon', 'sertifikalar', 'eğitimler', 'accreditations'],
    sampleValue: 'Kentsel Arama Kurtarma; Afetlerde Acil Barınma',
    description: 'Noktalı virgülle (;) ayrılmış akreditasyon isimleri.',
  },

  // 4. Sağlık & Acil Durum
  {
    key: 'emergencyContactName',
    label: 'Yakını Adı Soyadı',
    required: false,
    category: 'Sağlık & Acil',
    aliases: ['yakını adı soyadı', 'yakini adi soyadi', 'acil durum kişisi', 'acil durum kisi', 'acil irtibat adı', 'acil temas'],
    sampleValue: 'Fatma Yılmaz',
    description: 'Acil durumlarda ilk aranacak yakınının adı soyadı.',
  },
  {
    key: 'emergencyContactPhone',
    label: 'Yakın Telefonu',
    required: false,
    category: 'Sağlık & Acil',
    aliases: ['yakın telefonu', 'yakin telefonu', 'acil durum telefonu', 'acil tel', 'acil irtibat no'],
    sampleValue: '0533 222 33 44',
    description: 'Acil durumda aranacak yakınının cep telefonu.',
  },
  {
    key: 'emergencyContactRelation',
    label: 'Yakınlık Derecesi',
    required: false,
    category: 'Sağlık & Acil',
    aliases: ['yakınlık derecesi', 'yakinlik derecesi', 'yakınlık', 'yakinlik'],
    sampleValue: 'Eşi',
    description: 'Eşi, Anne, Baba, Kardeş, Çocuğu vb.',
  },
  {
    key: 'chronicDiseases',
    label: 'Kronik Rahatsızlığı',
    required: false,
    category: 'Sağlık & Acil',
    aliases: ['kronik rahatsızlığı', 'kronik rahatsizligi', 'kronik hastalık', 'kronik'],
    sampleValue: 'Yok',
    description: 'Varsa kronik hastalık bilgisi, yoksa Yok.',
  },
  {
    key: 'allergies',
    label: 'Alerjileri',
    required: false,
    category: 'Sağlık & Acil',
    aliases: ['alerjileri', 'alerji', 'alerjisi'],
    sampleValue: 'Penisilin',
    description: 'İlaç, besin veya temas alerjileri.',
  },
  {
    key: 'pastSurgeries',
    label: 'Geçirdiği Tıbbi Operasyonlar',
    required: false,
    category: 'Sağlık & Acil',
    aliases: ['geçirdiği tıbbi operasyonlar', 'gecirdigi tibbi operasyonlar', 'ameliyatlar', 'operasyonlar'],
    sampleValue: 'Yok',
    description: 'Önemli ameliyat ve cerrahi geçmişi.',
  },
  {
    key: 'prosthetics',
    label: 'Kullandığı Protezler',
    required: false,
    category: 'Sağlık & Acil',
    aliases: ['kullandığı protezler', 'kullandigi protezler', 'protez', 'protezler'],
    sampleValue: 'Yok',
    description: 'Protez, platin, işitme cihazı vb.',
  },
  {
    key: 'regularMedications',
    label: 'Sürekli Kullandığı İlaçlar',
    required: false,
    category: 'Sağlık & Acil',
    aliases: ['sürekli kullandığı ilaçlar', 'surekli kullandigi ilaclar', 'ilaçlar', 'ilaclar'],
    sampleValue: 'Yok',
    description: 'Düzenli alınması zorunlu reçeteli ilaçlar.',
  },
  {
    key: 'disabilityStatus',
    label: 'Engel Durumu',
    required: false,
    category: 'Sağlık & Acil',
    aliases: ['engel durumu', 'engel', 'engellilik'],
    sampleValue: 'Yok',
    description: 'Var veya Yok.',
  },

  // 5. Lojistik & Diğer
  {
    key: 'educationLevel',
    label: 'Öğrenim Durumu',
    required: false,
    category: 'Lojistik & Diğer',
    aliases: ['öğrenim durumu', 'ogrenim durumu', 'eğitim durumu', 'egitim durumu', 'mezuniyet'],
    sampleValue: 'Lisans',
    description: 'İlköğretim, Lise, Ön Lisans, Lisans, Yüksek Lisans, Doktora.',
  },
  {
    key: 'drivingLicense',
    label: 'Ehliyet Durumu',
    required: false,
    category: 'Lojistik & Diğer',
    aliases: ['ehliyet durumu', 'ehliyet', 'sürücü belgesi'],
    sampleValue: 'Var',
    description: 'Var veya Yok.',
  },
  {
    key: 'drivingLicenseClasses',
    label: 'Ehliyet Sınıfı',
    required: false,
    category: 'Lojistik & Diğer',
    aliases: ['ehliyet sınıfı', 'ehliyet sinifi', 'ehliyet sınıfları', 'sınıfı'],
    sampleValue: 'B, C',
    description: 'B, C, D, E, A2 vb.',
  },
  {
    key: 'srcCertificate',
    label: 'SRC Belgesi',
    required: false,
    category: 'Lojistik & Diğer',
    aliases: ['src belgesi', 'src', 'src durumu'],
    sampleValue: 'Var',
    description: 'Var veya Yok.',
  },
  {
    key: 'srcCertificateType',
    label: 'SRC Belge Türü',
    required: false,
    category: 'Lojistik & Diğer',
    aliases: [
      'src belge türü',
      'src belge turu',
      'src türü',
      'src turu',
      'src tipi',
      'src_belge_turu',
      'src belge tipi',
      'src sinifi',
      'src sınıfı',
    ],
    sampleValue: 'SRC2',
    description: 'SRC1, SRC2, SRC3 veya SRC4 (SRC Belgesi Var olduğunda zorunludur).',
  },
  {
    key: 'passportStatus',
    label: 'Pasaport Durumu',
    required: false,
    category: 'Lojistik & Diğer',
    aliases: ['pasaport durumu', 'pasaport'],
    sampleValue: 'Var',
    description: 'Var veya Yok (Uluslararası afet görevleri için).',
  },
  {
    key: 'passportNumber',
    label: 'Pasaport Numarası',
    required: false,
    category: 'Lojistik & Diğer',
    aliases: ['pasaport numarası', 'pasaport no', 'pasaport numarasi'],
    sampleValue: 'U12345678',
    description: 'Pasaport seri numarası.',
  },
  {
    key: 'shirtSize',
    label: 'Tişört Bedeni',
    required: false,
    category: 'Lojistik & Diğer',
    aliases: ['tişört bedeni', 'tisort bedeni', 'beden', 'kıyafet bedeni', 'forma bedeni'],
    sampleValue: 'L',
    description: 'XS, S, M, L, XL, 2XL, 3XL, 4XL.',
  },
  {
    key: 'shoeSize',
    label: 'Ayakkabı Numarası',
    required: false,
    category: 'Lojistik & Diğer',
    aliases: ['ayakkabı numarası', 'ayakkabi numarasi', 'bot numarası', 'ayak no', 'ayakkabı no'],
    sampleValue: '42',
    description: 'Operasyonel bot / ayakkabı numarası (36 - 48).',
  },
];

/**
 * Normalizes text for comparison (lowercase, trimmed, standard characters)
 */
export function normalizeHeader(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s\-_/\\().]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

/**
 * Generates an official Bursa MEB AKUB member import template Excel file
 */
export function generateMemberExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Üye Listesi (Header + 2 sample rows)
  const headers = MEMBER_FIELD_DEFINITIONS.map((f) => f.label);
  const sampleRow1 = MEMBER_FIELD_DEFINITIONS.map((f) => f.sampleValue);
  const sampleRow2 = MEMBER_FIELD_DEFINITIONS.map((f) => {
    switch (f.key) {
      case 'memberNo':
        return ''; // Auto Üye No
      case 'firstName':
        return 'Zeynep';
      case 'lastName':
        return 'Demir';
      case 'idNumber':
        return '20000000188';
      case 'birthDate':
        return '1990-11-20';
      case 'birthPlace':
        return 'Nilüfer';
      case 'fatherName':
        return 'Mustafa';
      case 'gender':
        return 'Kadın';
      case 'bloodType':
        return '0 Rh+';
      case 'phone':
        return '0542 333 44 55';
      case 'email':
        return 'zeynep.demir@meb.k12.tr';
      case 'district':
        return 'Nilüfer';
      case 'address':
        return 'İhsaniye Mah. Barış Cad. No:14 Nilüfer / Bursa';
      case 'dutyStation':
        return 'Feriha Uyar Kız Mesleki ve Teknik AL';
      case 'dutyTitle':
        return 'Müdür Yardımcısı';
      case 'teamPosition':
        return 'Lider Yardımcısı';
      case 'branch':
        return 'Kimya';
      case 'responsibilityArea':
        return 'İlkyardım ve Tıbbi Müdahale';
      case 'radioCallSign':
        return 'AKUB-16-08';
      case 'joinDate':
        return '2024-02-15';
      case 'status':
        return 'Aktif';
      case 'accreditations':
        return 'Kentsel Arama Kurtarma; Afetlerde Acil Barınma';
      case 'emergencyContactName':
        return 'Ali Demir';
      case 'emergencyContactPhone':
        return '0544 555 66 77';
      case 'emergencyContactRelation':
        return 'Kardeşi';
      case 'chronicDiseases':
        return 'Yok';
      case 'allergies':
        return 'Yok';
      case 'pastSurgeries':
        return 'Yok';
      case 'prosthetics':
        return 'Yok';
      case 'regularMedications':
        return 'Yok';
      case 'disabilityStatus':
        return 'Yok';
      case 'educationLevel':
        return 'Yüksek Lisans';
      case 'drivingLicense':
        return 'Var';
      case 'drivingLicenseClasses':
        return 'B';
      case 'srcCertificate':
        return 'Var';
      case 'srcCertificateType':
        return 'SRC2';
      case 'passportStatus':
        return 'Var';
      case 'passportNumber':
        return 'U87654321';
      case 'shirtSize':
        return 'M';
      case 'shoeSize':
        return '38';
      default:
        return f.sampleValue || '';
    }
  });

  const wsData = [headers, sampleRow1, sampleRow2];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = MEMBER_FIELD_DEFINITIONS.map((f) => ({
    wch: Math.max(f.label.length + 3, f.sampleValue.length + 2, 12),
  }));

  XLSX.utils.book_append_sheet(wb, ws, 'Üye Listesi');

  // 2. Sheet: Kılavuz ve Standartlar
  const guideRows = [
    ['BURSA MEB AKUB - TOPLU ÜYE AKTARIM KILAVUZU', ''],
    ['Kural / Alan', 'Açıklama ve Kabul Edilen Seçenekler'],
    ['Zorunlu Alanlar', 'Ad, Soyad, T.C. Kimlik Numarası ve Cep Telefonu alanları zorunludur.'],
    ['T.C. Kimlik Numarası', '11 haneli geçerli T.C. kimlik algoritmasına uymalıdır. Tekrarlanan T.C. numaraları engellenir.'],
    ['Üye No', 'Boş bırakılırsa sistem "EKP-YYYY-XXX" formatında otomatik numara atar.'],
    ['Tarihler', 'YYYY-AA-GG veya GG.AA.YYYY formatında girilmelidir (Örn: 1985-05-14 veya 14.05.1985).'],
    ['Bursa İlçeleri', BURSA_DISTRICTS.join(', ')],
    ['Kan Grupları', BLOOD_TYPES.join(', ')],
    ['SRC Belgesi & Belge Türü', 'SRC Belgesi "Var" ise SRC Belge Türü zorunludur: SRC1, SRC2, SRC3, SRC4. SRC Belgesi "Yok" ise boş bırakılabilir.'],
    ['Tişört Bedenleri', SHIRT_SIZES.join(', ') + ', 4XL'],
    ['Ayakkabı Numaraları', '36 ile 48 arası tam sayılar'],
    ['Ekip Görevleri', 'Ekip Lideri, Lider Yardımcısı, Ekip Üyesi, Lojistik Sorumlusu, İlkyardım Sorumlusu, Haberleşme Sorumlusu'],
    ['Akreditasyonlar', 'Birden fazla akreditasyon noktalı virgülle (;) ayrılabilir. Örn: "Kentsel Arama Kurtarma; Afetlerde Acil Barınma"'],
    ['Mevcut Üyeler', 'Sistemde kayıtlı T.C. Kimlik tespit edildiğinde atlama veya güncelleme seçeneği sunulur.'],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 25 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Kılavuz ve Standartlar');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Bursa_MEB_AKUB_Toplu_Uye_Aktarim_Sablonu_${today}.xlsx`);
}

/**
 * Parses an Excel (.xlsx / .xls) file securely without executing macros or formulas
 */
export async function parseMemberExcelFile(
  file: File
): Promise<{ headers: string[]; rawRows: Record<string, any>[] }> {
  // 1. File extension validation
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    throw new Error('CSV dosyaları desteklenmemektedir. Lütfen resmi Excel (.xlsx veya .xls) şablonunu kullanınız.');
  }
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
    throw new Error('Desteklenmeyen dosya biçimi. Yalnızca .xlsx veya .xls formatındaki Excel dosyalarını yükleyebilirsiniz.');
  }

  // 2. Size validation (max 10 MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Dosya boyutu çok büyük (En fazla 10 MB yükleyebilirsiniz).');
  }

  // 3. Read array buffer
  const buffer = await file.arrayBuffer();

  // 4. Safe XLSX parse (cellFormula: false prevents any formula execution)
  const wb = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    cellFormula: false,
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('Yüklenen Excel dosyasında sayfa bulunamadı.');
  }

  // Pick first sheet
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  if (!sheet || !sheet['!ref']) {
    throw new Error('Excel sayfası boş veya bozuk görünüyor.');
  }

  // Convert to JSON with headers
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: '',
    raw: false,
  });

  if (!jsonData || jsonData.length === 0) {
    throw new Error('Excel dosyasında veri satırı bulunamadı. Lütfen en az bir üye kaydı ekleyiniz.');
  }

  // Max 1000 rows protection
  if (jsonData.length > 1000) {
    throw new Error(`Tek seferde en fazla 1000 üye aktarabilirsiniz. Dosyanızda ${jsonData.length} satır tespit edildi.`);
  }

  // Extract headers from first object keys
  const headers = Object.keys(jsonData[0] || {});
  if (headers.length === 0) {
    throw new Error('Excel dosyasında sütun başlıkları okunamadı.');
  }

  return { headers, rawRows: jsonData };
}

/**
 * Automatically maps Excel column names to system field keys
 */
export function autoMapColumns(excelHeaders: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const mappedSystemKeys = new Set<string>();

  // Normalized definitions lookup
  const normalizedDefs = MEMBER_FIELD_DEFINITIONS.map((def) => ({
    def,
    normLabel: normalizeHeader(def.label),
    normAliases: def.aliases.map(normalizeHeader),
  }));

  for (const header of excelHeaders) {
    const norm = normalizeHeader(header);
    if (!norm) continue;

    // 1. Exact label match
    let match = normalizedDefs.find(
      (item) => !mappedSystemKeys.has(item.def.key) && item.normLabel === norm
    );

    // 2. Alias match
    if (!match) {
      match = normalizedDefs.find(
        (item) => !mappedSystemKeys.has(item.def.key) && item.normAliases.includes(norm)
      );
    }

    // 3. Substring match
    if (!match) {
      match = normalizedDefs.find(
        (item) =>
          !mappedSystemKeys.has(item.def.key) &&
          (norm.includes(item.normLabel) || item.normAliases.some((a) => norm.includes(a)))
      );
    }

    if (match) {
      mapping[header] = match.def.key;
      mappedSystemKeys.add(match.def.key);
    } else {
      mapping[header] = 'IGNORE';
    }
  }

  return mapping;
}

/**
 * Normalizes date inputs to standard YYYY-MM-DD
 */
export function normalizeDate(val: any): string | null {
  if (!val) return null;
  const str = val.toString().trim();
  if (!str) return null;

  // If DD.MM.YYYY or DD/MM/YYYY
  const dmYMatch = str.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/);
  if (dmYMatch) {
    const day = dmYMatch[1].padStart(2, '0');
    const month = dmYMatch[2].padStart(2, '0');
    const year = dmYMatch[3];
    return `${year}-${month}-${day}`;
  }

  // If YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return str;
}

/**
 * Clean phone number to digits or standard format
 */
export function normalizePhone(val: any): string {
  if (!val) return '';
  const digits = val.toString().replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('5')) {
    return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
  if (digits.length === 11 && digits.startsWith('05')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
  }
  return val.toString().trim();
}

/**
 * Row-by-row validation, duplicate detection and conflict matching
 */
export function validateAndPrepareRows(params: {
  rawRows: Record<string, any>[];
  columnMapping: Record<string, string>;
  existingMembers: Member[];
  accreditationsList?: Accreditation[];
  teamPositionsList?: TeamPosition[];
}): BatchImportRow[] {
  const { rawRows, columnMapping, existingMembers, accreditationsList = [], teamPositionsList = [] } = params;

  // Index existing members by T.C. Kimlik and MemberNo
  const existingTCMap = new Map<string, Member>();
  const existingMemberNoMap = new Map<string, Member>();
  existingMembers.forEach((m) => {
    if (m.idNumber) existingTCMap.set(m.idNumber.trim(), m);
    if (m.memberNo) existingMemberNoMap.set(m.memberNo.trim().toUpperCase(), m);
  });

  // Track TC numbers seen inside this Excel file to detect in-file duplicates
  const seenTCsInFile = new Map<string, number>();

  const resultRows: BatchImportRow[] = [];

  rawRows.forEach((rowObj, index) => {
    const rowNumber = index + 2; // Excel row number (1-based, row 1 is header)
    const rowData: Record<string, any> = {};

    // Transform row using columnMapping
    Object.entries(columnMapping).forEach(([excelHeader, systemKey]) => {
      if (systemKey && systemKey !== 'IGNORE') {
        const rawVal = rowObj[excelHeader];
        rowData[systemKey] = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
      }
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Mandatory Fields Check
    if (!rowData.firstName) {
      errors.push('Ad alanı zorunludur ve boş bırakılamaz.');
    }
    if (!rowData.lastName) {
      errors.push('Soyad alanı zorunludur ve boş bırakılamaz.');
    }
    if (!rowData.idNumber) {
      errors.push('T.C. Kimlik Numarası zorunludur ve boş bırakılamaz.');
    }
    if (!rowData.phone) {
      errors.push('Cep Telefonu alanı zorunludur.');
    }

    // 2. T.C. Kimlik Algorithm Validation
    const cleanTC = rowData.idNumber ? rowData.idNumber.toString().replace(/\D/g, '') : '';
    if (cleanTC) {
      rowData.idNumber = cleanTC;
      const tcCheck = validateTCKimlik(cleanTC);
      if (!tcCheck.isValid) {
        errors.push(`Geçersiz T.C. Kimlik Numarası (${cleanTC}): ${tcCheck.message}`);
      }

      // Check In-File Duplicate
      if (seenTCsInFile.has(cleanTC)) {
        const prevRow = seenTCsInFile.get(cleanTC);
        errors.push(`Bu T.C. Kimlik Numarası Excel dosyasında tekrar ediyor (Önceki satır: #${prevRow}).`);
      } else {
        seenTCsInFile.set(cleanTC, rowNumber);
      }
    }

    // 3. Normalization of Dates
    if (rowData.birthDate) {
      rowData.birthDate = normalizeDate(rowData.birthDate);
    }
    if (rowData.joinDate) {
      rowData.joinDate = normalizeDate(rowData.joinDate);
    } else {
      rowData.joinDate = new Date().toISOString().slice(0, 10);
    }

    // 4. Normalization of Phone
    if (rowData.phone) {
      rowData.phone = normalizePhone(rowData.phone);
      const digits = rowData.phone.replace(/\D/g, '');
      if (digits.length < 10) {
        warnings.push('Telefon numarası eksik veya standart dışı görünüyor.');
      }
    }
    if (rowData.emergencyContactPhone) {
      rowData.emergencyContactPhone = normalizePhone(rowData.emergencyContactPhone);
    }

    // 5. İlçe validation
    if (rowData.district) {
      const matchedDistrict = BURSA_DISTRICTS.find(
        (d) => d.toLowerCase() === rowData.district.toString().toLowerCase()
      );
      if (matchedDistrict) {
        rowData.district = matchedDistrict;
      } else {
        warnings.push(`"${rowData.district}" Bursa ilçeleri arasında bulunamadı. Genel kayıt olarak tutulacak.`);
      }
    } else {
      rowData.district = 'Osmangazi'; // Default Bursa central district
    }

    // 6. Ekip Görevi
    const knownPositions = [
      'Ekip Lideri',
      'Lider Yardımcısı',
      'Ekip Üyesi',
      'Lojistik Sorumlusu',
      'İlkyardım Sorumlusu',
      'Haberleşme Sorumlusu',
      ...teamPositionsList.map((p) => p.name),
    ];
    if (rowData.teamPosition) {
      const posMatched = knownPositions.find(
        (p) => p.toLowerCase() === rowData.teamPosition.toString().toLowerCase()
      );
      if (posMatched) {
        rowData.teamPosition = posMatched;
      } else {
        warnings.push(`"${rowData.teamPosition}" tanımlı görevler arasında yok. "Ekip Üyesi" olarak atanacak.`);
        rowData.teamPosition = 'Ekip Üyesi';
      }
    } else {
      rowData.teamPosition = 'Ekip Üyesi';
    }

    // 7. Kan Grubu
    if (rowData.bloodType) {
      const cleanBt = rowData.bloodType.toString().trim().toUpperCase().replace(/\s+/g, ' ');
      const matchedBt = BLOOD_TYPES.find((b) => b.toUpperCase() === cleanBt);
      if (matchedBt) {
        rowData.bloodType = matchedBt;
      } else {
        warnings.push(`"${rowData.bloodType}" standart kan grubu formatına uymuyor.`);
      }
    }

    // 8. Cinsiyet
    if (rowData.gender) {
      const gLower = rowData.gender.toString().toLowerCase();
      if (gLower.startsWith('e')) rowData.gender = 'Erkek';
      else if (gLower.startsWith('k')) rowData.gender = 'Kadın';
      else rowData.gender = 'Erkek';
    } else {
      rowData.gender = 'Erkek';
    }

    // 9. Üyelik Durumu
    if (rowData.status) {
      const sLower = rowData.status.toString().toLowerCase();
      if (sLower.includes('pasif')) rowData.status = 'Pasif';
      else rowData.status = 'Aktif';
    } else {
      rowData.status = 'Aktif';
    }

    // 10. SRC Belgesi ve SRC Belge Türü Doğrulaması
    const rawSrcCert = rowData.srcCertificate ? rowData.srcCertificate.toString().trim() : '';
    const rawSrcType = (rowData.srcCertificateType || rowData.src_belge_turu)
      ? (rowData.srcCertificateType || rowData.src_belge_turu).toString().trim().toUpperCase()
      : '';

    const validSrcTypes = ['SRC1', 'SRC2', 'SRC3', 'SRC4'];

    if (
      rawSrcCert.toLowerCase() === 'var' ||
      rawSrcCert.toLowerCase() === 'evet' ||
      rawSrcCert.toLowerCase() === 'true' ||
      rawSrcType
    ) {
      rowData.srcCertificate = 'Var';
      if (!rawSrcType) {
        errors.push('SRC Belgesi "Var" olan üyeler için SRC Belge Türü zorunludur (SRC1, SRC2, SRC3 veya SRC4).');
      } else if (!validSrcTypes.includes(rawSrcType)) {
        errors.push(`Geçersiz SRC Belge Türü: "${rawSrcType}". Yalnızca SRC1, SRC2, SRC3 veya SRC4 kabul edilir.`);
      } else {
        rowData.srcCertificateType = rawSrcType;
      }
    } else {
      rowData.srcCertificate = 'Yok';
      rowData.srcCertificateType = null;
    }

    // 11. Check Database Duplicate (Match existing member by TC or MemberNo)
    let matchedMember: Member | undefined;
    if (cleanTC && existingTCMap.has(cleanTC)) {
      matchedMember = existingTCMap.get(cleanTC);
    } else if (rowData.memberNo && existingMemberNoMap.has(rowData.memberNo.toString().trim().toUpperCase())) {
      matchedMember = existingMemberNoMap.get(rowData.memberNo.toString().trim().toUpperCase());
    }

    // Determine row status
    let status: BatchImportRowStatus = 'VALID';
    let statusMessage = 'Aktarılabilir';

    if (errors.length > 0) {
      status = 'ERROR';
      statusMessage = `${errors.length} adet hata tespit edildi.`;
    } else if (matchedMember) {
      status = 'MATCHED';
      statusMessage = `Mevcut üye ile eşleşti: ${matchedMember.firstName} ${matchedMember.lastName} (${matchedMember.memberNo})`;
    } else if (warnings.length > 0) {
      status = 'WARNING';
      statusMessage = `${warnings.length} adet uyarı var.`;
    }

    resultRows.push({
      rowNumber,
      data: rowData,
      status,
      statusMessage,
      errors,
      warnings,
      matchedMemberId: matchedMember?.id,
      matchedMemberName: matchedMember ? `${matchedMember.firstName} ${matchedMember.lastName}` : undefined,
      selected: status !== 'ERROR', // bad rows deselected by default
    });
  });

  return resultRows;
}

/**
 * Exports failed & skipped rows to an Excel error report
 */
export function exportFailedRowsToExcel(
  failedRows: Array<{
    rowNumber: number;
    fullName?: string;
    reason: string;
    fields: string[];
  }>
): void {
  const wb = XLSX.utils.book_new();

  const reportRows = failedRows.map((r) => ({
    'Excel Satır No': r.rowNumber,
    'Üye Adı Soyadı': r.fullName || '-',
    'Hata / Sorun Açıklaması': r.reason,
    'İlgili Alanlar': r.fields.join(', '),
  }));

  const ws = XLSX.utils.json_to_sheet(reportRows);
  ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 55 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Hatalı Satırlar Raporu');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Bursa_MEB_AKUB_Aktarim_Hatalari_${today}.xlsx`);
}
