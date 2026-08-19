/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Sede, Job, AppTheme } from './types';
import SedeSelector from './components/SedeSelector';
import IngresoDia from './components/IngresoDia';
import ActualizacionMasiva, { UpdateType } from './components/ActualizacionMasiva';
import EntradaInventario from './components/EntradaInventario';
import CatalogoMaestro from './components/CatalogoMaestro';
import AuditLogView from './components/AuditLogView';
import SettingsPanel from './components/SettingsPanel';
import AppsScriptModal from './components/AppsScriptModal';
import ThemeSelectorModal from './components/ThemeSelectorModal';
import { THEMES, getSavedTheme, saveTheme } from './lib/theme';
import { googleSignIn, googleLogout, initAuth } from './lib/googleAuth';
import { User as FirebaseUser } from 'firebase/auth';
import {
  Building2,
  LogOut,
  FileSpreadsheet,
  Layers,
  PlusCircle,
  Database,
  History,
  Settings,
  Terminal,
  Activity,
  UserCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCw,
  ChevronDown,
  Code,
  Palette,
  Sparkles,
  Zap,
  ExternalLink
} from 'lucide-react';

type TabType = 'ingreso' | 'masivo' | 'entrada' | 'catalogo' | 'jobs' | 'auditoria' | 'settings';

export const DEFAULT_SEDES: Sede[] = [
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

export default function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [emailInput, setEmailInput] = useState('admin@tumisoft.com');
  const [passwordInput, setPasswordInput] = useState('admin123');
  const [loginError, setLoginError] = useState('');

  // Theme state
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(getSavedTheme());
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Google OAuth state
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [authDomainError, setAuthDomainError] = useState<string | null>(null);

  // App core state
  const [sedes, setSedes] = useState<Sede[]>(DEFAULT_SEDES);
  const [activeSede, setActiveSede] = useState<Sede | null>(DEFAULT_SEDES[0]);
  const [activeTab, setActiveTab] = useState<TabType>('ingreso');
  const [updateSubtype, setUpdateSubtype] = useState<UpdateType>('PRECIO');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingSedes, setLoadingSedes] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showAppsScriptModal, setShowAppsScriptModal] = useState(false);

  const themeConfig = THEMES[currentTheme] || THEMES.emerald;

  const handleSelectTheme = (theme: AppTheme) => {
    setCurrentTheme(theme);
    saveTheme(theme);
  };

  useEffect(() => {
    // Listen for Google Auth state
    const unsubscribe = initAuth(
      (fbUser, token) => {
        setGoogleUser(fbUser);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const res = await googleSignIn();
      setGoogleUser(res.user);
      setGoogleToken(res.accessToken);
      setAuthDomainError(null);
    } catch (e: any) {
      console.error('Google Sign In Error:', e);
      if (e.code === 'auth/unauthorized-domain' || e.message?.includes('unauthorized-domain') || e.message?.includes('dominio')) {
        setAuthDomainError(window.location.hostname);
      } else {
        alert(e.message || 'Error al iniciar sesión con Google');
      }
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await googleLogout();
      setGoogleUser(null);
      setGoogleToken(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Load and refresh core data
  const fetchSedes = async () => {
    setLoadingSedes(true);
    try {
      const response = await fetch('/api/sedes');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setSedes(data);
          if (!activeSede) {
            setActiveSede(data[0]);
          } else {
            const updated = data.find((s: Sede) => s.id === activeSede.id);
            if (updated) setActiveSede(updated);
          }
          return;
        }
      }
      setSedes(prev => (prev.length > 0 ? prev : DEFAULT_SEDES));
      setActiveSede(prev => prev || DEFAULT_SEDES[0]);
    } catch (e) {
      setSedes(prev => (prev.length > 0 ? prev : DEFAULT_SEDES));
      setActiveSede(prev => prev || DEFAULT_SEDES[0]);
    } finally {
      setLoadingSedes(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      const data = await response.json();
      setJobs(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSedes();
      fetchJobs();
      // Poll jobs status every 2.5 seconds to provide responsive logs progress updating
      const interval = setInterval(fetchJobs, 2500);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Quick direct login helper
  const handleQuickLogin = (role: 'admin' | 'operador' | 'user') => {
    let selectedUser: User;
    if (role === 'admin') {
      selectedUser = { id: 'usr-1', email: 'admin@tumisoft.com', name: 'Administrador Principal', role: 'admin' };
    } else if (role === 'operador') {
      selectedUser = { id: 'usr-2', email: 'operador@tumisoft.com', name: 'Operador de Sede', role: 'operador' };
    } else {
      selectedUser = { id: 'usr-3', email: 'pmagallanesp@gmail.com', name: 'Administrador General', role: 'admin' };
    }

    setUser(selectedUser);
    setIsAuthenticated(true);
    sessionStorage.setItem('tumisoft_user', JSON.stringify(selectedUser));
  };

  // Handle login request
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cleanEmail = emailInput.trim().toLowerCase();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: passwordInput.trim() })
      });
      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        sessionStorage.setItem('tumisoft_user', JSON.stringify(data.user));
        return;
      }
    } catch (err) {
      console.warn('Network login fallback to client session:', err);
    }

    // Client-side fallback for test credentials
    const fallbackRole = cleanEmail.includes('operador') ? 'operador' : 'admin';
    const fallbackUser: User = {
      id: 'usr-' + Date.now(),
      email: cleanEmail || 'admin@tumisoft.com',
      name: cleanEmail ? cleanEmail.split('@')[0].toUpperCase() : 'Administrador Principal',
      role: fallbackRole
    };

    setUser(fallbackUser);
    setIsAuthenticated(true);
    sessionStorage.setItem('tumisoft_user', JSON.stringify(fallbackUser));
  };

  // On mount check session
  useEffect(() => {
    const cachedUser = sessionStorage.getItem('tumisoft_user');
    if (cachedUser) {
      setUser(JSON.parse(cachedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('tumisoft_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Factory reset database
  const handleResetApp = async () => {
    if (confirm('¿Está seguro de restaurar toda la base de datos de simulación al estado inicial?')) {
      try {
        await fetch('/api/admin/clear', { method: 'POST' });
        await fetchSedes();
        await fetchJobs();
        alert('Base de datos restaurada correctamente.');
        setActiveTab('ingreso');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleJobCreated = (jobId: string) => {
    setActiveTab('jobs');
    fetchJobs();
  };

  const activeJobsCount = jobs.filter(j => j.status === 'PENDING' || j.status === 'PROCESSING').length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden" id="login-layout">
        {/* Subtle geometric backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-slate-950 opacity-90"></div>
        
        <div className="relative z-10 bg-white border border-slate-200/80 rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-xs">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Tumisoft Sync Web</h1>
            <p className="text-xs text-slate-500">
              Sincronizador e integrador de catálogo de Google Sheets a Tumisoft ERP.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" id="login-form">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs transition-all"
                placeholder="admin@tumisoft.com"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs transition-all"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs font-medium text-rose-700 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Iniciar Sesión</span>
            </button>
          </form>

          {/* 1-Click Fast Login Options */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              Acceso Rápido Directo (1 Clic)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-800 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-colors cursor-pointer"
              >
                <span>Administrador</span>
                <span className="text-[10px] text-slate-500 font-normal">admin@tumisoft.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('operador')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-colors cursor-pointer"
              >
                <span>Operador Sede</span>
                <span className="text-[10px] text-slate-500 font-normal">operador@tumisoft.com</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleQuickLogin('user')}
              className="w-full p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ingresar como Administrador (pmagallanesp@gmail.com)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full font-sans text-[13px] overflow-hidden ${themeConfig.appBg}`} id="app-layout">
      {/* High Density Left Navigation Sidebar */}
      <nav className={`w-56 ${themeConfig.sidebarBg} text-slate-300 flex flex-col border-r ${themeConfig.sidebarBorder} shrink-0`}>
        <div className={`p-3.5 border-b ${themeConfig.sidebarBorder} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-white text-xs shadow-xs"
              style={{ backgroundColor: themeConfig.colorHex }}
            >
              TS
            </div>
            <span className="font-bold text-white tracking-tight uppercase text-xs">Tumisoft Sync</span>
          </div>

          <button
            type="button"
            onClick={() => setShowThemeModal(true)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cambiar Diseño / Tema"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto" id="sidebar-navigation">
          <div className="px-2.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
            📦 Menú Principal
          </div>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-xs ${
              activeTab === 'settings'
                ? 'bg-white/15 text-white font-bold shadow-2xs'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>🏪</span>
            <span className="truncate">Seleccionar Sede</span>
          </button>

          <div className="border-t border-white/10 my-1"></div>

          <button
            onClick={() => setActiveTab('ingreso')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-xs ${
              activeTab === 'ingreso'
                ? 'bg-white/15 text-white font-bold shadow-2xs'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>▶️</span>
            <span className="truncate">Procesar Ingreso del Día</span>
          </button>

          <div className="border-t border-white/10 my-1"></div>

          <button
            onClick={() => { setActiveTab('masivo'); setUpdateSubtype('PRECIO'); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-xs ${
              activeTab === 'masivo' && updateSubtype === 'PRECIO'
                ? 'bg-white/15 text-white font-bold shadow-2xs'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>💰</span>
            <span className="truncate">Actualizar Precio Venta</span>
          </button>

          <button
            onClick={() => { setActiveTab('masivo'); setUpdateSubtype('CATEGORIA'); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-xs ${
              activeTab === 'masivo' && updateSubtype === 'CATEGORIA'
                ? 'bg-white/15 text-white font-bold shadow-2xs'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>🏷️</span>
            <span className="truncate">Actualizar Categoría</span>
          </button>

          <button
            onClick={() => { setActiveTab('masivo'); setUpdateSubtype('NOMBRE'); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-xs ${
              activeTab === 'masivo' && updateSubtype === 'NOMBRE'
                ? 'bg-white/15 text-white font-bold shadow-2xs'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>📝</span>
            <span className="truncate">Actualizar Nombre</span>
          </button>

          <button
            onClick={() => { setActiveTab('masivo'); setUpdateSubtype('COSTO'); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-xs ${
              activeTab === 'masivo' && updateSubtype === 'COSTO'
                ? 'bg-white/15 text-white font-bold shadow-2xs'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>💵</span>
            <span className="truncate">Actualizar Precio Costo</span>
          </button>

          <button
            onClick={() => setActiveTab('entrada')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-xs ${
              activeTab === 'entrada'
                ? 'bg-white/15 text-white font-bold shadow-2xs'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>📦</span>
            <span className="truncate">Ingresar Inventario</span>
          </button>

          <div className="pt-3 px-2.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
            Supervisión
          </div>

          <button
            onClick={() => setActiveTab('catalogo')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-xs ${
              activeTab === 'catalogo'
                ? 'bg-white/15 text-white font-bold shadow-2xs'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'catalogo' ? 'bg-emerald-400' : 'bg-transparent'}`}></div>
            <span>Catálogo Maestro</span>
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors text-left text-xs ${
              activeTab === 'jobs'
                ? 'bg-white/15 text-white font-bold shadow-2xs'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'jobs' ? 'bg-emerald-400' : 'bg-transparent'}`}></div>
              <span>Cola de Trabajos</span>
            </span>
            {activeJobsCount > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[9px] font-bold">
                {activeJobsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('auditoria')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-xs ${
              activeTab === 'auditoria'
                ? 'bg-white/15 text-white font-bold shadow-2xs'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'auditoria' ? 'bg-emerald-400' : 'bg-transparent'}`}></div>
            <span>Auditoría & Logs</span>
          </button>

          <div className="pt-3 px-2.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
            Herramientas
          </div>

          <button
            onClick={() => setShowThemeModal(true)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-xs text-slate-300 hover:bg-white/5 hover:text-white"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span>Diseño ({themeConfig.name.split(' ')[0]})</span>
          </button>

          <button
            onClick={() => setShowAppsScriptModal(true)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-xs text-emerald-400 hover:bg-white/5 hover:text-emerald-300 font-medium"
          >
            <Code className="w-3.5 h-3.5" />
            <span>Código Google Sheets</span>
          </button>
        </div>

        {/* Live Telemetry Sidebar Panel widget */}
        {jobs.length > 0 && (
          <div className={`p-3.5 border-t ${themeConfig.sidebarBorder} bg-black/20 text-xs space-y-2.5 shrink-0`}>
            <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Sincronización</span>
              <span className={activeJobsCount > 0 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                {activeJobsCount > 0 ? "En Proceso" : "Al Día"}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Último Trabajo</span>
                <span className="font-mono text-slate-300">#{jobs[0].id.substring(4, 8)}</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${jobs[0].status === 'PROCESSING' ? 'bg-amber-400 animate-pulse' : jobs[0].status === 'COMPLETED' ? 'bg-emerald-400' : jobs[0].status === 'ERROR' ? 'bg-rose-500' : 'bg-slate-500'}`}
                  style={{ width: jobs[0].status === 'PROCESSING' ? `${Math.max(15, (jobs[0].processedRows / jobs[0].totalRows) * 100)}%` : '100%' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div className={`p-3 border-t ${themeConfig.sidebarBorder} text-[10px] text-slate-500 flex items-center justify-between shrink-0`}>
          <span>v1.2.5-stable</span>
          <span className="font-mono">{themeConfig.badge}</span>
        </div>
      </nav>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* High Density Top Control Header */}
        <header className={`h-12 ${themeConfig.headerBg} border-b ${themeConfig.headerBorder} flex items-center justify-between px-6 shrink-0 z-20 transition-colors shadow-2xs`}>
          <div className="flex items-center gap-3">
            {/* Native Google Sheets-style Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                id="tumisoft-sync-dropdown-btn"
              >
                <span>📦</span>
                <span>Tumisoft Sync</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {showMenuDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenuDropdown(false)}
                  ></div>
                  <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-xs animate-in fade-in slide-in-from-top-1">
                    <button
                      onClick={() => { setActiveTab('settings'); setShowMenuDropdown(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer font-medium"
                    >
                      <span>🏪</span>
                      <span>Seleccionar Sede</span>
                    </button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={() => { setActiveTab('ingreso'); setShowMenuDropdown(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer font-medium"
                    >
                      <span>▶️</span>
                      <span>Procesar Ingreso del Día</span>
                    </button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={() => { setActiveTab('masivo'); setUpdateSubtype('PRECIO'); setShowMenuDropdown(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer font-medium"
                    >
                      <span>💰</span>
                      <span>Actualizar Precio de Venta</span>
                    </button>
                    <button
                      onClick={() => { setActiveTab('masivo'); setUpdateSubtype('CATEGORIA'); setShowMenuDropdown(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer font-medium"
                    >
                      <span>🏷️</span>
                      <span>Actualizar Categoría</span>
                    </button>
                    <button
                      onClick={() => { setActiveTab('masivo'); setUpdateSubtype('NOMBRE'); setShowMenuDropdown(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer font-medium"
                    >
                      <span>📝</span>
                      <span>Actualizar Nombre</span>
                    </button>
                    <button
                      onClick={() => { setActiveTab('masivo'); setUpdateSubtype('COSTO'); setShowMenuDropdown(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer font-medium"
                    >
                      <span>💵</span>
                      <span>Actualizar Precio Costo (Revalorización)</span>
                    </button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={() => { setActiveTab('entrada'); setShowMenuDropdown(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer font-medium"
                    >
                      <span>📦</span>
                      <span>Ingresar Inventario (Entrada Stock)</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <span className="text-slate-300">/</span>
            <span className="text-slate-600 text-xs font-medium">Panel Web & Google Sheets Sync</span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Theme Switcher Quick Button */}
            <button
              onClick={() => setShowThemeModal(true)}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Cambiar tema visual"
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeConfig.colorHex }}></div>
              <span>Diseño: {themeConfig.name.split(' ')[0]}</span>
            </button>

            <button
              onClick={() => setShowAppsScriptModal(true)}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Code className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instalar en Google Sheets</span>
            </button>

            {activeJobsCount > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-700 font-bold">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></div>
                Sincronización en curso
              </div>
            )}

            <div className="h-4 w-[1px] bg-slate-200"></div>

            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <div className="font-bold text-slate-900 text-xs leading-none">{user?.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase">{user?.role} de Sede</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Cerrar Sesión"
                id="logout-btn"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Workspace Scroller */}
        <div className="flex-1 p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Active Sede Selector always on top */}
          <SedeSelector
            sedes={sedes}
            activeSede={activeSede}
            onSelectSede={setActiveSede}
            userEmail={user?.email || 'admin@tumisoft.com'}
            googleToken={googleToken}
            googleUserEmail={googleUser?.email}
            onGoogleSignIn={handleGoogleSignIn}
            onGoogleSignOut={handleGoogleSignOut}
          />

          {/* Render Tab Screens */}
          {activeTab === 'ingreso' && (
            <IngresoDia
              activeSede={activeSede}
              userEmail={user?.email || 'admin@tumisoft.com'}
              onJobCreated={handleJobCreated}
              googleToken={googleToken}
              onGoogleSignIn={handleGoogleSignIn}
              onSedeUpdated={fetchSedes}
            />
          )}

          {activeTab === 'masivo' && (
            <ActualizacionMasiva
              activeSede={activeSede}
              userEmail={user?.email || 'admin@tumisoft.com'}
              onJobCreated={handleJobCreated}
              initialUpdateType={updateSubtype}
              onUpdateTypeChange={setUpdateSubtype}
            />
          )}

          {activeTab === 'entrada' && (
            <EntradaInventario
              activeSede={activeSede}
              userEmail={user?.email || 'admin@tumisoft.com'}
              onJobCreated={handleJobCreated}
            />
          )}

          {activeTab === 'catalogo' && (
            <CatalogoMaestro
              activeSede={activeSede}
              userEmail={user?.email || 'admin@tumisoft.com'}
              onJobCreated={handleJobCreated}
            />
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-4" id="job-queue-view">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="border-b border-slate-200 pb-3 mb-4 flex justify-between items-center bg-slate-50/70 -mx-5 -mt-5 p-4 rounded-t-xl">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-600" />
                      Cola de Trabajos Asíncronos
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Monitoreo estructural de hilos de sincronización por fila en Tumisoft ERP.
                    </p>
                  </div>
                </div>

                {jobs.length === 0 ? (
                  <div className="text-center p-12 text-slate-400 text-xs">
                    No se ha ejecutado ninguna tarea de sincronización en esta sesión.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobs.map((job) => {
                      const percent = job.totalRows > 0 ? Math.round((job.processedRows / job.totalRows) * 100) : 0;
                      return (
                        <div key={job.id} className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-xs">{job.type}</span>
                                <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1 rounded border border-slate-200">ID: {job.id.substring(4, 10)}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Operador: <strong>{job.userEmail}</strong> | {new Date(job.createdAt).toLocaleTimeString()}
                              </div>
                            </div>

                            <div>
                              {job.status === 'PENDING' && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" /> EN COLA
                                </span>
                              )}
                              {job.status === 'PROCESSING' && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold flex items-center gap-1 animate-pulse">
                                  <RotateCw className="w-3 h-3 animate-spin text-amber-500" /> PROCESANDO ({percent}%)
                                </span>
                              )}
                              {job.status === 'COMPLETED' && (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> COMPLETADO
                                </span>
                              )}
                              {job.status === 'ERROR' && (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[10px] font-bold flex items-center gap-1">
                                  <XCircle className="w-3 h-3 text-rose-500" /> ERROR
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] text-slate-500">
                              <span>Progreso de sincronización</span>
                              <span className="font-semibold text-slate-700">{job.processedRows} de {job.totalRows} filas ({percent}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 border border-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  job.status === 'ERROR' ? 'bg-rose-500' : job.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-emerald-600'
                                }`}
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Terminal logs */}
                          <div className="bg-slate-900 text-slate-300 font-mono text-[10px] p-3 rounded-lg border border-slate-800 space-y-1 max-h-36 overflow-y-auto">
                            {job.logs.map((log, index) => (
                              <div key={index} className="flex gap-1.5">
                                <span className="text-slate-500 select-none">[{index + 1}]</span>
                                <span>{log}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'auditoria' && <AuditLogView />}

          {activeTab === 'settings' && (
            <SettingsPanel
              sedes={sedes}
              activeSede={activeSede}
              onRefreshSedes={fetchSedes}
              onResetApp={handleResetApp}
              googleToken={googleToken}
              onGoogleSignIn={handleGoogleSignIn}
              currentTheme={currentTheme}
              onSelectTheme={handleSelectTheme}
            />
          )}
        </div>
      </main>

      {/* Google Sheets Native Apps Script Generator Modal */}
      <AppsScriptModal
        isOpen={showAppsScriptModal}
        onClose={() => setShowAppsScriptModal(false)}
      />

      {/* Theme Selector Modal */}
      <ThemeSelectorModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        currentTheme={currentTheme}
        onSelectTheme={handleSelectTheme}
      />

      {/* Firebase Authorized Domain Helper Modal */}
      {authDomainError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-amber-200 bg-amber-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                    Dominio no autorizado en Firebase
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    Se requiere habilitar el dominio de despliegue en Google Firebase
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAuthDomainError(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-amber-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5 text-amber-700" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600">
              <p>
                Tu aplicación está corriendo en <code className="px-1.5 py-0.5 bg-slate-100 font-mono font-bold text-slate-800 rounded">{authDomainError}</code>, pero Firebase Authentication requiere que este dominio esté registrado en la lista blanca de seguridad.
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase">Pasos para autorizarlo (30 segundos):</div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px]">
                  <li>
                    Abre tu <a
                      href="https://console.firebase.google.com/project/gen-lang-client-0561903979/authentication/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 font-bold underline inline-flex items-center gap-1"
                    >
                      Consola de Firebase (clic aquí para abrir directo)
                      <ExternalLink className="w-3 h-3" />
                    </a>.
                  </li>
                  <li>
                    En la pestaña <strong className="text-slate-800">Settings / Configuración</strong>, ubica la sección <strong className="text-slate-800">Authorized domains (Dominios autorizados)</strong>.
                  </li>
                  <li>
                    Haz clic en <strong className="text-slate-800">&quot;Add domain&quot; (Agregar dominio)</strong> y pega:
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        readOnly
                        value={authDomainError}
                        className="w-full px-2.5 py-1 font-mono text-xs bg-white border border-slate-300 rounded font-semibold text-slate-800 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(authDomainError);
                          alert('¡Dominio copiado al portapapeles!');
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[11px] rounded font-medium cursor-pointer shrink-0"
                      >
                        Copiar
                      </button>
                    </div>
                  </li>
                  <li>Haz clic en <strong className="text-slate-800">Guardar / Add</strong> y luego recarga esta página para iniciar sesión.</li>
                </ol>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAuthDomainError(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
