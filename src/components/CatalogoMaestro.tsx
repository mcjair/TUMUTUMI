/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Sede, Producto } from '../types';
import { Search, Database, RefreshCw, Eye, Globe, ArrowDownWideNarrow } from 'lucide-react';

interface CatalogoMaestroProps {
  activeSede: Sede | null;
  userEmail: string;
  onJobCreated: (jobId: string) => void;
}

export default function CatalogoMaestro({ activeSede, userEmail, onJobCreated }: CatalogoMaestroProps) {
  const [catalog, setCatalog] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');
  const [syncingMaestro, setSyncingMaestro] = useState(false);
  const [scrapingMaestro, setScrapingMaestro] = useState(false);

  const fetchCatalog = async () => {
    if (!activeSede) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/sedes/${activeSede.id}/productos`);
      const data = await response.json();
      setCatalog(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [activeSede]);

  // Sync Master catalog
  const handleSyncMaster = async () => {
    if (!activeSede) return;
    setSyncingMaestro(true);
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SYNC_MAESTRO',
          sedeId: activeSede.id,
          payload: catalog.map(c => ({ sku: c.sku })),
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
      setSyncingMaestro(false);
    }
  };

  // Scrape/Sync competitors catalogs
  const handleScrapeMaster = async () => {
    if (!activeSede) return;
    setScrapingMaestro(true);
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SCRAPE_MAESTRO',
          sedeId: activeSede.id,
          payload: catalog.map(c => ({ sku: c.sku })),
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
      setScrapingMaestro(false);
    }
  };

  // Filter & Search
  const filteredCatalog = catalog.filter((prod) => {
    const matchesSearch =
      prod.sku.toLowerCase().includes(search.toLowerCase()) ||
      prod.nombre.toLowerCase().includes(search.toLowerCase()) ||
      prod.barcode.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'TODAS' || prod.categoria === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Unique categories
  const categories = ['TODAS', ...Array.from(new Set(catalog.map((p) => p.categoria)))];

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden" id="catalogo-maestro-container">
      {/* Upper header */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50">
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-4 h-4 text-indigo-500" />
            Catálogo Local & Sincronización Maestra
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Explore los productos registrados en esta sede y ejecute tareas masivas de homologación contra la base de datos principal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncMaster}
            disabled={syncingMaestro || catalog.length === 0}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            id="sync-maestro-btn"
          >
            <RefreshCw className={`w-3 h-3 ${syncingMaestro ? 'animate-spin' : ''}`} />
            Sincronizar Base Maestra
          </button>

          <button
            onClick={handleScrapeMaster}
            disabled={scrapingMaestro || catalog.length === 0}
            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            id="scrape-maestro-btn"
          >
            <Globe className={`w-3 h-3 ${scrapingMaestro ? 'animate-spin' : ''}`} />
            Scraping Maestro
          </button>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por SKU, nombre o código de barras..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Categoría:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table view */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
          Cargando catálogo local en caché...
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className="p-16 text-center text-slate-400 text-sm border-b border-slate-200">
          No se encontraron productos que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">SKU / Barcode</th>
                <th className="py-2.5 px-4">Nombre Comercial</th>
                <th className="py-2.5 px-4">Categoría</th>
                <th className="py-2.5 px-4 text-right">P. Venta (S/)</th>
                <th className="py-2.5 px-4 text-right">Costo (S/)</th>
                <th className="py-2.5 px-4 text-center">Stock Sede</th>
                <th className="py-2.5 px-4 text-center">Última Sinc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCatalog.map((prod) => (
                <tr key={prod.sku} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-slate-700 font-mono">{prod.sku}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{prod.barcode || 'Sin Barcode'}</div>
                  </td>
                  <td className="py-2.5 px-4 text-slate-800 font-medium">{prod.nombre}</td>
                  <td className="py-2.5 px-4 text-slate-500">{prod.categoria}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-700">S/ {prod.precioVenta.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">S/ {prod.costo.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 font-bold rounded text-[10px] ${
                      prod.stock <= 5 
                        ? 'bg-rose-100 text-rose-800' 
                        : prod.stock <= 15 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-indigo-50 text-indigo-700'
                    }`}>
                      {prod.stock} uds
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center text-slate-400 text-[10px] font-mono">
                    {new Date(prod.updatedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Catalog count footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between text-xs text-slate-500">
        <div>
          Mostrando <strong>{filteredCatalog.length}</strong> de <strong>{catalog.length}</strong> productos catalogados.
        </div>
        <div className="flex items-center gap-1">
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          Sincronizado en tiempo real con Tumisoft ERP
        </div>
      </div>
    </div>
  );
}
