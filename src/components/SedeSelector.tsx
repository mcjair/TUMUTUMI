/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sede } from '../types';
import { ShieldCheck, CloudLightning, CheckCircle2, RotateCw, AlertTriangle, Building2, FileSpreadsheet } from 'lucide-react';

interface SedeSelectorProps {
  sedes: Sede[];
  activeSede: Sede | null;
  onSelectSede: (sede: Sede) => void;
  userEmail: string;
  googleToken?: string | null;
  googleUserEmail?: string | null;
  onGoogleSignIn?: () => void;
  onGoogleSignOut?: () => void;
}

export default function SedeSelector({
  sedes,
  activeSede,
  onSelectSede,
  userEmail,
  googleToken,
  googleUserEmail,
  onGoogleSignIn,
  onGoogleSignOut
}: SedeSelectorProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; logs: string[] } | null>(null);

  const handleTestConnection = async () => {
    if (!activeSede) return;
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/sedes/${activeSede.id}/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail })
      });
      const data = await response.json();
      if (data.success) {
        setTestResult({ success: true, logs: data.logs });
      } else {
        setTestResult({ success: false, logs: [data.error || 'Error desconocido al probar conexión'] });
      }
    } catch (e) {
      setTestResult({ success: false, logs: ['Fallo crítico de red al contactar al servidor backend'] });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded p-4 shadow-sm" id="sede-selector-card">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-100 text-indigo-600 rounded">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sede de Trabajo Activa</h2>
            <p className="text-[11px] text-slate-500">Seleccione la sucursal para sincronizar catálogo e ingresos</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Google Sheets Live Auth State */}
          {googleToken ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="truncate max-w-[130px]" title={googleUserEmail || ''}>
                Google: {googleUserEmail?.split('@')[0] || 'Conectado'}
              </span>
              {onGoogleSignOut && (
                <button
                  onClick={onGoogleSignOut}
                  className="text-emerald-700 hover:text-emerald-950 font-bold ml-1 cursor-pointer"
                  title="Desconectar cuenta Google"
                >
                  ×
                </button>
              )}
            </div>
          ) : (
            onGoogleSignIn && (
              <button
                onClick={onGoogleSignIn}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Conectar con Google Drive & Sheets"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>Conectar Google Sheets</span>
              </button>
            )
          )}

          <select
            value={activeSede?.id || ''}
            onChange={(e) => {
              const selected = sedes.find(s => s.id === e.target.value);
              if (selected) onSelectSede(selected);
            }}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            id="sede-select-dropdown"
          >
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.ruc})
              </option>
            ))}
          </select>

          {activeSede && (
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              id="test-connection-btn"
            >
              {testing ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CloudLightning className="w-3.5 h-3.5" />
              )}
              Probar Conexión
            </button>
          )}
        </div>
      </div>

      {activeSede && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">RUC de Sede:</span> {activeSede.ruc}
          </div>
          <div>
            <span className="font-semibold text-slate-700">Dirección:</span> {activeSede.address}
          </div>
          <div>
            <span className="font-semibold text-slate-700">Spreadsheet ID:</span>{' '}
            <code className="bg-slate-50 px-1 py-0.5 rounded text-indigo-600 font-mono text-[10px] border border-slate-200">
              {activeSede.googleSheetId.substring(0, 15)}...
            </code>
          </div>
        </div>
      )}

      {/* Connection Diagnostic Logs */}
      {testResult && (
        <div className="mt-3 p-3 rounded border text-xs bg-slate-900 border-slate-800 text-slate-300" id="diagnostic-log-container">
          <div className="flex items-center justify-between mb-2 border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
              {testResult.success ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span>Resultado del Diagnóstico Estructural</span>
            </div>
            <button
              onClick={() => setTestResult(null)}
              className="text-[10px] text-slate-500 hover:text-slate-300 uppercase font-semibold"
            >
              Cerrar
            </button>
          </div>
          <div className="space-y-1 font-mono text-[10px] max-h-36 overflow-y-auto">
            {testResult.logs.map((log, index) => (
              <div key={index} className="flex gap-1.5">
                <span className="text-indigo-400 select-none">⚡</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex justify-end">
            <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-slate-800/50 px-2 py-0.5 rounded">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Estado: Canal Operativo
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
