/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sede, Producto } from '../types';
import { Search, Database, RefreshCw, Eye, Globe, Plus, CheckCircle, AlertCircle, X } from 'lucide-react';

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

  // New product modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('CONFITERIA');
  const [newPrice, setNewPrice] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newStock, setNewStock] = useState('10');
  const [savingProduct, setSavingProduct] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // Handle Add Product
  const handleSaveNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSede) return;

    setSaveError(null);
    setSaveSuccess(null);
    setSavingProduct(true);

    try {
      const response = await fetch(`/api/sedes/${activeSede.id}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: newSku,
          barcode: newBarcode,
          nombre: newName,
          categoria: newCategory,
          precioVenta: newPrice,
          costo: newCost,
          stock: newStock,
          userEmail
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar el producto');
      }

      setSaveSuccess(`¡Producto ${data.product.sku} (${data.product.nombre}) registrado y sincronizado exitosamente con Tumisoft ERP!`);
      // Reset form
      setNewSku('');
      setNewBarcode('');
      setNewName('');
      setNewPrice('');
      setNewCost('');
      setNewStock('10');
      // Refresh list
      fetchCatalog();

      setTimeout(() => {
        setSaveSuccess(null);
        setShowAddModal(false);
      }, 1500);
    } catch (err: any) {
      setSaveError(err.message || 'Error al conectar con Tumisoft ERP');
    } finally {
      setSavingProduct(false);
    }
  };

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
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            id="nuevo-producto-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Producto
          </button>

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

      {/* New Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                    Registrar Nuevo Producto en Tumisoft
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Sede: <strong className="text-slate-700">{activeSede?.name}</strong> (RUC: {activeSede?.ruc})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewProduct} className="p-5 space-y-3.5">
              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {saveError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Código SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="Ej. TUMI-205 o PROD-01"
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Código de Barras
                  </label>
                  <input
                    type="text"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    placeholder="Ej. 775012340205"
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Nombre Comercial / Descripción *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Chocolate Sublime 30g x 24"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Ej. CONFITERIA"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Stock Inicial
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Costo Adquisición (S/)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Precio Venta (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-emerald-700"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs rounded font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {savingProduct ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Sincronizando con Tumisoft...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Guardar y Sincronizar en Tumisoft
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
