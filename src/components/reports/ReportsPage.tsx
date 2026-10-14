import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { apiClient } from '../../services/api.ts';
import {
  ReportFilterState,
  ReportQueryParams,
  ReportQueryResult,
  ReportColumnDef,
  SavedReport,
  ReadyTemplateDef,
  Accreditation,
  TeamPosition,
  Member,
  TeamEvent,
} from '../../types/index.ts';
import {
  READY_REPORT_TEMPLATES,
  MEMBER_COLUMNS,
  EVENT_COLUMNS,
  PARTICIPATION_COLUMNS,
  exportReportToExcel,
  exportReportToPdf,
} from '../../lib/reportUtils.ts';
import { ReportFilterPanel } from './ReportFilterPanel.tsx';
import { ReportPreviewTable } from './ReportPreviewTable.tsx';
import { ColumnSelectorModal } from './ColumnSelectorModal.tsx';
import { SaveReportModal } from './SaveReportModal.tsx';
import {
  BarChart3,
  BookmarkPlus,
  RefreshCw,
  Sparkles,
  ChevronDown,
  Layers,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { currentUser, currentUserRole, showToast, refreshTrigger } = useApp();

  // Active Data Source & Report Title
  const [dataSource, setDataSource] = useState<'members' | 'events' | 'participations'>('members');
  const [currentReportTitle, setCurrentReportTitle] = useState<string>('Bursa MEB AKUB – Detaylı Üye Raporu');

  // Query & Table State
  const [filters, setFilters] = useState<ReportFilterState>({ status: 'Aktif' });
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(
    MEMBER_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.key)
  );
  const [sortField, setSortField] = useState<string | undefined>('memberNo');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);

  // Result & Loading
  const [queryResult, setQueryResult] = useState<ReportQueryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Auxiliary data lists
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [eventsList, setEventsList] = useState<TeamEvent[]>([]);
  const [accreditationsList, setAccreditationsList] = useState<Accreditation[]>([]);
  const [teamPositionsList, setTeamPositionsList] = useState<TeamPosition[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  // Modals
  const [isColumnModalOpen, setIsColumnModalOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState<boolean>(false);

  // Load lookups on mount or global refresh
  useEffect(() => {
    loadLookups();
  }, [refreshTrigger]);

  const loadLookups = async () => {
    try {
      const [members, events, accs, settingsRes, saved] = await Promise.all([
        apiClient.getMembers().catch(() => []),
        apiClient.getEvents().catch(() => []),
        apiClient.getAccreditations().catch(() => []),
        apiClient.getSettings().catch(() => ({ positions: [] })),
        apiClient.getSavedReports().catch(() => []),
      ]);
      setMembersList(members);
      setEventsList(events);
      setAccreditationsList(accs);
      setTeamPositionsList(settingsRes.positions || []);
      setSavedReports(saved);
    } catch (err) {
      console.error('Lookups could not be loaded:', err);
    }
  };

  // Run report query
  const fetchReportData = useCallback(
    async (
      targetDataSource: 'members' | 'events' | 'participations' = dataSource,
      targetFilters: ReportFilterState = filters,
      targetSortField: string | undefined = sortField,
      targetSortOrder: 'ASC' | 'DESC' = sortOrder,
      targetPage: number = page,
      targetLimit: number = limit
    ) => {
      try {
        setLoading(true);
        const res = await apiClient.queryReport(
          {
            dataSource: targetDataSource,
            columns: selectedColumnKeys,
            filters: targetFilters,
            sortField: targetSortField,
            sortOrder: targetSortOrder,
            page: targetPage,
            limit: targetLimit,
          },
          currentUserRole
        );
        setQueryResult(res);
      } catch (err: any) {
        showToast(err.message || 'Rapor verileri getirilemedi.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [dataSource, filters, selectedColumnKeys, sortField, sortOrder, page, limit, currentUserRole]
  );

  // Trigger query on parameter changes
  useEffect(() => {
    fetchReportData();
  }, [sortField, sortOrder, page, limit, refreshTrigger]);

  // Available column list for current dataSource
  const currentAvailableColumns: ReportColumnDef[] =
    dataSource === 'members'
      ? MEMBER_COLUMNS
      : dataSource === 'events'
      ? EVENT_COLUMNS
      : PARTICIPATION_COLUMNS;

  // Handle switching data source
  const handleDataSourceChange = (newDs: 'members' | 'events' | 'participations') => {
    setDataSource(newDs);
    const cols =
      newDs === 'members'
        ? MEMBER_COLUMNS
        : newDs === 'events'
        ? EVENT_COLUMNS
        : PARTICIPATION_COLUMNS;
    setSelectedColumnKeys(cols.filter((c) => c.defaultSelected).map((c) => c.key));

    const newTitle =
      newDs === 'members'
        ? 'Bursa MEB AKUB – Detaylı Üye Raporu'
        : newDs === 'events'
        ? 'Bursa MEB AKUB – Detaylı Etkinlik ve Operasyon Raporu'
        : 'Bursa MEB AKUB – Detaylı Katılım Raporu';
    setCurrentReportTitle(newTitle);

    const initialFilters: ReportFilterState = newDs === 'members' ? { status: 'Aktif' } : {};
    setFilters(initialFilters);
    setPage(1);
    setSortField(cols[0]?.key);
    fetchReportData(newDs, initialFilters, cols[0]?.key, 'ASC', 1, limit);
  };

  // Launch a ready pre-built template
  const handleLaunchTemplate = (tpl: ReadyTemplateDef) => {
    setShowTemplatesDropdown(false);
    setDataSource(tpl.dataSource);
    setCurrentReportTitle(`Bursa MEB AKUB – ${tpl.title}`);
    setFilters({ ...tpl.defaultFilters });
    setSelectedColumnKeys([...tpl.defaultColumns]);
    setPage(1);

    const defaultCol =
      tpl.dataSource === 'members'
        ? MEMBER_COLUMNS
        : tpl.dataSource === 'events'
        ? EVENT_COLUMNS
        : PARTICIPATION_COLUMNS;
    const sField = defaultCol[0]?.key;
    setSortField(sField);

    fetchReportData(tpl.dataSource, tpl.defaultFilters, sField, 'ASC', 1, limit);
    showToast(`"${tpl.title}" şablonu yüklendi.`, 'info');
  };

  // Load a saved custom report
  const handleLoadSavedReport = (saved: SavedReport) => {
    setDataSource(saved.dataSource);
    setCurrentReportTitle(`Bursa MEB AKUB – ${saved.name}`);
    setFilters({ ...saved.filters });
    setSelectedColumnKeys([...saved.selectedColumns]);
    if (saved.sortField) setSortField(saved.sortField);
    if (saved.sortOrder) setSortOrder(saved.sortOrder);
    setPage(1);
    setIsSaveModalOpen(false);

    fetchReportData(
      saved.dataSource,
      saved.filters,
      saved.sortField || undefined,
      (saved.sortOrder as 'ASC' | 'DESC') || 'ASC',
      1,
      limit
    );
    showToast(`"${saved.name}" kayıtlı şablonu yüklendi.`, 'success');
  };

  // Filter actions
  const handleApplyFilters = () => {
    setPage(1);
    fetchReportData(dataSource, filters, sortField, sortOrder, 1, limit);
  };

  const handleClearFilters = () => {
    const emptyFilters: ReportFilterState = {};
    setFilters(emptyFilters);
    setPage(1);
    fetchReportData(dataSource, emptyFilters, sortField, sortOrder, 1, limit);
    showToast('Filtreler temizlendi.', 'info');
  };

  // EXCEL EXPORT (EXPORTS ALL FILTERED RECORDS, NOT JUST CURRENT PAGE)
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      // Query with limit=0 to get ALL records matching the active filters
      const res = await apiClient.queryReport(
        {
          dataSource,
          columns: selectedColumnKeys,
          filters,
          sortField,
          sortOrder,
          limit: 0,
        },
        currentUserRole
      );

      const activeColumns = selectedColumnKeys
        .map((key) => currentAvailableColumns.find((c) => c.key === key))
        .filter(Boolean) as ReportColumnDef[];

      exportReportToExcel({
        reportTitle: currentReportTitle,
        categoryTitle:
          dataSource === 'members'
            ? 'Üye Raporu'
            : dataSource === 'events'
            ? 'Etkinlik Raporu'
            : 'Katılım Raporu',
        appliedFilters: res.appliedFiltersSummary,
        columns: activeColumns.map((c) => ({ key: c.key, label: c.label })),
        rows: res.rows,
        userDisplayName: currentUser?.displayName || 'Bursa MEB AKUB Yöneticisi',
      });
      showToast(`${res.rows.length} kayıt Excel (.xlsx) olarak indirildi.`, 'success');
    } catch (err: any) {
      showToast('Excel dışa aktarma hatası: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // PDF EXPORT (EXPORTS ALL FILTERED RECORDS, NOT JUST CURRENT PAGE)
  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      // Query with limit=0 to get ALL records matching the active filters
      const res = await apiClient.queryReport(
        {
          dataSource,
          columns: selectedColumnKeys,
          filters,
          sortField,
          sortOrder,
          limit: 0,
        },
        currentUserRole
      );

      const activeColumns = selectedColumnKeys
        .map((key) => currentAvailableColumns.find((c) => c.key === key))
        .filter(Boolean) as ReportColumnDef[];

      exportReportToPdf({
        reportTitle: currentReportTitle,
        categoryTitle:
          dataSource === 'members'
            ? 'Üye Raporu'
            : dataSource === 'events'
            ? 'Etkinlik Raporu'
            : 'Katılım Raporu',
        appliedFilters: res.appliedFiltersSummary,
        columns: activeColumns.map((c) => ({ key: c.key, label: c.label })),
        rows: res.rows,
        userDisplayName: currentUser?.displayName || 'Bursa MEB AKUB Yöneticisi',
      });
      showToast(`${res.rows.length} kayıt PDF (.pdf) olarak indirildi.`, 'success');
    } catch (err: any) {
      showToast('PDF dışa aktarma hatası: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. SAYFA BAŞLIĞI VE AÇIKLAMA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            DETAYLI ÜYE VE ETKİNLİK RAPORLAMA
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Üyeleri, görevleri, akreditasyonları, etkinlikleri ve katılım durumlarını ayrıntılı filtrelerle raporlayın.
          </p>
        </div>

        {/* SAĞ ÜST: KAYITLI RAPORLAR & HAZIR ŞABLONLAR */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Hazır Şablonlar Menüsü */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Hazır Şablonlar</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showTemplatesDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-slide-up">
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  Standart AKUB Şablonları (16 Adet)
                </div>
                <div className="max-h-80 overflow-y-auto space-y-1 py-1">
                  {READY_REPORT_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleLaunchTemplate(tpl)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-xs transition flex flex-col"
                    >
                      <span className="font-bold text-slate-900 dark:text-white">
                        {tpl.title}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {tpl.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Kaydedilmiş Raporlar Düğmesi */}
          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200/60 dark:border-purple-800/60 transition cursor-pointer"
          >
            <BookmarkPlus className="w-4 h-4 text-amber-500" />
            <span>Kaydedilmiş Raporlar ({savedReports.length})</span>
          </button>

          {/* Yenile */}
          <button
            type="button"
            onClick={() => fetchReportData()}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Sorguyu Yenile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. DİNAMİK FİLTRELEME PANELİ (KOYU LACİVERT & 4 SÜTUNLU IZGARA) */}
      <ReportFilterPanel
        dataSource={dataSource}
        onDataSourceChange={handleDataSourceChange}
        filters={filters}
        onFilterChange={(newFilters) => setFilters(newFilters)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        onOpenColumnSelector={() => setIsColumnModalOpen(true)}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        membersList={membersList}
        eventsList={eventsList}
        accreditationsList={accreditationsList}
        teamPositionsList={teamPositionsList}
        userRole={currentUserRole}
        isExporting={isExporting}
      />

      {/* 4. SONUÇ TABLOSU (FİLTRE PANELİNİN HEMEN ALTINDA) */}
      <ReportPreviewTable
        reportTitle={currentReportTitle}
        categoryTitle={
          dataSource === 'members'
            ? 'Üye Raporu'
            : dataSource === 'events'
            ? 'Etkinlik Raporu'
            : 'Katılım Raporu'
        }
        queryResult={queryResult}
        loading={loading}
        columns={currentAvailableColumns}
        selectedColumnKeys={selectedColumnKeys}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={(f, o) => {
          setSortField(f);
          setSortOrder(o);
        }}
        page={page}
        limit={limit}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        onOpenColumnSelector={() => setIsColumnModalOpen(true)}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        userDisplayName={currentUser?.displayName || 'Bursa MEB AKUB Yöneticisi'}
      />

      {/* MODALS */}
      <ColumnSelectorModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        availableColumns={currentAvailableColumns}
        selectedColumnKeys={selectedColumnKeys}
        onChange={(keys) => {
          setSelectedColumnKeys(keys);
          fetchReportData(dataSource, filters, sortField, sortOrder, page, limit);
        }}
        userRole={currentUserRole}
      />

      <SaveReportModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        dataSource={dataSource}
        category={
          dataSource === 'members'
            ? 'Üye Raporu'
            : dataSource === 'events'
            ? 'Etkinlik Raporu'
            : 'Katılım Raporu'
        }
        selectedColumns={selectedColumnKeys}
        filters={filters}
        savedReports={savedReports}
        onReportSaved={(newRep) => {
          setSavedReports([newRep, ...savedReports]);
          showToast(`"${newRep.name}" şablonu kaydedildi.`, 'success');
        }}
        onReportLoaded={handleLoadSavedReport}
        onReportDeleted={(delId) => {
          setSavedReports(savedReports.filter((r) => r.id !== delId));
          showToast('Şablon silindi.', 'info');
        }}
      />
    </div>
  );
};
