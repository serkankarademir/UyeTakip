import React, { useState } from 'react';
import { ReportColumnDef, ReportQueryResult } from '../../types/index.ts';
import { exportReportToExcel, exportReportToPdf } from '../../lib/reportUtils.ts';
import {
  FileSpreadsheet,
  FileText,
  Columns3,
  BookmarkPlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart2,
  PieChart,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface Props {
  reportTitle: string;
  categoryTitle: string;
  queryResult: ReportQueryResult | null;
  loading: boolean;
  columns: ReportColumnDef[];
  selectedColumnKeys: string[];
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
  onSortChange: (field: string, order: 'ASC' | 'DESC') => void;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onOpenColumnSelector: () => void;
  onOpenSaveModal: () => void;
  userDisplayName?: string;
}

export const ReportPreviewTable: React.FC<Props> = ({
  reportTitle,
  categoryTitle,
  queryResult,
  loading,
  columns,
  selectedColumnKeys,
  sortField,
  sortOrder = 'ASC',
  onSortChange,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onOpenColumnSelector,
  onOpenSaveModal,
  userDisplayName = 'Yetkili Yönetici',
}) => {
  const [showSummaryStats, setShowSummaryStats] = useState<boolean>(false);

  // Active selected column definitions in order
  const activeColumns = selectedColumnKeys
    .map((key) => columns.find((c) => c.key === key))
    .filter(Boolean) as ReportColumnDef[];

  const handleHeaderClick = (colKey: string) => {
    if (sortField === colKey) {
      onSortChange(colKey, sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      onSortChange(colKey, 'ASC');
    }
  };

  const handleExportExcel = () => {
    if (!queryResult || queryResult.rows.length === 0) return;
    exportReportToExcel({
      reportTitle,
      categoryTitle,
      appliedFilters: queryResult.appliedFiltersSummary,
      columns: activeColumns.map((c) => ({ key: c.key, label: c.label })),
      rows: queryResult.rows,
      userDisplayName,
    });
  };

  const handleExportPdf = () => {
    if (!queryResult || queryResult.rows.length === 0) return;
    exportReportToPdf({
      reportTitle,
      categoryTitle,
      appliedFilters: queryResult.appliedFiltersSummary,
      columns: activeColumns.map((c) => ({ key: c.key, label: c.label })),
      rows: queryResult.rows,
      userDisplayName,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-4 p-5">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
              Sonuç Tablosu
            </span>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {reportTitle}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Toplam <strong className="text-purple-600 dark:text-purple-400">{queryResult?.totalCount || 0}</strong> eşleşen kayıt ({activeColumns.length} sütun seçili)
          </p>
        </div>

        {/* Buttons: Dağılım Özeti, Sütunlar, Excel, PDF, Şablon Kaydet */}
        <div className="flex flex-wrap items-center gap-2">
          {queryResult?.summary && (
            <button
              type="button"
              onClick={() => setShowSummaryStats(!showSummaryStats)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="İstatistik ve Dağılım Özeti"
            >
              <BarChart2 className="w-3.5 h-3.5 text-purple-500" />
              <span>{showSummaryStats ? 'Grafiği Gizle' : 'Dağılım Özeti'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenColumnSelector}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Columns3 className="w-3.5 h-3.5 text-slate-400" /> Sütunlar ({activeColumns.length})
          </button>

          <button
            type="button"
            onClick={onOpenSaveModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-amber-500" /> Şablon Kaydet
          </button>
        </div>
      </div>

      {/* Applied Filters Badges Banner */}
      {queryResult && queryResult.appliedFiltersSummary.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
          <span className="font-bold text-slate-400 flex items-center gap-1 text-[11px]">
            <Filter className="w-3 h-3 text-rose-500" /> Aktif Filtreler:
          </span>
          {queryResult.appliedFiltersSummary.map((fText, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60 text-[11px] font-medium"
            >
              {fText}
            </span>
          ))}
        </div>
      )}

      {/* Optional Distributions Summary Cards */}
      {showSummaryStats && queryResult?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs animate-slide-up">
          {queryResult.summary.distributionByDistrict && Object.keys(queryResult.summary.distributionByDistrict).length > 0 && (
            <div>
              <h5 className="font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-blue-500" /> İlçe Dağılımı:
              </h5>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {Object.entries(queryResult.summary.distributionByDistrict).map(([dst, cnt]) => (
                  <div key={dst} className="flex justify-between py-0.5 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-300">{dst}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{cnt} kişi</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {queryResult.summary.distributionByPosition && Object.keys(queryResult.summary.distributionByPosition).length > 0 && (
            <div>
              <h5 className="font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-emerald-500" /> Görev Dağılımı:
              </h5>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {Object.entries(queryResult.summary.distributionByPosition).map(([pos, cnt]) => (
                  <div key={pos} className="flex justify-between py-0.5 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-300">{pos}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{cnt} kişi</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {queryResult.summary.distributionByBloodType && Object.keys(queryResult.summary.distributionByBloodType).length > 0 && (
            <div>
              <h5 className="font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Kan Grubu Dağılımı:
              </h5>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {Object.entries(queryResult.summary.distributionByBloodType).map(([bt, cnt]) => (
                  <div key={bt} className="flex justify-between py-0.5 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-300">{bt}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{cnt} kişi</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Table Preview */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 select-none">
              <th className="py-2.5 px-3 w-12 text-center text-slate-400">#</th>
              {activeColumns.map((col) => {
                const isSorted = sortField === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleHeaderClick(col.key)}
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.label}</span>
                      {isSorted ? (
                        sortOrder === 'ASC' ? (
                          <ArrowUp className="w-3 h-3 text-purple-600" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-purple-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-300 opacity-60" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
            {loading ? (
              <tr>
                <td colSpan={activeColumns.length + 1} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-500">Rapor verileri sorgulanıyor...</span>
                  </div>
                </td>
              </tr>
            ) : !queryResult || queryResult.rows.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length + 1} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-slate-300" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      Seçilen kriterlere uygun hiçbir kayıt bulunamadı.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Filtreleri esneterek veya temizleyerek tekrar deneyebilirsiniz.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              queryResult.rows.map((row, idx) => {
                const rowNum = (page - 1) * limit + idx + 1;
                return (
                  <tr
                    key={row.id || idx}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {rowNum}
                    </td>
                    {activeColumns.map((col) => {
                      let val = row[col.key];

                      if (Array.isArray(val)) {
                        return (
                          <td key={col.key} className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {val.length === 0 ? (
                                <span className="text-slate-400">-</span>
                              ) : (
                                val.map((item, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                  >
                                    {item}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                        );
                      }

                      if (col.type === 'badge') {
                        const isPositive = val === 'Aktif' || val === 'Tamamlandı' || val === 'Katıldı';
                        return (
                          <td key={col.key} className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                isPositive
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {val || '-'}
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={col.key} className="py-2.5 px-3 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {val !== null && val !== undefined && val !== '' ? String(val) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Limit selector */}
      {queryResult && queryResult.totalCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Sayfa Başına Kayıt:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={0}>Tümü</option>
            </select>
            <span>
              ({queryResult.totalCount} kayıttan {limit > 0 ? `${(page - 1) * limit + 1} - ${Math.min(page * limit, queryResult.totalCount)}` : `1 - ${queryResult.totalCount}`} gösteriliyor)
            </span>
          </div>

          {limit > 0 && queryResult.totalPages > 1 && (
            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
                Sayfa {page} / {queryResult.totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= queryResult.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
