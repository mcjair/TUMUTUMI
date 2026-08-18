/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sede, GoogleSheetRow } from '../types';
import { listUserSpreadsheets, GoogleDriveFile } from '../lib/googleSheets';
import { Settings, Plus, RotateCcw, Save, Trash2, Eye, LayoutGrid, FileSpreadsheet, ExternalLink, Search } from 'lucide-react';

interface SettingsPanelProps {
  sedes: Sede[];
  activeSede: Sede | null;
  onRefreshSedes: () => void;
  onResetApp: () => void;
  googleToken?: string | null;
  onGoogleSignIn?: () => void;
}

export default function SettingsPanel({
  sedes,
  activeSede,
  onRefreshSedes,
  onResetApp,
  googleToken,
  onGoogleSignIn
}: SettingsPanelProps) {
  // Sede form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [newSede, setNewSede] = useState({
    name: '',
    ruc: '',
    address: '',
    googleSheetId: '',
    googleSheetRange: 'Ingreso!A2:H',
    token: ''
  });

  const handleFetchDriveFiles = async () => {
    if (!googleToken) {
      if (onGoogleSignIn) onGoogleSignIn();
      return;
    }
    setLoadingDrive(true);
    setShowDrivePicker(true);
    try {
      const files = await listUserSpreadsheets(googleToken);
      setDriveFiles(files);
    } catch (e: any) {
      alert(e.message || 'Error al conectar con Google Drive');
    } finally {
      setLoadingDrive(false);
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
    // Re-index row IDs
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
      <div className="bg-slate-800 border border-slate-700 text-slate-200 rounded p-3 text-xs leading-relaxed">
        <h4 className="font-bold text-white uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-indigo-400" />
          Arquitectura Multi-Sucursal y Credenciales Independientes
        </h4>
        <p className="text-slate-300">
          Este sistema gestiona conexiones seguras e independientes para cada sucursal. Para cada sede configurada, el sistema asocia de forma aislada:
        </p>
        <ul className="list-disc pl-4 mt-1.5 space-y-1 text-slate-400 text-[11px]">
          <li><strong className="text-slate-300">Google Drive:</strong> Cada sucursal apunta a su propio archivo de <span className="text-emerald-400 font-mono">Google Sheet ID</span>.</li>
          <li><strong className="text-slate-300">Tumisoft ERP:</strong> Cada sucursal se autentica con su propia firma digital (<span className="text-indigo-400 font-mono">API Token Privado</span>) y número de RUC.</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Side: Sede Management */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-indigo-500" />
              Sedes Registradas en la Red
            </h4>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11px] rounded flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Añadir Sede
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleCreateSede} className="p-3.5 bg-slate-50 border border-slate-200 rounded space-y-3 text-[11px]" id="add-sede-form">
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
                    placeholder="20609876543"
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
                  placeholder="Av. Bolognesi 450, Arequipa"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1">
                      <span className="text-emerald-600">●</span> Google Sheet ID (Drive)
                    </label>
                    <button
                      type="button"
                      onClick={handleFetchDriveFiles}
                      className="text-[9px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Search className="w-2.5 h-2.5" />
                      <span>Buscar en Drive</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newSede.googleSheetId}
                    onChange={(e) => setNewSede({ ...newSede, googleSheetId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono text-xs"
                    placeholder="ID del archivo de Google Drive"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Identificador de la hoja del local</span>
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
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Pestaña y rango de celdas</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1">
                  <span className="text-indigo-600">●</span> Token de Acceso Tumisoft API (Sucursal)
                </label>
                <input
                  type="password"
                  value={newSede.token}
                  onChange={(e) => setNewSede({ ...newSede, token: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono text-xs"
                  placeholder="Cada sucursal puede tener su propio token API"
                />
                <span className="text-[9px] text-slate-400 mt-0.5 block">Credencial secreta de conexión a Tumisoft ERP para este RUC</span>
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

          <div className="divide-y divide-slate-150 border border-slate-200 rounded">
            {sedes.map((s) => (
              <div key={s.id} className="p-3 flex items-center justify-between text-[11px] hover:bg-slate-50/50">
                <div>
                  <div className="font-bold text-slate-800">{s.name}</div>
                  <div className="text-slate-400 font-mono mt-0.5">RUC: {s.ruc} | Sheet: {s.googleSheetId ? s.googleSheetId.substring(0, 15) + '...' : 'Inexistente'}</div>
                  <div className="text-slate-400 font-mono mt-0.5">Tumisoft Token: <span className="text-indigo-600 font-semibold">{s.token ? '••••••••' : 'Mock-Default'}</span></div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold">
                  Activa (Simulada)
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200">
            <h5 className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-2">Zona de Restauración</h5>
            <div className="p-3 bg-rose-50 border border-rose-100 rounded flex items-center justify-between text-xs gap-4">
              <div>
                <span className="font-bold text-slate-700 text-[11px]">Restaurar Base de Datos</span>
                <p className="text-slate-400 mt-0.5 text-[10px]">Restablece todos los productos, trabajos de la cola, y registros de auditoría al estado inicial.</p>
              </div>
              <button
                onClick={onResetApp}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded flex items-center gap-1 transition-colors cursor-pointer text-xs"
                id="factory-reset-btn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Virtual Google Sheets spreadsheet editor */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <LayoutGrid className="w-4 h-4 text-emerald-500" />
              Editor Virtual Google Sheets
            </h4>
            <div className="flex gap-1.5">
              <button
                onClick={fetchSheetForSimulator}
                disabled={!activeSede}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-[11px] rounded flex items-center gap-1 transition-colors border border-slate-200 cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                Cargar Hoja
              </button>
              <button
                onClick={handleCommitSheetSimulator}
                disabled={sheetRows.length === 0}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] rounded flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                id="save-virtual-sheet-btn"
              >
                <Save className="w-3 h-3" />
                Guardar Cambios
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Utilice este editor para simular la adición o edición de registros en el Google Sheet de la sede activa. Puede añadir SKUs válidos o inválidos para observar cómo reacciona el motor de validación en tiempo real.
          </p>

          {sheetRows.length > 0 ? (
            <div className="border border-slate-200 rounded overflow-hidden text-xs">
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-2 px-2 text-center w-10">Fila</th>
                      <th className="py-2 px-2">SKU</th>
                      <th className="py-2 px-2">Producto</th>
                      <th className="py-2 px-2 text-right">Precio</th>
                      <th className="py-2 px-2 text-right">Costo</th>
                      <th className="py-2 px-2 text-center">Stock</th>
                      <th className="py-2 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sheetRows.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="py-2 px-2 text-center font-mono text-slate-400">{row.rowId}</td>
                        <td className="py-2 px-1">
                          <input
                            type="text"
                            value={row.sku}
                            onChange={(e) => handleSaveSheetRow(index, 'sku', e.target.value)}
                            className="w-16 px-1 py-0.5 border border-slate-200 rounded font-mono text-[11px]"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="text"
                            value={row.nombre}
                            onChange={(e) => handleSaveSheetRow(index, 'nombre', e.target.value)}
                            className="w-full px-1 py-0.5 border border-slate-200 rounded text-[11px]"
                          />
                        </td>
                        <td className="py-2 px-1 text-right">
                          <input
                            type="number"
                            step="0.1"
                            value={row.precioVenta}
                            onChange={(e) => handleSaveSheetRow(index, 'precioVenta', parseFloat(e.target.value) || 0)}
                            className="w-12 px-1 py-0.5 border border-slate-200 rounded text-right text-[11px]"
                          />
                        </td>
                        <td className="py-2 px-1 text-right">
                          <input
                            type="number"
                            step="0.1"
                            value={row.costo}
                            onChange={(e) => handleSaveSheetRow(index, 'costo', parseFloat(e.target.value) || 0)}
                            className="w-12 px-1 py-0.5 border border-slate-200 rounded text-right text-[11px]"
                          />
                        </td>
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            value={row.stock}
                            onChange={(e) => handleSaveSheetRow(index, 'stock', parseInt(e.target.value) || 0)}
                            className="w-10 px-1 py-0.5 border border-slate-200 rounded text-center text-[11px]"
                          />
                        </td>
                        <td className="py-2 px-1 text-center">
                          <button
                            onClick={() => handleRemoveSheetRow(index)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-2 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={handleAddSheetRow}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                  Agregar Fila
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 rounded p-12 text-center text-slate-400 text-xs min-h-[220px] flex items-center justify-center">
              Presione "Cargar Hoja" para cargar y editar los datos virtuales de la hoja de cálculo.
            </div>
          )}
        </div>
      </div>

      {/* Google Drive Spreadsheet Picker Modal */}
      {showDrivePicker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded shadow-xl max-w-lg w-full flex flex-col max-h-[80vh] overflow-hidden text-xs">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  Hojas de Cálculo en su Google Drive
                </h4>
              </div>
              <button
                onClick={() => setShowDrivePicker(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {loadingDrive ? (
                <div className="text-center p-8 text-slate-500 text-xs space-y-2">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p>Consultando sus archivos de Google Drive...</p>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="text-center p-8 text-slate-400 text-xs">
                  No se encontraron hojas de cálculo en su cuenta de Google Drive o necesita autorizar el acceso.
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-slate-500 mb-2">
                    Haga clic en una hoja para asignarla automáticamente a la sucursal:
                  </p>
                  {driveFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => {
                        setNewSede({ ...newSede, googleSheetId: file.id, name: newSede.name || file.name });
                        setShowDrivePicker(false);
                      }}
                      className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded cursor-pointer transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <div className="font-semibold text-slate-800 text-xs truncate group-hover:text-indigo-900">
                            {file.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            ID: {file.id}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] bg-white group-hover:bg-indigo-600 group-hover:text-white border border-slate-200 group-hover:border-transparent px-2 py-0.5 rounded font-bold text-slate-600 shrink-0 ml-2 transition-colors">
                        Seleccionar
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowDrivePicker(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
