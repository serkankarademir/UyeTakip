import React, { useState, useEffect } from 'react';
import { Member } from '../../types/index.ts';
import { apiClient } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import { formatDateTR, formatPhoneTR } from '../../lib/formatters.ts';
import {
  X,
  User,
  Shield,
  Phone,
  GraduationCap,
  CalendarCheck2,
  HeartPulse,
  Award,
  Lock,
  Printer,
  MapPin,
  Clock,
  Radio,
  FileBadge,
} from 'lucide-react';

interface Props {
  memberId: number;
  onClose: () => void;
  onEdit: (m: Member) => void;
}

export const MemberDetailModal: React.FC<Props> = ({ memberId, onClose, onEdit }) => {
  const { currentUserRole } = useApp();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'personal' | 'team' | 'education' | 'events' | 'health' | 'history'>('personal');

  useEffect(() => {
    loadDetails();
  }, [memberId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getMemberById(memberId);
      setMember(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !member) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Üye detayları getiriliyor...</p>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Top Header Card */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg">
              {member.photoUrl ? (
                <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-rose-300">
                  {member.firstName[0]}
                  {member.lastName[0]}
                </span>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-white/15 text-rose-200 font-bold">
                  {member.memberNo}
                </span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                    member.status === 'Aktif'
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/30'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {member.status}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-rose-600/60 font-semibold text-white">
                  {member.bloodType || 'Kan Grubu Belirtilmedi'}
                </span>
              </div>

              <h2 className="text-2xl font-bold mt-1 text-white truncate">
                {member.firstName} {member.lastName}
              </h2>

              <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <span className="font-semibold text-amber-300">{member.teamPosition}</span>
                <span>•</span>
                <span>{member.city} / {member.district}</span>
                <span>•</span>
                <span>Üyelik: {member.joinDate}</span>
                {member.radioCallSign && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-cyan-300">
                      <Radio className="w-3.5 h-3.5" /> {member.radioCallSign}
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex sm:flex-col gap-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" /> Yazdır
              </button>
              {currentUserRole !== 'VIEWER' && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit(member);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition"
                >
                  Düzenle
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Header */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 pt-2 gap-1 overflow-x-auto">
          {[
            { id: 'personal', label: 'Kişisel Bilgiler', icon: User },
            { id: 'team', label: 'İletişim ve Görev', icon: Phone },
            { id: 'education', label: 'Eğitim ve Akreditasyonlar', icon: GraduationCap },
            { id: 'events', label: 'Katıldığı Etkinlikler', icon: CalendarCheck2 },
            { id: 'health', label: 'Acil Durum ve Sağlık', icon: HeartPulse },
            { id: 'history', label: 'Belgeler ve Geçmiş', icon: Award },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border-rose-600'
                    : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: KİŞİSEL BİLGİLER */}
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block font-medium">T.C. Kimlik Numarası</span>
                <span className="text-slate-900 dark:text-white font-mono font-bold text-sm mt-0.5 block">
                  {currentUserRole === 'VIEWER'
                    ? `${member.idNumber.slice(0, 3)}*****${member.idNumber.slice(8)}`
                    : member.idNumber}
                </span>
                {currentUserRole === 'VIEWER' && (
                  <span className="text-[10px] text-amber-500">KVKK Korumalı (Maskeli)</span>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Doğum Tarihi / Yeri</span>
                <span className="text-slate-900 dark:text-white font-semibold mt-0.5 block">
                  {member.birthDate || '-'} • {member.birthPlace || '-'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Baba Adı</span>
                <span className="text-slate-900 dark:text-white font-semibold mt-0.5 block">
                  {member.fatherName || '-'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Cinsiyet / Kan Grubu</span>
                <span className="text-slate-900 dark:text-white font-semibold mt-0.5 block">
                  {member.gender || '-'} • <strong className="text-rose-600">{member.bloodType}</strong>
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block font-medium">İkamet İlçesi / İl</span>
                <span className="text-slate-900 dark:text-white font-semibold mt-0.5 block">
                  {member.district} / {member.city}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Kıyafet & Bot Bedeni</span>
                <span className="text-slate-900 dark:text-white font-semibold mt-0.5 block">
                  Tişört: <strong>{member.shirtSize || '-'}</strong> • Bot: <strong>{member.shoeSize || '-'} Numara</strong>
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: İLETİŞİM VE GÖREV */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Cep Telefonu</span>
                  <span className="text-slate-900 dark:text-white font-semibold text-sm mt-0.5 block">
                    {formatPhoneTR(member.phone)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">E-posta</span>
                  <span className="text-slate-900 dark:text-white font-semibold mt-0.5 block truncate">
                    {member.email || '-'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Telsiz Çağrı İşareti</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-mono font-bold mt-0.5 block">
                    {member.radioCallSign || '-'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Ekip Görevi / Branş</span>
                  <span className="text-slate-900 dark:text-white font-semibold mt-0.5 block">
                    {member.teamPosition} • {member.branch || '-'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Görev Yeri & Ünvan</span>
                  <span className="text-slate-900 dark:text-white font-semibold mt-0.5 block">
                    {member.dutyStation || '-'} • {member.dutyTitle || '-'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Sorumluluk Alanı</span>
                  <span className="text-slate-900 dark:text-white font-semibold mt-0.5 block">
                    {member.responsibilityArea || '-'}
                  </span>
                </div>
              </div>

              {member.address && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block font-medium mb-1">İkametgâh Adresi</span>
                  <p className="text-slate-900 dark:text-white">{member.address}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EĞİTİM VE AKREDİTASYONLAR */}
          {activeTab === 'education' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block font-medium">Öğrenim Durumu</span>
                  <span className="text-slate-900 dark:text-white font-semibold block mt-0.5">{member.educationLevel || '-'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block font-medium">Ehliyet & Sınıfları</span>
                  <span className="text-slate-900 dark:text-white font-semibold block mt-0.5">
                    {member.drivingLicense} {member.drivingLicenseClasses ? `(${member.drivingLicenseClasses})` : ''}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block font-medium">SRC Belgesi & Türü</span>
                  <span className="text-slate-900 dark:text-white font-semibold block mt-0.5">
                    {member.srcCertificate === 'Var' ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Var</span>
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          {member.srcCertificateType || 'Belirtilmemiş'}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-500">Yok</span>
                    )}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block font-medium">Pasaport Durumu</span>
                  <span className="text-slate-900 dark:text-white font-semibold block mt-0.5">
                    {member.passportStatus} {member.passportNumber ? `(${member.passportNumber})` : ''}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <FileBadge className="w-4 h-4 text-rose-600" /> Sahip Olunan Akreditasyon Belgeleri
                </h4>
                {(!member.accreditations || member.accreditations.length === 0) ? (
                  <p className="text-xs text-slate-400 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                    Henüz kayıtlı akreditasyon belgesi bulunmamaktadır.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {member.accreditations.map((acc: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 flex items-start gap-3"
                      >
                        <Award className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 text-xs">
                          <span className="font-bold text-slate-900 dark:text-white block truncate">
                            {typeof acc === 'string' ? acc : acc.name}
                          </span>
                          {typeof acc === 'object' && (
                            <>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                                {acc.organization} • {acc.code}
                              </span>
                              {acc.expiryDate && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
                                  Geçerlilik: {acc.expiryDate}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: KATILDIĞI ETKİNLİKLER (Relational events) */}
          {activeTab === 'events' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CalendarCheck2 className="w-4 h-4 text-rose-600" /> Katılım Sağlanan Faaliyetler ve Görevler
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  Toplam: {member.participations?.length || 0} etkinlik
                </span>
              </div>

              {(!member.participations || member.participations.length === 0) ? (
                <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                  Bu üye henüz herhangi bir etkinliğe veya operasyona dahil edilmemiştir.
                </div>
              ) : (
                <div className="space-y-2">
                  {member.participations.map((part) => (
                    <div
                      key={part.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              part.eventType === 'Operasyon'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : part.eventType === 'Tatbikat'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {part.eventType}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {part.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{part.city} / {part.district}</span>
                          <span>•</span>
                          <span>{formatDateTR(part.startDateTime, true)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-slate-500">Etkinlikteki Rolü:</span>
                        <span
                          className={`font-semibold px-2.5 py-1 rounded-lg ${
                            part.role === 'Ekip Sorumlusu'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {part.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ACIL DURUM VE SAĞLIK (Hassas Veri / RBAC Koruması) */}
          {activeTab === 'health' && (
            <div className="space-y-5">
              {/* Emergency Contacts */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                  Acil Durumda İlk Ulaşılacak Kişi
                </h4>
                {(!member.emergencyContacts || member.emergencyContacts.length === 0) ? (
                  <p className="text-xs text-slate-400">Acil durum yakını tanımlanmamış.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {member.emergencyContacts.map((ec, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800"
                      >
                        <span className="text-slate-500 block font-medium">Adı Soyadı / Yakınlık</span>
                        <span className="text-slate-900 dark:text-white font-bold block mt-0.5">
                          {ec.contactName} ({ec.relationshipDegree})
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 font-mono block mt-1">
                          {formatPhoneTR(ec.contactPhone)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Health Records with Role Guard */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-rose-600" /> Sağlık ve Özel Durum Kaydı (KVKK Korumalı)
                </h4>

                {currentUserRole === 'VIEWER' ? (
                  <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-center space-y-1 text-xs">
                    <Lock className="w-6 h-6 mx-auto text-amber-600" />
                    <p className="font-bold text-amber-900 dark:text-amber-200">
                      Hassas Sağlık Verisi Gizlenmiştir
                    </p>
                    <p className="text-amber-700 dark:text-amber-300">
                      'Sınırlı Görüntüleyici' yetkisi bu verileri görüntüleyemez. Lütfen üst menüden 'Sistem Yöneticisi' rolünü seçiniz.
                    </p>
                  </div>
                ) : !member.healthRecord ? (
                  <p className="text-xs text-slate-400 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                    Bu üye için özel sağlık kaydı girilmemiştir.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 block font-medium">Kronik Rahatsızlıkları</span>
                      <span className="text-slate-900 dark:text-white font-semibold block mt-0.5">
                        {member.healthRecord.chronicDiseases || 'Yok'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 block font-medium">Alerjileri</span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold block mt-0.5">
                        {member.healthRecord.allergies || 'Yok'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 block font-medium">Geçirdiği Tıbbi Operasyonlar</span>
                      <span className="text-slate-900 dark:text-white font-semibold block mt-0.5">
                        {member.healthRecord.pastSurgeries || 'Yok'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 block font-medium">Sürekli Kullandığı İlaçlar</span>
                      <span className="text-slate-900 dark:text-white font-semibold block mt-0.5">
                        {member.healthRecord.regularMedications || 'Yok'}
                      </span>
                    </div>

                    {member.healthRecord.additionalNotes && (
                      <div className="col-span-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block font-medium">Ek Sağlık & Müdahale Notları</span>
                        <p className="text-slate-900 dark:text-white mt-1">
                          {member.healthRecord.additionalNotes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: BELGELER VE GEÇMİŞ */}
          {activeTab === 'history' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white block mb-1">
                  Kayıt Denetim Bilgileri
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  İlk Kayıt Tarihi: {formatDateTR(member.createdAt, true)}
                </p>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Son Güncelleme: {formatDateTR(member.updatedAt, true)}
                </p>
              </div>

              {member.notes && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    Özel Notlar & Saha Tecrübesi
                  </span>
                  <p className="text-slate-700 dark:text-slate-300">{member.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
