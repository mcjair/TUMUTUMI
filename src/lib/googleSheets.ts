/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface SheetRowData {
  values: string[];
}

export interface ParsedSheetProduct {
  rowId: number;
  block?: number;
  sku: string;
  barcode: string;
  nombre: string;
  categoria: string;
  stock: number;
  costo: number;
  precioVenta: number;
  status: 'REINGRESO' | 'NUEVO' | 'ERROR' | 'MODIFICADO';
  marginPercent: number;
  isValid: boolean;
  errors: string[];
}

/**
 * List all Google Sheets spreadsheets from the user's Google Drive
 */
export async function listUserSpreadsheets(accessToken: string): Promise<GoogleDriveFile[]> {
  const url = `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=50`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Error al listar archivos de Google Drive: ${response.statusText}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Get spreadsheet details and sheet names
 */
export async function getSpreadsheetDetails(spreadsheetId: string, accessToken: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error al acceder a la hoja de cálculo (${spreadsheetId}): ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Read rows/values from a specific Google Sheet range in REAL-TIME
 */
export async function getSheetValues(spreadsheetId: string, range: string, accessToken?: string | null): Promise<string[][]> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) return [];

  // Try direct browser client-side Google API v4 if token is present
  if (accessToken) {
    try {
      const encodedRange = encodeURIComponent(range);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}?valueRenderOption=FORMATTED_VALUE`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.values || [];
      }
    } catch (e) {
      console.warn('Client-side Google API fetch failed, trying backend live fetch...', e);
    }
  }

  // Use the backend live proxy route for real-time capture
  try {
    const parts = range.split('!');
    const sheetTab = parts.length === 2 ? parts[0] : '5-08';
    const cellRange = parts.length === 2 ? parts[1] : range;

    const proxyRes = await fetch('/api/google-sheets/realtime-fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheetId: cleanId,
        sheetTab,
        range: cellRange,
        googleToken: accessToken
      })
    });

    if (proxyRes.ok) {
      const result = await proxyRes.json();
      if (result.values && result.values.length > 0) {
        return result.values;
      }
    }
  } catch (err) {
    console.error('Backend live fetch failed:', err);
  }

  return [];
}

export const DEFAULT_MONTH_TABS = [
  '5-08', '5-08 PZ', '06-08', '6-08PZ', '7-08', '7-08 PZ', '08-08', '8-08 PZ',
  '09-08', '10-08', '10-08 PZ', '11-08', '11-08 PZ', '12-08', '12-08 PZ',
  '13-08', '13-08 PZ', '14-08', '14-08 PZ', '15-08', '15-08 PZ', '16-08',
  '17-08', '18-08', '19-08', '20-08', '21-08', '22-08', '23-08', '24-08',
  '25-08', '26-08', '27-08', '28-08', '29-08', '30-08', '31-08'
];

/**
 * Real-time discovery of spreadsheet tabs (e.g. ['5-08', '06-08', '7-08', '11-08 PZ', '14-08', '15-08', ...])
 */
export async function getSpreadsheetSheets(spreadsheetId: string, accessToken?: string | null): Promise<string[]> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) return DEFAULT_MONTH_TABS;

  // Try direct client-side Google API
  if (accessToken) {
    try {
      const details = await getSpreadsheetDetails(cleanId, accessToken);
      if (details.sheets && Array.isArray(details.sheets)) {
        const tabList = details.sheets.map((s: any) => s.properties?.title).filter(Boolean);
        if (tabList.length > 0) return tabList;
      }
    } catch (e) {
      console.warn('Direct tab fetch failed, checking backend tab finder...', e);
    }
  }

  // Try backend real-time tab explorer
  try {
    const res = await fetch('/api/google-sheets/tabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId: cleanId, googleToken: accessToken })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.tabs && data.tabs.length > 0) {
        return data.tabs;
      }
    }
  } catch (err) {
    console.error('Tab finder error:', err);
  }

  return DEFAULT_MONTH_TABS;
}

/**
 * Clean currency strings like "S/ 13.84", "S/9.0125", "15.50", "4,500.00" to float
 */
export function parseCurrencyOrNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val)
    .replace(/[S\/$\s]/g, '') // remove currency symbol and spaces
    .replace(/,/g, '') // remove thousand commas
    .trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Parses a raw spreadsheet matrix (including Peruvian multi-block side-by-side columns and dynamic headers)
 * e.g., Block 1 in cols 0-5, Block 2 in cols 8-13 as shown in the Royal Ingreso sheets.
 */
export function parseGoogleSheetMatrix(rawGrid: string[][]): ParsedSheetProduct[] {
  if (!rawGrid || rawGrid.length === 0) return [];

  const products: ParsedSheetProduct[] = [];
  let rowCounter = 1;

  // Search for header row if available
  let headerColMap: Record<string, number> | null = null;
  for (let r = 0; r < Math.min(10, rawGrid.length); r++) {
    const row = rawGrid[r] || [];
    const joined = row.join(' ').toUpperCase();
    if (joined.includes('PRODUCT') || joined.includes('COD') || joined.includes('PRECIO') || joined.includes('COSTO')) {
      headerColMap = {};
      row.forEach((cell, idx) => {
        const c = String(cell).toUpperCase().trim();
        if (c.includes('COD') || c.includes('SKU') || c.includes('ITEM')) headerColMap!['code'] = idx;
        else if (c.includes('BARCODE') || c.includes('BARRAS')) headerColMap!['barcode'] = idx;
        else if (c.includes('PRODUC') || c.includes('DESCRIP') || c.includes('NOMBRE')) headerColMap!['name'] = idx;
        else if (c.includes('CAT') || c.includes('FAMILIA') || c.includes('GRUPO')) headerColMap!['cat'] = idx;
        else if (c.includes('STOCK') || c.includes('CANT') || c.includes('TOTAL') || c.includes('UNID')) headerColMap!['stock'] = idx;
        else if (c.includes('COST')) headerColMap!['costo'] = idx;
        else if (c.includes('VENT') || c.includes('PRECIO') || c.includes('P.V')) headerColMap!['venta'] = idx;
      });
      break;
    }
  }

  // Search through rows
  for (let r = 0; r < rawGrid.length; r++) {
    const row = rawGrid[r];
    if (!row || row.length === 0) continue;

    // Check if this row is a header row (e.g. contains "CODIGO", "PRODUCTO", "TOTAL")
    const rowJoined = row.join(' ').toUpperCase();
    if ((rowJoined.includes('CODIGO') || rowJoined.includes('COD')) && (rowJoined.includes('PRODUCTO') || rowJoined.includes('DESCRIPCION'))) {
      continue; // Skip header row
    }

    // --- Process Block 1 (Left columns, typically cols 0-5: CODIGO, CATEGORIA, PRODUCTO, TOTAL, COSTO, VENTA) ---
    const b1_code = (row[0] || '').trim();
    const b1_cat = (row[1] || '').trim() || 'CONFITERIA';
    const b1_name = (row[2] || '').trim();
    const b1_stockStr = (row[3] || '').trim();
    const b1_costoStr = (row[4] || '').trim();
    const b1_ventaStr = (row[5] || '').trim();

    if (b1_name && b1_name !== 'PRODUCTO' && b1_name !== 'DESCRIPCION' && (b1_stockStr || b1_ventaStr || b1_costoStr)) {
      const stock = parseInt(b1_stockStr.replace(/[^0-9]/g, ''), 10) || 0;
      const costo = parseCurrencyOrNumber(b1_costoStr);
      const venta = parseCurrencyOrNumber(b1_ventaStr);
      const margin = venta > 0 ? ((venta - costo) / venta) * 100 : 0;

      const isReingreso = b1_code.toUpperCase().includes('REINGRESO') || (costo > 0 && stock > 0);
      const errors: string[] = [];
      if (venta <= 0) errors.push('Precio venta debe ser mayor a S/ 0');
      if (venta < costo && venta > 0) errors.push('El precio de venta es menor al costo con IGV');

      const cleanSku = (b1_code && !b1_code.toUpperCase().includes('REINGRESO') && !b1_code.toUpperCase().includes('NUEVO') && b1_code.length <= 25)
        ? b1_code
        : `TUMI-${String(products.length + 1).padStart(3, '0')}`;

      products.push({
        rowId: rowCounter++,
        block: 1,
        sku: cleanSku,
        barcode: `7750123400${String(products.length + 1).padStart(2, '0')}`,
        nombre: b1_name,
        categoria: b1_cat,
        stock,
        costo,
        precioVenta: venta,
        status: errors.length > 0 ? 'ERROR' : isReingreso ? 'REINGRESO' : 'NUEVO',
        marginPercent: Math.round(margin * 10) / 10,
        isValid: errors.length === 0,
        errors
      });
    }

    // --- Process Block 2 (Right columns, typically cols 8-13 if side-by-side: CODIGO, CATEGORIA, PRODUCTO, TOTAL, COSTO, VENTA) ---
    if (row.length > 8) {
      const b2_code = (row[8] || '').trim();
      const b2_cat = (row[9] || '').trim() || 'CONFITERIA';
      const b2_name = (row[10] || '').trim();
      const b2_stockStr = (row[11] || '').trim();
      const b2_costoStr = (row[12] || '').trim();
      const b2_ventaStr = (row[13] || '').trim();

      if (b2_name && b2_name !== 'PRODUCTO' && b2_name !== 'DESCRIPCION' && (b2_stockStr || b2_ventaStr || b2_costoStr)) {
        const stock = parseInt(b2_stockStr.replace(/[^0-9]/g, ''), 10) || 0;
        const costo = parseCurrencyOrNumber(b2_costoStr);
        const venta = parseCurrencyOrNumber(b2_ventaStr);
        const margin = venta > 0 ? ((venta - costo) / venta) * 100 : 0;

        const isReingreso = b2_code.toUpperCase().includes('REINGRESO') || (costo > 0 && stock > 0);
        const errors: string[] = [];
        if (venta <= 0) errors.push('Precio venta debe ser mayor a S/ 0');
        if (venta < costo && venta > 0) errors.push('El precio de venta es menor al costo con IGV');

        const cleanSku = (b2_code && !b2_code.toUpperCase().includes('REINGRESO') && !b2_code.toUpperCase().includes('NUEVO') && b2_code.length <= 25)
          ? b2_code
          : `TUMI-${String(products.length + 1).padStart(3, '0')}`;

        products.push({
          rowId: rowCounter++,
          block: 2,
          sku: cleanSku,
          barcode: `7750123400${String(products.length + 1).padStart(2, '0')}`,
          nombre: b2_name,
          categoria: b2_cat,
          stock,
          costo,
          precioVenta: venta,
          status: errors.length > 0 ? 'ERROR' : isReingreso ? 'REINGRESO' : 'NUEVO',
          marginPercent: Math.round(margin * 10) / 10,
          isValid: errors.length === 0,
          errors
        });
      }
    }
  }

  return products;
}

/**
 * Extract Google Spreadsheet ID from a URL or raw ID
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const clean = input.trim();
  const match = clean.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return clean;
}


