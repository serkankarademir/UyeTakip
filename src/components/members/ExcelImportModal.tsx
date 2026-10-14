import React, { useState, useRef } from 'react';
import {
  Member,
  Accreditation,
  TeamPosition,
  BatchImportRow,
  BatchImportStrategy,
  BatchImportResult,
} from '../../types/index.ts';
import { apiClient } from '../../services/api.ts';
import {
  MEMBER_FIELD_DEFINITIONS,
  generateMemberExcelTemplate,
  parseMemberExcelFile,
  autoMapColumns,
  validateAndPrepareRows,
  exportFailedRowsToExcel,
} from '../../lib/excelMemberUtils.ts';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Info,
  ShieldCheck,
  Check,
  Loader2,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  existingMembers: Member[];
  accreditationsList?: Accreditation[];
  teamPositionsList?: TeamPosition[];
  currentUserRole?: string;
}

type ImportStep = 'UPLOAD' | 'MAPPING' | 'PREVIEW' | 'RESULT';

export const ExcelImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImportComplete,
  existingMembers,
  accreditationsList = [],
  teamPositionsList = [],
  currentUserRole = 'ADMIN',
}) => {
  const [currentStep, setCurrentStep] = useState<ImportStep>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Parsed raw data
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);

  // Mapping state: excelHeader -> systemKey
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Validated rows
  const [validatedRows, setValidatedRows] = useState<BatchImportRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'MATCHED' | 'WARNING' | 'ERROR'>('ALL');

  // Import options
  const [strategy, setStrategy] = useState<BatchImportStrategy>('SKIP_EXISTING');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // STEP 1: FILE HANDLING
  // -------------------------------------------------------------
  const handleFileProcess = async (selectedFile: File) => {
    setFileError(null);
    setLoadingFile(true);
    try {
      const { headers, rawRows: rows } = await parseMemberExcelFile(selectedFile);
      setFile(selectedFile);
      setExcelHeaders(headers);
      setRawRows(rows);

      // Auto map columns
      const initialMapping = autoMapColumns(headers);
      setColumnMapping(initialMapping);

      setCurrentStep('MAPPING');
    } catch (err: any) {
      setFileError(err.message || 'Dosya okunamadı. Lütfen geçerli bir Excel dosyası yükleyiniz.');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // -------------------------------------------------------------
  // STEP 2: COLUMN MAPPING & PROCEED TO PREVIEW
  // -------------------------------------------------------------
  const handleMappingChange = (excelHeader: string, targetKey: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [excelHeader]: targetKey,
    }));
  };

  const handleProceedToPreview = () => {
    // Validate required fields are mapped
    const mappedTargetKeys = Object.values(columnMapping);
    const missingRequired = ['firstName', 'lastName', 'idNumber', 'phone'].filter(
      (reqKey) => !mappedTargetKeys.includes(reqKey)
    );

    if (missingRequired.length > 0) {
      const missingLabels = missingRequired
        .map((k) => MEMBER_FIELD_DEFINITIONS.find((f) => f.key === k)?.label || k)
        .join(', ');
      setFileError(`Lütfen zorunlu alanları eşleştiriniz: ${missingLabels}`);
      return;
    }

    setFileError(null);

    // Validate rows
    const rows = validateAndPrepareRows({
      rawRows,
      columnMapping,
      existingMembers,
      accreditationsList,
      teamPositionsList,
    });

    setValidatedRows(rows);
    setCurrentStep('PREVIEW');
  };

  // -------------------------------------------------------------
  // STEP 3: PREVIEW SELECTION & RUN IMPORT
  // -------------------------------------------------------------
  const toggleSelectRow = (index: number) => {
    setValidatedRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], selected: !next[index].selected };
      return next;
    });
  };

  const selectAllRows = (select: boolean) => {
    setValidatedRows((prev) =>
      prev.map((r) => ({
        ...r,
        selected: r.status === 'ERROR' ? false : select,
      }))
    );
  };

  const handleStartImport = async () => {
    const selectedRows = validatedRows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      setFileError('Lütfen aktarmak için en az bir geçerli satır seçiniz.');
      return;
    }

    setIsSubmitting(true);
    setFileError(null);

    try {
      // Prepare payload
      const payloadMembers = selectedRows.map((r) => ({
        ...r.data,
        rowNumber: r.rowNumber,
      }));

      const res = await apiClient.batchImportMembers(payloadMembers, strategy, currentUserRole);
      setImportResult(res);
      setCurrentStep('RESULT');
    } catch (err: any) {
      setFileError(err.message || 'Aktarım sırasında bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // STEP 4: RESULT ACTIONS
  // -------------------------------------------------------------
  const handleDownloadFailedReport = () => {
    if (!importResult || importResult.failedRows.length === 0) return;
    exportFailedRowsToExcel(importResult.failedRows);
  };

  const handleFinish = () => {
    onImportComplete();
    onClose();
  };

  // Counts for preview
  const validCount = validatedRows.filter((r) => r.status === 'VALID').length;
  const matchedCount = validatedRows.filter((r) => r.status === 'MATCHED').length;
  const warningCount = validatedRows.filter((r) => r.status === 'WARNING').length;
  const errorCount = validatedRows.filter((r) => r.status === 'ERROR').length;
  const selectedCount = validatedRows.filter((r) => r.selected).length;

  const filteredPreviewRows = validatedRows.filter((r) => {
    if (previewFilter === 'ALL') return true;
    return r.status === previewFilter;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* HEADER BAR */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Bursa MEB AKUB
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Excel'den Toplu Üye Aktarımı
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Excel şablonundaki personelleri doğrulayarak sisteme toplu olarak aktarın veya mevcut kayıtları güncelleyin.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP PROGRESS INDICATOR */}
        <div className="px-6 py-2.5 bg-slate-100/60 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1">
            <span
              className={`flex items-center gap-1.5 font-bold ${
                currentStep === 'UPLOAD'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-[11px]">
                1
              </span>
              Dosya Yükle
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
            <span
              className={`flex items-center gap-1.5 font-bold ${
                currentStep === 'MAPPING'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-[11px]">
                2
              </span>
              Sütun Eşleştirme
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
            <span
              className={`flex items-center gap-1.5 font-bold ${
                currentStep === 'PREVIEW'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-[11px]">
                3
              </span>
              Önizleme & Doğrulama
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
            <span
              className={`flex items-center gap-1.5 font-bold ${
                currentStep === 'RESULT'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-[11px]">
                4
              </span>
              Sonuç Raporu
            </span>
          </div>

          {currentStep === 'UPLOAD' && (
            <button
              onClick={generateMemberExcelTemplate}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel Şablonunu İndir (.xlsx)</span>
            </button>
          )}
        </div>

        {/* ERROR NOTIFICATION BANNER */}
        {fileError && (
          <div className="px-6 py-2.5 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{fileError}</span>
            </div>
            <button
              onClick={() => setFileError(null)}
              className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* BODY CONTENT (STEP BY STEP) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ========================================================= */}
          {/* STEP 1: UPLOAD                                            */}
          {/* ========================================================= */}
          {currentStep === 'UPLOAD' && (
            <div className="space-y-6">
              {/* Instructions banner */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-emerald-500" />
                    Toplu Üye Aktarımı Nasıl Çalışır?
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                    1. Örnek Excel şablonunu indirin ve personellerinizin bilgilerini ilgili sütunlara doldurun.<br />
                    2. Dosyanızı buraya yükleyin. Sütunlar otomatik eşleştirilecek ve verileriniz doğrulanacaktır.<br />
                    3. Önizleme ekranında hatalı satırları inceleyin, yinelenen kayıt kurallarını belirleyin ve tek tıkla veritabanına aktarın.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={generateMemberExcelTemplate}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/20 transition shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Şablonu İndir (.xlsx)</span>
                </button>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition cursor-pointer flex flex-col items-center justify-center gap-4 ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                  accept=".xlsx,.xls"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                  {loadingFile ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                    {loadingFile
                      ? 'Excel dosyası işleniyor ve sütunlar çözümleniyor...'
                      : 'Excel dosyasını sürükleyip buraya bırakın veya bilgisayarınızdan seçin'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Desteklenen biçimler: <strong>.xlsx, .xls</strong> (CSV desteklenmez) • En fazla <strong>10 MB</strong> • Maksimum <strong>1.000 satır</strong>
                  </p>
                </div>

                <button
                  type="button"
                  disabled={loadingFile}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                >
                  Dosya Seç
                </button>
              </div>

              {/* Security & Integrity Note */}
              <div className="p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-800/20 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Güvenlik ve Bütünlük:</strong> Dosyadaki formüller ve makrolar güvenlik amacıyla çalıştırılmaz. T.C. Kimlik numaraları resmi algoritma ile doğrulanır ve gereksiz sistem loglarına kaydedilmez. Aktarım işlemi tamamlandıktan sonra geçici dosya verileri bellekten temizlenir.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: COLUMN MAPPING                                    */}
          {/* ========================================================= */}
          {currentStep === 'MAPPING' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Sütun Eşleştirme (Excel Başlıkları → Sistem Alanları)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sistem sütunları otomatik eşleştirdi. Gerekirse aşağıdaki açılır kutulardan hedef alanları düzeltebilirsiniz.
                  </p>
                </div>

                <span className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold">
                  {rawRows.length} Veri Satırı Tespit Edildi
                </span>
              </div>

              {/* Mapping Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold">
                      <tr>
                        <th className="py-2.5 px-4 w-1/3">Excel Dosyasındaki Sütun</th>
                        <th className="py-2.5 px-4 w-1/3">Hedef Sistem Alanı</th>
                        <th className="py-2.5 px-4 w-1/3">Örnek Veri (İlk Satır)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {excelHeaders.map((header) => {
                        const currentMappedKey = columnMapping[header] || 'IGNORE';
                        const fieldDef = MEMBER_FIELD_DEFINITIONS.find((f) => f.key === currentMappedKey);
                        const firstRowValue = rawRows[0] ? String(rawRows[0][header] || '-') : '-';

                        return (
                          <tr
                            key={header}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                          >
                            <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                              {header}
                            </td>

                            <td className="py-2.5 px-4">
                              <select
                                value={currentMappedKey}
                                onChange={(e) => handleMappingChange(header, e.target.value)}
                                className={`w-full py-1.5 px-3 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition ${
                                  currentMappedKey === 'IGNORE'
                                    ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400'
                                    : fieldDef?.required
                                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold'
                                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                <option value="IGNORE">[ Bu Sütunu Aktarma (Atla) ]</option>
                                <optgroup label="Zorunlu Alanlar">
                                  {MEMBER_FIELD_DEFINITIONS.filter((f) => f.required).map((f) => (
                                    <option key={f.key} value={f.key}>
                                      ★ {f.label} (Zorunlu)
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Kimlik & İletişim Alanları">
                                  {MEMBER_FIELD_DEFINITIONS.filter(
                                    (f) => !f.required && (f.category === 'Kimlik Bilgileri' || f.category === 'İletişim & Konum')
                                  ).map((f) => (
                                    <option key={f.key} value={f.key}>
                                      {f.label}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Ekip, Görev & Sağlık Alanları">
                                  {MEMBER_FIELD_DEFINITIONS.filter(
                                    (f) => !f.required && f.category !== 'Kimlik Bilgileri' && f.category !== 'İletişim & Konum'
                                  ).map((f) => (
                                    <option key={f.key} value={f.key}>
                                      {f.label}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </td>

                            <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 truncate max-w-xs font-mono text-[11px]">
                              {firstRowValue}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('UPLOAD')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Farklı Dosya Seç
                </button>

                <button
                  type="button"
                  onClick={handleProceedToPreview}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/20 transition cursor-pointer"
                >
                  <span>Önizlemeye Geç</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: PREVIEW & VALIDATION                              */}
          {/* ========================================================= */}
          {currentStep === 'PREVIEW' && (
            <div className="space-y-5">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPreviewFilter('ALL')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    previewFilter === 'ALL'
                      ? 'border-slate-800 bg-slate-900 text-white dark:border-slate-600 dark:bg-slate-800 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                    Toplam Satır
                  </span>
                  <span className="text-lg font-black">{validatedRows.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewFilter('VALID')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    previewFilter === 'VALID'
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                      : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                    Yeni & Geçerli
                  </span>
                  <span className="text-lg font-black">{validCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewFilter('MATCHED')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    previewFilter === 'MATCHED'
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                      : 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                    Mevcut Eşleşen
                  </span>
                  <span className="text-lg font-black">{matchedCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewFilter('WARNING')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    previewFilter === 'WARNING'
                      ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                      : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                    Uyarı Var
                  </span>
                  <span className="text-lg font-black">{warningCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewFilter('ERROR')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    previewFilter === 'ERROR'
                      ? 'border-rose-600 bg-rose-600 text-white shadow-xs'
                      : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                    Hatalı Satır
                  </span>
                  <span className="text-lg font-black">{errorCount}</span>
                </button>
              </div>

              {/* DUPLICATE STRATEGY SELECTOR (CRITICAL REQUIREMENT) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-500" />
                    Mevcut Üyelerle Eşleşen Kayıtlar İçin İşlem Kuralı:
                  </h5>
                  <span className="text-[11px] text-slate-400">
                    {matchedCount} kayıt veritabanında mevcut
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                      strategy === 'SKIP_EXISTING'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={strategy === 'SKIP_EXISTING'}
                      onChange={() => setStrategy('SKIP_EXISTING')}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <span className="font-bold block">1. Mevcut Kayıtları Atla</span>
                      <span className="text-[11px] opacity-75">
                        Mevcut üyelere dokunulmaz, yalnızca yeni üyeler eklenir (Önerilen).
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                      strategy === 'UPDATE_EXISTING'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={strategy === 'UPDATE_EXISTING'}
                      onChange={() => setStrategy('UPDATE_EXISTING')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <span className="font-bold block">2. Eşleşen Kayıtları Güncelle</span>
                      <span className="text-[11px] opacity-75">
                        Eşleşen üyelerin görev, telefon ve adres bilgileri güncellenir.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                      strategy === 'ABORT'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={strategy === 'ABORT'}
                      onChange={() => setStrategy('ABORT')}
                      className="mt-0.5 text-rose-600"
                    />
                    <div>
                      <span className="font-bold block">3. Aktarımı İptal Et</span>
                      <span className="text-[11px] opacity-75">
                        Eğer eşleşen üye bulunursa veritabanında hiçbir değişiklik yapılmaz.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Preview Table Controls */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Seçili: <strong>{selectedCount}</strong> / {validatedRows.length} satır
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => selectAllRows(true)}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                  >
                    Tüm Geçerlileri Seç
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={() => selectAllRows(false)}
                    className="text-slate-500 hover:underline font-medium"
                  >
                    Seçimi Kaldır
                  </button>
                </div>

                <span className="text-slate-400">
                  Gösterilen: {filteredPreviewRows.length} kayıt
                </span>
              </div>

              {/* Preview Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="max-h-96 overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold select-none">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedCount > 0 && selectedCount === validatedRows.filter((r) => r.status !== 'ERROR').length}
                            onChange={(e) => selectAllRows(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                        </th>
                        <th className="py-2.5 px-2 w-12 text-center text-slate-400">Satır</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Adı Soyadı</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">T.C. Kimlik No</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Telefon</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">E-posta</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Ekip Görevi</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Üyelik Durumu</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Kontrol Sonucu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                      {filteredPreviewRows.map((row) => {
                        const originalIndex = validatedRows.findIndex((r) => r.rowNumber === row.rowNumber);
                        const isError = row.status === 'ERROR';
                        const isMatched = row.status === 'MATCHED';
                        const isWarning = row.status === 'WARNING';

                        // Mask T.C. Kimlik for privacy: 123*****89
                        const cleanTc = row.data.idNumber || '';
                        const maskedTc =
                          cleanTc.length === 11
                            ? `${cleanTc.substring(0, 3)}*****${cleanTc.substring(8)}`
                            : cleanTc || '-';

                        return (
                          <tr
                            key={row.rowNumber}
                            className={`transition ${
                              isError
                                ? 'bg-rose-50/40 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
                                : isMatched
                                ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                                : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                disabled={isError}
                                onChange={() => toggleSelectRow(originalIndex)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 disabled:opacity-30"
                              />
                            </td>

                            <td className="py-2.5 px-2 text-center font-mono text-slate-400 text-[11px]">
                              {row.rowNumber}
                            </td>

                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {row.data.firstName} {row.data.lastName}
                            </td>

                            <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {maskedTc}
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                              {row.data.phone || '-'}
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                              {row.data.email || '-'}
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {row.data.teamPosition || 'Ekip Üyesi'}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.data.status === 'Pasif'
                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                }`}
                              >
                                {row.data.status || 'Aktif'}
                              </span>
                            </td>

                            <td className="py-2.5 px-4">
                              <div className="flex flex-col gap-0.5">
                                {isError ? (
                                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-xs">
                                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>Hatalı</span>
                                  </div>
                                ) : isMatched ? (
                                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                                    <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                                    <span>Mevcut Eşleşti</span>
                                  </div>
                                ) : isWarning ? (
                                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    <span>Uyarı Var</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    <span>Aktarılabilir</span>
                                  </div>
                                )}

                                {/* Error/Warning details */}
                                {row.errors.length > 0 && (
                                  <p className="text-[10px] text-rose-500 font-medium">
                                    {row.errors.join(' • ')}
                                  </p>
                                )}
                                {row.warnings.length > 0 && (
                                  <p className="text-[10px] text-amber-500 font-medium">
                                    {row.warnings.join(' • ')}
                                  </p>
                                )}
                                {isMatched && row.matchedMemberName && (
                                  <p className="text-[10px] text-indigo-500 font-medium">
                                    {row.matchedMemberName}
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('MAPPING')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Eşleştirmeye Dön
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    İptal
                  </button>

                  <button
                    type="button"
                    onClick={handleStartImport}
                    disabled={isSubmitting || selectedCount === 0}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/20 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>SQL Veritabanına Aktarılıyor...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Aktarımı Başlat ({selectedCount} Üye)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 4: RESULT REPORT                                     */}
          {/* ========================================================= */}
          {currentStep === 'RESULT' && importResult && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              {/* Success Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-950/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Toplu Üye Aktarımı Başarıyla Tamamlandı!
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                  {importResult.message}
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    İşlenen Satır
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                    {importResult.totalProcessed}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Yeni Eklenen
                  </span>
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block">
                    {importResult.addedCount}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    Güncellenen
                  </span>
                  <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1 block">
                    {importResult.updatedCount}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                    Atlanan Kayıt
                  </span>
                  <span className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1 block">
                    {importResult.skippedCount}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" /> İşlem Süresi
                  </span>
                  <span className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                    {importResult.durationMs < 1000
                      ? `${importResult.durationMs} ms`
                      : `${(importResult.durationMs / 1000).toFixed(1)} sn`}
                  </span>
                </div>
              </div>

              {/* Failed / Skipped Details Notice */}
              {importResult.failedRows.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-xs text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      {importResult.failedRows.length} satırda hata tespit edildi ve aktarılamadı.
                    </h5>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                      Hatalı kayıtları incelemek ve düzeltip tekrar yüklemek için hata raporunu indirebilirsiniz.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadFailedReport}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Hatalı Satırları İndir (.xlsx)</span>
                  </button>
                </div>
              )}

              {/* Completion Action */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/20 transition cursor-pointer"
                >
                  Tamamla ve Üye Listesini Görüntüle
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
