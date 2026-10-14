import React, { useState, useEffect } from 'react';
import { Member, TeamPosition, Accreditation } from '../../types/index.ts';
import { apiClient } from '../../services/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import { formatDateTR, formatPhoneTR, exportToExcel, BURSA_DISTRICTS } from '../../lib/formatters.ts';
import { MemberFormModal } from './MemberFormModal.tsx';
import { MemberDetailModal } from './MemberDetailModal.tsx';
import { ExcelImportModal } from './ExcelImportModal.tsx';
import {
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Eye,
  Edit2,
  Trash2,
  Users,
  Award,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X,
} from 'lucide-react';

export const MembersPage: React.FC = () => {
  const { refreshTrigger, triggerRefresh, showToast, currentUserRole, selectedMemberId, setSelectedMemberId } = useApp();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tümü');
  const [filterPosition, setFilterPosition] = useState('Tümü');
  const [filterDistrict, setFilterDistrict] = useState('Tümü');
  const [filterBranch, setFilterBranch] = useState('Tümü');
  const [filterSrcType, setFilterSrcType] = useState('Tümü');
  const [showSrcColumn, setShowSrcColumn] = useState(true);

  // Lookups
  const [positions, setPositions] = useState<TeamPosition[]>([]);
  const [accreditations, setAccreditations] = useState<Accreditation[]>([]);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [detailMemberId, setDetailMemberId] = useState<number | null>(null);

  // Delete Confirmation State
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [deleteConflict, setDeleteConflict] = useState<{ hasRelations: boolean; eventCount: number; message: string } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting
  const [sortField, setSortField] = useState<'name' | 'no' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadMembers();
  }, [refreshTrigger, search, filterStatus, filterPosition, filterDistrict, filterBranch, filterSrcType]);

  useEffect(() => {
    if (selectedMemberId) {
      setDetailMemberId(selectedMemberId);
      setSelectedMemberId(null);
    }
  }, [selectedMemberId]);

  const loadLookups = async () => {
    try {
      const [settingsRes, accRes] = await Promise.all([
        apiClient.getSettings(),
        apiClient.getAccreditations(),
      ]);
      setPositions(settingsRes.positions);
      setAccreditations(accRes);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getMembers({
        search,
        status: filterStatus,
        position: filterPosition,
        district: filterDistrict,
        branch: filterBranch,
        srcCertificateType: filterSrcType,
      });
      setMembers(data);
    } catch (err: any) {
      showToast(err.message || 'Üyeler yüklenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Sort and Paginate
  const sortedMembers = [...members].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'name') {
      comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'tr');
    } else if (sortField === 'no') {
      comparison = a.memberNo.localeCompare(b.memberNo);
    } else if (sortField === 'date') {
      comparison = a.joinDate.localeCompare(b.joinDate);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedMembers.length / pageSize) || 1;
  const paginatedMembers = sortedMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportExcel = () => {
    const exportData = sortedMembers.map((m) => ({
      'Üye No': m.memberNo,
      'Adı': m.firstName,
      'Soyadı': m.lastName,
      'Ekip Görevi': m.teamPosition,
      'Telefon': formatPhoneTR(m.phone),
      'İlçe': m.district,
      'Görev Yeri': m.dutyStation || '-',
      'Branşı': m.branch || '-',
      'Üyelik Durumu': m.status,
      'Üyelik Tarihi': m.joinDate,
      'Telsiz Çağrı': m.radioCallSign || '-',
      'Kan Grubu': m.bloodType || '-',
      'SRC Belgesi': m.srcCertificate,
      'SRC Belge Türü': m.srcCertificate === 'Var' ? (m.srcCertificateType || '-') : 'Yok',
      'Tişört Bedeni': m.shirtSize || '-',
      'Ayakkabı No': m.shoeSize || '-',
    }));
    exportToExcel('Ekip_Uyeleri_Listesi', 'Üyeler', exportData);
    showToast('Üye listesi Excel olarak dışa aktarıldı.', 'success');
  };

  const handleDeleteClick = (m: Member) => {
    setDeletingMember(m);
    setDeleteConflict(null);
  };

  const confirmDelete = async (force: boolean = false) => {
    if (!deletingMember) return;
    try {
      await apiClient.deleteMember(deletingMember.id, force);
      showToast('Üye başarıyla silindi.', 'success');
      setDeletingMember(null);
      setDeleteConflict(null);
      triggerRefresh();
    } catch (err: any) {
      if (err.hasRelations) {
        setDeleteConflict({
          hasRelations: true,
          eventCount: err.eventCount,
          message: err.message,
        });
      } else {
        showToast(err.message || 'Silme işlemi başarısız.', 'error');
      }
    }
  };

  // Distinct branches for filtering
  const uniqueBranches = Array.from(new Set(members.map((m) => m.branch).filter(Boolean))) as string[];

  return (
    <div className="space-y-5">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-rose-600" /> Ekip Üyeleri Listesi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Toplam {members.length} kayıtlı üye bulundu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel'e Aktar
          </button>

          {currentUserRole !== 'VIEWER' && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-md transition cursor-pointer"
                title="Excel dosyasından toplu personel ve üye kaydı aktarın"
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel'den Üye Aktar
              </button>

              <button
                onClick={() => {
                  setEditingMember(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Yeni Üye Kaydet
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Ad, soyad, üye no, telefon ile ara..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Status filter */}
          <div className="md:col-span-2">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Tümü">Tüm Durumlar</option>
              <option value="Aktif">Aktif Üyeler</option>
              <option value="Pasif">Pasif Üyeler</option>
            </select>
          </div>

          {/* Position filter */}
          <div className="md:col-span-2">
            <select
              value={filterPosition}
              onChange={(e) => {
                setFilterPosition(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Tümü">Tüm Ekip Görevleri</option>
              {positions.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* District filter */}
          <div className="md:col-span-2">
            <select
              value={filterDistrict}
              onChange={(e) => {
                setFilterDistrict(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Tümü">Tüm İlçeler</option>
              {BURSA_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Branch filter */}
          <div className="md:col-span-2">
            <select
              value={filterBranch}
              onChange={(e) => {
                setFilterBranch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Tümü">Tüm Branşlar</option>
              {uniqueBranches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-12 text-center">Fotoğraf</th>
                <th
                  onClick={() => {
                    setSortField('no');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3 px-3 cursor-pointer hover:text-rose-600"
                >
                  Üye No
                </th>
                <th
                  onClick={() => {
                    setSortField('name');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3 px-3 cursor-pointer hover:text-rose-600"
                >
                  Ad Soyad
                </th>
                <th className="py-3 px-3">Ekip Görevi</th>
                <th className="py-3 px-3">Telefon</th>
                <th className="py-3 px-3">İlçesi</th>
                <th className="py-3 px-3">Görev Yeri</th>
                <th className="py-3 px-3">Branşı</th>
                <th className="py-3 px-3">Akreditasyonlar</th>
                <th
                  onClick={() => {
                    setSortField('date');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3 px-3 cursor-pointer hover:text-rose-600"
                >
                  Üyelik Tarihi
                </th>
                <th className="py-3 px-3 text-center">Durum</th>
                <th className="py-3 px-3 text-center w-28">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Üyeler yükleniyor...
                  </td>
                </tr>
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-400">
                    Arama kriterlerine uygun üye bulunamadı.
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Photo */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs overflow-hidden shadow-xs">
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          `${m.firstName[0]}${m.lastName[0]}`
                        )}
                      </div>
                    </td>

                    {/* Member No */}
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {m.memberNo}
                    </td>

                    {/* Name */}
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      <button
                        onClick={() => setDetailMemberId(m.id)}
                        className="hover:text-rose-600 text-left transition"
                      >
                        {m.firstName} {m.lastName}
                      </button>
                    </td>

                    {/* Team Position */}
                    <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {m.teamPosition}
                    </td>

                    {/* Phone */}
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatPhoneTR(m.phone)}
                    </td>

                    {/* District */}
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {m.district}
                    </td>

                    {/* Duty Station */}
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {m.dutyStation || '-'}
                    </td>

                    {/* Branch */}
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {m.branch || '-'}
                    </td>

                    {/* Accreditations */}
                    <td className="py-2.5 px-3 max-w-[180px]">
                      <div className="flex flex-wrap gap-1">
                        {m.accreditations && (m.accreditations as string[]).length > 0 ? (
                          (m.accreditations as string[]).map((acc, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900 truncate"
                            >
                              {typeof acc === 'string' ? acc : (acc as any).name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </div>
                    </td>

                    {/* Join Date */}
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {m.joinDate}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          m.status === 'Aktif'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDetailMemberId(m.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Görüntüle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {currentUserRole !== 'VIEWER' && (
                          <>
                            <button
                              onClick={() => {
                                setEditingMember(m);
                                setIsFormOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Düzenle"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(m)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Count footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Sayfa başına:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>
              Toplam {sortedMembers.length} kayıttan {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, sortedMembers.length)} gösteriliyor
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold text-slate-800 dark:text-slate-200">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal (with Relation Safety Check) */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Üyeyi Silmeyi Onaylayın
              </h3>
            </div>

            {deleteConflict ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-bold mb-1">İlişkili Veri Uyarısı</p>
                  <p>{deleteConflict.message}</p>
                </div>
                <p className="text-xs text-slate-500">
                  Bu üyenin silinmesi katıldığı etkinliklerdeki kayıtları da temizleyecektir. Yine de tamamen silmek istiyor musunuz?
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setDeletingMember(null);
                      setDeleteConflict(null);
                    }}
                    className="px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={() => confirmDelete(true)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-500"
                  >
                    Evet, Kesinlikle Sil
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <strong>{deletingMember.firstName} {deletingMember.lastName}</strong> ({deletingMember.memberNo}) isimli üyeyi silmek istediğinize emin misiniz?
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setDeletingMember(null)}
                    className="px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => confirmDelete(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-500"
                  >
                    Sil
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Member Form Modal */}
      {isFormOpen && (
        <MemberFormModal
          member={editingMember}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            triggerRefresh();
          }}
        />
      )}

      {/* Member Detail Modal */}
      {detailMemberId && (
        <MemberDetailModal
          memberId={detailMemberId}
          onClose={() => setDetailMemberId(null)}
          onEdit={(m) => {
            setDetailMemberId(null);
            setEditingMember(m);
            setIsFormOpen(true);
          }}
        />
      )}

      {/* Excel Batch Import Modal */}
      {isImportModalOpen && (
        <ExcelImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportComplete={() => {
            triggerRefresh();
            loadMembers();
          }}
          existingMembers={members}
          accreditationsList={accreditations}
          teamPositionsList={positions}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
};
