/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Sede, GoogleSheetRow, Job } from '../types';
import { getSheetValues, parseGoogleSheetMatrix, getSpreadsheetSheets, extractSpreadsheetId, DEFAULT_MONTH_TABS, ParsedSheetProduct } from '../lib/googleSheets';
import GoogleSheetConfigModal from './GoogleSheetConfigModal';
import {
  FileSpreadsheet,
  BadgeAlert,
  Play,
  RotateCw,
  TrendingDown,
  ChevronRight,
  Database,
  ArrowRight,
  FileCheck,
  ListRestart,
  ExternalLink,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  Clock,
  Table,
  Package,
  Layers,
  AlertTriangle,
  Radio,
  Check
} from 'lucide-react';

interface IngresoDiaProps {
  activeSede: Sede | null;
  userEmail: string;
  onJobCreated: (jobId: string) => void;
  googleToken?: string | null;
  onGoogleSignIn?: () => void;
  onSedeUpdated?: () => void;
}

export default function IngresoDia({
  activeSede,
  userEmail,
  onJobCreated,
  googleToken,
  onGoogleSignIn,
  onSedeUpdated
}: IngresoDiaProps) {
  const [rows, setRows] = useState<GoogleSheetRow[]>([]);
  const [rawGrid, setRawGrid] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dataSource, setDataSource] = useState<'GOOGLE_REALTIME' | 'LOCAL_CACHE'>('LOCAL_CACHE');
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<'PRODUCTS' | 'RAW_GRID'>('PRODUCTS');

  // Real-time metadata
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // 0 = off, 10 = 10s, 30 = 30s
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [activeTabName, setActiveTabName] = useState<string>('5-08');
  const [cellRange, setCellRange] = useState<string>('A1:O60');
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize sheet tab and range from activeSede
  useEffect(() => {
    if (activeSede) {
      if (activeSede.googleSheetRange) {
        const parts = activeSede.googleSheetRange.split('!');
        if (parts.length === 2) {
          setActiveTabName(parts[0]);
          setCellRange(parts[1]);
        }
      }
      loadTabs();
      fetchSheetData();
    }
  }, [activeSede?.id, activeSede?.googleSheetId, googleToken]);

  const loadTabs = async () => {
    if (!activeSede?.googleSheetId) {
      setAvailableTabs(DEFAULT_MONTH_TABS);
      return;
    }
    try {
      const tabs = await getSpreadsheetSheets(activeSede.googleSheetId, googleToken);
      const combined = Array.from(new Set([...(tabs || []), ...DEFAULT_MONTH_TABS]));
      setAvailableTabs(combined);
      if (tabs.length > 0 && !tabs.includes(activeTabName)) {
        setActiveTabName(tabs[0]);
      }
    } catch (e) {
      console.warn('Error loading tabs:', e);
      setAvailableTabs(DEFAULT_MONTH_TABS);
    }
  };

  // Real-time live data capture
  const fetchSheetData = async (overrideTab?: string) => {
    if (!activeSede) return;
    const tabToUse = overrideTab || activeTabName || '5-08';
    setLoading(true);
    setValidated(false);

    const spreadsheetId = activeSede.googleSheetId;
    const fullRange = `${tabToUse}!${cellRange || 'A1:O60'}`;

    try {
      let gridValues: string[][] = [];

      if (spreadsheetId) {
        gridValues = await getSheetValues(spreadsheetId, fullRange, googleToken);
      }

      if (gridValues && gridValues.length > 0) {
        setRawGrid(gridValues);
        const parsed = parseGoogleSheetMatrix(gridValues);

        if (parsed.length > 0) {
          const mappedRows: GoogleSheetRow[] = parsed.map((p) => ({
            rowId: p.rowId,
            sku: p.sku,
            barcode: p.barcode,
            nombre: p.nombre,
            categoria: p.categoria,
            precioVenta: p.precioVenta,
            costo: p.costo,
            stock: p.stock,
            status: p.status,
            isValid: p.isValid,
            errors: p.errors
          }));
          setRows(mappedRows);
          setDataSource('GOOGLE_REALTIME');
          setLastSyncTime(new Date());
          return;
        }
      }

      // Local fallback
      const response = await fetch(`/api/sedes/${activeSede.id}/sheet`);
      const data = await response.json();
      setRows(data);
      setDataSource('LOCAL_CACHE');
      setLastSyncTime(new Date());
    } catch (e) {
      console.error('Error fetching sheet data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh interval management
  useEffect(() => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }

    if (autoRefreshInterval > 0 && activeSede) {
      autoRefreshTimerRef.current = setInterval(() => {
        fetchSheetData();
      }, autoRefreshInterval * 1000);
    }

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefreshInterval, activeSede?.id, activeTabName, googleToken]);

  const handleSwitchTab = (tabName: string) => {
    setActiveTabName(tabName);
    fetchSheetData(tabName);
    // Optionally update sede configuration in background
    if (activeSede) {
      fetch(`/api/sedes/${activeSede.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleSheetRange: `${tabName}!${cellRange || 'A1:O60'}`
        })
      }).catch(() => {});
    }
  };

  const handleSaveSheetConfig = async (updatedFields: Partial<Sede>) => {
    if (!activeSede) return;
    const res = await fetch(`/api/sedes/${activeSede.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedFields)
    });
    if (res.ok) {
      if (onSedeUpdated) onSedeUpdated();
      if (updatedFields.googleSheetRange) {
        const parts = updatedFields.googleSheetRange.split('!');
        if (parts.length === 2) {
          setActiveTabName(parts[0]);
          setCellRange(parts[1]);
        }
      }
      loadTabs();
      fetchSheetData();
      setShowSheetModal(false);
    } else {
      throw new Error('Error al actualizar la sede');
    }
  };

  // Handle cell edits in simulation mode
  const handleCellEdit = (index: number, field: keyof GoogleSheetRow, value: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    updated[index].status = 'MODIFICADO';
    updated[index].errors = [];
    setRows(updated);
    setValidated(false);
  };

  // Validate business rules
  const handleValidate = () => {
    setValidating(true);
    setTimeout(() => {
      const updated = rows.map((row) => {
        const errors: string[] = [];
        if (!row.sku || row.sku.trim() === '') {
          errors.push('El SKU es obligatorio');
        }
        if (!row.nombre || row.nombre.trim() === '') {
          errors.push('El nombre del producto no puede estar vacío');
        }
        if (row.precioVenta <= 0) {
          errors.push('El precio de venta debe ser mayor a S/ 0');
        }
        if (row.costo < 0) {
          errors.push('El costo no puede ser negativo');
        }
        if (row.stock < 0) {
          errors.push('El stock no puede ser negativo');
        }
        if (row.precioVenta > 0 && row.costo > 0 && row.precioVenta < row.costo) {
          errors.push('Margen negativo: El precio de venta es menor al costo con IGV');
        }

        const isError = errors.length > 0;
        return {
          ...row,
          isValid: !isError,
          status: isError ? ('ERROR' as const) : row.status === 'ERROR' ? ('REINGRESO' as const) : row.status,
          errors
        };
      });

      setRows(updated);
      setValidating(false);
      setValidated(true);
    }, 400);
  };

  // Execute synchronization
  const handleExecuteSync = async () => {
    if (!activeSede) return;
    setSyncing(true);

    try {
      const validPayload = rows.filter((r) => r.isValid && r.status !== 'ERROR');
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'INGRESO_DIARIO_SHEET',
          sedeId: activeSede.id,
          payload: validPayload,
          userEmail
        })
      });

      const data = await response.json();
      if (data.id) {
        onJobCreated(data.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
      setShowPreview(false);
    }
  };

  // Metrics summary
  const totalStockUnits = rows.reduce((acc, r) => acc + (r.stock || 0), 0);
  const totalCostValue = rows.reduce((acc, r) => acc + ((r.costo || 0) * (r.stock || 0)), 0);
  const totalSaleValue = rows.reduce((acc, r) => acc + ((r.precioVenta || 0) * (r.stock || 0)), 0);
  const errorCount = rows.filter((r) => r.status === 'ERROR' || (r.errors && r.errors.length > 0)).length;
  const newCount = rows.filter((r) => r.status === 'NUEVO').length;
  const reingresoCount = rows.filter((r) => r.status === 'REINGRESO' || r.status === 'MODIFICADO').length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden" id="ingreso-dia-container">
      {/* Real-time Google Sheet & Branch Link Banner */}
      <div className="bg-slate-900 text-white p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm text-white">Google Sheet en Tiempo Real</span>
              <span className="text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded font-mono font-bold">
                {activeSede?.name || 'Sede no seleccionada'}
              </span>
              
              {dataSource === 'GOOGLE_REALTIME' ? (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1.5 animate-pulse">
                  <Radio className="w-3 h-3 text-emerald-400" />
                  ● EN VIVO (Directo de Google Sheets)
                </span>
              ) : (
                <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono">
                  ○ Modo Caché / Local
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-1">
              <span>Spreadsheet ID:</span>
              <code className="text-emerald-400 font-mono text-[11px] bg-slate-800/90 px-1.5 py-0.5 rounded truncate max-w-[220px]">
                {activeSede?.googleSheetId ? `${activeSede.googleSheetId.substring(0, 16)}...` : 'Sin asignar'}
              </code>
              <span>| Pestaña Activa: <strong className="text-white font-mono text-[11px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{activeTabName}</strong></span>
              {lastSyncTime && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Captura: {lastSyncTime.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
          {activeSede?.googleSheetId && (
            <a
              href={`https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(activeSede.googleSheetId)}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-700"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Ver en Drive</span>
            </a>
          )}

          {/* Real-time Capture Now Button */}
          <button
            type="button"
            onClick={() => fetchSheetData()}
            disabled={loading}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Capturar los datos más recientes directamente del archivo de Google Sheets"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-300 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Capturando...' : 'Capturar en Tiempo Real'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSheetModal(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Configurar Hoja</span>
          </button>
        </div>
      </div>

      {/* Live Worksheet Tabs Selector Bar (Switch Days/Tabs in 1 click) */}
      <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="font-bold text-slate-700 text-xs flex items-center gap-1 shrink-0 uppercase tracking-wider text-[10px]">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Pestañas de Ingreso:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {availableTabs.map((tab) => {
              const isTabSelected = activeTabName === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleSwitchTab(tab)}
                  disabled={loading}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                    isTabSelected
                      ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  <span>{tab}</span>
                  {isTabSelected && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Auto-Refresh Control & View Switcher */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 text-[11px]">
            <span className="text-slate-500 font-semibold">Auto-captura:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="0">Manual</option>
              <option value="10">Cada 10 seg</option>
              <option value="30">Cada 30 seg</option>
              <option value="60">Cada 1 min</option>
            </select>
          </div>

          <div className="flex bg-white rounded-lg border border-slate-300 p-0.5">
            <button
              type="button"
              onClick={() => setActiveViewMode('PRODUCTS')}
              className={`px-2.5 py-1 rounded-md font-bold text-xs flex items-center gap-1 transition-colors ${
                activeViewMode === 'PRODUCTS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-indigo-400" />
              <span>Catálogo ({rows.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('RAW_GRID')}
              className={`px-2.5 py-1 rounded-md font-bold text-xs flex items-center gap-1 transition-colors ${
                activeViewMode === 'RAW_GRID' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-emerald-400" />
              <span>Matriz Original</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-slate-400">Total Unidades Stock</div>
          <div className="text-base font-extrabold text-slate-800 mt-0.5">
            {totalStockUnits.toLocaleString()} und
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-slate-400">Costo Total Lote</div>
          <div className="text-base font-extrabold text-rose-600 mt-0.5">
            S/ {totalCostValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-slate-400">Valor Venta Proyectado</div>
          <div className="text-base font-extrabold text-emerald-600 mt-0.5">
            S/ {totalSaleValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-slate-400">Acciones de Sincronización</div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={handleValidate}
              disabled={rows.length === 0 || validating}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] rounded flex items-center gap-1 transition-colors cursor-pointer"
            >
              {validating ? <RotateCw className="w-3 h-3 animate-spin" /> : <FileCheck className="w-3 h-3" />}
              Validar
            </button>
            <button
              onClick={() => setShowPreview(true)}
              disabled={!validated || errorCount === rows.length || rows.length === 0}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded flex items-center gap-1 shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Play className="w-3 h-3" />
              Sincronizar
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Products Table OR Raw Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 space-y-2">
          <RotateCw className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
          <div className="font-bold text-sm text-slate-700">Capturando Google Sheet en tiempo real...</div>
          <div className="text-xs text-slate-400">Consultando la pestaña "{activeTabName}" directamente de Google Sheets</div>
        </div>
      ) : activeViewMode === 'RAW_GRID' && rawGrid.length > 0 ? (
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-[11px] border-collapse">
            <tbody>
              {rawGrid.map((row, rIdx) => {
                const isHeader = row.some(cell => String(cell).toUpperCase().includes('CODIGO') || String(cell).toUpperCase().includes('PRODUCTO'));
                return (
                  <tr
                    key={rIdx}
                    className={`border-b border-slate-200 transition-colors ${
                      isHeader
                        ? 'bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider sticky top-0 z-10'
                        : rIdx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/60 hover:bg-slate-100/50'
                    }`}
                  >
                    <td className="px-2 py-1.5 text-slate-400 font-mono text-[9px] bg-slate-100/80 border-r border-slate-200 select-none text-center w-8">
                      {rIdx + 1}
                    </td>
                    {row.map((cell, cIdx) => {
                      const valStr = String(cell || '').trim();
                      const isCostCell = (cIdx === 4 || cIdx === 12) && !isHeader && valStr !== '';
                      const isHighlightedPrice = valStr.includes('15.50') || (cIdx === 5 && !isHeader && valStr !== '');
                      return (
                        <td
                          key={cIdx}
                          className={`px-2.5 py-1.5 border-r border-slate-200 last:border-0 truncate max-w-[180px] ${
                            isHeader ? 'border-slate-700' : ''
                          } ${
                            isCostCell ? 'text-rose-600 font-semibold font-mono' : ''
                          } ${
                            isHighlightedPrice && !isHeader ? 'bg-amber-100/80 text-amber-900 font-bold' : ''
                          }`}
                        >
                          {valStr}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-16 text-center text-slate-400 text-xs">
          No hay productos o filas cargadas en esta sede. Presione <strong>"Capturar en Tiempo Real"</strong> para cargar datos.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">Fila</th>
                <th className="py-2.5 px-4">SKU / Barcode</th>
                <th className="py-2.5 px-4">Nombre Producto (Tumisoft)</th>
                <th className="py-2.5 px-4">Categoría</th>
                <th className="py-2.5 px-4 text-right">P. Venta (S/)</th>
                <th className="py-2.5 px-4 text-right">Costo c/IGV (S/)</th>
                <th className="py-2.5 px-4 text-center">Stock Entrada</th>
                <th className="py-2.5 px-4 text-center">Clasificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {rows.map((row, index) => {
                const hasError = row.status === 'ERROR' || (row.errors && row.errors.length > 0);
                return (
                  <tr
                    key={row.rowId}
                    className={`hover:bg-slate-50 transition-colors ${hasError ? 'bg-rose-50/40' : ''}`}
                  >
                    <td className="py-2.5 px-4 text-center text-slate-400">{row.rowId}</td>
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-800">
                        <input
                          type="text"
                          value={row.sku}
                          onChange={(e) => handleCellEdit(index, 'sku', e.target.value)}
                          className="bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 px-1 py-0.5 rounded border border-transparent hover:border-slate-200 text-slate-800 font-medium focus:outline-none"
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        <input
                          type="text"
                          value={row.barcode}
                          onChange={(e) => handleCellEdit(index, 'barcode', e.target.value)}
                          placeholder="Sin Barcode"
                          className="bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 px-1 py-0.5 rounded border border-transparent hover:border-slate-200 text-slate-500 font-mono focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-800">
                      <input
                        type="text"
                        value={row.nombre}
                        onChange={(e) => handleCellEdit(index, 'nombre', e.target.value)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 px-1 py-0.5 rounded border border-transparent hover:border-slate-200 text-slate-800 focus:outline-none font-bold"
                      />
                      {row.errors && row.errors.map((err, i) => (
                        <div key={i} className="text-[10px] text-rose-500 flex items-center gap-1 mt-1 font-medium font-sans">
                          <BadgeAlert className="w-3 h-3 shrink-0" /> {err}
                        </div>
                      ))}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        {row.categoria}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={row.precioVenta}
                        onChange={(e) => handleCellEdit(index, 'precioVenta', parseFloat(e.target.value) || 0)}
                        className="bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 px-1 py-0.5 rounded border border-transparent hover:border-slate-200 text-right w-16 text-emerald-700 font-bold focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={row.costo}
                        onChange={(e) => handleCellEdit(index, 'costo', parseFloat(e.target.value) || 0)}
                        className="bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 px-1 py-0.5 rounded border border-transparent hover:border-slate-200 text-right w-16 text-rose-600 font-semibold focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-800">
                      <input
                        type="number"
                        value={row.stock}
                        onChange={(e) => handleCellEdit(index, 'stock', parseInt(e.target.value) || 0)}
                        className="bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 px-1 py-0.5 rounded border border-transparent hover:border-slate-200 text-center w-14 text-slate-800 font-bold focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-center font-sans">
                      {row.status === 'NUEVO' && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold rounded text-[10px]">
                          NUEVO
                        </span>
                      )}
                      {row.status === 'REINGRESO' && (
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 font-semibold rounded text-[10px]">
                          REINGRESO
                        </span>
                      )}
                      {row.status === 'ERROR' && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded text-[10px]">
                          RECHAZADO
                        </span>
                      )}
                      {row.status === 'MODIFICADO' && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 font-semibold rounded text-[10px]">
                          EDITADO
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Spreadsheet Status Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <strong>{newCount}</strong> Nuevos
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <strong>{reingresoCount}</strong> Reingresos
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <strong>{errorCount}</strong> Observados/Errores
          </span>
        </div>
        <div className="text-slate-400 flex items-center gap-1">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          Sincronización en vivo habilitada para Tumisoft ERP (RUC {activeSede?.ruc || '20612547131'})
        </div>
      </div>

      {/* Step 3: Authorization Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="preview-modal">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-500" />
                Previsualización y Autorización de Cambios
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Revise el resumen de cambios estructurales antes de encolar la tarea en Tumisoft ERP.
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-lg text-xs text-amber-800 flex gap-2">
                <TrendingDown className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Validación Margen de Venta:</span> Las reglas de negocio de Tumisoft Sync Web se aplicaron de manera exitosa. Todas las filas con errores o márgenes negativos serán ignoradas para evitar desajustes comerciales en el ERP.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-400 font-semibold">Sede Destino</div>
                  <div className="text-slate-700 font-bold mt-1 text-sm">{activeSede?.name}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-400 font-semibold">Usuario Autorizador</div>
                  <div className="text-slate-700 font-bold mt-1 text-sm">{userEmail}</div>
                </div>
              </div>

              <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 overflow-hidden text-xs">
                <div className="px-4 py-2 bg-slate-50 text-slate-500 font-semibold">Resumen de Operación</div>
                <div className="px-4 py-2.5 flex justify-between">
                  <span className="text-slate-600">Creación de productos nuevos:</span>
                  <span className="font-bold text-emerald-600">+{newCount} productos</span>
                </div>
                <div className="px-4 py-2.5 flex justify-between">
                  <span className="text-slate-600">Sincronización de reingresos (Stock/Precio):</span>
                  <span className="font-bold text-indigo-600">+{reingresoCount} productos</span>
                </div>
                <div className="px-4 py-2.5 flex justify-between bg-rose-50/20">
                  <span className="text-slate-500">Filas omitidas (con errores):</span>
                  <span className="font-bold text-rose-600">{errorCount} filas</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteSync}
                disabled={syncing}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                id="confirm-execute-btn"
              >
                {syncing ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Confirmar y Encolar Tarea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheet Config Modal */}
      {showSheetModal && activeSede && (
        <GoogleSheetConfigModal
          isOpen={showSheetModal}
          onClose={() => setShowSheetModal(false)}
          sede={activeSede}
          onSave={handleSaveSheetConfig}
          googleToken={googleToken}
          onGoogleSignIn={onGoogleSignIn}
        />
      )}
    </div>
  );
}
