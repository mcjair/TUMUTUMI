/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Sede, Producto } from '../types';
import { PlusCircle, Search, AlertCircle, RotateCw, CheckCircle, PackageOpen } from 'lucide-react';

interface EntradaInventarioProps {
  activeSede: Sede | null;
  userEmail: string;
  onJobCreated: (jobId: string) => void;
}

export default function EntradaInventario({ activeSede, userEmail, onJobCreated }: EntradaInventarioProps) {
  const [skuSearch, setSkuSearch] = useState('');
  const [matchedProduct, setMatchedProduct] = useState<Producto | null>(null);
  const [stockToAdd, setStockToAdd] = useState(10);
  const [errorMsg, setErrorMsg] = useState('');
  const [allProducts, setAllProducts] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  const fetchCatalog = async () => {
    if (!activeSede) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/sedes/${activeSede.id}/productos`);
      const data = await response.json();
      setAllProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
    setSkuSearch('');
    setMatchedProduct(null);
  }, [activeSede]);

  const handleSkuSearchChange = (val: string) => {
    setSkuSearch(val);
    setErrorMsg('');
    const match = allProducts.find(p => p.sku.toUpperCase() === val.trim().toUpperCase());
    if (match) {
      setMatchedProduct(match);
    } else {
      setMatchedProduct(null);
    }
  };

  const handleExecuteEntry = async () => {
    if (!activeSede || !matchedProduct) return;
    if (stockToAdd <= 0) {
      setErrorMsg('La cantidad a ingresar debe ser mayor a cero.');
      return;
    }

    setExecuting(true);
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ENTRADA_INVENTARIO',
          sedeId: activeSede.id,
          payload: [{
            sku: matchedProduct.sku,
            stock: stockToAdd.toString()
          }],
          userEmail
        })
      });

      const data = await response.json();
      if (data.id) {
        onJobCreated(data.id);
        // Refresh catalog and reset input
        setSkuSearch('');
        setMatchedProduct(null);
        fetchCatalog();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm p-4" id="entrada-inventario-container">
      <div className="border-b border-slate-200 pb-3 mb-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <PlusCircle className="w-4 h-4 text-indigo-500" />
          Ingresar Inventario (Incremental)
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Incremente el stock actual de un producto registrado de manera segura. El valor se sumará al inventario existente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Search Panel */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Buscar Producto por SKU
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={skuSearch}
                onChange={(e) => handleSkuSearchChange(e.target.value)}
                placeholder="Ingrese SKU (ej. TUMI-001)"
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-mono"
              />
            </div>
            {skuSearch.trim() !== '' && !matchedProduct && !loading && (
              <span className="text-[10px] text-rose-500 mt-1 block flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> No se encontró ningún producto con ese SKU en esta sede
              </span>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Cantidad de Unidades a Ingresar
            </label>
            <input
              type="number"
              min="1"
              value={stockToAdd}
              onChange={(e) => setStockToAdd(parseInt(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded font-medium flex gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {errorMsg}
            </div>
          )}

          <button
            onClick={handleExecuteEntry}
            disabled={!matchedProduct || executing}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            id="register-stock-entry-btn"
          >
            {executing ? (
              <RotateCw className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle className="w-3 h-3" />
            )}
            Procesar Entrada de Inventario
          </button>
        </div>

        {/* Dynamic Comparison Panel */}
        <div>
          {matchedProduct ? (
            <div className="border border-slate-200 rounded p-4 space-y-4 bg-slate-50" id="stock-comparison-box">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-white border border-slate-200 text-indigo-600 rounded">
                  <PackageOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detalles del Producto</h4>
                  <div className="text-xs font-bold text-slate-800 mt-1">{matchedProduct.nombre}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {matchedProduct.sku} | Barcode: {matchedProduct.barcode || 'N/A'}</div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 grid grid-cols-3 gap-2.5 text-center">
                <div className="p-2.5 bg-white border border-slate-200 rounded">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Stock Actual</div>
                  <div className="text-sm font-bold text-slate-700 mt-0.5">{matchedProduct.stock}</div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Cantidad Entrante</div>
                  <div className="text-sm font-bold text-indigo-600 mt-0.5">+{stockToAdd}</div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Stock Proyectado</div>
                  <div className="text-sm font-bold text-emerald-600 mt-0.5">
                    {matchedProduct.stock + (isNaN(stockToAdd) ? 0 : stockToAdd)}
                  </div>
                </div>
              </div>

              <div className="text-[10px] leading-relaxed text-slate-500 bg-amber-50/50 border border-amber-200 rounded p-2.5">
                <strong>Nota Comercial:</strong> Al presionar "Procesar Entrada de Inventario", se creará una tarea en la cola para sincronizar el incremento con Tumisoft ERP de forma atómica con bloqueo de exclusión mutua. Se registrará un rastro en el historial de auditoría.
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 rounded p-12 text-center text-slate-400 text-xs flex flex-col justify-center items-center h-full min-h-[220px]">
              <PackageOpen className="w-8 h-8 text-slate-300 mb-1.5" />
              Busque un SKU válido en la columna de la izquierda para desplegar el panel de proyecciones matemáticas y de stock.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
