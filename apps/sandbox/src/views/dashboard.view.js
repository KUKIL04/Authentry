export const renderDashboard = ({ session, rbac, employees = [], suppliers = [], inventory = [], shipments = [], auditLogs = [] }) => `
  <div style="font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; min-height: 100vh; margin: 0; padding: 40px;">
    <div style="max-width: 1400px; margin: 0 auto;">
      
      <!-- HEADER -->
      <header style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 24px 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 32px; border: 1px solid #e2e8f0;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 48px; height: 48px; background: #4f46e5; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">📦</div>
          <div>
            <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 800;">SCM Workspace</h1>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px; font-weight: 500;">
              ${session.tenantName} 
            </p>
          </div>
        </div>
        <div style="text-align: right;">
          <strong style="color: #1e293b; font-size: 16px;">${session.firstName} ${session.lastName}</strong><br/>
          <span style="font-size: 11px; color: #4f46e5; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; background: #e0e7ff; padding: 4px 8px; border-radius: 6px; display: inline-block; margin-top: 6px;">
            ${session.roles?.join(', ') || 'Staff Member'}
          </span>
          <br/>
          <a href="/logout" style="color: #ef4444; font-size: 12px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 12px;">Secure Logout</a>
        </div>
      </header>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
        
        <!-- MAIN CONTENT AREA -->
        <div style="display: flex; flex-direction: column; gap: 24px;">

          <!-- PROCUREMENT MANAGEMENT -->
          <div style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <h3 style="margin: 0; color: #0f172a; font-size: 18px;">🤝 Procurement & Suppliers</h3>
              ${rbac.procurement.canWrite ? `<span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Write Access</span>` : `<span style="background: #f1f5f9; color: #64748b; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Read-Only</span>`}
            </div>
            
            ${rbac.procurement.hasAccess ? `
              ${rbac.procurement.canWrite ? `
                <form action="/portal/suppliers" method="POST" style="display: flex; gap: 12px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
                  <input type="text" name="name" placeholder="Supplier Name" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; flex: 1; outline: none;"/>
                  <input type="email" name="contactEmail" placeholder="Contact Email" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; flex: 1; outline: none;"/>
                  <button type="submit" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">Add Supplier</button>
                </form>
              ` : ''}
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b; text-align: left;">
                    <th style="padding: 12px 8px;">Supplier Name</th>
                    <th style="padding: 12px 8px;">Contact Email</th>
                    <th style="padding: 12px 8px;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${suppliers.map(sup => `
                    <tr style="border-bottom: 1px solid #f1f5f9;" id="sup-${sup.id}">
                      <td style="padding: 16px 8px;"><strong style="color: #0f172a;">${sup.name}</strong></td>
                      <td style="padding: 16px 8px; color: #64748b;">${sup.contact_email}</td>
                      <td style="padding: 16px 8px;">
                        <button onclick="deleteRow('/portal/suppliers/${sup.id}', 'sup-${sup.id}', this)" 
                          ${!rbac.procurement.canWrite ? 'disabled' : ''} 
                          style="background: ${rbac.procurement.canWrite ? '#fee2e2' : '#f1f5f9'}; color: ${rbac.procurement.canWrite ? '#ef4444' : '#94a3b8'}; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: ${rbac.procurement.canWrite ? 'pointer' : 'not-allowed'};">
                          Remove
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : lockedWidget('Procurement')}
          </div>

          <!-- WAREHOUSE MANAGEMENT -->
          <div style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <h3 style="margin: 0; color: #0f172a; font-size: 18px;">🏭 Warehouse Inventory</h3>
              ${rbac.warehouse.canWrite ? `<span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Write Access</span>` : `<span style="background: #f1f5f9; color: #64748b; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Read-Only</span>`}
            </div>
            
            ${rbac.warehouse.hasAccess ? `
              ${rbac.warehouse.canWrite ? `
                <form action="/portal/inventory" method="POST" style="display: flex; gap: 12px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
                  <input type="text" name="sku" placeholder="SKU" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; flex: 1; outline: none;"/>
                  <input type="text" name="name" placeholder="Item Name" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; flex: 2; outline: none;"/>
                  <input type="number" name="quantity" placeholder="Qty" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; width: 80px; outline: none;"/>
                  <input type="text" name="location" placeholder="Aisle/Bin" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; flex: 1; outline: none;"/>
                  <button type="submit" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">Add Stock</button>
                </form>
              ` : ''}
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b; text-align: left;">
                    <th style="padding: 12px 8px;">SKU</th>
                    <th style="padding: 12px 8px;">Item Details</th>
                    <th style="padding: 12px 8px;">Location</th>
                    <th style="padding: 12px 8px;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${inventory.map(item => `
                    <tr style="border-bottom: 1px solid #f1f5f9;" id="inv-${item.id}">
                      <td style="padding: 16px 8px; font-family: monospace; font-weight: bold;">${item.sku}</td>
                      <td style="padding: 16px 8px;"><strong style="color: #0f172a;">${item.name}</strong><br/><span style="color: #64748b;">${item.quantity} Units</span></td>
                      <td style="padding: 16px 8px;">${item.location}</td>
                      <td style="padding: 16px 8px;">
                        <button onclick="deleteRow('/portal/inventory/${item.id}', 'inv-${item.id}', this)" 
                          ${!rbac.warehouse.canWrite ? 'disabled' : ''} 
                          style="background: ${rbac.warehouse.canWrite ? '#fee2e2' : '#f1f5f9'}; color: ${rbac.warehouse.canWrite ? '#ef4444' : '#94a3b8'}; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: ${rbac.warehouse.canWrite ? 'pointer' : 'not-allowed'};">
                          Remove
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : lockedWidget('Warehouse Inventory')}
          </div>

          <!-- LOGISTICS MANAGEMENT -->
          <div style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <h3 style="margin: 0; color: #0f172a; font-size: 18px;">🚚 Outbound Logistics</h3>
              ${rbac.logistics.canWrite ? `<span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Write Access</span>` : `<span style="background: #f1f5f9; color: #64748b; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Read-Only</span>`}
            </div>
            
            ${rbac.logistics.hasAccess ? `
              ${rbac.logistics.canWrite ? `
                <form action="/portal/shipments" method="POST" style="display: flex; gap: 12px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
                  <input type="text" name="trackingNumber" placeholder="Tracking Number" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; flex: 1; outline: none;"/>
                  <input type="text" name="destination" placeholder="Destination Address" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; flex: 2; outline: none;"/>
                  <button type="submit" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">Dispatch</button>
                </form>
              ` : ''}
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b; text-align: left;">
                    <th style="padding: 12px 8px;">Tracking No.</th>
                    <th style="padding: 12px 8px;">Destination</th>
                    <th style="padding: 12px 8px;">Status</th>
                    <th style="padding: 12px 8px;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${shipments.map(ship => `
                    <tr style="border-bottom: 1px solid #f1f5f9;" id="ship-${ship.id}">
                      <td style="padding: 16px 8px; font-family: monospace; font-weight: bold;">${ship.tracking_number}</td>
                      <td style="padding: 16px 8px; color: #334155;">${ship.destination}</td>
                      <td style="padding: 16px 8px;" id="ship-stat-${ship.id}">
                        <span style="background: ${ship.status === 'DELIVERED' ? '#dcfce7' : (ship.status === 'IN_TRANSIT' ? '#e0e7ff' : '#fef3c7')}; color: ${ship.status === 'DELIVERED' ? '#166534' : (ship.status === 'IN_TRANSIT' ? '#3730a3' : '#92400e')}; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; border: 1px solid rgba(0,0,0,0.1);">
                          ${ship.status}
                        </span>
                      </td>
                      <td style="padding: 16px 8px; display: flex; gap: 8px;">
                        <button onclick="updateStatus('/portal/shipments/${ship.id}/status', 'IN_TRANSIT', 'ship-stat-${ship.id}', this)" 
                          ${!rbac.logistics.canWrite || ship.status !== 'PENDING' ? 'disabled' : ''} 
                          style="background: ${rbac.logistics.canWrite && ship.status === 'PENDING' ? '#e0e7ff' : '#f1f5f9'}; color: ${rbac.logistics.canWrite && ship.status === 'PENDING' ? '#4f46e5' : '#94a3b8'}; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: ${rbac.logistics.canWrite && ship.status === 'PENDING' ? 'pointer' : 'not-allowed'};">
                          Transit
                        </button>

                        <button onclick="updateStatus('/portal/shipments/${ship.id}/status', 'DELIVERED', 'ship-stat-${ship.id}', this)" 
                          ${!rbac.logistics.canWrite || ship.status === 'DELIVERED' ? 'disabled' : ''} 
                          style="background: ${rbac.logistics.canWrite && ship.status !== 'DELIVERED' ? '#dcfce7' : '#f1f5f9'}; color: ${rbac.logistics.canWrite && ship.status !== 'DELIVERED' ? '#166534' : '#94a3b8'}; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: ${rbac.logistics.canWrite && ship.status !== 'DELIVERED' ? 'pointer' : 'not-allowed'};">
                          Deliver
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : lockedWidget('Outbound Logistics')}
          </div>

        </div>

        <!-- SIDEBAR AREA -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          
          <!-- CORE HR DIRECTORY -->
          <div style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0;">
             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
               <h3 style="margin: 0; color: #0f172a; font-size: 16px;">👥 Workspace Members</h3>
               ${rbac.directory.canWrite ? `<span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: bold; text-transform: uppercase;">HR Admin</span>` : ''}
             </div>
             
             ${rbac.directory.hasAccess ? `
               <div style="display: flex; flex-direction: column; gap: 12px;">
                 ${employees.map(emp => `
                   <div style="display: flex; flex-direction: column; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
                     <div style="display: flex; justify-content: space-between; align-items: center;">
                       <div>
                         <strong style="color: #1e293b; font-size: 13px;">${emp.first_name} ${emp.last_name}</strong>
                         <div style="color: #64748b; font-size: 11px;">${emp.email}</div>
                       </div>
                       <span style="width: 8px; height: 8px; border-radius: 50%; background: ${emp.status === 'ACTIVE' ? '#10b981' : '#ef4444'}; box-shadow: 0 0 4px ${emp.status === 'ACTIVE' ? '#10b981' : '#ef4444'};" title="${emp.status}"></span>
                     </div>
                     
                     ${rbac.directory.canWrite ? `
                       <div style="display: flex; gap: 8px; margin-top: 4px;">
                         <button onclick="viewLiveProfile('${emp.id}', this)" style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer; color: #475569; transition: all 0.2s;">🔍 Live State</button>
                         <button onclick="syncEmployee('${emp.id}', this)" style="background: #e0e7ff; border: 1px solid #c7d2fe; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer; color: #3730a3; transition: all 0.2s;">🔄 Force Sync</button>
                         ${emp.status === 'ACTIVE' ? `<button onclick="suspendEmployee('${emp.id}', this)" style="background: #fee2e2; border: 1px solid #fecaca; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer; color: #991b1b; transition: all 0.2s;">🛑 Suspend</button>` : `<span style="font-size: 10px; font-weight: bold; color: #ef4444; padding: 4px 8px;">Suspended</span>`}
                       </div>
                     ` : ''}
                   </div>
                 `).join('')}
               </div>
             ` : lockedWidget('Member Directory')}
          </div>

        </div>
      </div>
    </div>
  </div>
  
  <script>
    // Universal Fetch Helper for DOM manipulation
    window.deleteRow = async function(endpoint, rowId, btn) {
      if(!confirm("Are you sure?")) return;
      
      const originalText = btn.innerHTML;
      btn.innerHTML = '⏳ ...';
      btn.disabled = true;
      btn.style.opacity = '0.7';

      try {
        const res = await fetch(endpoint, { method: 'DELETE' });
        if ((await res.json()).success) {
          document.getElementById(rowId).remove();
        } else {
          alert("Failed to delete record.");
          btn.innerHTML = originalText;
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      } catch(e) {
        alert("Network error occurred.");
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    };
    
    window.updateStatus = async function(endpoint, status, statusCellId, btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '⏳ ...';
      btn.disabled = true;
      btn.style.opacity = '0.7';

      try {
        const res = await fetch(endpoint, { 
          method: 'POST', 
          headers: {'Content-Type': 'application/json'}, 
          body: JSON.stringify({status}) 
        });
        
        if ((await res.json()).success) {
          // Force a rapid page reload. This guarantees that your Server-Side Rendered 
          // RBAC logic correctly disables the Transit/Deliver buttons based on the new status!
          window.location.reload(); 
        } else {
          alert("Failed to update shipment status.");
          btn.innerHTML = originalText;
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      } catch(e) {
        alert("Network error occurred.");
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    };

    // --- SDK M2M INTEGRATION HELPERS ---
    
    window.viewLiveProfile = async function(userId, btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '⏳ Fetching...';
      btn.disabled = true;
      btn.style.opacity = '0.7';

      try {
        const res = await fetch('/portal/directory/' + userId + '/live');
        const data = await res.json();
        if (data.success) {
          // 🚨 ESCAPED NEWLINES (\\n\\n) prevents the HTML script syntax error!
          alert("⚡ LIVE IDP STATE:\\n\\n" + JSON.stringify(data.user, null, 2));
        } else {
          alert("Notice: " + data.error);
        }
      } catch(e) { 
        alert("Failed to fetch live state via M2M SDK."); 
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    };

    window.syncEmployee = async function(userId, btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '⏳ Syncing...';
      btn.disabled = true;
      btn.style.opacity = '0.7';

      try {
        const res = await fetch('/portal/directory/' + userId + '/sync', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert("✅ " + data.message);
        } else {
          alert("Notice: " + data.error);
        }
      } catch(e) { 
        alert("Failed to dispatch sync via M2M SDK."); 
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    };

    window.suspendEmployee = async function(userId, btn) {
      if(!confirm("Are you sure you want to suspend this user? This will instantly terminate their session and lock them out of the App.")) return;
      
      const originalText = btn.innerHTML;
      btn.innerHTML = '⏳ Suspending...';
      btn.disabled = true;
      btn.style.opacity = '0.7';

      try {
        const res = await fetch('/portal/directory/' + userId + '/suspend', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert("🛑 " + data.message);
          window.location.reload(); // Refresh to update the UI badge
        } else {
          alert("Notice: " + data.error);
          btn.innerHTML = originalText;
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      } catch(e) { 
        alert("Failed to suspend user via M2M SDK."); 
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    };
  </script>
`;

const lockedWidget = (title) => `
  <div style="padding: 32px; background: #f8fafc; border-radius: 12px; text-align: center; border: 1px dashed #cbd5e1;">
    <div style="font-size: 24px; margin-bottom: 12px; opacity: 0.5;">🔒</div>
    <h4 style="margin: 0 0 8px 0; color: #475569;">${title} Locked</h4>
    <p style="margin: 0; font-size: 12px; color: #94a3b8;">You do not have the required entitlement bundle.</p>
  </div>
`;