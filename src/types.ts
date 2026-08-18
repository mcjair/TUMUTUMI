/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operador';
}

export interface Sede {
  id: string;
  name: string;
  ruc: string;
  address: string;
  googleSheetId: string;
  googleSheetRange: string;
  isActive: boolean;
  token?: string;
  isMockEnabled: boolean;
}

export interface Producto {
  sku: string;
  barcode: string;
  nombre: string;
  categoria: string;
  precioVenta: number;
  costo: number;
  stock: number;
  sedeId: string;
  updatedAt: string;
}

export type JobType =
  | 'INGRESO_DIA'
  | 'ACTUALIZAR_PRECIO'
  | 'ACTUALIZAR_CATEGORIA'
  | 'ACTUALIZAR_COSTO'
  | 'ACTUALIZAR_NOMBRE'
  | 'ENTRADA_INVENTARIO'
  | 'SYNC_MAESTRO'
  | 'SCRAPE_MAESTRO';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  sedeId: string;
  payload: any;
  totalRows: number;
  processedRows: number;
  logs: string[];
  errorLogs: string[];
  userEmail: string;
  createdAt: string;
  completedAt?: string;
}

export interface AuditLog {
  id: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
  originalValue?: string;
  newValue?: string;
  itemKey?: string;
}

export interface GoogleSheetRow {
  rowId: number;
  sku: string;
  barcode: string;
  nombre: string;
  categoria: string;
  precioVenta: number;
  costo: number;
  stock: number;
  status: string; // 'NUEVO' | 'REINGRESO' | 'VALIDO' | 'ERROR'
  errors?: string[];
  isValid?: boolean;
}
