import * as XLSX from 'xlsx';

/**
 * Validates Turkish Republic Identity Number (T.C. Kimlik No)
 * Rules:
 * 1. 11 digits, strictly digits.
 * 2. First digit cannot be 0.
 * 3. 10th digit = ((sum of 1,3,5,7,9th digits * 7) - sum of 2,4,6,8th digits) mod 10
 * 4. 11th digit = (sum of 1st to 10th digits) mod 10
 */
export function validateTCKimlik(tc: string): { isValid: boolean; message?: string } {
  if (!tc) return { isValid: false, message: 'T.C. Kimlik Numarası boş bırakılamaz.' };
  const clean = tc.trim();
  if (clean.length !== 11) {
    return { isValid: false, message: 'T.C. Kimlik Numarası 11 haneli olmalıdır.' };
  }
  if (!/^\d{11}$/.test(clean)) {
    return { isValid: false, message: 'T.C. Kimlik Numarası sadece rakamlardan oluşmalıdır.' };
  }
  if (clean[0] === '0') {
    return { isValid: false, message: 'T.C. Kimlik Numarası 0 ile başlayamaz.' };
  }

  const digits = clean.split('').map(Number);
  const sumOdd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const sumEven = digits[1] + digits[3] + digits[5] + digits[7];

  const digit10 = ((sumOdd * 7) - sumEven + 100) % 10;
  if (digit10 !== digits[9]) {
    return { isValid: false, message: 'Geçersiz T.C. Kimlik Numarası algoritma kontrolü (10. hane).' };
  }

  const sumFirst10 = digits.slice(0, 10).reduce((acc, curr) => acc + curr, 0);
  const digit11 = sumFirst10 % 10;
  if (digit11 !== digits[10]) {
    return { isValid: false, message: 'Geçersiz T.C. Kimlik Numarası algoritma kontrolü (11. hane).' };
  }

  return { isValid: true };
}

/**
 * Formats Turkish phone number to 05XX XXX XX XX
 */
export function formatPhoneTR(phone: string | null | undefined): string {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('5')) {
    return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
  if (digits.length === 11 && digits.startsWith('05')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
  }
  if (digits.length === 12 && digits.startsWith('905')) {
    return `0${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  }
  return phone;
}

/**
 * Formats date string to Turkish DD.MM.YYYY
 */
export function formatDateTR(dateInput: string | Date | null | undefined, includeTime: boolean = false): string {
  if (!dateInput) return '-';
  try {
    // If it's already DD.MM.YYYY
    if (typeof dateInput === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(dateInput)) {
      return dateInput;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      return String(dateInput);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    if (includeTime) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    }
    return `${day}.${month}.${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Export data array to Excel (.xlsx) file with Turkish character support
 */
export function exportToExcel(filename: string, sheetName: string, data: Record<string, any>[]): void {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Standard list of 39 Istanbul districts (default reference) + other Turkish major provinces
 */
export const ISTANBUL_DISTRICTS = [
  'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler', 'Bakırköy', 'Başakşehir',
  'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy',
  'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
  'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer', 'Silivri', 'Sultanbeyli',
  'Sultangazi', 'Şile', 'Şişli', 'Tuzla', 'Ümraniye', 'Üsküdar', 'Zeytinburnu'
];

export const BURSA_DISTRICTS = [
  'Osmangazi', 'Nilüfer', 'Yıldırım', 'İnegöl', 'Gemlik', 'Mudanya',
  'Gürsu', 'Kestel', 'Mustafakemalpaşa', 'Karacabey', 'Orhangazi',
  'Yenişehir', 'İznik', 'Orhaneli', 'Keles', 'Büyükorhan', 'Harmancık'
];

export const TURKEY_CITIES: Record<string, string[]> = {
  'Bursa': BURSA_DISTRICTS,
  'İstanbul': ISTANBUL_DISTRICTS,
  'Ankara': ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Etimesgut', 'Sincan', 'Altındağ', 'Gölbaşı', 'Pursaklar'],
  'İzmir': ['Konak', 'Karşıyaka', 'Bornova', 'Buca', 'Çiğli', 'Gaziemir', 'Balçova', 'Narlıdere', 'Bayraklı', 'Urla'],
  'Kocaeli': ['İzmit', 'Gebze', 'Darıca', 'Körfez', 'Gölcük', 'Derince', 'Çayırova', 'Kartepe', 'Başiskele'],
  'Sakarya': ['Adapazarı', 'Serdivan', 'Akyazı', 'Erenler', 'Hendek', 'Karasu', 'Sapanca', 'Geyve'],
  'Kahramanmaraş': ['Onikişubat', 'Dulkadiroğlu', 'Elbistan', 'Afşin', 'Türkoğlu', 'Göksun', 'Pazarcık'],
  'Hatay': ['Antakya', 'İskenderun', 'Defne', 'Dörtyol', 'Samandağ', 'Kırıkhan', 'Reyhanlı'],
  'Adana': ['Seyhan', 'Yüreğir', 'Çukurova', 'Sarıçam', 'Ceyhan', 'Kozan']
};

export const BLOOD_TYPES = ['A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-', '0 Rh+', '0 Rh-'];
export const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
export const DRIVING_LICENSE_CLASSES = ['M', 'A1', 'A2', 'A', 'B1', 'B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE', 'F', 'G'];
