/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppTheme } from '../types';
import { THEMES, ThemeConfig } from '../lib/theme';
import { Palette, Check, Sparkles, X, Sun, Moon, Monitor, LayoutTemplate } from 'lucide-react';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
}

export default function ThemeSelectorModal({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme
}: ThemeSelectorModalProps) {
  if (!isOpen) return null;

  const themeList = Object.values(THEMES);

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="theme-selector-modal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Personalización de Diseño y Estilos</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Seleccione el tema visual que mejor se adapte a su entorno de trabajo.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Options Grid */}
        <div className="p-6 space-y-4 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {themeList.map((t) => {
              const isSelected = currentTheme === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTheme(t.id)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden bg-white ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-200 shadow-md scale-[1.01]'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-black/10 shadow-xs shrink-0"
                        style={{ backgroundColor: t.colorHex }}
                      />
                      <span className="font-bold text-xs text-slate-800">{t.name}</span>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {t.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">
                    {t.description}
                  </p>

                  {/* Visual Mini Preview Bar */}
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-100 border border-slate-200/80">
                    <div className={`w-8 h-4 rounded ${t.id === 'midnight' ? 'bg-[#090d16]' : t.id === 'warm' ? 'bg-[#1c1917]' : 'bg-[#0f172a]'}`} title="Sidebar"></div>
                    <div className={`flex-1 h-4 rounded flex items-center justify-between px-1.5 ${t.id === 'midnight' ? 'bg-[#111827]' : 'bg-white'}`}>
                      <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: t.colorHex }}></div>
                      <div className="w-3 h-1.5 rounded-full bg-slate-300"></div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5 shadow-xs">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Tema activo: <strong className="text-slate-800">{THEMES[currentTheme].name}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Aplicar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
