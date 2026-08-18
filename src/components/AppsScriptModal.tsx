/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, Code, ExternalLink, X } from 'lucide-react';

interface AppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppsScriptModal({ isOpen, onClose }: AppsScriptModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const scriptCode = `/**
 * ==========================================================
 * TUMISOFT SYNC - GOOGLE APPS SCRIPT (Menu de Extension)
 * ==========================================================
 * Pegue este codigo en:
 * Google Sheets -> Extensiones -> Apps Script -> Pegar y Guardar
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📦 Tumisoft Sync')
    .addItem('🏪 Seleccionar Sede', 'menuSeleccionarSede')
    .addSeparator()
    .addItem('▶️ Procesar Ingreso del Día', 'menuProcesarIngresoDia')
    .addSeparator()
    .addItem('💰 Actualizar Precio de Venta', 'menuActualizarPrecioVenta')
    .addItem('🏷️ Actualizar Categoría', 'menuActualizarCategoria')
    .addItem('📝 Actualizar Nombre', 'menuActualizarNombre')
    .addItem('💵 Actualizar Precio Costo (Revalorización)', 'menuActualizarPrecioCosto')
    .addItem('📦 Ingresar Inventario (Entrada Stock)', 'menuIngresarInventario')
    .addToUi();
}

// URL base de su sistema desplegado (Vercel o Cloud Run)
const API_BASE_URL = window?.location?.origin || 'https://su-app-en-vercel.app';

function menuSeleccionarSede() {
  mostrarDialogo('Seleccionar Sede', '/');
}

function menuProcesarIngresoDia() {
  mostrarDialogo('Procesar Ingreso del Día', '/?tab=ingreso');
}

function menuActualizarPrecioVenta() {
  mostrarDialogo('Actualizar Precio de Venta', '/?tab=masivo&type=PRECIO');
}

function menuActualizarCategoria() {
  mostrarDialogo('Actualizar Categoría', '/?tab=masivo&type=CATEGORIA');
}

function menuActualizarNombre() {
  mostrarDialogo('Actualizar Nombre', '/?tab=masivo&type=NOMBRE');
}

function menuActualizarPrecioCosto() {
  mostrarDialogo('Actualizar Precio Costo (Revalorización)', '/?tab=masivo&type=COSTO');
}

function menuIngresarInventario() {
  mostrarDialogo('Ingresar Inventario (Entrada Stock)', '/?tab=entrada');
}

function mostrarDialogo(titulo, ruta) {
  const html = HtmlService.createHtmlOutput(
    '<iframe src="' + API_BASE_URL + ruta + '" style="width:100%;height:100%;border:none;"></iframe>'
  ).setWidth(1000).setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, 'Tumisoft Sync - ' + titulo);
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded shadow-xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden text-xs">
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider">
              Código Apps Script para Google Sheets (Menú Nativo)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1 text-slate-600">
          <p className="text-[11px] leading-relaxed">
            Para que este menú <strong>📦 Tumisoft Sync</strong> aparezca en la barra superior de su Google Sheet (como en su captura de pantalla), copie este código y péguelo en su hoja de cálculo:
          </p>

          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
            <li>Abra su Google Sheet en Google Drive.</li>
            <li>Vaya al menú superior: <strong>Extensiones &gt; Apps Script</strong>.</li>
            <li>Borre el código existente y pegue el bloque a continuación.</li>
            <li>Haga clic en <strong>Guardar 💾</strong> y recargue su Google Sheet.</li>
          </ol>

          <div className="relative">
            <div className="absolute right-2 top-2 z-10">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-950 text-white rounded font-medium text-[11px] flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? '¡Copiado!' : 'Copiar Código'}
              </button>
            </div>
            <pre className="bg-slate-950 text-emerald-300 font-mono text-[10px] p-3.5 rounded border border-slate-800 overflow-x-auto max-h-56 select-all">
              {scriptCode}
            </pre>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-xs cursor-pointer"
          >
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
