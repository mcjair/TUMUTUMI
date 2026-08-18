/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { History, Search, ShieldAlert, CheckCircle, Clock, UserCheck } from 'lucide-react';

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('TODAS');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/audit');
      const data = await response.json();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Poll logs every 5 seconds to show active job outcomes instantly
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      (log.itemKey && log.itemKey.toLowerCase().includes(search.toLowerCase()));

    const matchesAction = filterAction === 'TODAS' || log.action === filterAction;

    return matchesSearch && matchesAction;
  });

  // Calculate quick metrics
  const totalAudits = logs.length;
  const priceUpdates = logs.filter((l) => l.action === 'ACTUALIZAR_PRECIO').length;
  const stockEntries = logs.filter((l) => l.action === 'ENTRADA_INVENTARIO').length;
  const dailySyncs = logs.filter((l) => l.action === 'INGRESO_DIA').length;

  return (
    <div className="space-y-6" id="audit-log-view-container">
      {/* Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historial Total</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{totalAudits}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Precios Ajustados</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{priceUpdates}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lotes Diarios</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{dailySyncs}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entradas Stock</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{stockEntries}</div>
          </div>
        </div>
      </div>

      {/* Audit Log Box */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Bitácora General de Auditoría</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rastro de auditoría continuo e inmutable sobre operaciones del catálogo, precios de sede, y modificaciones del Google Sheet.
            </p>
          </div>

          <button
            onClick={fetchLogs}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors bg-white"
          >
            Refrescar Historial
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por operador, SKU o palabras clave de la bitácora..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Acción:</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODAS">TODAS LAS ACCIONES</option>
              <option value="INGRESO_DIA">INGRESO_DIA</option>
              <option value="ACTUALIZAR_PRECIO">ACTUALIZAR_PRECIO</option>
              <option value="ACTUALIZAR_CATEGORIA">ACTUALIZAR_CATEGORIA</option>
              <option value="ACTUALIZAR_COSTO">ACTUALIZAR_COSTO</option>
              <option value="ACTUALIZAR_NOMBRE">ACTUALIZAR_NOMBRE</option>
              <option value="ENTRADA_INVENTARIO">ENTRADA_INVENTARIO</option>
              <option value="SYNC_MAESTRO">SYNC_MAESTRO</option>
              <option value="CONEXION_TEST">CONEXION_TEST</option>
              <option value="CREAR_SEDE">CREAR_SEDE</option>
              <option value="MODIFICAR_SEDE">MODIFICAR_SEDE</option>
            </select>
          </div>
        </div>

        {/* Audit List */}
        {loading && logs.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            Cargando historial de auditoría...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            No se encontraron eventos que coincidan con los criterios de búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-4 w-40">Fecha y Hora</th>
                  <th className="py-2.5 px-4 w-44">Operador</th>
                  <th className="py-2.5 px-4 w-40">Acción</th>
                  <th className="py-2.5 px-4">Descripción</th>
                  <th className="py-2.5 px-4 text-right">Valor Anterior</th>
                  <th className="py-2.5 px-4 text-right">Valor Nuevo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {log.userEmail}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        log.action.includes('ACTUALIZAR_PRECIO') || log.action.includes('INGRESO_DIA')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : log.action.includes('ENTRADA_INVENTARIO')
                          ? 'bg-sky-50 text-sky-700 border border-sky-100'
                          : log.action.includes('CONEXION_TEST')
                          ? 'bg-purple-50 text-purple-700 border border-purple-100'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-normal">
                      {log.details}
                      {log.itemKey && (
                        <span className="ml-1 px-1 py-0.5 bg-slate-100 text-slate-600 rounded font-mono text-[9px]">
                          SKU: {log.itemKey}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      {log.originalValue || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-indigo-600">
                      {log.newValue || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
