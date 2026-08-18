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

/**
 * List all Google Sheets spreadsheets from the user's Google Drive
 */
export async function listUserSpreadsheets(accessToken: string): Promise<GoogleDriveFile[]> {
  const url = `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=30`;
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
 * Read rows/values from a specific Google Sheet range
 */
export async function getSheetValues(spreadsheetId: string, range: string, accessToken: string): Promise<string[][]> {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueRenderOption=FORMATTED_VALUE`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error al leer datos de la hoja: ${response.statusText}`);
  }

  const data = await response.json();
  return data.values || [];
}

/**
 * Update cell values in a Google Sheet
 */
export async function updateSheetValues(spreadsheetId: string, range: string, values: any[][], accessToken: string) {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error al actualizar datos en Google Sheets: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Append rows to a Google Sheet
 */
export async function appendSheetRows(spreadsheetId: string, range: string, values: any[][], accessToken: string) {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error al insertar filas en Google Sheets: ${response.statusText}`);
  }

  return await response.json();
}
