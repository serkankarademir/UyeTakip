import React, { useState } from 'react';
import { ReportColumnDef } from '../../types/index.ts';
import {
  X,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  ShieldAlert,
  Columns3,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  availableColumns: ReportColumnDef[];
  selectedColumnKeys: string[];
  onChange: (keys: string[]) => void;
  userRole?: string;
}

export const ColumnSelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  availableColumns,
  selectedColumnKeys,
  onChange,
  userRole = 'ADMIN',
}) => {
  const [currentKeys, setCurrentKeys] = useState<string[]>(selectedColumnKeys);

  if (!isOpen) return null;

  const canViewSensitive = userRole === 'ADMIN' || userRole === 'MEMBER_MANAGER';

  // Group columns by category
  const categories: Record<string, ReportColumnDef[]> = {};
  availableColumns.forEach((col) => {
    if (!categories[col.category]) categories[col.category] = [];
    categories[col.category].push(col);
  });

  const toggleColumn = (key: string) => {
    if (currentKeys.includes(key)) {
      if (currentKeys.length <= 1) return; // keep at least 1 column
      setCurrentKeys(currentKeys.filter((k) => k !== key));
    } else {
      setCurrentKeys([...currentKeys, key]);
    }
  };

  const selectAll = () => {
    const all = availableColumns.map((c) => c.key);
    setCurrentKeys(all);
  };

  const selectDefaults = () => {
    const defaults = availableColumns.filter((c) => c.defaultSelected).map((c) => c.key);
    setCurrentKeys(defaults.length ? defaults : availableColumns.slice(0, 5).map((c) => c.key));
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...currentKeys];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setCurrentKeys(next);
  };

  const moveDown = (index: number) => {
    if (index >= currentKeys.length - 1) return;
    const next = [...currentKeys];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setCurrentKeys(next);
  };

  const handleSave = () => {
    onChange(currentKeys);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <Columns3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Rapor Sütunlarını Seç ve Sırala
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Raporda görünmesini istediğiniz alanları belirleyin ve görüntülenme sırasını ayarlayın.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Left Categories + Right Selected Order */}
        <div className="flex-1 overflow-y-auto py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left 2 Cols: Checkbox categories */}
          <div className="md:col-span-2 space-y-5">
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
              >
                Tümünü Seç
              </button>
              <button
                onClick={selectDefaults}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
              >
                Varsayılan Alanlar
              </button>
            </div>

            {Object.entries(categories).map(([categoryName, cols]) => (
              <div key={categoryName} className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {categoryName}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cols.map((col) => {
                    const isSelected = currentKeys.includes(col.key);
                    const isSensitiveDisabled = col.isSensitive && !canViewSensitive;

                    return (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => !isSensitiveDisabled && toggleColumn(col.key)}
                        disabled={isSensitiveDisabled}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-slate-900 dark:text-white font-medium'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                        } ${isSensitiveDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-rose-600 flex-shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          <span className="truncate">{col.label}</span>
                        </span>
                        {col.isSensitive && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ml-1 flex-shrink-0"
                            title="Hassas veri"
                          >
                            Hassas
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right Col: Selected Columns Order list */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700 mb-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Seçili Sütun Sırası ({currentKeys.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[350px]">
              {currentKeys.map((key, idx) => {
                const colDef = availableColumns.find((c) => c.key === key);
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
                  >
                    <span className="truncate flex-1 font-medium text-slate-800 dark:text-slate-200">
                      <span className="text-slate-400 mr-1.5 font-mono text-[11px]">{idx + 1}.</span>
                      {colDef?.label || key}
                    </span>

                    <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-500"
                        title="Yukarı taşı"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === currentKeys.length - 1}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-500"
                        title="Aşağı taşı"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {currentKeys.length} sütun seçildi
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Seçimi Uygula
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
