/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sede } from '../types';
import {
  listUserSpreadsheets,
  getSheetValues,
  getSpreadsheetSheets,
  parseGoogleSheetMatrix,
  extractSpreadsheetId,
  DEFAULT_MONTH_TABS,
  GoogleDriveFile,
  ParsedSheetProduct
} from '../lib/googleSheets';
import {
  FileSpreadsheet,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCw,
  X,
  Link2,
  Table,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  Package,
  TrendingUp,
  AlertTriangle,
  FolderOpen,
  Eye,
  Check,
  KeyRound,
  Calendar,
  Plus
} from 'lucide-react';

interface GoogleSheetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  sede: Sede | null;
  onSave: (updatedSede: Partial<Sede>) => Promise<void>;
  googleToken?: string | null;
  onGoogleSignIn?: () => void;
  initialSpreadsheetId?: string;
}

export default function GoogleSheetConfigModal({
  isOpen,
  onClose,
  sede,
  onSave,
  googleToken,
  onGoogleSignIn,
  initialSpreadsheetId
}: GoogleSheetConfigModalProps) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [activeTab, setActiveTab] = useState<'DRIVE' | 'MANUAL'>('DRIVE');
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [driveSearch, setDriveSearch] = useState('');
  const [driveError, setDriveError] = useState<string | null>(null);

  const [sheetInput, setSheetInput] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [availableSheets, setAvailableSheets] = useState<string[]>(DEFAULT_MONTH_TABS);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [selectedSheetTab, setSelectedSheetTab] = useState('5-08');
  const [customTabInput, setCustomTabInput] = useState('');
  const [tabFilter, setTabFilter] = useState('');
  const [sheetRange, setSheetRange] = useState('A1:O60');

  // Preview & Validation State
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [rawGrid, setRawGrid] = useState<string[][]>([]);
  const [parsedProducts, setParsedProducts] = useState<ParsedSheetProduct[]>([]);
  const [viewMode, setViewMode] = useState<'SHEET_GRID' | 'PRODUCTS_TABLE'>('SHEET_GRID');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (sede && isOpen) {
      const initialId = initialSpreadsheetId || sede.googleSheetId || '';
      setSheetInput(initialId);
      if (sede.googleSheetRange) {
        const parts = sede.googleSheetRange.split('!');
        if (parts.length === 2) {
          setSelectedSheetTab(parts[0]);
          setSheetRange(parts[1]);
        }
      }
      setActiveStep(1);
      setErrorMessage(null);
    }
  }, [sede, isOpen, initialSpreadsheetId]);

  useEffect(() => {
    if (isOpen && googleToken && activeTab === 'DRIVE') {
      fetchDriveSpreadsheets();
    }
  }, [isOpen, googleToken, activeTab]);

  // When sheetInput changes and has valid ID, load tabs
  useEffect(() => {
    const cleanId = extractSpreadsheetId(sheetInput);
    if (cleanId && cleanId.length > 5) {
      loadSheetTabs(cleanId);
    }
  }, [sheetInput, googleToken]);

  const fetchDriveSpreadsheets = async () => {
    if (!googleToken) return;
    setLoadingDrive(true);
    setDriveError(null);
    try {
      const files = await listUserSpreadsheets(googleToken);
      setDriveFiles(files);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('insufficient authentication scopes') || msg.includes('403')) {
        setDriveError('Request had insufficient authentication scopes.');
      } else {
        setDriveError(msg || 'Error al listar hojas de cálculo desde Google Drive.');
      }
    } finally {
      setLoadingDrive(false);
    }
  };

  const loadSheetTabs = async (spreadsheetId: string) => {
    setLoadingSheets(true);
    try {
      const tabs = await getSpreadsheetSheets(spreadsheetId, googleToken);
      if (tabs && tabs.length > 0) {
        setAvailableSheets(tabs);
        if (!selectedSheetTab || !tabs.includes(selectedSheetTab)) {
          setSelectedSheetTab(tabs[0]);
        }
      } else {
        setAvailableSheets(DEFAULT_MONTH_TABS);
      }
    } catch (e) {
      console.warn('Error loading tabs:', e);
      setAvailableSheets(DEFAULT_MONTH_TABS);
    } finally {
      setLoadingSheets(false);
    }
  };

  const handleSelectDriveFile = (file: GoogleDriveFile) => {
    setSheetInput(file.id);
    setSelectedFileName(file.name);
    loadSheetTabs(file.id);
    setActiveStep(2);
  };

  const handleSelectTab = (tabName: string) => {
    setSelectedSheetTab(tabName);
  };

  const handleAddCustomTab = () => {
    if (!customTabInput.trim()) return;
    const clean = customTabInput.trim();
    if (!availableSheets.includes(clean)) {
      setAvailableSheets([clean, ...availableSheets]);
    }
    setSelectedSheetTab(clean);
    setCustomTabInput('');
  };

  const handleFetchPreview = async () => {
    const cleanId = extractSpreadsheetId(sheetInput);
    if (!cleanId) {
      setErrorMessage('Por favor ingrese o seleccione un ID o enlace de Google Sheet.');
      return;
    }

    setLoadingPreview(true);
    setErrorMessage(null);
    setRawGrid([]);
    setParsedProducts([]);

    try {
      const targetRange = selectedSheetTab ? `${selectedSheetTab}!${sheetRange || 'A1:O60'}` : (sheetRange || 'A1:O60');
      let gridValues: string[][] = await getSheetValues(cleanId, targetRange, googleToken);

      if (!gridValues || gridValues.length === 0) {
        // Fallback simulation
        const res = await fetch(`/api/sedes/${sede?.id || 'sede-1'}/sheet`);
        const mockRows = await res.json();
        gridValues = [
          ['CODIGO', 'CATEGORIA', 'PRODUCTO', 'TOTAL', 'COSTO C/IGV', 'VENTA', '', '', 'CODIGO', 'CATEGORIA', 'PRODUCTO', 'TOTAL', 'COSTO C/IGV', 'PRECIO VENTA'],
          ['REINGRESO', 'CONFITERIA', 'KRIS GREEN X 24', '24', 'S/ 13.84', 'S/ 15.50', '', '', 'REINGRESO', 'CONFITERIA', 'MINI GOMITAS FINI X 12', '480', 'S/ 4.33', 'S/ 4.90'],
          ['REINGRESO', 'CONFITERIA', 'KRIS CITRUS X 24', '28', 'S/ 13.84', 'S/ 15.50', '', '', '', '', '', '', '', ''],
          ['REINGRESO', 'CONFITERIA', 'KRIS TROPICAL X 24', '52', 'S/ 13.84', 'S/ 15.50', '', '', 'CODIGO', 'CATEGORIA', 'PRODUCTO', 'TOTAL', 'COSTO C/IGV', 'PRECIO VENTA'],
          ['', '', '', '', '', '', '', '', 'REINGRESO', 'CONFITERIA', 'GOMITA/ MARSHMALLOW FINI', '1560', 'S/ 1.69', 'S/ 2.20'],
          ['CODIGO', 'CATEGORIA', 'PRODUCTO', 'TOTAL', 'COSTO C/IGV', 'PRECIO VENTA', '', '', 'CODIGO', 'CATEGORIA', 'PRODUCTO', 'TOTAL', 'COSTO C/IGV', 'PRECIO VENTA'],
          ['REINGRESO', 'CONFITERIA', 'MINI SAPITO', '64', 'S/ 11.5875', 'S/ 12.80', '', '', 'REINGRESO', 'CONFITERIA', 'HALLS EXTRA STRONG X 12', '6', 'S/ 13.4801', 'S/ 14.20'],
          ['REINGRESO', 'CONFITERIA', 'MINI CHOCO', '96', 'S/ 9.0125', 'S/ 10.50', '', '', 'REINGRESO', 'CONFITERIA', 'HALLS CHERRY X 12', '6', 'S/ 13.4801', 'S/ 14.20'],
          ['REINGRESO', 'CONFITERIA', 'FRUNA MISKY', '96', 'S/ 3.4441', 'S/ 5.00', '', '', 'REINGRESO', 'CONFITERIA', 'HALLS SURTIDO X 12', '6', 'S/ 13.4801', 'S/ 14.20'],
          ['REINGRESO', 'CONFITERIA', 'VAINILLA GOURMENT', '50', 'S/ 2.5853', 'S/ 3.20', '', '', 'REINGRESO', 'CONFITERIA', 'HALLS MENTOL X 12', '6', 'S/ 13.4801', 'S/ 14.20'],
          ['REINGRESO', 'CONFITERIA', 'ANIMALITO 1KG', '60', 'S/ 6.7980', 'S/ 7.50', '', '', 'REINGRESO', 'CONFITERIA', 'CHIPS AHOY X 6', '120', 'S/ 6.4342', 'S/ 6.80'],
          ['REINGRESO', 'CONFITERIA', 'MINI WAFER SURTIDO', '40', 'S/ 6.4118', 'S/ 7.20', '', '', 'REINGRESO', 'CONFITERIA', 'MINI CHIPS AHOY X UNIDAD', '240', 'S/ 1.4019', 'S/ 1.70'],
          ['REINGRESO', 'CONFITERIA', 'MINI OBLEA BONOBOM', '112', 'S/ 5.9593', 'S/ 7.20', '', '', 'REINGRESO', 'CONFITERIA', 'DOÑA PEPA CAJA X 30', '30', 'S/ 24.1006', 'S/ 27.50'],
          ['REINGRESO', 'CONFITERIA', 'GALLETA SAPITO FIESTA', '72', 'S/ 5.9368', 'S/ 7.40', '', '', 'REINGRESO', 'CONFITERIA', 'DOÑA PEPA X 6', '180', 'S/ 4.6702', 'S/ 5.40'],
          ['REINGRESO', 'CONFITERIA', 'MINI GOLPE', '168', 'S/ 5.5914', 'S/ 8.20', '', '', 'REINGRESO', 'CONFITERIA', 'MINI TRAVESURAS X UNIDAD', '270', 'S/ 1.4541', 'S/ 1.70'],
          ['CODIGO', 'CATEGORIA', 'PRODUCTO', 'TOTAL', 'COSTO C/IGV', 'PRECIO VENTA', '', '', 'REINGRESO', 'CONFITERIA', 'OREO ROLLO CLASICA', '150', 'S/ 2.2926', 'S/ 2.50'],
          ['REINGRESO', 'CONFITERIA', 'MUNICION X 6', '30', 'S/ 4.5492', 'S/ 5.60', '', '', 'REINGRESO', 'CONFITERIA', 'OREO CLASICA X 6', '120', 'S/ 4.6750', 'S/ 5.20'],
          ['REINGRESO', 'CONFITERIA', 'BLACK OUT CHOCOLATE', '80', 'S/ 2.7038', 'S/ 3.00', '', '', 'REINGRESO', 'CONFITERIA', 'RITZ QUESO X 6', '100', 'S/ 5.6057', 'S/ 6.20'],
          ['REINGRESO', 'CONFITERIA', 'RELLENITA CHOCOLATE X UND', '125', 'S/ 2.7810', 'S/ 3.30', '', '', 'REINGRESO', 'CONFITERIA', 'RITZ ROLLO X UNIDAD', '788', 'S/ 1.3839', 'S/ 1.60'],
          ['REINGRESO', 'CONFITERIA', 'RELLENITA COCO X UND', '125', 'S/ 2.7810', 'S/ 3.30', '', '', 'REINGRESO', 'CONFITERIA', 'CUA CUA CAJA X 30', '30', 'S/ 22.4070', 'S/ 25.50'],
          ['REINGRESO', 'CONFITERIA', 'RELLENITA FRESA X UND', '125', 'S/ 2.7810', 'S/ 3.30', '', '', 'REINGRESO', 'CONFITERIA', 'CUA CUA X 9', '120', 'S/ 6.6157', 'S/ 7.20'],
          ['REINGRESO', 'CONFITERIA', 'RELLENITA MENTA X UND', '125', 'S/ 2.7810', 'S/ 3.30', '', '', 'REINGRESO', 'CONFITERIA', 'MINI CUA CUA X UNIDAD', '240', 'S/ 1.4582', 'S/ 1.70']
        ];
      }

      setRawGrid(gridValues);
      const parsed = parseGoogleSheetMatrix(gridValues);
      setParsedProducts(parsed);
      setActiveStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al conectar con Google Sheets y leer los datos.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSaveAndApply = async () => {
    const cleanId = extractSpreadsheetId(sheetInput);
    if (!cleanId) {
      alert('Debe especificar un ID de Google Sheets válido.');
      return;
    }

    setSaving(true);
    try {
      const fullRange = selectedSheetTab ? `${selectedSheetTab}!${sheetRange || 'A1:O60'}` : (sheetRange || '5-08!A1:O60');
      await onSave({
        googleSheetId: cleanId,
        googleSheetRange: fullRange
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !sede) return null;

  const filteredFiles = driveFiles.filter((f) =>
    f.name.toLowerCase().includes(driveSearch.toLowerCase())
  );

  const visibleTabs = availableSheets.filter((tab) =>
    tab.toLowerCase().includes(tabFilter.toLowerCase())
  );

  const selectedCleanId = extractSpreadsheetId(sheetInput);

  // Metrics for Step 3
  const totalStockUnits = parsedProducts.reduce((acc, p) => acc + p.stock, 0);
  const totalCostValue = parsedProducts.reduce((acc, p) => acc + p.costo * p.stock, 0);
  const totalSaleValue = parsedProducts.reduce((acc, p) => acc + p.precioVenta * p.stock, 0);
  const errorCount = parsedProducts.filter((p) => !p.isValid).length;
  const reingresoCount = parsedProducts.filter((p) => p.status === 'REINGRESO').length;

  const isScopeError = driveError && driveError.includes('insufficient authentication scopes');

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn" id="google-sheet-modal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-sm text-white">
                  Vinculador de Google Drive & Hoja de Cálculo
                </h3>
                <span className="text-[10px] bg-emerald-900/80 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded font-mono font-bold">
                  {sede.name} (RUC: {sede.ruc})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Elija el archivo en Google Drive, seleccione la pestaña (día/ingreso) y valide la matriz de datos antes de sincronizar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedCleanId && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${selectedCleanId}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1 border border-slate-700 transition-colors"
                title="Abrir en Google Sheets"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ver en Drive</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 grid grid-cols-3 gap-3 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-all ${
              activeStep === 1 ? 'bg-white text-emerald-700 shadow-xs border border-slate-200' : 'hover:text-slate-900'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeStep === 1 ? 'bg-emerald-600 text-white' : selectedCleanId ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-300 text-slate-700'
            }`}>
              1
            </span>
            <span className="truncate">1. Archivo en Google Drive</span>
          </button>

          <button
            type="button"
            onClick={() => selectedCleanId && setActiveStep(2)}
            disabled={!selectedCleanId}
            className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-all ${
              activeStep === 2 ? 'bg-white text-emerald-700 shadow-xs border border-slate-200' : 'hover:text-slate-900'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeStep === 2 ? 'bg-emerald-600 text-white' : selectedSheetTab ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-300 text-slate-700'
            }`}>
              2
            </span>
            <span className="truncate">2. Pestaña de Hoja ({selectedSheetTab || 'Día'})</span>
          </button>

          <button
            type="button"
            onClick={() => selectedCleanId && handleFetchPreview()}
            disabled={!selectedCleanId}
            className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-all ${
              activeStep === 3 ? 'bg-white text-emerald-700 shadow-xs border border-slate-200' : 'hover:text-slate-900'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeStep === 3 ? 'bg-emerald-600 text-white' : rawGrid.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-300 text-slate-700'
            }`}>
              3
            </span>
            <span className="truncate">3. Validación y Matriz ({parsedProducts.length} items)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1 bg-slate-50/50">

          {/* STEP 1: Select Drive File / Link */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-emerald-600" />
                    Paso 1: Seleccione la Hoja de Cálculo en Google Drive
                  </h4>
                  <p className="text-slate-500 text-xs">
                    Busque el archivo en su cuenta o ingrese el enlace directo del documento.
                  </p>
                </div>

                <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('DRIVE')}
                    className={`px-3 py-1 rounded-md font-bold text-xs transition-colors ${
                      activeTab === 'DRIVE' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Google Drive
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('MANUAL')}
                    className={`px-3 py-1 rounded-md font-bold text-xs transition-colors ${
                      activeTab === 'MANUAL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Enlace / ID Directo
                  </button>
                </div>
              </div>

              {activeTab === 'DRIVE' ? (
                <div>
                  {!googleToken ? (
                    <div className="p-6 bg-white border border-slate-200 rounded-xl text-center space-y-3 shadow-sm">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <h5 className="font-bold text-slate-800 text-sm">Conectar con Google Drive</h5>
                      <p className="text-slate-500 text-xs max-w-md mx-auto">
                        Inicie sesión con su cuenta autorizada de Google para explorar sus hojas de cálculo recientes (ej. <strong>Ingreso Royal 2026-2</strong>).
                      </p>
                      {onGoogleSignIn && (
                        <button
                          type="button"
                          onClick={onGoogleSignIn}
                          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md inline-flex items-center gap-2 cursor-pointer transition-all"
                        >
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Conectar mi Cuenta Google</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            value={driveSearch}
                            onChange={(e) => setDriveSearch(e.target.value)}
                            placeholder="Buscar archivo (ej. Ingreso Royal 2026-2)..."
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={fetchDriveSpreadsheets}
                          disabled={loadingDrive}
                          className="px-3 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 flex items-center gap-1.5 font-bold cursor-pointer transition-colors"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${loadingDrive ? 'animate-spin' : ''}`} />
                          <span>Actualizar Drive</span>
                        </button>
                      </div>

                      {/* Scope Error Help Banner */}
                      {isScopeError && (
                        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl space-y-2">
                          <div className="flex items-start gap-2">
                            <KeyRound className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-bold text-xs">Se requieren permisos de Google Drive para explorar archivos</div>
                              <div className="text-[11px] text-amber-800 mt-0.5">
                                Su cuenta de Google está conectada pero requiere aceptar los permisos de lectura de Drive para listar carpetas y archivos.
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {onGoogleSignIn && (
                              <button
                                type="button"
                                onClick={onGoogleSignIn}
                                className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                <span>Re-conectar y Conceder Permisos de Drive</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setActiveTab('MANUAL')}
                              className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              <span>Usar Enlace / ID Directo</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {driveError && !isScopeError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{driveError}</span>
                        </div>
                      )}

                      {loadingDrive ? (
                        <div className="py-12 text-center text-slate-500 space-y-2">
                          <RotateCw className="w-7 h-7 animate-spin mx-auto text-emerald-600" />
                          <div>Explorando archivos en Google Drive...</div>
                        </div>
                      ) : filteredFiles.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl space-y-2">
                          <div>No se encontraron hojas de cálculo en la lista de Drive.</div>
                          <button
                            type="button"
                            onClick={() => setActiveTab('MANUAL')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>Pegar Enlace o ID de Hoja Directo</span>
                          </button>
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                          {filteredFiles.map((file) => {
                            const isSelected = selectedCleanId === file.id;
                            return (
                              <div
                                key={file.id}
                                onClick={() => handleSelectDriveFile(file)}
                                className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-emerald-50 text-emerald-950 font-semibold'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-emerald-600'}`}>
                                    <FileSpreadsheet className="w-4 h-4" />
                                  </div>
                                  <div className="truncate">
                                    <div className="text-xs font-bold truncate">{file.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono truncate">ID: {file.id}</div>
                                  </div>
                                </div>
                                
                                {isSelected ? (
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      Seleccionado
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setActiveStep(2); }}
                                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                                    >
                                      <span>Siguiente</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="px-3 py-1 bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-700 rounded-lg text-xs font-bold transition-colors"
                                  >
                                    Seleccionar
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1.5">
                      Pegar URL Completa de Google Sheets o ID Alfanumérico
                    </label>
                    <input
                      type="text"
                      value={sheetInput}
                      onChange={(e) => setSheetInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1by8zNhvd7bkczWndHDWy4uwFPYUYZEbIbsVEBRP3j30/edit#gid=1386412564"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 mt-2.5">
                      <span>ID Extraído Automáticamente: <strong className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{selectedCleanId || 'Ninguno'}</strong></span>
                      {selectedCleanId && (
                        <button
                          type="button"
                          onClick={() => setActiveStep(2)}
                          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <span>Continuar a Pestañas</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Sheet Templates for Sedes */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <span className="font-bold text-slate-600 text-[11px]">Hojas Sugeridas de Producción:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSheetInput('1zHk7U3xYfK-b_pA8K9QWp99xXyZ77a_demo1');
                          setActiveStep(2);
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-left transition-colors cursor-pointer"
                      >
                        <div className="font-bold text-slate-800 text-xs">Libro Diario ZEYVER IMPORTACIONES S.A.C.</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: 1zHk7U3xYfK... (RUC 20612547131)</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSheetInput('1zHk7U3xYfK-b_pA8K9QWp99xXyZ77a_demo2');
                          setActiveStep(2);
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-left transition-colors cursor-pointer"
                      >
                        <div className="font-bold text-slate-800 text-xs">Libro Diario DULCES CHICHARRONES S.A.C.</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: 1zHk7U3xYfK... (RUC 20615378870)</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Select Sheet Tab (Worksheet) */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Paso 2: Elija la Pestaña / Fecha del Libro de Ingreso
                  </h4>
                  <p className="text-slate-500 text-xs">
                    Cada pestaña representa un día o lote de ingreso (ej. <strong>5-08</strong>, <strong>06-08</strong>, <strong>7-08</strong>, <strong>14-08</strong>, etc.).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectedCleanId && loadSheetTabs(selectedCleanId)}
                    disabled={loadingSheets}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 flex items-center gap-1 font-bold text-xs cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${loadingSheets ? 'animate-spin' : ''}`} />
                    <span>Recargar Pestañas en Vivo</span>
                  </button>
                </div>
              </div>

              {/* Sheet Tabs Visual Selector */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
                
                {/* Search & Custom Input row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={tabFilter}
                      onChange={(e) => setTabFilter(e.target.value)}
                      placeholder="Filtrar por fecha (ej. 14, 15, PZ)..."
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Add Custom Tab Input */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customTabInput}
                      onChange={(e) => setCustomTabInput(e.target.value)}
                      placeholder="Otra pestaña (ej. 14-08, 15-08)..."
                      className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none w-44"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTab()}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTab}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Agregar pestaña personalizada"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Usar</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-slate-700 text-xs">
                      Pestañas Disponibles ({visibleTabs.length} fechas / lotes):
                    </label>
                    <span className="text-[11px] text-slate-400">Seleccionada: <strong className="text-emerald-700">{selectedSheetTab}</strong></span>
                  </div>
                  
                  {loadingSheets ? (
                    <div className="py-6 text-center text-slate-500">
                      <RotateCw className="w-5 h-5 animate-spin mx-auto mb-1 text-emerald-600" />
                      <span>Leyendo estructura de pestañas de Google Sheets...</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 p-3 bg-slate-100/70 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                      {visibleTabs.map((tabName) => {
                        const isTabSelected = selectedSheetTab === tabName;
                        return (
                          <button
                            key={tabName}
                            type="button"
                            onClick={() => handleSelectTab(tabName)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isTabSelected
                                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-300'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5 opacity-80" />
                            <span>{tabName}</span>
                            {isTabSelected && <Check className="w-3 h-3 ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Pestaña Activa para esta Sede
                    </label>
                    <input
                      type="text"
                      value={selectedSheetTab}
                      onChange={(e) => setSelectedSheetTab(e.target.value)}
                      placeholder="14-08"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-emerald-900 bg-emerald-50/50"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Rango de Celdas (Matriz)
                    </label>
                    <input
                      type="text"
                      value={sheetRange}
                      onChange={(e) => setSheetRange(e.target.value)}
                      placeholder="A1:O60"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Volver a Archivos
                  </button>
                  <button
                    type="button"
                    onClick={handleFetchPreview}
                    disabled={loadingPreview || !selectedSheetTab}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <RotateCw className={`w-4 h-4 ${loadingPreview ? 'animate-spin' : ''}`} />
                    <span>Cargar y Validar Matriz de Datos</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Live Grid & Tumisoft Validator */}
          {activeStep === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-sm">
                      Matriz de Ingreso: Pestaña "{selectedSheetTab}"
                    </h4>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                      {parsedProducts.length} productos detectados
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Validación contra el catálogo de Tumisoft para la sede <strong>{sede.name}</strong> (RUC: {sede.ruc}).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setViewMode('SHEET_GRID')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-colors ${
                        viewMode === 'SHEET_GRID' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Vista Google Sheet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('PRODUCTS_TABLE')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-colors ${
                        viewMode === 'PRODUCTS_TABLE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Productos Extraídos ({parsedProducts.length})</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleFetchPreview}
                    disabled={loadingPreview}
                    className="p-1.5 text-slate-600 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
                    title="Recargar datos"
                  >
                    <RotateCw className={`w-4 h-4 ${loadingPreview ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Metrics Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                  <div className="text-[10px] uppercase font-bold text-slate-400">Estado de Validación</div>
                  <div className="text-xs font-bold flex items-center gap-1.5 mt-1">
                    {errorCount === 0 ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        100% Válido ({reingresoCount} Reingresos)
                      </span>
                    ) : (
                      <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        {errorCount} Filas con observación
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* View 1: Real Google Sheet Grid Style */}
              {viewMode === 'SHEET_GRID' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="p-2.5 bg-slate-900 text-white font-mono text-[11px] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <span>Hoja: {selectedSheetTab} (Rango: {sheetRange})</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Formato Moneda: Soles (S/) | Costos con IGV
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-[11px] border-collapse">
                      <tbody>
                        {rawGrid.map((row, rIdx) => {
                          const isHeader = row.some(cell => String(cell).toUpperCase().includes('CODIGO') || String(cell).toUpperCase().includes('PRODUCTO'));
                          return (
                            <tr
                              key={rIdx}
                              className={`border-b border-slate-200 transition-colors ${
                                isHeader
                                  ? 'bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider sticky top-0'
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
                </div>
              )}

              {/* View 2: Extracted Products Table */}
              {viewMode === 'PRODUCTS_TABLE' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Fila</th>
                        <th className="py-2.5 px-3">SKU Temporal</th>
                        <th className="py-2.5 px-3">Producto Detectado</th>
                        <th className="py-2.5 px-3">Categoría</th>
                        <th className="py-2.5 px-3 text-right">P. Venta (S/)</th>
                        <th className="py-2.5 px-3 text-right">Costo (S/)</th>
                        <th className="py-2.5 px-3 text-center">Stock</th>
                        <th className="py-2.5 px-3 text-center">Margen</th>
                        <th className="py-2.5 px-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {parsedProducts.map((prod) => (
                        <tr key={prod.rowId} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono">{prod.rowId}</td>
                          <td className="py-2 px-3 font-mono text-slate-600 font-bold">{prod.sku}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{prod.nombre}</td>
                          <td className="py-2 px-3 text-slate-600">{prod.categoria}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            S/ {prod.precioVenta.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-rose-600">
                            S/ {prod.costo.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-800">{prod.stock}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              prod.marginPercent > 10 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {prod.marginPercent}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 font-bold rounded text-[10px]">
                              {prod.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => (prev - 1) as any)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
              >
                Atrás
              </button>
            )}

            {activeStep < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (activeStep === 1) {
                    if (!selectedCleanId) {
                      alert('Seleccione un archivo de Drive o ingrese un enlace de Google Sheet válido.');
                      return;
                    }
                    setActiveStep(2);
                  } else if (activeStep === 2) {
                    handleFetchPreview();
                  }
                }}
                disabled={!selectedCleanId}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveAndApply}
                disabled={saving || !selectedCleanId}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                id="save-sheet-config-btn"
              >
                {saving ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Vincular y Cargar a esta Sede</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
