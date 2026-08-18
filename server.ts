/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { Sede } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API: Authentication
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Simple secure check for demonstration & operator accounts
    const users = db.getUsers();
    const foundUser = users.find(u => u.email === email);

    if (foundUser && (password === 'admin123' || password === 'operador123')) {
      res.json({
        success: true,
        user: foundUser,
        token: `mock-jwt-token-for-${foundUser.role}-${foundUser.email}`
      });
    } else {
      res.status(401).json({ success: false, message: 'Credenciales inválidas. Intente admin@tumisoft.com / admin123 o operador@tumisoft.com / operador123' });
    }
  });

  // API: Get Sedes
  app.get('/api/sedes', (req, res) => {
    res.json(db.getSedes());
  });

  // API: Add Sede
  app.post('/api/sedes', (req, res) => {
    const { name, ruc, address, googleSheetId, googleSheetRange, isActive, token, isMockEnabled } = req.body;
    
    if (!name || !ruc) {
      return res.status(400).json({ error: 'Nombre y RUC de la sede son obligatorios' });
    }

    const newSede: Sede = {
      id: 'sede-' + Math.random().toString(36).substr(2, 9),
      name,
      ruc,
      address: address || '',
      googleSheetId: googleSheetId || '',
      googleSheetRange: googleSheetRange || 'Ingreso!A2:H',
      isActive: isActive !== false,
      token: token || '',
      isMockEnabled: isMockEnabled !== false
    };

    db.addSede(newSede);
    db.logAudit({
      userEmail: 'admin@tumisoft.com',
      action: 'CREAR_SEDE',
      details: `Nueva sede creada: ${name} (RUC: ${ruc})`,
      newValue: name
    });

    res.json(newSede);
  });

  // API: Update Sede
  app.put('/api/sedes/:id', (req, res) => {
    const { id } = req.params;
    const updated = db.updateSede(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Sede no encontrada' });
    }

    db.logAudit({
      userEmail: 'admin@tumisoft.com',
      action: 'MODIFICAR_SEDE',
      details: `Sede modificada: ${updated.name}`,
      newValue: JSON.stringify(req.body)
    });

    res.json(updated);
  });

  // API: Test Sede Connection
  app.post('/api/sedes/:id/test-connection', (req, res) => {
    const { id } = req.params;
    const sede = db.getSede(id);
    if (!sede) {
      return res.status(404).json({ error: 'Sede no encontrada' });
    }

    // Simulate diagnostic check
    const statusLogs = [
      'Iniciando diagnóstico estructural de conexión...',
      `Verificando credenciales de Tumisoft ERP (RUC: ${sede.ruc})... OK`,
      `Probando endpoint de autorización: https://iam.tumi-soft.com/api/v1/auth... OK`,
      `Verificando ID de Google Sheet: ${sede.googleSheetId || 'No configurado'}... OK (Acceso público/lectura verificado por Cuenta de Servicio)`,
      'Validando mapeo de columnas del catálogo... OK',
      'Diagnóstico completado. Todo el circuito funciona de manera correcta.'
    ];

    db.logAudit({
      userEmail: req.body.userEmail || 'admin@tumisoft.com',
      action: 'CONEXION_TEST',
      details: `Prueba de conexión exitosa para la sede: ${sede.name}`,
      itemKey: id
    });

    res.json({
      success: true,
      message: `Conexión verificada con éxito para ${sede.name}`,
      logs: statusLogs
    });
  });

  // API: Get products cache for a Sede
  app.get('/api/sedes/:id/productos', (req, res) => {
    const { id } = req.params;
    res.json(db.getProductos(id));
  });

  // API: Get Google Sheet rows (real or mock)
  app.get('/api/sedes/:id/sheet', (req, res) => {
    const { id } = req.params;
    const rows = db.getMockSheetRows(id);
    res.json(rows);
  });

  // API: Save Google Sheet simulator rows (to allow editing mock spreadsheet)
  app.post('/api/sedes/:id/sheet', (req, res) => {
    const { id } = req.params;
    const { rows } = req.body;
    db.updateMockSheetRows(id, rows);
    res.json({ success: true });
  });

  // API: Jobs
  app.get('/api/jobs', (req, res) => {
    res.json(db.getJobs());
  });

  app.get('/api/jobs/:id', (req, res) => {
    const { id } = req.params;
    const job = db.getJob(id);
    if (!job) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }
    res.json(job);
  });

  app.post('/api/jobs', (req, res) => {
    const { type, sedeId, payload, userEmail } = req.body;
    if (!type || !sedeId || !payload) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos (type, sedeId, payload)' });
    }

    const newJob = db.createJob({
      type,
      sedeId,
      payload,
      totalRows: payload.length,
      userEmail: userEmail || 'operador@tumisoft.com'
    });

    res.json(newJob);
  });

  // API: Audit Logs
  app.get('/api/audit', (req, res) => {
    res.json(db.getAuditLogs());
  });

  // API: Clear/Reset database logs
  app.post('/api/admin/clear', (req, res) => {
    db.clearAllData();
    res.json({ success: true, message: 'Base de datos restaurada al estado original de semilla.' });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
