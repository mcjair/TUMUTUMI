/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppTheme } from '../types';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  badge: string;
  description: string;
  colorHex: string;
  sidebarBg: string;
  sidebarBorder: string;
  headerBg: string;
  headerBorder: string;
  appBg: string;
  cardBg: string;
  cardBorder: string;
  primaryBg: string;
  primaryHover: string;
  primaryText: string;
  accentBadge: string;
}

export const THEMES: Record<AppTheme, ThemeConfig> = {
  emerald: {
    id: 'emerald',
    name: 'Tumisoft Emerald Pro',
    badge: 'Corporativo',
    description: 'Estilo oficial Tumisoft con acentos esmeralda y pizarra de alta precisión.',
    colorHex: '#059669',
    sidebarBg: 'bg-[#0f172a]',
    sidebarBorder: 'border-slate-800',
    headerBg: 'bg-white',
    headerBorder: 'border-slate-200',
    appBg: 'bg-[#f8fafc]',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    primaryBg: 'bg-emerald-600',
    primaryHover: 'hover:bg-emerald-700',
    primaryText: 'text-emerald-600',
    accentBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Titanium',
    badge: 'Modo Oscuro',
    description: 'Paleta nocturna profunda con alto contraste, bordes de titanio y descansado para la vista.',
    colorHex: '#06b6d4',
    sidebarBg: 'bg-[#090d16]',
    sidebarBorder: 'border-slate-800/80',
    headerBg: 'bg-[#0e1626]',
    headerBorder: 'border-slate-800',
    appBg: 'bg-[#0a0e1a]',
    cardBg: 'bg-[#111827]',
    cardBorder: 'border-slate-800',
    primaryBg: 'bg-cyan-600',
    primaryHover: 'hover:bg-cyan-500',
    primaryText: 'text-cyan-400',
    accentBadge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
  },
  indigo: {
    id: 'indigo',
    name: 'Indigo Modern Tech',
    badge: 'Fintech SaaS',
    description: 'Diseño minimalista moderno con detalles índigo zafiro y tarjetas estilizadas.',
    colorHex: '#4f46e5',
    sidebarBg: 'bg-[#0d1527]',
    sidebarBorder: 'border-indigo-950',
    headerBg: 'bg-white',
    headerBorder: 'border-slate-200',
    appBg: 'bg-[#f1f5f9]',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    primaryBg: 'bg-indigo-600',
    primaryHover: 'hover:bg-indigo-700',
    primaryText: 'text-indigo-600',
    accentBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  warm: {
    id: 'warm',
    name: 'Executive Champagne',
    badge: 'Gerencial',
    description: 'Acabado ejecutivo sobrio con tonos grafito, ámbar y fondo marfil cálido.',
    colorHex: '#d97706',
    sidebarBg: 'bg-[#1c1917]',
    sidebarBorder: 'border-stone-800',
    headerBg: 'bg-[#fafaf9]',
    headerBorder: 'border-stone-200',
    appBg: 'bg-[#f5f5f4]',
    cardBg: 'bg-white',
    cardBorder: 'border-stone-200',
    primaryBg: 'bg-amber-600',
    primaryHover: 'hover:bg-amber-700',
    primaryText: 'text-amber-700',
    accentBadge: 'bg-amber-50 text-amber-800 border-amber-200'
  }
};

export function getSavedTheme(): AppTheme {
  try {
    const saved = localStorage.getItem('tumisoft_theme') as AppTheme;
    if (saved && THEMES[saved]) return saved;
  } catch (e) {}
  return 'emerald';
}

export function saveTheme(theme: AppTheme) {
  try {
    localStorage.setItem('tumisoft_theme', theme);
  } catch (e) {}
}
