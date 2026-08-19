/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sede } from '../types';
import GoogleSheetConfigModal from './GoogleSheetConfigModal';
import {
  ShieldCheck,
  CloudLightning,
  CheckCircle2,
  RotateCw,
  AlertTriangle,
  Building2,
  FileSpreadsheet,
  FolderOpen,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface SedeSelectorProps {
  sedes: Sede[];
  activeSede: Sede | null;
  onSelectSede: (sede: Sede) => void;
  userEmail: string;
  googleToken?: string | null;
  googleUserEmail?: string | null;
  onGoogleSignIn?: () => void;
  onGoogleSignOut?: () => void;
  onSedeUpdated?: () => void;
}

export default function SedeSelector({
  sedes,
  activeSede,
  onSelectSede,
  userEmail,
  googleToken,
  googleUserEmail,
  onGoogleSignIn,
  onGoogleSignOut,
  onSedeUpdated
}: SedeSelectorProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; logs: string[] } | null>(null);
  const [showDriveModal, setShowDriveModal] = useState(false);

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
        // After verifying connection, prompt the user to choose the sheet
      } else {
        setTestResult({ success: false, logs: [data.error || 'Error desconocido al probar conexión'] });
      }
    } catch (e) {
      setTestResult({ success: false, logs: ['Fallo crítico de red al contactar al servidor backend'] });
    } finally {
      setTesting(false);
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
      setShowDriveModal(false);
    } else {
      throw new Error('Error al actualizar la configuración de la sede');
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs" id="sede-selector-card">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shadow-2xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Sede de Trabajo Activa</h2>
              {activeSede && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                  En Línea
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">Seleccione la sucursal para sincronizar catálogo, precios e ingresos</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Google Sheets Live Auth State */}
          {googleToken ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
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
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
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

          {/* Sede Selector Dropdown */}
          <div className="relative min-w-[240px]">
            <select
              value={activeSede?.id || (sedes.length > 0 ? sedes[0].id : 'sede-1')}
              onChange={(e) => {
                const list = sedes.length > 0 ? sedes : [
                  {
                    id: 'sede-1',
                    name: 'ZEYVER IMPORTACIONES S.A.C.',
                    ruc: '20612547131',
                    address: 'Lima Principal, Perú',
                    googleSheetId: '1zHk7U3xYfK-b_pA8K9QWp99xXyZ77a_demo1',
                    googleSheetRange: '5-08!A1:O60',
                    isActive: true,
                    usuario: '906255854',
                    clave: 'Tumisoft2025',
                    token: 'Tumisoft2025:906255854',
                    isMockEnabled: true
                  },
                  {
                    id: 'sede-2',
                    name: 'DULCES CHICHARRONES S.A.C.',
                    ruc: '20615378870',
                    address: 'Sede 2 / Almacén Central, Perú',
                    googleSheetId: '1zHk7U3xYfK-b_pA8K9QWp99xXyZ77a_demo2',
                    googleSheetRange: '5-08!A1:O60',
                    isActive: true,
                    usuario: '933752943',
                    clave: 'Tumisoft2026',
                    token: 'Tumisoft2026:933752943',
                    isMockEnabled: true
                  }
                ];
                const selected = list.find(s => s.id === e.target.value);
                if (selected) onSelectSede(selected);
              }}
              className="w-full px-3 py-1.5 bg-slate-50 hover:bg-white border border-slate-300 rounded-lg text-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer shadow-2xs"
              id="sede-select-dropdown"
            >
              {(sedes.length > 0 ? sedes : [
                { id: 'sede-1', name: 'ZEYVER IMPORTACIONES S.A.C.', ruc: '20612547131' },
                { id: 'sede-2', name: 'DULCES CHICHARRONES S.A.C.', ruc: '20615378870' }
              ]).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.ruc})
                </option>
              ))}
            </select>
          </div>

          {activeSede && (
            <>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                id="test-connection-btn"
              >
                {testing ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : (
                  <CloudLightning className="w-3.5 h-3.5 text-emerald-400" />
                )}
                Probar Conexión
              </button>

              <button
                type="button"
                onClick={() => setShowDriveModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Abrir Google Drive para elegir el archivo y validar la hoja de cálculo"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Explorar Drive & Hoja</span>
              </button>
            </>
          )}
        </div>
      </div>

      {activeSede && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700">RUC:</span>
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-semibold">{activeSede.ruc}</span>
          </div>
          <div className="truncate">
            <span className="font-bold text-slate-700">Dirección:</span> {activeSede.address}
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-bold text-slate-700">Google Sheet:</span>{' '}
            <code className="bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-800 font-mono text-[10px] border border-emerald-200 truncate">
              {activeSede.googleSheetId ? `${activeSede.googleSheetId.substring(0, 18)}...` : 'Sin asignar'}
            </code>
          </div>
        </div>
      )}

      {/* Connection Diagnostic Logs */}
      {testResult && (
        <div className="mt-3 p-3.5 rounded-xl border text-xs bg-slate-900 border-slate-800 text-slate-300 shadow-md animate-fadeIn" id="diagnostic-log-container">
          <div className="flex items-center justify-between mb-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px]">
              {testResult.success ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span className={testResult.success ? 'text-emerald-300' : 'text-rose-300'}>
                Resultado del Diagnóstico: {testResult.success ? 'Conexión Exitosa' : 'Fallo en Conexión'}
              </span>
            </div>
            <button
              onClick={() => setTestResult(null)}
              className="text-[10px] text-slate-400 hover:text-white uppercase font-semibold cursor-pointer"
            >
              Cerrar
            </button>
          </div>

          <div className="space-y-1 font-mono text-[10px] max-h-36 overflow-y-auto pr-1">
            {testResult.logs.map((log, index) => (
              <div key={index} className="flex gap-1.5 items-start">
                <span className="text-indigo-400 select-none">⚡</span>
                <span>{log}</span>
              </div>
            ))}
          </div>

          {testResult.success && (
            <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tumisoft ERP & Google Sheets Operativos
              </span>
              <button
                type="button"
                onClick={() => setShowDriveModal(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all animate-pulse"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Elegir Archivo en Drive & Validar Hoja</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Google Sheet & Drive Config Modal */}
      {showDriveModal && activeSede && (
        <GoogleSheetConfigModal
          isOpen={showDriveModal}
          onClose={() => setShowDriveModal(false)}
          sede={activeSede}
          onSave={handleSaveSheetConfig}
          googleToken={googleToken}
          onGoogleSignIn={onGoogleSignIn}
        />
      )}
    </div>
  );
}
