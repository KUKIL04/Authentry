import express from 'express';
import cookieParser from 'cookie-parser';
import { CONFIG } from './config/constants.js';
import { requireAuth } from './middlewares/requireAuth.js';
import { AuthController } from './controllers/auth.controller.js';
import { PortalController } from './controllers/portal.controller.js';
import { WebhookController } from './controllers/webhook.controller.js';
import { authentry } from './services/authentry.service.js';

const app = express();

// ---> WEBHOOK RECEIVER (Delegated to Controller) <---
app.post(
  '/api/webhooks/authentry', 
  express.raw({ type: 'application/json' }), 
  authentry.webhooks.expressHandler(WebhookController.handleEvent)
);

app.use(cookieParser());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- Authentication Routes ---
app.get('/', AuthController.renderLogin);
app.get('/callback', AuthController.handleCallback);
app.get('/logout', AuthController.logout);

// --- Protected Quantum Ecom Routes ---
app.get('/portal/dashboard', requireAuth, PortalController.getDashboard);
app.post('/portal/invite', requireAuth, PortalController.inviteEmployee);

// --- Core HR Directory SDK Routes ---
app.post('/portal/directory/:userId/suspend', requireAuth, PortalController.suspendEmployee);
app.post('/portal/directory/:userId/sync', requireAuth, PortalController.syncEmployee);
app.get('/portal/directory/:userId/live', requireAuth, PortalController.fetchLiveEmployeeState);

// SCM Domain Routes
app.post('/portal/suppliers', requireAuth, PortalController.createSupplier);
app.delete('/portal/suppliers/:supplierId', requireAuth, PortalController.deleteSupplier);

app.post('/portal/inventory', requireAuth, PortalController.createInventoryItem);
app.delete('/portal/inventory/:itemId', requireAuth, PortalController.deleteInventoryItem);

app.post('/portal/shipments', requireAuth, PortalController.createShipment);
app.post('/portal/shipments/:shipmentId/status', requireAuth, PortalController.updateShipmentStatus);

app.listen(CONFIG.PORT, () => {
  console.log(`📦 SCM App running on http://localhost:${CONFIG.PORT}`);
});