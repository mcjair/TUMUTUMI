/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sede, GoogleSheetRow, AppTheme } from '../types';
import { listUserSpreadsheets, GoogleDriveFile } from '../lib/googleSheets';
import { THEMES } from '../lib/theme';
import GoogleSheetConfigModal from './GoogleSheetConfigModal';
import {
  Settings,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Eye,
  LayoutGrid,
  FileSpreadsheet,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  Activity,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Edit3,
  Palette,
  Check
} from 'lucide-react';

interface SettingsPanelProps {
  sedes: Sede[];
  activeSede: Sede | null;
  onRefreshSedes: () => void;
  onResetApp: () => void;
  googleToken?: string | null;
  onGoogleSignIn?: () => void;
  currentTheme?: AppTheme;
  onSelectTheme?: (theme: AppTheme) => void;
}

export default function SettingsPanel({
  sedes,
  activeSede,
  onRefreshSedes,
  onResetApp,
  googleToken,
  onGoogleSignIn,
  currentTheme = 'emerald',
  onSelectTheme
}: SettingsPanelProps) {
  // Sede form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSedeForSheet, setEditingSedeForSheet] = useState<Sede | null>(null);
  const [testingSedeId, setTestingSedeId] = useState<string | null>(null);
  const [sedeTestResults, setSedeTestResults] = useState<Record<string, { success: boolean; message: string; logs: string[] }>>({});

  const [newSede, setNewSede] = useState({
    name: '',
    ruc: '',
    address: '',
    googleSheetId: '',
    googleSheetRange: 'Ingreso!A2:H',
    token: ''
  });

  const handleTestSede = async (sede: Sede) => {
    setTestingSedeId(sede.id);
    try {
      const response = await fetch(`/api/sedes/${sede.id}/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: 'admin@tumisoft.com' })
      });
      const data = await response.json();
      setSedeTestResults(prev => ({
        ...prev,
        [sede.id]: {
          success: data.success || false,
          message: data.message || 'Prueba finalizada',
          logs: data.logs || []
        }
      }));
    } catch (err: any) {
      setSedeTestResults(prev => ({
        ...prev,
        [sede.id]: {
          success: false,
          message: err.message || 'Error al conectar con la sede',
          logs: ['Error de red o servidor no disponible']
        }
      }));
    } finally {
      setTestingSedeId(null);
    }
  };

  const handleSaveSedeSheet = async (updatedFields: Partial<Sede>) => {
    if (!editingSedeForSheet) return;
    const response = await fetch(`/api/sedes/${editingSedeForSheet.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedFields)
    });
    if (response.ok) {
      onRefreshSedes();
      setEditingSedeForSheet(null);
    } else {
      throw new Error('No se pudo guardar la configuración de la sede');
    }
  };

  // Simulator Sheets state
  const [sheetRows, setSheetRows] = useState<GoogleSheetRow[]>([]);
  const [loadingSheet, setLoadingSheet] = useState(false);

  const fetchSheetForSimulator = async () => {
    if (!activeSede) return;
    setLoadingSheet(true);
    try {
      const response = await fetch(`/api/sedes/${activeSede.id}/sheet`);
      const data = await response.json();
      setSheetRows(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleSaveSheetRow = async (index: number, field: keyof GoogleSheetRow, value: any) => {
    const updated = [...sheetRows];
    updated[index] = { ...updated[index], [field]: value };
    setSheetRows(updated);
  };

  const handleAddSheetRow = () => {
    const newId = sheetRows.length > 0 ? Math.max(...sheetRows.map(r => r.rowId)) + 1 : 1;
    const newRow: GoogleSheetRow = {
      rowId: newId,
      sku: `TUMI-00${newId}`,
      barcode: `7750123400${newId}`,
      nombre: `Nuevo Producto Simulado ${newId}`,
      categoria: 'Otros',
      precioVenta: 100.00,
      costo: 50.00,
      stock: 25,
      status: 'NUEVO'
    };
    setSheetRows([...sheetRows, newRow]);
  };

  const handleRemoveSheetRow = (index: number) => {
    const updated = sheetRows.filter((_, i) => i !== index);
    const reindexed = updated.map((r, i) => ({ ...r, rowId: i + 1 }));
    setSheetRows(reindexed);
  };

  const handleCommitSheetSimulator = async () => {
    if (!activeSede) return;
    try {
      await fetch(`/api/sedes/${activeSede.id}/sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: sheetRows })
      });
      alert('¡Hoja de cálculo virtual actualizada con éxito!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSede = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sedes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSede)
      });
      if (response.ok) {
        onRefreshSedes();
        setShowAddForm(false);
        setNewSede({
          name: '',
          ruc: '',
          address: '',
          googleSheetId: '',
          googleSheetRange: 'Ingreso!A2:H',
          token: ''
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4" id="settings-panel-container">
      {/* Informational Multi-Branch Connectivity Badge */}
      <div className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl p-4 text-xs leading-relaxed shadow-sm">
        <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-1.5 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Conectividad de Sedes: Tumisoft ERP & Google Sheets
        </h4>
        <p className="text-slate-300">
          Cada sede opera con su propia conexión a <strong>Tumisoft ERP</strong> (RUC 20612547131 - ZEYVER IMPORTACIONES S.A.C.) y a su archivo correspondiente de <strong>Google Sheets</strong>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-slate-700/80 text-[11px]">
          <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">1. Tumisoft ERP (En Vivo):</strong>
              <span className="text-slate-400">Usuario 906255854 en admin.tumi-soft.com enlazado.</span>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">2. Google Sheets por Sede:</strong>
              <span className="text-slate-400">Haga clic en <em>"Elegir Google Sheet"</em> en cualquier sede para vincular su archivo de Drive o pegar su enlace.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Design & Theme Presets */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-indigo-500" />
              Opciones de Diseño Visual (Temas Disponibles)
            </h4>
            <p className="text-[11px] text-slate-400">Seleccione su estilo de interfaz preferido sin alterar datos ni lógica.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {Object.values(THEMES).map((t) => {
            const isSelected = currentTheme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onSelectTheme && onSelectTheme(t.id)}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden bg-slate-50/60 ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-200 shadow-sm bg-white'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                      style={{ backgroundColor: t.colorHex }}
                    />
                    <span className="font-bold text-xs text-slate-800">{t.name.split(' ')[0]}</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                    {t.badge}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">
                  {t.description}
                </p>
                {isSelected && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-600">
                    <Check className="w-3 h-3" />
                    <span>Seleccionado</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Side: Sede Management */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-indigo-500" />
                Sedes y Conexiones Registradas
              </h4>
              <p className="text-[11px] text-slate-400">Gestione la vinculación de Google Sheets y pruebe la conexión en vivo de cada sede.</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11px] rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Añadir Sede
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleCreateSede} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-[11px]" id="add-sede-form">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px]">Nombre de Sede / Sucursal</label>
                  <input
                    type="text"
                    required
                    value={newSede.name}
                    onChange={(e) => setNewSede({ ...newSede, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                    placeholder="Ej. Sede Arequipa Centro"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px]">RUC (11 dígitos)</label>
                  <input
                    type="text"
                    required
                    value={newSede.ruc}
                    onChange={(e) => setNewSede({ ...newSede, ruc: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono text-xs"
                    placeholder="20612547131"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px]">Dirección Física</label>
                <input
                  type="text"
                  value={newSede.address}
                  onChange={(e) => setNewSede({ ...newSede, address: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                  placeholder="Av. Principal 123, Lima"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px]">Google Sheet ID / URL</label>
                  <input
                    type="text"
                    value={newSede.googleSheetId}
                    onChange={(e) => setNewSede({ ...newSede, googleSheetId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono text-xs"
                    placeholder="ID o enlace de Google Sheet"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px]">Rango Lectura</label>
                  <input
                    type="text"
                    value={newSede.googleSheetRange}
                    onChange={(e) => setNewSede({ ...newSede, googleSheetRange: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono text-xs"
                    placeholder="Ingreso!A2:H"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold cursor-pointer"
                >
                  Guardar Sede
                </button>
              </div>
            </form>
          )}

          {/* Sede List with Direct Google Sheets and Connection Controls */}
          <div className="space-y-3">
            {sedes.map((s) => {
              const testResult = sedeTestResults[s.id];
              const isTesting = testingSedeId === s.id;
              const isActive = activeSede?.id === s.id;

              return (
                <div
                  key={s.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isActive
                      ? 'border-indigo-300 bg-indigo-50/30 ring-1 ring-indigo-200'
                      : 'border-slate-200 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-xs">{s.name}</span>
                        {isActive && (
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold">
                            Activa
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 font-mono text-[10px] mt-0.5">
                        RUC: <strong className="text-slate-700">{s.ruc}</strong> | Entidad: <span className="text-emerald-700 font-semibold">{s.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span>Usuario Tumisoft:</span>
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded">
                          {s.usuario || (s.ruc === '20615378870' ? '933752943' : '906255854')}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[10px] flex items-center gap-1 mt-1">
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-slate-700">Hoja vinculada:</span>
                        <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono truncate max-w-[200px]">
                          {s.googleSheetId || 'No asignada'}
                        </code>
                        <span className="text-slate-400">({s.googleSheetRange || 'Ingreso!A2:H'})</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingSedeForSheet(s)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Elegir Google Sheet</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTestSede(s)}
                        disabled={isTesting}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Activity className={`w-3 h-3 text-emerald-400 ${isTesting ? 'animate-spin' : ''}`} />
                        <span>{isTesting ? 'Verificando...' : 'Probar Conexión'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Diagnostic Test Results Accordion / Box */}
                  {testResult && (
                    <div className={`mt-3 p-2.5 rounded-lg border text-[10px] font-mono space-y-1 ${
                      testResult.success ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      <div className="font-bold flex items-center gap-1 text-[11px]">
                        {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                        <span>{testResult.message}</span>
                      </div>
                      <div className="space-y-0.5 pt-1 text-slate-600">
                        {testResult.logs.map((log, lIdx) => (
                          <div key={lIdx} className="leading-tight">{log}</div>
                        ))}
                      </div>

                      {testResult.success && (
                        <div className="pt-2 border-t border-emerald-200 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingSedeForSheet(s)}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                          >
                            <FileSpreadsheet className="w-3 h-3" />
                            <span>Elegir Archivo en Drive & Validar Hoja</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200">
            <h5 className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-2">Zona de Restauración</h5>
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between text-xs gap-4">
              <div>
                <span className="font-bold text-slate-700 text-[11px]">Restaurar Base de Datos</span>
                <p className="text-slate-400 mt-0.5 text-[10px]">Restablece todos los productos, trabajos de la cola, y registros de auditoría al estado inicial.</p>
              </div>
              <button
                onClick={onResetApp}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer text-xs"
                id="factory-reset-btn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Virtual Google Sheets spreadsheet editor */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-emerald-500" />
                Editor Virtual Google Sheets
              </h4>
              <p className="text-[11px] text-slate-400">Simulador de hoja para pruebas rápidas de validación e ingreso masivo.</p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={fetchSheetForSimulator}
                disabled={!activeSede}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-[11px] rounded-lg flex items-center gap-1 transition-colors border border-slate-200 cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                Cargar Hoja
              </button>
              <button
                onClick={handleCommitSheetSimulator}
                disabled={sheetRows.length === 0}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                id="save-virtual-sheet-btn"
              >
                <Save className="w-3 h-3" />
                Guardar Cambios
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">SKU</th>
                    <th className="p-2">Nombre</th>
                    <th className="p-2">Precio</th>
                    <th className="p-2">Stock</th>
                    <th className="p-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {sheetRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400">
                        Haga clic en "Cargar Hoja" para editar filas de la sede activa.
                      </td>
                    </tr>
                  ) : (
                    sheetRows.map((row, idx) => (
                      <tr key={row.rowId} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-400">{row.rowId}</td>
                        <td className="p-2 font-mono font-bold text-slate-700">
                          <input
                            type="text"
                            value={row.sku}
                            onChange={(e) => handleSaveSheetRow(idx, 'sku', e.target.value)}
                            className="w-20 px-1 py-0.5 border border-slate-200 rounded bg-white text-[10px]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.nombre}
                            onChange={(e) => handleSaveSheetRow(idx, 'nombre', e.target.value)}
                            className="w-full px-1 py-0.5 border border-slate-200 rounded bg-white text-[10px]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.precioVenta}
                            onChange={(e) => handleSaveSheetRow(idx, 'precioVenta', parseFloat(e.target.value) || 0)}
                            className="w-16 px-1 py-0.5 border border-slate-200 rounded bg-white text-[10px]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.stock}
                            onChange={(e) => handleSaveSheetRow(idx, 'stock', parseInt(e.target.value, 10) || 0)}
                            className="w-12 px-1 py-0.5 border border-slate-200 rounded bg-white text-[10px]"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveSheetRow(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-2 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={handleAddSheetRow}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-emerald-600" />
                <span>Agregar Fila</span>
              </button>
              <span className="text-[10px] text-slate-400">{sheetRows.length} fila(s) cargadas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Google Sheet Config Modal */}
      {editingSedeForSheet && (
        <GoogleSheetConfigModal
          isOpen={!!editingSedeForSheet}
          onClose={() => setEditingSedeForSheet(null)}
          sede={editingSedeForSheet}
          onSave={handleSaveSedeSheet}
          googleToken={googleToken}
          onGoogleSignIn={onGoogleSignIn}
        />
      )}
    </div>
  );
}
