/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { User, Sede, Producto, Job, AuditLog, GoogleSheetRow } from '../src/types';

interface Schema {
  users: User[];
  sedes: Sede[];
  productos: Producto[];
  jobs: Job[];
  auditLogs: AuditLog[];
  mockSheets: Record<string, GoogleSheetRow[]>;
}

const DB_FILE = path.join(process.cwd(), 'db.json');

// Initial seed data
const initialData: Schema = {
  users: [
    { id: 'usr-1', email: 'admin@tumisoft.com', name: 'Administrador Principal', role: 'admin' },
    { id: 'usr-2', email: 'operador@tumisoft.com', name: 'Operador de Sede', role: 'operador' },
    { id: 'usr-3', email: 'pmagallanesp@gmail.com', name: 'Administrador General', role: 'admin' }
  ],
  sedes: [
    {
      id: 'sede-1',
      name: 'Sede Lima Centro',
      ruc: '20601234567',
      address: 'Av. Garcilaso de la Vega 1250, Lima',
      googleSheetId: '1zHk7U3xYfK-b_pA8K9QWp99xXyZ77a_demo1',
      googleSheetRange: 'Ingreso!A2:H',
      isActive: true,
      isMockEnabled: true
    },
    {
      id: 'sede-2',
      name: 'Sede Miraflores',
      ruc: '20601234568',
      address: 'Calle Shell 345, Miraflores, Lima',
      googleSheetId: '1zHk7U3xYfK-b_pA8K9QWp99xXyZ77a_demo2',
      googleSheetRange: 'Ingreso!A2:H',
      isActive: true,
      isMockEnabled: true
    }
  ],
  productos: [
    { sku: 'TUMI-001', barcode: '775012340011', nombre: 'Teclado Mecánico RGB Red Switch', categoria: 'Accesorios PC', precioVenta: 189.90, costo: 95.00, stock: 45, sedeId: 'sede-1', updatedAt: new Date().toISOString() },
    { sku: 'TUMI-002', barcode: '775012340012', nombre: 'Mouse Gamer Óptico 16000 DPI', categoria: 'Accesorios PC', precioVenta: 124.50, costo: 58.00, stock: 60, sedeId: 'sede-1', updatedAt: new Date().toISOString() },
    { sku: 'TUMI-003', barcode: '775012340013', nombre: 'Audífonos Inalámbricos Bluetooth Pro', categoria: 'Audio', precioVenta: 249.00, costo: 110.00, stock: 30, sedeId: 'sede-1', updatedAt: new Date().toISOString() },
    { sku: 'TUMI-004', barcode: '775012340014', nombre: 'Cámara Web Full HD 1080p c/ Micrófono', categoria: 'Accesorios PC', precioVenta: 159.00, costo: 75.00, stock: 25, sedeId: 'sede-1', updatedAt: new Date().toISOString() },
    { sku: 'TUMI-005', barcode: '775012340015', nombre: 'Monitor Curvo Gamer 27\" 144Hz', categoria: 'Monitores', precioVenta: 899.00, costo: 520.00, stock: 15, sedeId: 'sede-1', updatedAt: new Date().toISOString() },

    { sku: 'TUMI-001', barcode: '775012340011', nombre: 'Teclado Mecánico RGB Red Switch', categoria: 'Accesorios PC', precioVenta: 189.90, costo: 95.00, stock: 12, sedeId: 'sede-2', updatedAt: new Date().toISOString() },
    { sku: 'TUMI-002', barcode: '775012340012', nombre: 'Mouse Gamer Óptico 16000 DPI', categoria: 'Accesorios PC', precioVenta: 129.90, costo: 58.00, stock: 24, sedeId: 'sede-2', updatedAt: new Date().toISOString() },
    { sku: 'TUMI-003', barcode: '775012340013', nombre: 'Audífonos Inalámbricos Bluetooth Pro', categoria: 'Audio', precioVenta: 249.00, costo: 110.00, stock: 8, sedeId: 'sede-2', updatedAt: new Date().toISOString() },
    { sku: 'TUMI-006', barcode: '775012340016', nombre: 'Silla Ergonómica de Oficina Black', categoria: 'Muebles', precioVenta: 450.00, costo: 220.00, stock: 5, sedeId: 'sede-2', updatedAt: new Date().toISOString() }
  ],
  jobs: [],
  auditLogs: [
    {
      id: 'aud-1',
      userEmail: 'admin@tumisoft.com',
      action: 'CONEXION_TEST',
      details: 'Conexión exitosa verificada para Sede Lima Centro',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    }
  ],
  mockSheets: {
    'sede-1': [
      { rowId: 1, sku: 'TUMI-001', barcode: '775012340011', nombre: 'Teclado Mecánico RGB Red Switch', categoria: 'Accesorios PC', precioVenta: 195.00, costo: 95.00, stock: 20, status: 'REINGRESO' },
      { rowId: 2, sku: 'TUMI-002', barcode: '775012340012', nombre: 'Mouse Gamer Óptico 16000 DPI', categoria: 'Accesorios PC', precioVenta: 124.50, costo: 60.00, stock: 15, status: 'REINGRESO' },
      { rowId: 3, sku: 'TUMI-007', barcode: '775012340017', nombre: 'Pad Mouse Extra Large Gamer', categoria: 'Accesorios PC', precioVenta: 45.00, costo: 18.00, stock: 50, status: 'NUEVO' },
      { rowId: 4, sku: 'TUMI-008', barcode: '775012340018', nombre: 'Soporte de Aluminio para Laptop', categoria: 'Accesorios PC', precioVenta: 89.90, costo: 40.00, stock: 30, status: 'NUEVO' },
      { rowId: 5, sku: 'INVALID-SKU', barcode: '', nombre: 'Producto Inválido Sin Precio', categoria: 'Otros', precioVenta: 0, costo: 25.00, stock: 5, status: 'ERROR', errors: ['El precio debe ser mayor a 0', 'El código de barras no puede estar vacío'] }
    ],
    'sede-2': [
      { rowId: 1, sku: 'TUMI-001', barcode: '775012340011', nombre: 'Teclado Mecánico RGB Red Switch', categoria: 'Accesorios PC', precioVenta: 189.90, costo: 95.00, stock: 10, status: 'REINGRESO' },
      { rowId: 2, sku: 'TUMI-006', barcode: '775012340016', nombre: 'Silla Ergonómica Premium Plus', categoria: 'Muebles', precioVenta: 499.00, costo: 240.00, stock: 3, status: 'REINGRESO' },
      { rowId: 3, sku: 'TUMI-009', barcode: '775012340019', nombre: 'Parlante Inteligente con Asistente', categoria: 'Audio', precioVenta: 199.00, costo: 85.00, stock: 12, status: 'NUEVO' }
    ]
  }
};

class DBEngine {
  private data: Schema = { ...initialData };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
      } else {
        this.save();
      }
    } catch (e) {
      console.error('Error loading database, using default values', e);
      this.data = { ...initialData };
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database', e);
    }
  }

  // Users
  public getUsers() {
    return this.data.users;
  }

  // Sedes
  public getSedes() {
    return this.data.sedes;
  }

  public getSede(id: string) {
    return this.data.sedes.find(s => s.id === id);
  }

  public addSede(sede: Sede) {
    this.data.sedes.push(sede);
    this.save();
  }

  public updateSede(id: string, updates: Partial<Sede>) {
    const index = this.data.sedes.findIndex(s => s.id === id);
    if (index !== -1) {
      this.data.sedes[index] = { ...this.data.sedes[index], ...updates };
      this.save();
      return this.data.sedes[index];
    }
    return null;
  }

  // Productos
  public getProductos(sedeId: string) {
    return this.data.productos.filter(p => p.sedeId === sedeId);
  }

  public getProducto(sedeId: string, sku: string) {
    return this.data.productos.find(p => p.sedeId === sedeId && p.sku === sku);
  }

  public saveProducto(producto: Producto) {
    const index = this.data.productos.findIndex(
      p => p.sedeId === producto.sedeId && p.sku === producto.sku
    );
    if (index !== -1) {
      this.data.productos[index] = { ...producto, updatedAt: new Date().toISOString() };
    } else {
      this.data.productos.push({ ...producto, updatedAt: new Date().toISOString() });
    }
    this.save();
  }

  // Google Sheets simulation
  public getMockSheetRows(sedeId: string): GoogleSheetRow[] {
    return this.data.mockSheets[sedeId] || [];
  }

  public updateMockSheetRows(sedeId: string, rows: GoogleSheetRow[]) {
    this.data.mockSheets[sedeId] = rows;
    this.save();
  }

  // Audit Logs
  public getAuditLogs() {
    return this.data.auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public logAudit(audit: Omit<AuditLog, 'id' | 'timestamp'>) {
    const newLog: AuditLog = {
      id: 'aud-' + Math.random().toString(36).substr(2, 9),
      ...audit,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs.push(newLog);
    this.save();
    return newLog;
  }

  // Jobs
  public getJobs() {
    return this.data.jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getJob(id: string) {
    return this.data.jobs.find(j => j.id === id);
  }

  public createJob(job: Omit<Job, 'id' | 'status' | 'processedRows' | 'logs' | 'errorLogs' | 'createdAt'>) {
    const newJob: Job = {
      id: 'job-' + Math.random().toString(36).substr(2, 9),
      status: 'PENDING',
      processedRows: 0,
      logs: ['Trabajo creado y encolado en la cola asíncrona de base de datos.'],
      errorLogs: [],
      createdAt: new Date().toISOString(),
      ...job
    };
    this.data.jobs.push(newJob);
    this.save();
    return newJob;
  }

  public updateJob(id: string, updates: Partial<Job>) {
    const index = this.data.jobs.findIndex(j => j.id === id);
    if (index !== -1) {
      this.data.jobs[index] = { ...this.data.jobs[index], ...updates };
      this.save();
      return this.data.jobs[index];
    }
    return null;
  }

  public clearAllData() {
    this.data = { ...initialData, jobs: [], auditLogs: [] };
    this.save();
  }
}

export const db = new DBEngine();

// Run background job worker
setInterval(() => {
  const pendingJobs = db.getJobs().filter(j => j.status === 'PENDING');
  if (pendingJobs.length > 0) {
    // Process the oldest pending job
    const job = pendingJobs[pendingJobs.length - 1];
    processJobAsync(job);
  }
}, 3000);

async function processJobAsync(job: Job) {
  db.updateJob(job.id, {
    status: 'PROCESSING',
    logs: [...job.logs, `[${new Date().toLocaleTimeString()}] Iniciando procesamiento de tarea en worker asíncrono con bloqueo concurrente.`]
  });

  const payload = job.payload;
  const sede = db.getSede(job.sedeId);
  if (!sede) {
    db.updateJob(job.id, {
      status: 'ERROR',
      logs: [...job.logs, `[${new Date().toLocaleTimeString()}] Error: Sede no encontrada.`]
    });
    return;
  }

  // Simulate processing delay row-by-row
  const total = payload.length;
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < total; i++) {
    const row = payload[i];
    await new Promise(resolve => setTimeout(resolve, 600)); // Optical visual pacing

    const currentJobState = db.getJob(job.id);
    if (!currentJobState) break;

    const sku = row.sku || row.SKU;
    const barcode = row.barcode || row.BARCODE || '';
    const name = row.nombre || row.nombreProducto || row.NAME || '';
    const category = row.categoria || row.CATEGORY || 'General';
    const price = parseFloat(row.precioVenta || row.price || row.precio || '0');
    const cost = parseFloat(row.costo || row.cost || '0');
    const stock = parseInt(row.stock || row.stockEntrada || '0', 10);

    // Business validation rule check inside Worker
    const errors: string[] = [];
    if (!sku) errors.push('SKU vacío');
    if (price <= 0 && job.type !== 'ACTUALIZAR_CATEGORIA' && job.type !== 'ACTUALIZAR_COSTO' && job.type !== 'ACTUALIZAR_NOMBRE') errors.push('Precio debe ser mayor a 0');
    if (cost > price && price > 0) errors.push(`Precio de venta (${price}) menor al costo de adquisición (${cost}) - Margen negativo detectado`);

    const logPrefix = `[Fila ${i + 1}/${total} - SKU: ${sku || 'N/A'}]`;

    if (errors.length > 0) {
      failureCount++;
      const errorMsg = `${logPrefix} RECHAZADO: ${errors.join(', ')}`;
      db.updateJob(job.id, {
        processedRows: i + 1,
        logs: [...currentJobState.logs, errorMsg],
        errorLogs: [...currentJobState.errorLogs, errorMsg]
      });
    } else {
      successCount++;
      
      // Perform database updates depending on job type
      const originalProduct = db.getProducto(job.sedeId, sku);
      let details = '';
      let originalVal = '';
      let newVal = '';

      const updatedProduct: Producto = {
        sku,
        barcode: barcode || (originalProduct?.barcode || ''),
        nombre: name || (originalProduct?.nombre || ''),
        categoria: category || (originalProduct?.categoria || ''),
        precioVenta: isNaN(price) || price === 0 ? (originalProduct?.precioVenta || 0) : price,
        costo: isNaN(cost) || cost === 0 ? (originalProduct?.costo || 0) : cost,
        stock: originalProduct ? (job.type === 'ENTRADA_INVENTARIO' ? originalProduct.stock + stock : originalProduct.stock) : stock,
        sedeId: job.sedeId,
        updatedAt: new Date().toISOString()
      };

      if (job.type === 'INGRESO_DIA') {
        details = `Sincronización de ingreso del día. SKU: ${sku}, Stock actual: ${updatedProduct.stock}, Precio: S/ ${updatedProduct.precioVenta}`;
        originalVal = originalProduct ? `Stock: ${originalProduct.stock}, Precio: S/ ${originalProduct.precioVenta}` : 'Producto Nuevo';
        newVal = `Stock: ${updatedProduct.stock}, Precio: S/ ${updatedProduct.precioVenta}`;
      } else if (job.type === 'ACTUALIZAR_PRECIO') {
        details = `Actualización de precio de venta. SKU: ${sku}`;
        originalVal = originalProduct ? `S/ ${originalProduct.precioVenta}` : '0';
        newVal = `S/ ${price}`;
      } else if (job.type === 'ACTUALIZAR_CATEGORIA') {
        details = `Actualización de categoría. SKU: ${sku}`;
        originalVal = originalProduct?.categoria || 'Ninguna';
        newVal = category;
      } else if (job.type === 'ACTUALIZAR_COSTO') {
        details = `Actualización de costo de adquisición. SKU: ${sku}`;
        originalVal = originalProduct ? `S/ ${originalProduct.costo}` : '0';
        newVal = `S/ ${cost}`;
      } else if (job.type === 'ACTUALIZAR_NOMBRE') {
        details = `Actualización de nombre del producto. SKU: ${sku}`;
        originalVal = originalProduct?.nombre || 'Ninguno';
        newVal = name;
      } else if (job.type === 'ENTRADA_INVENTARIO') {
        details = `Incremento de stock (+${stock} unidades). SKU: ${sku}`;
        originalVal = originalProduct ? `${originalProduct.stock} unidades` : '0 unidades';
        newVal = `${updatedProduct.stock} unidades`;
      } else if (job.type === 'SYNC_MAESTRO') {
        details = `Sincronización con Base Maestra. SKU: ${sku}`;
        originalVal = originalProduct ? 'Catálogo Local' : 'Inexistente';
        newVal = 'Sincronizado';
      }

      // Save to database products catalog
      db.saveProducto(updatedProduct);

      // Save audit log
      db.logAudit({
        userEmail: job.userEmail,
        action: job.type,
        details,
        originalValue: originalVal,
        newValue: newVal,
        itemKey: sku
      });

      // Update mock sheet row state if it exists
      const mockRows = db.getMockSheetRows(job.sedeId);
      const sheetIndex = mockRows.findIndex(r => r.sku === sku);
      if (sheetIndex !== -1) {
        mockRows[sheetIndex].status = 'SINCRONIZADO';
        db.updateMockSheetRows(job.sedeId, mockRows);
      }

      db.updateJob(job.id, {
        processedRows: i + 1,
        logs: [...currentJobState.logs, `${logPrefix} PROCESADO CORRECTAMENTE en Tumisoft ERP. ${details}`]
      });
    }
  }

  // Update final state of the job
  const finalState = db.getJob(job.id);
  if (finalState) {
    const isCompletedWithError = failureCount === total;
    db.updateJob(job.id, {
      status: isCompletedWithError ? 'ERROR' : 'COMPLETED',
      completedAt: new Date().toISOString(),
      logs: [
        ...finalState.logs,
        `[${new Date().toLocaleTimeString()}] Tarea finalizada. Resultados: ${successCount} éxitos, ${failureCount} rechazos/errores.`
      ]
    });
  }
}
