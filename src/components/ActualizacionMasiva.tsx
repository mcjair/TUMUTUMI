/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sede, Producto } from '../types';
import { Layers, FileEdit, RotateCw, Play, Info, AlertTriangle, ArrowRight } from 'lucide-react';

interface ActualizacionMasivaProps {
  activeSede: Sede | null;
  userEmail: string;
  onJobCreated: (jobId: string) => void;
  initialUpdateType?: UpdateType;
  onUpdateTypeChange?: (type: UpdateType) => void;
}

export type UpdateType = 'PRECIO' | 'CATEGORIA' | 'NOMBRE' | 'COSTO';

interface PreviewRow {
  sku: string;
  nombre: string;
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  isValid: boolean;
  error?: string;
}

export default function ActualizacionMasiva({
  activeSede,
  userEmail,
  onJobCreated,
  initialUpdateType,
  onUpdateTypeChange
}: ActualizacionMasivaProps) {
  const [updateType, setUpdateType] = useState<UpdateType>(initialUpdateType || 'PRECIO');
  const [inputText, setInputText] = useState('TUMI-001, 195.00\nTUMI-002, 129.90\nTUMI-003, 259.00');
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Sync if parent passes different initialUpdateType
  React.useEffect(() => {
    if (initialUpdateType && initialUpdateType !== updateType) {
      setUpdateType(initialUpdateType);
      setPreviewRows([]);
    }
  }, [initialUpdateType]);

  // Trigger dry-run preview from input text
  const handlePreview = async () => {
    if (!activeSede) return;
    setLoadingPreview(true);
    setPreviewRows([]);

    try {
      // Fetch current database product cache for this Sede
      const response = await fetch(`/api/sedes/${activeSede.id}/productos`);
      const productos: Producto[] = await response.json();

      const lines = inputText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const preview: PreviewRow[] = [];

      for (const line of lines) {
        const parts = line.split(/[,;\t]+/).map(p => p.trim());
        const sku = parts[0];
        const val = parts[1];

        if (!sku) continue;

        const product = productos.find(p => p.sku.toUpperCase() === sku.toUpperCase());
        
        if (!product) {
          preview.push({
            sku,
            nombre: 'Producto no encontrado en catálogo',
            campo: updateType,
            valorAnterior: 'N/A',
            valorNuevo: val || 'Vacío',
            isValid: false,
            error: 'SKU no existe en el catálogo de esta sede'
          });
          continue;
        }

        let valorAnterior = '';
        let valorNuevo = val || '';
        let isValid = true;
        let error = '';

        if (updateType === 'PRECIO') {
          valorAnterior = `S/ ${product.precioVenta.toFixed(2)}`;
          const numVal = parseFloat(val);
          if (isNaN(numVal) || numVal <= 0) {
            isValid = false;
            error = 'Precio inválido o menor a cero';
          } else if (numVal < product.costo) {
            isValid = false;
            error = `Alerta: Precio de venta (S/ ${numVal}) menor al costo (S/ ${product.costo})`;
          } else {
            valorNuevo = `S/ ${numVal.toFixed(2)}`;
          }
        } else if (updateType === 'CATEGORIA') {
          valorAnterior = product.categoria;
          if (!val) {
            isValid = false;
            error = 'Categoría no puede estar vacía';
          }
        } else if (updateType === 'NOMBRE') {
          valorAnterior = product.nombre;
          if (!val || val.length < 3) {
            isValid = false;
            error = 'Nombre demasiado corto';
          }
        } else if (updateType === 'COSTO') {
          valorAnterior = `S/ ${product.costo.toFixed(2)}`;
          const numVal = parseFloat(val);
          if (isNaN(numVal) || numVal < 0) {
            isValid = false;
            error = 'Costo inválido o menor a cero';
          } else {
            valorNuevo = `S/ ${numVal.toFixed(2)}`;
          }
        }

        preview.push({
          sku: product.sku,
          nombre: product.nombre,
          campo: updateType,
          valorAnterior,
          valorNuevo,
          isValid,
          error
        });
      }

      setPreviewRows(preview);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Enqueue bulk job
  const handleExecuteUpdate = async () => {
    if (!activeSede || previewRows.length === 0) return;
    setExecuting(true);

    const validRowsToSync = previewRows.filter(r => r.isValid).map(r => {
      // Parse numerical values if needed
      const rawVal = r.valorNuevo.replace('S/ ', '').trim();
      return {
        sku: r.sku,
        nombre: updateType === 'NOMBRE' ? rawVal : '',
        categoria: updateType === 'CATEGORIA' ? rawVal : '',
        precioVenta: updateType === 'PRECIO' ? rawVal : '0',
        costo: updateType === 'COSTO' ? rawVal : '0'
      };
    });

    let jobType = 'ACTUALIZAR_PRECIO';
    if (updateType === 'CATEGORIA') jobType = 'ACTUALIZAR_CATEGORIA';
    else if (updateType === 'NOMBRE') jobType = 'ACTUALIZAR_NOMBRE';
    else if (updateType === 'COSTO') jobType = 'ACTUALIZAR_COSTO';

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: jobType,
          sedeId: activeSede.id,
          payload: validRowsToSync,
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
      setExecuting(false);
    }
  };

  const getPlaceholderText = () => {
    if (updateType === 'PRECIO') return 'TUMI-001, 195.00\nTUMI-002, 129.90';
    if (updateType === 'CATEGORIA') return 'TUMI-001, Smart Home\nTUMI-002, Cómputo';
    if (updateType === 'NOMBRE') return 'TUMI-001, Teclado Mecánico RGB Red Pro\nTUMI-002, Mouse Óptico Razer';
    return 'TUMI-001, 88.50\nTUMI-002, 45.00';
  };

  const validRowsCount = previewRows.filter(r => r.isValid).length;

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm p-4" id="actualizacion-masiva-container">
      <div className="border-b border-slate-200 pb-3 mb-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-indigo-500" />
          Actualización Masiva de Catálogo (Lotes)
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Modifique precios, nombres, costos o categorías de múltiples productos simultáneamente con doble validación de seguridad.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form & Selection */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Atributo a Modificar
            </label>
            <div className="grid grid-cols-2 gap-1.5" id="update-type-selector">
              {(['PRECIO', 'CATEGORIA', 'NOMBRE', 'COSTO'] as UpdateType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setUpdateType(type);
                    setPreviewRows([]);
                    if (onUpdateTypeChange) onUpdateTypeChange(type);
                  }}
                  className={`py-2 px-2 rounded text-[11px] font-semibold border transition-all text-left flex items-center gap-1.5 cursor-pointer ${
                    updateType === type
                      ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{type === 'PRECIO' ? '💰' : type === 'CATEGORIA' ? '🏷️' : type === 'NOMBRE' ? '📝' : '💵'}</span>
                  <span className="truncate">
                    {type === 'PRECIO' && 'Precio de Venta'}
                    {type === 'CATEGORIA' && 'Categoría'}
                    {type === 'NOMBRE' && 'Nombre'}
                    {type === 'COSTO' && 'Precio Costo (Revalorización)'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Copiar Datos (Formato SKU, Valor)
              </label>
              <button
                onClick={() => setInputText(getPlaceholderText())}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                Cargar Plantilla
              </button>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setPreviewRows([]);
              }}
              rows={8}
              className="w-full px-2.5 py-2 text-xs font-mono border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all resize-none"
              placeholder="SKU, NUEVO_VALOR"
            ></textarea>
            <span className="text-[10px] text-slate-400 block mt-1 leading-relaxed">
              * Ingrese un producto por línea. El delimitador puede ser coma (,), punto y coma (;) o tabulación.
            </span>
          </div>

          <button
            onClick={handlePreview}
            disabled={inputText.trim() === '' || loadingPreview}
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            id="run-preview-dry-run-btn"
          >
            {loadingPreview ? (
              <RotateCw className="w-3 h-3 animate-spin" />
            ) : (
              <FileEdit className="w-3 h-3" />
            )}
            Previsualizar Cambios (Dry-Run)
          </button>
        </div>

        {/* Right Column: Pre-Sync Validation Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded p-3.5 flex gap-2.5 text-xs">
            <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed text-slate-600 text-[11px]">
              <span className="font-bold text-slate-700">Validación Dry-Run:</span> Al previsualizar, el sistema confrontará los SKUs ingresados con la base de datos de la sede activa. Las celdas válidas se marcarán con check verde; los errores se detallarán explícitamente para que pueda corregirlos antes de aplicar.
            </div>
          </div>

          {previewRows.length > 0 ? (
            <div className="border border-slate-200 rounded overflow-hidden">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Producto</th>
                      <th className="py-2 px-3 text-right">Valor Anterior</th>
                      <th className="py-2 px-3 text-right">Valor Propuesto</th>
                      <th className="py-2 px-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((row, i) => (
                      <tr key={i} className={`hover:bg-slate-50/50 ${!row.isValid ? 'bg-rose-50/40' : ''}`}>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{row.sku}</td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[150px]">
                          <div>{row.nombre}</div>
                          {row.error && (
                            <div className="text-[10px] text-rose-500 font-medium flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {row.error}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 font-mono">{row.valorAnterior}</td>
                        <td className="py-2.5 px-3 text-right text-indigo-600 font-bold font-mono">
                          <span className="flex items-center justify-end gap-1">
                            <ArrowRight className="w-3 h-3 text-slate-300" />
                            {row.valorNuevo}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {row.isValid ? (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold rounded text-[9px]">
                              VÁLIDO
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 font-bold rounded text-[9px]">
                              RECHAZADO
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Apply Changes Trigger */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Total de filas válidas: <strong className="text-slate-800">{validRowsCount}</strong> / {previewRows.length}
                </span>
                <button
                  onClick={handleExecuteUpdate}
                  disabled={validRowsCount === 0 || executing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                  id="execute-bulk-job-btn"
                >
                  {executing ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  Procesar Actualización en Lote
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 rounded-lg p-12 text-center text-slate-400 text-xs">
              Configure la lista de SKUs e ingrese el Dry-Run para verificar cambios.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
