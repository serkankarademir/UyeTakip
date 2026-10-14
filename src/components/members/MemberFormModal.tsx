import React, { useState, useEffect } from 'react';
import { Member, TeamPosition, Accreditation } from '../../types/index.ts';
import { apiClient } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import {
  validateTCKimlik,
  BURSA_DISTRICTS,
  BLOOD_TYPES,
  SHIRT_SIZES,
  DRIVING_LICENSE_CLASSES,
} from '../../lib/formatters.ts';
import {
  X,
  User,
  Shield,
  Phone,
  GraduationCap,
  Shirt,
  HeartHandshake,
  HeartPulse,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface Props {
  member: Member | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const MemberFormModal: React.FC<Props> = ({ member, onClose, onSuccess }) => {
  const { showToast, currentUserRole } = useApp();
  const [activeTab, setActiveTab] = useState<'personal' | 'team' | 'contact' | 'education' | 'equipment' | 'emergency' | 'health'>('personal');
  const [saving, setSaving] = useState(false);

  const [positions, setPositions] = useState<TeamPosition[]>([]);
  const [availableAccreditations, setAvailableAccreditations] = useState<Accreditation[]>([]);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [gender, setGender] = useState('Erkek');
  const [bloodType, setBloodType] = useState('A Rh+');
  const [city, setCity] = useState('Bursa');
  const [district, setDistrict] = useState('Osmangazi');

  const [teamPosition, setTeamPosition] = useState('Ekip Üyesi');
  const [joinDate, setJoinDate] = useState('');
  const [responsibilityArea, setResponsibilityArea] = useState('');
  const [dutyStation, setDutyStation] = useState('');
  const [dutyTitle, setDutyTitle] = useState('');
  const [branch, setBranch] = useState('Kentsel Arama Kurtarma');
  const [radioCallSign, setRadioCallSign] = useState('');
  const [status, setStatus] = useState<'Aktif' | 'Pasif'>('Aktif');

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const [educationLevel, setEducationLevel] = useState('Lisans');
  const [selectedAccreditations, setSelectedAccreditations] = useState<number[]>([]);
  const [drivingLicense, setDrivingLicense] = useState('Var');
  const [selectedLicenseClasses, setSelectedLicenseClasses] = useState<string[]>(['B']);
  const [srcCertificate, setSrcCertificate] = useState('Yok');
  const [srcCertificateType, setSrcCertificateType] = useState('');
  const [passportStatus, setPassportStatus] = useState('Yok');
  const [passportNumber, setPassportNumber] = useState('');
  const [disabilityStatus, setDisabilityStatus] = useState('Yok');

  const [shoeSize, setShoeSize] = useState<number | string>(42);
  const [shirtSize, setShirtSize] = useState('L');

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyDegree, setEmergencyDegree] = useState('Eşi');

  // Health record
  const [chronicDiseases, setChronicDiseases] = useState('');
  const [allergies, setAllergies] = useState('');
  const [pastSurgeries, setPastSurgeries] = useState('');
  const [prosthetics, setProsthetics] = useState('');
  const [regularMedications, setRegularMedications] = useState('');
  const [bloodGroupVerified, setBloodGroupVerified] = useState(false);
  const [healthNotes, setHealthNotes] = useState('');

  const [photoUrl, setPhotoUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Live TC validation
  const [tcError, setTcError] = useState<string | null>(null);

  useEffect(() => {
    loadLookups();
    if (member) {
      loadMemberDetails(member.id);
    } else {
      setJoinDate(new Date().toLocaleDateString('tr-TR'));
    }
  }, [member]);

  const loadLookups = async () => {
    try {
      const [settingsRes, accRes] = await Promise.all([
        apiClient.getSettings(),
        apiClient.getAccreditations(),
      ]);
      setPositions(settingsRes.positions);
      setAvailableAccreditations(accRes);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMemberDetails = async (id: number) => {
    try {
      const m = await apiClient.getMemberById(id);
      setFirstName(m.firstName || '');
      setLastName(m.lastName || '');
      setIdNumber(m.idNumber || '');
      setBirthDate(m.birthDate || '');
      setBirthPlace(m.birthPlace || '');
      setFatherName(m.fatherName || '');
      setGender(m.gender || 'Erkek');
      setBloodType(m.bloodType || 'A Rh+');
      setCity(m.city || 'İstanbul');
      setDistrict(m.district || 'Kadıköy');

      setTeamPosition(m.teamPosition || 'Ekip Üyesi');
      setJoinDate(m.joinDate || '');
      setResponsibilityArea(m.responsibilityArea || '');
      setDutyStation(m.dutyStation || '');
      setDutyTitle(m.dutyTitle || '');
      setBranch(m.branch || '');
      setRadioCallSign(m.radioCallSign || '');
      setStatus(m.status || 'Aktif');

      setPhone(m.phone || '');
      setEmail(m.email || '');
      setAddress(m.address || '');

      setEducationLevel(m.educationLevel || 'Lisans');
      setDrivingLicense(m.drivingLicense || 'Var');
      if (m.drivingLicenseClasses) {
        setSelectedLicenseClasses(m.drivingLicenseClasses.split(',').map((s) => s.trim()));
      }
      setSrcCertificate(m.srcCertificate || 'Yok');
      setSrcCertificateType(m.srcCertificateType || (m as any).src_belge_turu || '');
      setPassportStatus(m.passportStatus || 'Yok');
      setPassportNumber(m.passportNumber || '');
      setDisabilityStatus(m.disabilityStatus || 'Yok');

      setShoeSize(m.shoeSize || 42);
      setShirtSize(m.shirtSize || 'L');
      setPhotoUrl(m.photoUrl || '');
      setNotes(m.notes || '');

      if (m.accreditations && Array.isArray(m.accreditations)) {
        const ids = m.accreditations.map((a: any) => (typeof a === 'object' ? a.accreditationId : null)).filter(Boolean);
        setSelectedAccreditations(ids);
      }

      if (m.emergencyContacts && m.emergencyContacts.length > 0) {
        const ec = m.emergencyContacts[0];
        setEmergencyName(ec.contactName || '');
        setEmergencyPhone(ec.contactPhone || '');
        setEmergencyDegree(ec.relationshipDegree || 'Eşi');
      }

      if (m.healthRecord) {
        setChronicDiseases(m.healthRecord.chronicDiseases || '');
        setAllergies(m.healthRecord.allergies || '');
        setPastSurgeries(m.healthRecord.pastSurgeries || '');
        setProsthetics(m.healthRecord.prosthetics || '');
        setRegularMedications(m.healthRecord.regularMedications || '');
        setBloodGroupVerified(m.healthRecord.bloodGroupVerified || false);
        setHealthNotes(m.healthRecord.additionalNotes || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTcChange = (val: string) => {
    setIdNumber(val);
    if (val.length === 11) {
      const v = validateTCKimlik(val);
      setTcError(v.isValid ? null : v.message || 'Geçersiz T.C. Kimlik No');
    } else if (val.length > 0) {
      setTcError('11 haneli olmalıdır');
    } else {
      setTcError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      showToast('Ad ve Soyad alanları zorunludur.', 'error');
      setActiveTab('personal');
      return;
    }

    if (!idNumber.trim()) {
      showToast('T.C. Kimlik Numarası zorunludur.', 'error');
      setActiveTab('personal');
      return;
    }

    const tcCheck = validateTCKimlik(idNumber);
    if (!tcCheck.isValid) {
      showToast(tcCheck.message || 'Geçersiz T.C. Kimlik Numarası.', 'error');
      setActiveTab('personal');
      return;
    }

    if (!phone.trim()) {
      showToast('İletişim için cep telefonu zorunludur.', 'error');
      setActiveTab('contact');
      return;
    }

    if (srcCertificate === 'Var') {
      const cleanType = srcCertificateType.trim();
      if (!cleanType) {
        showToast('SRC Belgesi "Var" seçildiğinde SRC Belge Türü (SRC1, SRC2, SRC3 veya SRC4) zorunludur.', 'error');
        setActiveTab('education');
        return;
      }
      const validTypes = ['SRC1', 'SRC2', 'SRC3', 'SRC4'];
      if (!validTypes.includes(cleanType)) {
        showToast('Lütfen geçerli bir SRC Belge Türü seçiniz (SRC1, SRC2, SRC3 veya SRC4).', 'error');
        setActiveTab('education');
        return;
      }
    }

    try {
      setSaving(true);

      const payload = {
        firstName,
        lastName,
        idNumber,
        birthDate,
        birthPlace,
        fatherName,
        gender,
        bloodType,
        city,
        district,
        address,
        phone,
        email,
        teamPosition,
        joinDate,
        responsibilityArea,
        dutyStation,
        dutyTitle,
        branch,
        radioCallSign,
        status,
        educationLevel,
        drivingLicense,
        drivingLicenseClasses: selectedLicenseClasses.join(', '),
        srcCertificate,
        srcCertificateType: srcCertificate === 'Var' ? srcCertificateType.trim() : null,
        passportStatus,
        passportNumber,
        disabilityStatus,
        shoeSize: shoeSize ? Number(shoeSize) : null,
        shirtSize,
        notes,
        photoUrl: photoUrl || null,
        accreditationIds: selectedAccreditations,
        emergencyContacts: emergencyName.trim()
          ? [
              {
                contactName: emergencyName.trim(),
                contactPhone: emergencyPhone.trim(),
                relationshipDegree: emergencyDegree,
                isPrimary: true,
              },
            ]
          : [],
        healthRecord: currentUserRole !== 'VIEWER'
          ? {
              chronicDiseases,
              allergies,
              pastSurgeries,
              prosthetics,
              regularMedications,
              bloodGroupVerified,
              additionalNotes: healthNotes,
            }
          : undefined,
      };

      if (member) {
        await apiClient.updateMember(member.id, payload);
        showToast('Üye bilgileri başarıyla güncellendi.', 'success');
      } else {
        await apiClient.createMember(payload);
        showToast('Yeni üye başarıyla sisteme kaydedildi.', 'success');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Kayıt sırasında bir hata oluştu.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'personal', label: 'A. Kimlik & Kişisel', icon: User },
    { id: 'team', label: 'B. Ekip & Görev', icon: Shield },
    { id: 'contact', label: 'C. İletişim', icon: Phone },
    { id: 'education', label: 'D. Eğitim & Akreditasyon', icon: GraduationCap },
    { id: 'equipment', label: 'E. Kıyafet & Beden', icon: Shirt },
    { id: 'emergency', label: 'F. Acil Durum Yakını', icon: HeartHandshake },
    { id: 'health', label: 'G. Sağlık Bilgisi (KVKK)', icon: HeartPulse },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {member ? `Üye Düzenle: ${member.firstName} ${member.lastName}` : 'Yeni Ekip Üyesi Kayıt Formu'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {member ? `Üye No: ${member.memberNo}` : 'Tüm sekmelerdeki zorunlu bilgileri doldurunuz.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none bg-slate-100/70 dark:bg-slate-900/50 px-4 pt-2 gap-1.5">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border-rose-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB A: KIMLIK & KISISEL */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Adı *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Örn: Ahmet"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Soyadı *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Örn: Yılmaz"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* TC Kimlik No */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  T.C. Kimlik Numarası (11 Hane) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={idNumber}
                    onChange={(e) => handleTcChange(e.target.value)}
                    placeholder="11 haneli T.C. Kimlik No"
                    className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:outline-none ${
                      tcError
                        ? 'border-rose-500 focus:ring-rose-500'
                        : idNumber.length === 11
                        ? 'border-emerald-500 focus:ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-rose-500'
                    }`}
                  />
                  {idNumber.length === 11 && !tcError && (
                    <span className="absolute right-3 top-2.5 text-emerald-600 flex items-center gap-1 text-xs font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Algoritma Geçerli
                    </span>
                  )}
                </div>
                {tcError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {tcError}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Doğum Tarihi
                  </label>
                  <input
                    type="text"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    placeholder="GG.AA.YYYY (Örn: 14.05.1990)"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Doğum Yeri
                  </label>
                  <input
                    type="text"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    placeholder="Örn: İstanbul"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Baba Adı
                  </label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Örn: Mehmet"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cinsiyet
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="Erkek">Erkek</option>
                    <option value="Kadın">Kadın</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kan Grubu
                  </label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    İkamet İlçesi *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    {BURSA_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fotoğraf URL / Depolama Anahtarı
                </label>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://... veya dosya anahtarı (İsteğe bağlı)"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB B: EKIP VE GÖREV */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ekip Üyeliği / Görevi *
                  </label>
                  <select
                    value={teamPosition}
                    onChange={(e) => setTeamPosition(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    {positions.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ekip Üyelik Tarihi *
                  </label>
                  <input
                    type="text"
                    required
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    placeholder="GG.AA.YYYY"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sorumluluk Alanı
                  </label>
                  <input
                    type="text"
                    value={responsibilityArea}
                    onChange={(e) => setResponsibilityArea(e.target.value)}
                    placeholder="Örn: Anadolu Yakası Operasyonları"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Görev Yeri
                  </label>
                  <input
                    type="text"
                    value={dutyStation}
                    onChange={(e) => setDutyStation(e.target.value)}
                    placeholder="Örn: Kadıköy Afet Merkezi"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Görev Ünvanı
                  </label>
                  <input
                    type="text"
                    value={dutyTitle}
                    onChange={(e) => setDutyTitle(e.target.value)}
                    placeholder="Örn: Saha Arama Kurtarmacı"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Branşı
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="Örn: Kentsel Arama / Triyaj"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Telsiz Çağrı İşareti
                  </label>
                  <input
                    type="text"
                    value={radioCallSign}
                    onChange={(e) => setRadioCallSign(e.target.value)}
                    placeholder="Örn: TA1AYM"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Üyelik Durumu *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={status === 'Aktif'}
                      onChange={() => setStatus('Aktif')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-semibold text-emerald-600">Aktif</span> (Saha ve etkinlik görevlerine uygun)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={status === 'Pasif'}
                      onChange={() => setStatus('Pasif')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-semibold text-slate-500">Pasif</span> (Geçici izinli / pasif durumda)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB C: İLETİŞİM */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cep Telefonu (Türkiye formatında) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    E-posta Adresi
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@ekiptakip.org"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  İkametgâh Adresi
                </label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Mahalle, cadde, sokak ve kapı numarası..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB D: EGITIM, AKREDITASYON & BELGELER */}
          {activeTab === 'education' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Öğrenim Durumu
                </label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="İlköğretim">İlköğretim</option>
                  <option value="Lise">Lise</option>
                  <option value="Ön Lisans">Ön Lisans</option>
                  <option value="Lisans">Lisans</option>
                  <option value="Yüksek Lisans">Yüksek Lisans</option>
                  <option value="Doktora">Doktora</option>
                </select>
              </div>

              {/* Akreditasyonlar (Çoklu seçim ilişkisel tablo) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Akreditasyonlar (Çoklu Seçim - İlişkisel SQL Tablosu)
                  </label>
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                    {selectedAccreditations.length} seçildi
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  {availableAccreditations.map((acc) => {
                    const isSelected = selectedAccreditations.includes(acc.id);
                    return (
                      <label
                        key={acc.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-950 dark:text-rose-100'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAccreditations([...selectedAccreditations, acc.id]);
                            } else {
                              setSelectedAccreditations(selectedAccreditations.filter((id) => id !== acc.id));
                            }
                          }}
                          className="mt-0.5 text-rose-600 focus:ring-rose-500 rounded"
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-xs block truncate">{acc.name}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                            {acc.organization} • {acc.code}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ehliyet Durumu
                  </label>
                  <select
                    value={drivingLicense}
                    onChange={(e) => setDrivingLicense(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="Var">Var</option>
                    <option value="Yok">Yok</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    SRC Belgesi
                  </label>
                  <select
                    value={srcCertificate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSrcCertificate(val);
                      if (val === 'Yok') {
                        setSrcCertificateType('');
                      } else if (!srcCertificateType) {
                        setSrcCertificateType('SRC1');
                      }
                    }}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="Var">Var</option>
                    <option value="Yok">Yok</option>
                  </select>
                </div>
              </div>

              {/* SRC Belge Türü (SRC Belgesi = Var seçildiğinde görünür ve zorunlu olur) */}
              {srcCertificate === 'Var' && (
                <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 transition-all">
                  <label className="block text-xs font-bold text-purple-900 dark:text-purple-300 mb-1">
                    SRC Belge Türü *
                  </label>
                  <select
                    required
                    value={srcCertificateType}
                    onChange={(e) => setSrcCertificateType(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none font-medium"
                  >
                    <option value="">Lütfen SRC Belge Türü Seçiniz</option>
                    <option value="SRC1">SRC1 (Uluslararası Yolcu Taşımacılığı)</option>
                    <option value="SRC2">SRC2 (Yurtiçi Yolcu Taşımacılığı)</option>
                    <option value="SRC3">SRC3 (Uluslararası Eşya/Kargo Taşımacılığı)</option>
                    <option value="SRC4">SRC4 (Yurtiçi Eşya/Kargo Taşımacılığı)</option>
                  </select>
                  <p className="text-[11px] text-purple-700 dark:text-purple-400 mt-1">
                    SRC belgesi bulunan personeller için geçerli belge türü seçimi zorunludur.
                  </p>
                </div>
              )}

              {drivingLicense === 'Var' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Ehliyet Sınıfları (Birden fazla seçilebilir)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DRIVING_LICENSE_CLASSES.map((cls) => {
                      const isChecked = selectedLicenseClasses.includes(cls);
                      return (
                        <button
                          type="button"
                          key={cls}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedLicenseClasses(selectedLicenseClasses.filter((c) => c !== cls));
                            } else {
                              setSelectedLicenseClasses([...selectedLicenseClasses, cls]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            isChecked
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pasaport Durumu
                  </label>
                  <select
                    value={passportStatus}
                    onChange={(e) => setPassportStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="Var">Var</option>
                    <option value="Yok">Yok</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pasaport Numarası
                  </label>
                  <input
                    type="text"
                    disabled={passportStatus !== 'Var'}
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value)}
                    placeholder="U12345678"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Engel Durumu
                  </label>
                  <select
                    value={disabilityStatus}
                    onChange={(e) => setDisabilityStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="Yok">Yok</option>
                    <option value="Var">Var</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB E: KIYAFET & EKIPMAN */}
          {activeTab === 'equipment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bot / Ayakkabı Numarası
                  </label>
                  <input
                    type="number"
                    min={35}
                    max={50}
                    value={shoeSize}
                    onChange={(e) => setShoeSize(e.target.value)}
                    placeholder="Örn: 43"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Saha botu ve koruyucu çizme numarası</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tişört / Kıyafet Bedeni
                  </label>
                  <select
                    value={shirtSize}
                    onChange={(e) => setShirtSize(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    {SHIRT_SIZES.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ekip üniforması, yelek ve polar lojistiği için
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB F: ACIL DURUM YAKINI */}
          {activeTab === 'emergency' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Operasyon ve afet anında acil durumda ilk ulaşılacak birinci derece yakının bilgileri:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Yakının Adı Soyadı
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="Örn: Zeynep Yılmaz"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Yakının Telefonu
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Yakınlık Derecesi
                  </label>
                  <select
                    value={emergencyDegree}
                    onChange={(e) => setEmergencyDegree(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="Eşi">Eşi</option>
                    <option value="Annesi">Annesi</option>
                    <option value="Babası">Babası</option>
                    <option value="Kardeşi">Kardeşi</option>
                    <option value="Çocuğu">Çocuğu</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB G: SAĞLIK & ÖZEL DURUM (Hassas Veri) */}
          {activeTab === 'health' && (
            <div className="space-y-4">
              {currentUserRole === 'VIEWER' ? (
                <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-center space-y-2">
                  <Lock className="w-8 h-8 mx-auto text-amber-600 dark:text-amber-400" />
                  <h4 className="font-bold text-amber-900 dark:text-amber-200">
                    Yetki Sınırı: Hassas Sağlık Verisi Korunuyor
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 max-w-md mx-auto">
                    Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, üye sağlık ve özel durum bilgileri yalnızca Sistem Yöneticisi veya Üye Yöneticisi yetkisine sahip kullanıcılar tarafından düzenlenebilir.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center gap-2 text-xs text-blue-900 dark:text-blue-200">
                    <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>
                      Sağlık bilgileri isteğe bağlıdır ve hassas kişisel veridir. Yapılan tüm erişim ve güncellemeler denetim loglarına kaydedilmektedir.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Kronik Rahatsızlığı
                      </label>
                      <input
                        type="text"
                        value={chronicDiseases}
                        onChange={(e) => setChronicDiseases(e.target.value)}
                        placeholder="Yok veya örneğin: Hipertansiyon, Astım"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Alerjileri (İlaç, Gıda vb.)
                      </label>
                      <input
                        type="text"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        placeholder="Yok veya örneğin: Penisilin, Toz"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Geçirdiği Tıbbi Operasyonlar
                      </label>
                      <input
                        type="text"
                        value={pastSurgeries}
                        onChange={(e) => setPastSurgeries(e.target.value)}
                        placeholder="Yok veya ameliyat bilgisi"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Kullandığı Protezler
                      </label>
                      <input
                        type="text"
                        value={prosthetics}
                        onChange={(e) => setProsthetics(e.target.value)}
                        placeholder="Yok veya protez bilgisi"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Sürekli Kullandığı İlaçlar
                    </label>
                    <input
                      type="text"
                      value={regularMedications}
                      onChange={(e) => setRegularMedications(e.target.value)}
                      placeholder="Yok veya düzenli ilaç adları"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </>
              )}
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

            <div className="flex items-center gap-2">
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
                  <span>{member ? 'Değişiklikleri Kaydet' : 'Üyeyi Kaydet'}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
