import { renderDashboard } from '../views/dashboard.view.js';
import { authentry } from '../services/authentry.service.js';
import { pool } from '../config/db.js';

const checkFeatureAccess = (session, moduleName) => {
  const targetFeature = moduleName.toLowerCase();
  let accessLevel = null;
  if (session?.entitlements) {
    for (const app of Object.values(session.entitlements)) {
      if (app[targetFeature]) {
        accessLevel = app[targetFeature];
        break;
      }
    }
  }
  return { hasAccess: !!accessLevel, canWrite: accessLevel === 'WRITE' };
};

export class PortalController {
  static async getDashboard(req, res) {
    const session = req.session; 
    const tenantId = session.tenantId;
    
    // 🛡️ Notice: We completely removed the custom role checks!
    // The App only cares about the Module Matrix capabilities.
    const rbac = {
      procurement: checkFeatureAccess(session, 'Procurement'),
      warehouse: checkFeatureAccess(session, 'Warehouse'),
      logistics: checkFeatureAccess(session, 'Logistics'),
      directory: checkFeatureAccess(session, 'Core HR Directory'),
      isAdmin: session.isAdmin // Global tenant admin flag
    };

    const viewData = { rbac, session, suppliers: [], inventory: [], shipments: [], auditLogs: [], employees: [] };

    if (rbac.procurement.hasAccess) {
      const supRes = await pool.query('SELECT * FROM suppliers WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5', [tenantId]);
      viewData.suppliers = supRes.rows;
    }

    if (rbac.warehouse.hasAccess) {
      const invRes = await pool.query('SELECT * FROM inventory_items WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5', [tenantId]);
      viewData.inventory = invRes.rows;
    }

    if (rbac.logistics.hasAccess) {
      const shipRes = await pool.query('SELECT * FROM shipments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5', [tenantId]);
      viewData.shipments = shipRes.rows;
    }

    if (rbac.directory.hasAccess) {
      const empRes = await pool.query('SELECT * FROM local_employees WHERE tenant_id = $1 ORDER BY first_name ASC', [tenantId]);
      viewData.employees = empRes.rows;
    }

    res.send(renderDashboard(viewData));
  }

  // --- PROCUREMENT LOGIC ---
  static async createSupplier(req, res) {
    const { tenantId } = req.session;
    const access = checkFeatureAccess(req.session, 'Procurement');
    
    if (!access.canWrite) return res.status(403).send('WRITE access required for Procurement.');

    try {
      await pool.query('INSERT INTO suppliers (tenant_id, name, contact_email) VALUES ($1, $2, $3)', [tenantId, req.body.name, req.body.contactEmail]);
      res.redirect('/portal/dashboard');
    } catch (err) {
      res.status(500).send('Database Error: Contact email might already exist.');
    }
  }

  static async deleteSupplier(req, res) {
    const { tenantId } = req.session;
    const access = checkFeatureAccess(req.session, 'Procurement');
    
    if (!access.canWrite) return res.status(403).json({ success: false, error: 'Unauthorized' });

    try {
      const result = await pool.query('DELETE FROM suppliers WHERE id = $1 AND tenant_id = $2 RETURNING id', [req.params.supplierId, tenantId]);
      return res.json({ success: result.rowCount > 0 });
    } catch (err) {
      return res.status(500).json({ success: false });
    }
  }

  // --- WAREHOUSE LOGIC ---
  static async createInventoryItem(req, res) {
    const { tenantId } = req.session;
    const access = checkFeatureAccess(req.session, 'Warehouse');
    
    if (!access.canWrite) return res.status(403).send('WRITE access required.');

    try {
      await pool.query('INSERT INTO inventory_items (tenant_id, sku, name, quantity, location) VALUES ($1, $2, $3, $4, $5)', 
        [tenantId, req.body.sku, req.body.name, req.body.quantity, req.body.location]);
      res.redirect('/portal/dashboard');
    } catch (err) { res.status(500).send('Database Error'); }
  }

  static async deleteInventoryItem(req, res) {
    const { tenantId } = req.session;
    const access = checkFeatureAccess(req.session, 'Warehouse');
    
    if (!access.canWrite) return res.status(403).json({ success: false });

    try {
      const result = await pool.query('DELETE FROM inventory_items WHERE id = $1 AND tenant_id = $2 RETURNING id', [req.params.itemId, tenantId]);
      return res.json({ success: result.rowCount > 0 });
    } catch (err) { return res.status(500).json({ success: false }); }
  }

  // --- LOGISTICS LOGIC ---
  static async createShipment(req, res) {
    const { tenantId } = req.session;
    const access = checkFeatureAccess(req.session, 'Logistics');
    
    if (!access.canWrite) return res.status(403).send('WRITE access required.');

    try {
      await pool.query('INSERT INTO shipments (tenant_id, tracking_number, destination) VALUES ($1, $2, $3)', 
        [tenantId, req.body.trackingNumber, req.body.destination]);
      res.redirect('/portal/dashboard');
    } catch (err) { res.status(500).send('Database Error'); }
  }

  static async updateShipmentStatus(req, res) {
    const { tenantId, userId } = req.session;
    const access = checkFeatureAccess(req.session, 'Logistics');
    
    if (!access.canWrite) return res.status(403).json({ success: false });

    try {
      const result = await pool.query(
        'UPDATE shipments SET status = $1, handler_id = $2 WHERE id = $3 AND tenant_id = $4 RETURNING id', 
        [req.body.status, userId, req.params.shipmentId, tenantId]
      );
      return res.json({ success: result.rowCount > 0 });
    } catch (err) { return res.status(500).json({ success: false }); }
  }

  // --- SDK INTEGRATION METHODS ---
  static async inviteEmployee(req, res) {
    if (!req.session.isAdmin) return res.status(403).send('Unauthorized. Only Admins can invite staff.');
    try {
      const data = await authentry.directory.inviteUser(req.body.email, 24); 
      res.send(`<script>alert("${data.existingUser ? data.message : 'Invite dispatched via SDK!'}"); window.location.href="/portal/dashboard";</script>`);
    } catch (error) {
      res.send(`<script>alert("Notice: ${error.response?.data?.error || error.message}"); window.location.href="/portal/dashboard";</script>`);
    }
  }

  static async suspendEmployee(req, res) {
    const directoryAccess = checkFeatureAccess(req.session, 'Core HR Directory');
    if (!directoryAccess.canWrite) return res.status(403).json({ success: false });
    
    try {
      await authentry.directory.suspendUser(req.params.userId, req.session.tenantId);
      await pool.query("UPDATE local_employees SET status = 'SUSPENDED' WHERE id = $1 AND tenant_id = $2", [req.params.userId, req.session.tenantId]);
      return res.json({ success: true, message: 'Employee suspended.' });
    } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
  }

  static async syncEmployee(req, res) {
    const directoryAccess = checkFeatureAccess(req.session, 'Core HR Directory');
    if (!directoryAccess.canWrite) return res.status(403).json({ success: false });

    try {
      await authentry.directory.syncUser(req.params.userId, req.session.tenantId);
      return res.json({ success: true, message: 'Forced sync dispatched.' });
    } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
  }

  static async fetchLiveEmployeeState(req, res) {
    const directoryAccess = checkFeatureAccess(req.session, 'Core HR Directory');
    if (!directoryAccess.hasAccess) return res.status(403).json({ success: false });

    try {
      const liveUser = await authentry.directory.getUser(req.params.userId, req.session.tenantId);
      return res.json({ success: true, user: liveUser });
    } catch (error) { return res.status(500).json({ success: false, error: error.message }); }
  }
}