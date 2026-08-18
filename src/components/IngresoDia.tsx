/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sede, GoogleSheetRow, Job } from '../types';
import { getSheetValues } from '../lib/googleSheets';
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
  ExternalLink
} from 'lucide-react';

interface IngresoDiaProps {
  activeSede: Sede | null;
  userEmail: string;
  onJobCreated: (jobId: string) => void;
  googleToken?: string | null;
}

export default function IngresoDia({ activeSede, userEmail, onJobCreated, googleToken }: IngresoDiaProps) {
  const [rows, setRows] = useState<GoogleSheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dataSource, setDataSource] = useState<'GOOGLE_API' | 'LOCAL_CACHE'>('LOCAL_CACHE');

  // Load spreadsheet rows (from live Google Sheets or local sync engine)
  const fetchSheetData = async () => {
    if (!activeSede) return;
    setLoading(true);
    setValidated(false);
    try {
      if (googleToken && activeSede.googleSheetId) {
        try {
          // Attempt direct live fetch from Google Sheets API v4
          const rawValues = await getSheetValues(activeSede.googleSheetId, 'A2:G50', googleToken);
          if (rawValues && rawValues.length > 0) {
            const mappedRows: GoogleSheetRow[] = rawValues.map((r, idx) => ({
              rowId: idx + 1,
              sku: r[0] || `TUMI-00${idx + 1}`,
              barcode: r[1] || `7750123400${idx + 1}`,
              nombre: r[2] || 'Producto importado de Google Sheet',
              categoria: r[3] || 'GENERAL',
              precioVenta: parseFloat(r[4] || '0') || 100.0,
              costo: parseFloat(r[5] || '0') || 50.0,
              stock: parseInt(r[6] || '1', 10) || 10,
              status: (r[0] && r[0].startsWith('TUMI-00')) ? 'REINGRESO' : 'NUEVO',
              isValid: true,
              errors: []
            }));
            setRows(mappedRows);
            setDataSource('GOOGLE_API');
            return;
          }
        } catch (apiErr) {
          console.warn('Google Sheets API direct fetch fallback to local cache:', apiErr);
        }
      }

      // Default to robust local API
      const response = await fetch(`/api/sedes/${activeSede.id}/sheet`);
      const data = await response.json();
      setRows(data);
      setDataSource('LOCAL_CACHE');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetData();
  }, [activeSede, googleToken]);

  // Handle cell edits in simulation mode
  const handleCellEdit = (index: number, field: keyof GoogleSheetRow, value: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    // Clear status since value changed
    updated[index].status = 'MODIFICADO';
    updated[index].errors = [];
    setRows(updated);
    setValidated(false);
  };

  // Step 2: Validate rows
  const handleValidate = () => {
    setValidating(true);
    setTimeout(() => {
      const updated = rows.map((row) => {
        const errors: string[] = [];
        if (!row.sku || row.sku.trim() === '') {
          errors.push('El SKU es obligatorio');
        }
        if (isNaN(row.precioVenta) || row.precioVenta <= 0) {
          errors.push('El precio de venta debe ser mayor a 0');
        }
        if (row.costo < 0) {
          errors.push('El costo de adquisición no puede ser negativo');
        }
        if (row.costo > row.precioVenta) {
          errors.push(`Margen negativo: costo (S/ ${row.costo}) supera precio de venta (S/ ${row.precioVenta})`);
        }

        const isValid = errors.length === 0;
        let finalStatus = row.status;
        if (!isValid) {
          finalStatus = 'ERROR';
        } else if (row.status === 'ERROR' || row.status === 'MODIFICADO') {
          // Fall back to REINGRESO or NUEVO depending on SKU
          finalStatus = row.sku.startsWith('TUMI-00') ? 'REINGRESO' : 'NUEVO';
        }

        return {
          ...row,
          isValid,
          errors,
          status: finalStatus
        };
      });

      setRows(updated);
      setValidated(true);
      setValidating(false);
    }, 1000);
  };

  // Step 4: Execute Synchronization
  const handleExecuteSync = async () => {
    if (!activeSede) return;
    setSyncing(true);
    
    // Save current simulated sheets values first
    await fetch(`/api/sedes/${activeSede.id}/sheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows })
    });

    // Only sync rows that are valid
    const validRows = rows.filter(r => r.isValid !== false && r.status !== 'ERROR');

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'INGRESO_DIA',
          sedeId: activeSede.id,
          payload: validRows,
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

  // Count summary
  const errorCount = rows.filter(r => r.status === 'ERROR' || (r.errors && r.errors.length > 0)).length;
  const newCount = rows.filter(r => r.status === 'NUEVO').length;
  const reingresoCount = rows.filter(r => r.status === 'REINGRESO').length;

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden" id="ingreso-dia-container">
      {/* Header Panel */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              Ingreso Diario de Inventario y Catálogo
            </h3>
            {activeSede?.googleSheetId && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${activeSede.googleSheetId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 transition-colors"
                title="Abrir hoja de cálculo en Google Sheets"
              >
                <span>Abrir Sheet</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            {dataSource === 'GOOGLE_API' && (
              <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                API Directa v4
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Procedimiento seguro en 4 pasos para sincronizar el Google Sheet activo con el catálogo maestro de Tumisoft.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={fetchSheetData}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors border border-slate-300 bg-white cursor-pointer"
            title="Recargar datos del Google Sheet"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleValidate}
            disabled={rows.length === 0 || validating}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded flex items-center gap-1.5 transition-colors cursor-pointer"
            id="validate-sheet-btn"
          >
            {validating ? (
              <RotateCw className="w-3 h-3 animate-spin" />
            ) : (
              <FileCheck className="w-3 h-3" />
            )}
            Validar Reglas de Negocio
          </button>

          <button
            onClick={() => setShowPreview(true)}
            disabled={!validated || errorCount === rows.length || rows.length === 0}
            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            id="preview-sync-btn"
          >
            <Play className="w-3 h-3" />
            Sincronizar a Tumisoft
          </button>
        </div>
      </div>

      {/* Steps Visual Progress */}
      <div className="bg-slate-100/50 px-5 py-3 border-b border-slate-100 grid grid-cols-4 gap-2 text-center text-xs font-medium text-slate-500">
        <div className={`flex items-center justify-center gap-1.5 py-1 ${rows.length > 0 ? 'text-indigo-600 border-b-2 border-indigo-600' : ''}`}>
          <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-mono text-xs">1</span>
          <span>Leer Sheet</span>
        </div>
        <div className={`flex items-center justify-center gap-1.5 py-1 ${validated ? 'text-indigo-600 border-b-2 border-indigo-600' : validating ? 'text-indigo-500 animate-pulse' : ''}`}>
          <span className="w-5 h-5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center font-mono text-xs">2</span>
          <span>Validar Margen</span>
        </div>
        <div className={`flex items-center justify-center gap-1.5 py-1 ${showPreview ? 'text-indigo-600 border-b-2 border-indigo-600' : ''}`}>
          <span className="w-5 h-5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center font-mono text-xs">3</span>
          <span>Previsualizar</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 py-1">
          <span className="w-5 h-5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center font-mono text-xs">4</span>
          <span>Sincronizar</span>
        </div>
      </div>

      {/* Spreadsheet Simulator View */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm">
          <RotateCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
          Descargando filas de Google Sheets usando cuenta de servicio...
        </div>
      ) : rows.length === 0 ? (
        <div className="p-16 text-center text-slate-400 text-sm">
          No hay productos o filas cargadas en esta sede.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">Fila</th>
                <th className="py-3 px-4">SKU / Barcode</th>
                <th className="py-3 px-4">Nombre Producto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-right">P. Venta (S/)</th>
                <th className="py-3 px-4 text-right">Costo (S/)</th>
                <th className="py-3 px-4 text-center">Stock Entrada</th>
                <th className="py-3 px-4 text-center">Clasificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => {
                const hasError = row.status === 'ERROR' || (row.errors && row.errors.length > 0);
                return (
                  <tr
                    key={row.rowId}
                    className={`hover:bg-slate-50 transition-colors ${hasError ? 'bg-rose-50/40' : ''}`}
                  >
                    <td className="py-3 px-4 text-center font-mono text-slate-400">{row.rowId}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-700">
                        <input
                          type="text"
                          value={row.sku}
                          onChange={(e) => handleCellEdit(index, 'sku', e.target.value)}
                          className="bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 text-slate-800 font-medium focus:outline-none"
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        <input
                          type="text"
                          value={row.barcode}
                          onChange={(e) => handleCellEdit(index, 'barcode', e.target.value)}
                          placeholder="Sin Barcode"
                          className="bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 text-slate-500 font-mono focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={row.nombre}
                        onChange={(e) => handleCellEdit(index, 'nombre', e.target.value)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 text-slate-700 focus:outline-none"
                      />
                      {row.errors && row.errors.map((err, i) => (
                        <div key={i} className="text-[10px] text-rose-500 flex items-center gap-1 mt-1 font-medium">
                          <BadgeAlert className="w-3 h-3 flex-shrink-0" /> {err}
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={row.categoria}
                        onChange={(e) => handleCellEdit(index, 'categoria', e.target.value)}
                        className="bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 text-slate-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={row.precioVenta}
                        onChange={(e) => handleCellEdit(index, 'precioVenta', parseFloat(e.target.value) || 0)}
                        className="bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 text-right w-16 text-slate-800 font-medium focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={row.costo}
                        onChange={(e) => handleCellEdit(index, 'costo', parseFloat(e.target.value) || 0)}
                        className="bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 text-right w-16 text-slate-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        value={row.stock}
                        onChange={(e) => handleCellEdit(index, 'stock', parseInt(e.target.value) || 0)}
                        className="bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-400 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 text-center w-12 text-slate-700 focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
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
                      {row.status === 'SINCRONIZADO' && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">
                          EN COLA
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
          <Database className="w-3.5 h-3.5" />
          Guardado automático en caché local de simulación de Google Sheets
        </div>
      </div>

      {/* Step 3: Authorization Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="preview-modal">
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
                <TrendingDown className="w-4 h-4 flex-shrink-0 mt-0.5" />
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
                className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteSync}
                disabled={syncing}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
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
    </div>
  );
}

// Simple internal inline component for the state icon
function CheckCircle2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
