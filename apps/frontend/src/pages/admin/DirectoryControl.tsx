import React, { useState, useEffect, useRef } from 'react';
import { AdminAPI } from '../../api/admin.api';
import { useAuth } from '../../hooks/useAuth';
import { useDropzone } from 'react-dropzone';
import { Users, Loader2, Activity, Ban, KeyRound, ShieldAlert, AlertTriangle, X, UserX, UserCheck, RefreshCcw, Search, Download, Columns, Eye, UploadCloud, Phone, Mail, CheckCircle2, Check, Edit3, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DirectoryControl() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [schema, setSchema] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const [syncingUserId, setSyncingUserId] = useState<string | null>(null);
  const [isSyncingWorkspace, setIsSyncingWorkspace] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const [drawerUser, setDrawerUser] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3 | 4>(1);
  const [importedHeaders, setImportedHeaders] = useState<string[]>([]);
  const [importedRows, setImportedRows] = useState<any[]>([]);
  const [emailMapping, setEmailMapping] = useState<string>('');
  const [firstNameMapping, setFirstNameMapping] = useState<string>('');
  const [lastNameMapping, setLastNameMapping] = useState<string>('');
  const [employeeIdMapping, setEmployeeIdMapping] = useState<string>('');
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({});

  const [editingEmpId, setEditingEmpId] = useState(false);
  const [draftEmpId, setDraftEmpId] = useState('');
  const [isSavingEmpId, setIsSavingEmpId] = useState(false);

  const [importResults, setImportResults] = useState<{ successCount: number; failureCount: number; errors: string[] } | null>(null);

  const [userRoleSelections, setUserRoleSelections] = useState<Record<string, string[]>>({});
  const [openImportDropdownId, setOpenImportDropdownId] = useState<string | null>(null);
  const importDropdownRef = useRef<HTMLDivElement>(null);

  const exportMenuRef = useRef<HTMLDivElement>(null);
 
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  const [roles, setRoles] = useState<any[]>([]);
  const [mappedPreview, setMappedPreview] = useState<any[]>([]);


  const [modal, setModal] = useState<{ 
    isOpen: boolean; type: 'RESET' | 'UNLOCK' | 'TOGGLE_STATUS' | null; user: any | null;
  }>({ isOpen: false, type: null, user: null });

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(event.target as Node)) {
        setIsColumnsMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (importDropdownRef.current && !importDropdownRef.current.contains(event.target as Node)) {
        setOpenImportDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenDrawer = (user: any) => {
    setDrawerUser(user);
    setEditingEmpId(false);
    setDraftEmpId('');
    setTimeout(() => setIsDrawerOpen(true), 10); 
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setDrawerUser(null), 300); 
  };

  // FETCHES BOTH USERS AND SCHEMA CONCURRENTLY
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, schemaRes] = await Promise.all([
        AdminAPI.getUsers(),
        AdminAPI.getOnboardingSchema()
      ]);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setSchema(schemaRes.schema || []);
    } catch (err) {
      notify('error', 'Failed to fetch directory data.');
    } finally {
      setIsLoading(false);
    }
  };

  const notify = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const executeSecurityAction = async () => {
    if (!modal.type) return;
    setIsProcessing(true);
    try {
      if (!modal.user) return;
      if (modal.type === 'RESET') {
        await AdminAPI.triggerPasswordReset(modal.user.id);
        notify('success', 'Credentials invalidated. User notified.');
      } else if (modal.type === 'UNLOCK') {
        await AdminAPI.clearSecurityLockout(modal.user.id);
        notify('success', 'Security lockout cleared. User can login.');
      } else if (modal.type === 'TOGGLE_STATUS') {
        const newStatus = modal.user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        await AdminAPI.updateUserStatus(modal.user.id, newStatus);
        notify('success', `User account status updated to ${newStatus}`);
        fetchData();
      }
      setModal({ isOpen: false, type: null, user: null });
    } catch (err: any) {
        notify('error', err.response?.data?.error || `Failed to execute ${modal.type} action`);
        setModal({ isOpen: false, type: null, user: null });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleColumn = (fieldId: string) => {
    setVisibleColumns(prev => 
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };

  // THE OMNI-SEARCH ENGINE
  const managedUsers = users.filter(u => u.status !== 'PENDING');
  const filteredUsers = managedUsers.filter(u => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    
    // Search standard fields
    if (u.first_name?.toLowerCase().includes(query)) return true;
    if (u.last_name?.toLowerCase().includes(query)) return true;
    if (u.email?.toLowerCase().includes(query)) return true;
    if (u.mobile_no?.toLowerCase().includes(query)) return true;
    
    // Search deep inside JSON custom data!
    if (u.custom_profile_data) {
      return Object.values(u.custom_profile_data).some(val => 
        String(val).toLowerCase().includes(query)
      );
    }
    return false;
  });

  const handleSaveEmpId = async () => {
    setIsSavingEmpId(true);
    try {
      await AdminAPI.updateEmployeeId(drawerUser.id, draftEmpId);
      notify('success', 'Employee ID updated successfully');
      
      // Instantly update the Drawer and the Main Table
      setDrawerUser({ ...drawerUser, employee_id: draftEmpId });
      setUsers(users.map(u => u.id === drawerUser.id ? { ...u, employee_id: draftEmpId } : u));
      setEditingEmpId(false);
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to update Employee ID');
    } finally {
      setIsSavingEmpId(false);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true 
        });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          raw: true, // Prevents locale-specific string formatting
          defval: ''
        }) as any[][]; 
        
        if (jsonData.length < 2) {
          notify('error', 'File appears to be empty or missing headers.');
          return;
        }

        const headers = jsonData[0] as string[];
        const rawRows = jsonData.slice(1);
        
        const sanitizedRows = rawRows.map((row) => 
          row.map(cell => {
            // If Excel recognized it as a valid date, it's now a JS Date object
            if (cell instanceof Date) {
              // Extract locally to prevent UTC timezone shifting
              const yyyy = cell.getFullYear();
              const mm = String(cell.getMonth() + 1).padStart(2, '0');
              const dd = String(cell.getDate()).padStart(2, '0');
              return `${yyyy}-${mm}-${dd}`;
            }
            
            return cell !== null && cell !== undefined ? String(cell).trim() : '';
          })
        );

        setImportedHeaders(headers);
        setImportedRows(sanitizedRows);
        
        // Auto-guess columns
        const autoEmail = headers.find(h => h.toLowerCase().includes('email') || h.toLowerCase().includes('mail'));
        if (autoEmail) setEmailMapping(autoEmail);

        const autoFirst = headers.find(h => h.toLowerCase().includes('first') || h.toLowerCase() === 'fname');
        if (autoFirst) setFirstNameMapping(autoFirst);

        const autoLast = headers.find(h => h.toLowerCase().includes('last') || h.toLowerCase() === 'lname');
        if (autoLast) setLastNameMapping(autoLast);

        const autoEmp = headers.find(h => h.toLowerCase().includes('emp') || h.toLowerCase() === 'id');
        if (autoEmp) setEmployeeIdMapping(autoEmp);

        setImportStep(2); // Move to mapping step
      } catch (err) {
        notify('error', 'Failed to parse file. Ensure it is a valid CSV or XLSX.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  const handleGeneratePreview = () => {
    if (!emailMapping) return notify('error', 'You must map the Email column to proceed.');
    
    const emailIndex = importedHeaders.indexOf(emailMapping);
    const firstIndex = importedHeaders.indexOf(firstNameMapping);
    const lastIndex = importedHeaders.indexOf(lastNameMapping);
    const empIndex = importedHeaders.indexOf(employeeIdMapping);

    const mapped = importedRows.map(row => {
      const customProfileData: Record<string, any> = {};
      schema.forEach(field => {
        const mappedHeaderName = customMappings[field.id];
        if (mappedHeaderName) {
          const colIdx = importedHeaders.indexOf(mappedHeaderName);
          if (colIdx !== -1 && row[colIdx] !== undefined) customProfileData[field.id] = row[colIdx];
        }
      });

      const emailVal = row[emailIndex]?.toString().toLowerCase().trim();
      const existsInWorkspace = users.some(u => u.email.toLowerCase() === emailVal);

      return {
        email: emailVal,
        employeeId: empIndex !== -1 ? row[empIndex] : undefined,
        firstName: firstIndex !== -1 ? row[firstIndex] : undefined,
        lastName: lastIndex !== -1 ? row[lastIndex] : undefined,
        customProfileData,
        existsInWorkspace // Add to object!
      };
    }).filter(u => u.email);

    setMappedPreview(mapped);
    setUserRoleSelections({});
    setImportStep(3); 
  };

  const handleExecuteImport = async () => {
    setIsProcessing(true);
    try {
      const finalPayload = mappedPreview
        .filter(u => !u.existsInWorkspace)
        .map(u => ({
          ...u,
          roleIds: userRoleSelections[u.email] || []
        }));

      const res = await AdminAPI.bulkImportUsers(finalPayload);
      setImportResults(res);
      setImportStep(4); 
      fetchData(); 
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Bulk import failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setTimeout(() => {
      setImportStep(1);
      setImportedHeaders([]);
      setImportedRows([]);
      setEmailMapping('');
      setFirstNameMapping('');
      setLastNameMapping('');
      setCustomMappings({});
      setImportResults(null);
    }, 300);
  };

  const handleSyncUser = async (userId: string) => {
    setSyncingUserId(userId);
    try {
      const res = await AdminAPI.syncUser(userId);
      notify('success', res.message);
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to sync user');
    } finally {
      setSyncingUserId(null);
    }
  };

  const handleSyncWorkspace = async () => {
    setIsSyncingWorkspace(true);
    try {
      const res = await AdminAPI.syncWorkspace();
      notify('success', res.message);
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to sync workspace');
    } finally {
      setIsSyncingWorkspace(false);
    }
  };

  // Extracts the WYSIWYG visible data
  const getExportData = () => {
    const customHeaders = visibleColumns.map(colId => schema.find(f => f.id === colId)?.label || colId);
    const headers = ['First Name', 'Middle Name', 'Last Name', 'Email', 'Mobile No', 'Status', ...customHeaders];
    
    const rows = filteredUsers.map(u => {
      const baseInfo = [u.first_name, u.middle_name || '', u.last_name, u.email, u.mobile_no || '', u.status];
      const customInfo = visibleColumns.map(colId => u.custom_profile_data?.[colId] || '');
      return [...baseInfo, ...customInfo];
    });

    return { headers, rows };
  };

  const handleExportCSV = () => {
    const { headers, rows } = getExportData();
    const csvContent = [
      headers.join(','), 
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `directory_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false); // Close menu
  };

  const handleExportExcel = () => {
    const { headers, rows } = getExportData();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Directory");
    
    // Generates a legitimate .xlsx binary file
    XLSX.writeFile(workbook, `directory_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    setIsExportMenuOpen(false); // Close menu
  };

  // Formats the full name including middle name if it exists
  const getFullName = (u: any) => [u?.first_name, u?.middle_name, u?.last_name].filter(Boolean).join(' ');

  return (
    <div className="w-full pb-12 relative flex h-full overflow-hidden">
      
      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto">
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-40 px-4 sm:px-8 lg:px-12 py-4 lg:py-6 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm supports-[backdrop-filter]:bg-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Users Control</h1>
            <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Manage active accounts, revoke access, and handle recoveries.</p>
          </div>
        </div>

        <div className="px-4 sm:px-8 lg:px-12 mt-8 max-w-[1600px] mx-auto space-y-8 pb-12">
          {message.text && (
            <div className={`px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest ${message.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
              {message.text}
            </div>
          )}

          <div className="embossed-card p-4 sm:p-8">
            {/* DATA GRID TOOLBAR */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-slate-700 flex items-center shrink-0">
                <div className="p-2 bg-lightgray rounded-lg mr-3 shadow-inner"><Users className="w-5 h-5 text-gamboge-600" /></div>
                Active Directory
              </h2>
              
              <div className="flex flex-row items-center gap-2 sm:gap-3 w-full xl:w-auto">
                {/* Omni-Search */}
                <div className="relative flex-1 min-w-[150px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 shrink-0" />
                  <input 
                    type="text"
                    placeholder="Search directory..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-gamboge-500 rounded-xl text-sm font-bold text-slate-700 outline-none transition-all shadow-inner"
                  />
                </div>
                
                {/* Dynamic Columns Dropdown */}
                {schema.length > 0 && (
                  <div className="relative shrink-0" ref={columnsMenuRef}>
                    <button 
                      onClick={() => setIsColumnsMenuOpen(!isColumnsMenuOpen)}
                      title="Toggle Columns"
                      className="w-10 lg:w-auto px-0 lg:px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 uppercase tracking-widest transition-colors flex items-center justify-center shadow-sm shrink-0"
                    >
                      <Columns className="w-4 h-4 lg:mr-2 shrink-0" /> <span className="hidden lg:inline">Columns</span>
                    </button>
                    {isColumnsMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200/60 shadow-xl rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="px-3 py-2 border-b border-slate-100 mb-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Show Custom Fields</p>
                        </div>
                        <div className="max-h-60 overflow-y-auto neumorphic-scrollbar space-y-1 p-1">
                          {schema.map(field => (
                            <label key={field.id} className="flex items-center px-2 py-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                              <input 
                                type="checkbox" 
                                checked={visibleColumns.includes(field.id)}
                                onChange={() => toggleColumn(field.id)}
                                className="w-4 h-4 rounded border-slate-300 text-gamboge-600 focus:ring-gamboge-500 accent-gamboge-600 mr-3 shrink-0"
                              />
                              <span className="text-xs font-bold text-slate-600 truncate">{field.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bulk Sync Button */}
                <button 
                  onClick={handleSyncWorkspace}
                  disabled={isSyncingWorkspace}
                  title="Force Sync Workspace"
                  className="w-10 lg:w-auto px-0 lg:px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center shadow-sm shrink-0 disabled:opacity-50"
                >
                  {isSyncingWorkspace ? <Loader2 className="w-4 h-4 lg:mr-2 shrink-0 animate-spin" /> : <RefreshCcw className="w-4 h-4 lg:mr-2 shrink-0" />}
                  <span className="hidden lg:inline">Sync Workspace</span>
                </button>

                {/* Import Button */}
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  title="Import Directory"
                  className="w-10 lg:w-auto px-0 lg:px-4 py-2.5 bg-gamboge-600 hover:bg-gamboge-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center shadow-lg shadow-gamboge-500/30 shrink-0"
                >
                  <UploadCloud className="w-4 h-4 lg:mr-2 shrink-0" /> <span className="hidden lg:inline">Import</span>
                </button>
                
                {/* Export Menu Dropdown */}
                <div className="relative shrink-0" ref={exportMenuRef}>
                  <button 
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    title="Export Directory"
                    className="w-10 lg:w-auto px-0 lg:px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 uppercase tracking-widest transition-colors flex items-center justify-center shadow-sm shrink-0"
                  >
                    <Download className="w-4 h-4 lg:mr-2 shrink-0" /> <span className="hidden lg:inline">Export</span>
                  </button>
                  
                  {isExportMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200/60 shadow-xl rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-2 border-b border-slate-100 mb-1">
                        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Select Format</p>
                      </div>
                      <button 
                        onClick={handleExportExcel} 
                        className="w-full text-left px-3 py-2.5 hover:bg-gamboge-50 hover:text-gamboge-700 rounded-xl text-xs font-bold text-slate-600 transition-colors"
                      >
                        Microsoft Excel (.xlsx)
                      </button>
                      <button 
                        onClick={handleExportCSV} 
                        className="w-full text-left px-3 py-2.5 hover:bg-gamboge-50 hover:text-gamboge-700 rounded-xl text-xs font-bold text-slate-600 transition-colors mt-1"
                      >
                        Standard CSV (.csv)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-500 font-bold uppercase tracking-widest">
                <Loader2 className="w-6 h-6 animate-spin mr-3 shrink-0" /> Loading Directory...
              </div>
            ) : (
              <div className="inner-depth p-2 sm:p-4 rounded-2xl sm:rounded-3xl overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500 text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                      <th className="py-4 px-4 sm:px-6 font-bold">User</th>
                      <th className="py-4 px-4 sm:px-6 font-bold">Contact</th>
                      {/* RENDER DYNAMIC COLUMNS */}
                      {visibleColumns.map(colId => {
                        const fieldDef = schema.find(f => f.id === colId);
                        return <th key={colId} className="py-4 px-4 sm:px-6 font-bold text-gamboge-700">{fieldDef?.label}</th>
                      })}
                      <th className="py-4 px-4 sm:px-6 font-bold">Status</th>
                      <th className="py-4 px-4 sm:px-6 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5 + visibleColumns.length} className="py-12 text-center text-slate-500 font-medium">No users match the current filters.</td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => {
                        const isSelf = user.id === currentUser?.id;

                        return (
                        <tr key={user.id} className="border-b border-slate-300/50 hover:bg-slate-50 transition-colors">
                          <td className="py-4 sm:py-5 px-4 sm:px-6 whitespace-nowrap">
                            <div className="font-bold text-slate-700 text-sm flex items-center">
                              {user.first_name} {user.last_name}
                              {isSelf && <span className="ml-2 bg-gamboge-100 text-gamboge-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest border border-gamboge-200 shadow-inner">You</span>}
                            </div>
                            <div className="text-[14px] text-gamboge-600 font-mono mt-1 font-bold">
                              {user.employee_id ? `ID: ${user.employee_id}` : 'ID: NOT ASSIGNED'}
                            </div>
                          </td>
                          <td className="py-4 sm:py-5 px-4 sm:px-6 text-sm text-slate-500 font-medium">
                            {user.email}
                          </td>
                          {/* POPULATE DYNAMIC COLUMNS */}
                          {visibleColumns.map(colId => (
                            <td key={colId} className="py-4 sm:py-5 px-4 sm:px-6 text-sm text-slate-600 font-semibold whitespace-nowrap">
                              {user.custom_profile_data?.[colId] || '-'}
                            </td>
                          ))}
                          <td className="py-4 sm:py-5 px-4 sm:px-6">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold tracking-widest uppercase shrink-0 ${
                              user.status === 'ACTIVE' ? 'bg-green-100 text-green-700 shadow-inner' : 'bg-red-100 text-red-600 shadow-inner'
                            }`}>
                              {user.status === 'ACTIVE' ? <Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 shrink-0"/> : <Ban className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 shrink-0"/>}
                              {user.status}
                            </span>
                          </td>
                          <td className="py-4 sm:py-5 px-4 sm:px-6 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {/* Single User Sync Trigger */}
                              <button 
                                onClick={() => handleSyncUser(user.id)}
                                disabled={syncingUserId === user.id}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm font-bold p-2.5 rounded-xl transition-all shrink-0 disabled:opacity-50"
                                title="Force Sync Identity to Apps"
                              >
                                {syncingUserId === user.id ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <RefreshCcw className="w-4 h-4 shrink-0" />}
                              </button>
                              {/* Profile Drawer Toggle */}
                              <button 
                                onClick={() => handleOpenDrawer(user)}
                                className="bg-gamboge-50 hover:bg-gamboge-100 text-gamboge-700 border border-gamboge-200 shadow-sm font-bold p-2.5 rounded-xl transition-all shrink-0"
                                title="View Full Profile"
                              >
                                <Eye className="w-4 h-4 shrink-0" />
                              </button>
                              <button 
                                onClick={() => setModal({ isOpen: true, type: 'RESET', user })}
                                disabled={isSelf}
                                className={`shadow-sm font-bold p-2.5 rounded-xl transition-all shrink-0 ${isSelf ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                                title="Force Password Reset"
                              >
                                <KeyRound className="w-4 h-4 shrink-0" />
                              </button>
                              <button 
                                onClick={() => setModal({ isOpen: true, type: 'UNLOCK', user })}
                                disabled={isSelf}
                                className={`shadow-sm font-bold p-2.5 rounded-xl transition-all shrink-0 ${isSelf ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                                title="Clear Security Lockout"
                              >
                                <ShieldAlert className="w-4 h-4 shrink-0" />
                              </button>
                              <button 
                                onClick={() => setModal({ isOpen: true, type: 'TOGGLE_STATUS', user })}
                                disabled={isSelf}
                                className={`font-bold p-2.5 rounded-xl uppercase tracking-widest shadow-sm transition-all shrink-0 ${
                                  isSelf ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50' :
                                  user.status === 'ACTIVE' ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200' : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
                                }`}
                                title={user.status === 'ACTIVE' ? 'Revoke Access' : 'Restore Access'}
                              >
                                {user.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )})
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* THE SLIDE-OVER DRAWER */}
      {drawerUser && (
        <>
          <div className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 transition-opacity duration-300 ease-in-out ${isDrawerOpen ? 'opacity-100' : 'opacity-0'}`} onClick={handleCloseDrawer}></div>
          <div className={`fixed inset-y-0 right-0 z-[60] w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200/60 transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Drawer Header */}
            <div className="p-6 pt-14 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between shrink-0">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-2xl bg-gamboge-100 text-gamboge-600 flex items-center justify-center font-extrabold text-xl shadow-inner border border-gamboge-200 mr-4 shrink-0">
                  {drawerUser.first_name?.charAt(0)}{drawerUser.last_name?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">{getFullName(drawerUser)}</h2>
                  <p className="text-xs font-bold text-slate-400 tracking-widest mt-0.5">{drawerUser.email}</p>
                </div>
              </div>
              <button onClick={handleCloseDrawer} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors shrink-0">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Status & Identity Block */}
              <div>
                <h3 className="text-[15px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Global Identity</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500">Network Status</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold tracking-widest uppercase ${drawerUser.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {drawerUser.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500">Employee ID</span>
                    {editingEmpId ? (
                      <div className="flex items-center space-x-2">
                        <input 
                          autoFocus
                          type="text" 
                          value={draftEmpId} 
                          onChange={(e) => setDraftEmpId(e.target.value)} 
                          className="w-24 px-2 py-1 text-xs border border-gamboge-300 rounded outline-none focus:ring-1 focus:ring-gamboge-500 font-mono text-gamboge-700 font-bold"
                          placeholder="EMP-001"
                        />
                        <button onClick={handleSaveEmpId} disabled={isSavingEmpId} className="p-1.5 bg-gamboge-500 text-white rounded hover:bg-gamboge-600 disabled:opacity-50 transition-colors shadow-sm">
                          {isSavingEmpId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                        <button onClick={() => setEditingEmpId(false)} disabled={isSavingEmpId} className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 disabled:opacity-50 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center group">
                        <span className={`text-sm font-bold font-mono mr-2 ${drawerUser.employee_id ? 'text-gamboge-600' : 'text-slate-400'}`}>
                          {drawerUser.employee_id || 'Not Assigned'}
                        </span>
                        <button 
                          onClick={() => { setDraftEmpId(drawerUser.employee_id || ''); setEditingEmpId(true); }} 
                          className="text-slate-400 hover:text-gamboge-500 opacity-50 group-hover:opacity-100 transition-all"
                          title="Edit Employee ID"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500">Mobile Number</span>
                    <span className="text-sm font-bold text-slate-800 flex items-center">
                      <Phone className="w-3 h-3 mr-1.5 text-slate-400" /> {drawerUser.mobile_no || 'Not Provided'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500">Joined Date</span>
                    <span className="text-sm font-bold text-slate-800">
                      {new Date(drawerUser.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  {drawerUser.is_tenant_admin && (
                    <div className="p-3 bg-gamboge-50 border border-gamboge-200 rounded-xl flex items-center text-gamboge-700 mt-2">
                      <ShieldAlert className="w-4 h-4 mr-2 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-widest">Workspace Administrator</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic HR Custom Data Block */}
              <div>
                <h3 className="text-[15px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Workspace Profile</h3>
                {schema.length === 0 ? (
                  <p className="text-xs font-medium text-slate-400 italic">No custom fields configured for this workspace.</p>
                ) : (
                  <div className="space-y-4">
                    {schema.map(field => (
                      <div key={field.id} className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{field.label}</span>
                        <div className="bg-lightgray border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 shadow-sm min-h-[42px] flex items-center">
                          {drawerUser.custom_profile_data?.[field.id] || <span className="text-slate-400 italic font-medium">No data provided</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </>
      )}

      {/* BULK IMPORT WIZARD MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:pl-32 lg:pl-140">
          <div className={`bg-white rounded-3xl w-full transition-all duration-300 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 ${importStep === 3 ? 'max-w-6xl' : 'max-w-2xl'}`}>
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Bulk Import Directory</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                  {importStep === 1 && 'Step 1: Upload Data File'}
                  {importStep === 2 && 'Step 2: Map Data Columns'}
                  {importStep === 3 && 'Step 3: Import Results'}
                </p>
              </div>
              {importStep !== 3 && !isProcessing && (
                <button onClick={closeImportModal} className="p-2 bg-white hover:bg-slate-100 border border-slate-200 shadow-sm rounded-full text-slate-500 transition-colors shrink-0">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 flex-1 overflow-y-auto neumorphic-scrollbar">
              
              {/* STEP 1: UPLOAD */}
              {importStep === 1 && (
                <div {...getRootProps()} className={`inner-depth p-10 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all border-2 border-dashed ${isDragActive ? 'border-gamboge-500 bg-gamboge-50/50' : 'border-slate-300 hover:border-gamboge-400 hover:bg-slate-50'}`}>
                  <input {...getInputProps()} />
                  <UploadCloud className={`w-12 h-12 mb-4 transition-colors ${isDragActive ? 'text-gamboge-600' : 'text-slate-400'}`} />
                  <h3 className="text-lg font-bold text-slate-700 mb-1">{isDragActive ? 'Drop file here to parse' : 'Drag & Drop CSV or Excel file'}</h3>
                  <p className="text-sm font-medium text-slate-500">or click to browse from your computer.</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6">Supports .csv and .xlsx formats</p>
                </div>
              )}

              {/* STEP 2: MAP */}
              {importStep === 2 && (
                <>
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-300">
                      <div className="w-20 h-20 relative mb-6">
                        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-gamboge-500 rounded-full border-t-transparent animate-spin"></div>
                        <Mail className="absolute inset-0 m-auto w-8 h-8 text-gamboge-600 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-800 mb-2">Dispatching Invitations</h3>
                      <p className="text-sm font-medium text-slate-500 max-w-xs">
                        Parsing directory, generating secure access tokens, and dispatching emails. Please do not close this window.
                      </p>
                    </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start text-indigo-800">
                          <CheckCircle2 className="w-5 h-5 mr-3 shrink-0 text-indigo-600" />
                          <div>
                            <h4 className="text-sm font-bold">File Parsed Successfully</h4>
                            <p className="text-xs font-medium mt-0.5 opacity-80">Detected {importedRows.length} rows. Match your file's columns to the required directory fields.</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Core Identity Fields</h3>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
                            <label className="text-xs font-bold text-slate-700">Corporate Email <span className="text-red-500">*</span></label>
                            <select 
                                value={emailMapping} 
                                onChange={(e) => setEmailMapping(e.target.value)}
                                className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl p-2.5 outline-none focus:border-gamboge-500 cursor-pointer"
                            >
                              <option value="" disabled>Select column...</option>
                              {importedHeaders.map(h => <option key={`email-${h}`} value={h}>{h}</option>)}
                            </select>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4 mt-4">
                            <label className="text-xs font-bold text-slate-700">Employee ID / Code</label>
                            <select 
                                value={employeeIdMapping} 
                                onChange={(e) => setEmployeeIdMapping(e.target.value)}
                                className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl p-2.5 outline-none focus:border-gamboge-500 cursor-pointer"
                            >
                              <option value="">Ignore / Leave Blank</option>
                              {importedHeaders.map(h => <option key={`emp-${h}`} value={h}>{h}</option>)}
                            </select>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
                            <label className="text-xs font-bold text-slate-700">First Name</label>
                            <select 
                                value={firstNameMapping} 
                                onChange={(e) => setFirstNameMapping(e.target.value)}
                                className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl p-2.5 outline-none focus:border-gamboge-500 cursor-pointer"
                            >
                              <option value="">Ignore / Leave Blank</option>
                              {importedHeaders.map(h => <option key={`fn-${h}`} value={h}>{h}</option>)}
                            </select>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
                            <label className="text-xs font-bold text-slate-700">Last Name</label>
                            <select 
                                value={lastNameMapping} 
                                onChange={(e) => setLastNameMapping(e.target.value)}
                                className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl p-2.5 outline-none focus:border-gamboge-500 cursor-pointer"
                            >
                              <option value="">Ignore / Leave Blank</option>
                              {importedHeaders.map(h => <option key={`ln-${h}`} value={h}>{h}</option>)}
                            </select>
                          </div>

                          {/* DYNAMIC SCHEMA MAPPING */}
                          {schema.length > 0 && (
                            <div className="pt-4">
                              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Workspace Custom Fields</h3>
                              <div className="space-y-4">
                                {schema.map(field => (
                                  <div key={field.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 gap-4">
                                    <label className="text-xs font-bold text-slate-700">
                                      {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    <select 
                                      value={customMappings[field.id] || ''} 
                                      onChange={(e) => setCustomMappings({...customMappings, [field.id]: e.target.value})}
                                      className="w-full sm:w-1/2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl p-2.5 outline-none focus:border-gamboge-500 cursor-pointer"
                                    >
                                      <option value="">Ignore / Leave Blank</option>
                                      {importedHeaders.map(h => <option key={`${field.id}-${h}`} value={h}>{h}</option>)}
                                    </select>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </>
              )}

              {/* STEP 3: DATA PREVIEW & ROLE ASSIGNMENT */}
              {importStep === 3 && (
                <>
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-300">
                      <div className="w-20 h-20 relative mb-6">
                        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-gamboge-500 rounded-full border-t-transparent animate-spin"></div>
                        <Mail className="absolute inset-0 m-auto w-8 h-8 text-gamboge-600 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-800 mb-2">Dispatching Roster & Invitations</h3>
                      <p className="text-sm font-medium text-slate-500 max-w-xs">
                        Injecting personnel into directory and securely distributing initial access tokens.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-4 flex flex-col h-full">
                      
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3">Review & Provision Job Titles</h3>
                        <p className="text-[11px] font-medium text-slate-500 mb-4 leading-relaxed max-w-3xl">
                          Review extracted data. Assign specific Job Titles to users via the dropdowns below. These employees will <strong className="text-gamboge-600">bypass the waiting room</strong> and receive active access instantly upon registration.
                        </p>
                        
                        {/* 🚨 Horizontally & Vertically Scrollable Container */}
                        <div className="border border-slate-200 rounded-xl overflow-x-auto overflow-y-auto shadow-sm max-h-[500px] neumorphic-scrollbar relative">
                          <table className="w-full text-left text-xs bg-white whitespace-nowrap border-separate border-spacing-0">
                            <thead className="bg-slate-50 sticky top-0 z-20">
                              <tr>
                                <th className="p-4 font-bold text-slate-600 sticky left-0 bg-slate-50 z-30 shadow-[1px_0_0_0_#e2e8f0] shadow-b-[1px_0_0_0_#e2e8f0]">User Email</th>
                                <th className="p-4 font-bold text-slate-600 border-b border-slate-200">Name</th>
                                <th className="p-4 font-bold text-slate-600 border-b border-slate-200">Emp ID</th>
                                {schema.map(f => (
                                  <th key={f.id} className="p-4 font-bold text-gamboge-700 border-b border-slate-200">{f.label}</th>
                                ))}
                                <th className="p-4 font-bold text-slate-600 border-b border-slate-200">Assign Job Titles</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {mappedPreview.map((u, idx) => (
                                <tr key={idx} className={u.existsInWorkspace ? "opacity-60 bg-slate-50/50" : "hover:bg-slate-50 transition-colors"}>
                                  
                                  {/* Sticky First Column */}
                                  <td className={`p-4 font-medium sticky left-0 z-10 shadow-[1px_0_0_0_#f1f5f9] ${u.existsInWorkspace ? 'bg-slate-50 text-slate-500' : 'bg-white text-slate-700 group-hover:bg-slate-50'}`}>
                                    {u.email}
                                    {u.existsInWorkspace && <span className="block text-[9px] text-gamboge-600 font-bold uppercase mt-1 tracking-widest">Already in Directory</span>}
                                  </td>
                                  
                                  <td className="p-4 text-slate-600 border-b border-slate-100">{u.firstName} {u.lastName}</td>
                                  <td className="p-4 font-mono text-slate-400 border-b border-slate-100">{u.employeeId || '-'}</td>
                                  
                                  {schema.map(f => (
                                    <td key={f.id} className="p-4 text-slate-500 border-b border-slate-100">{u.customProfileData[f.id] || '-'}</td>
                                  ))}
                                  
                                  <td className="p-4 border-b border-slate-100">
                                    {u.existsInWorkspace ? (
                                       <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Skipped</span>
                                    ) : (
                                      <div className="relative inline-block text-left w-[220px]" ref={openImportDropdownId === u.email ? importDropdownRef : null}>
                                        <button
                                          onClick={() => setOpenImportDropdownId(openImportDropdownId === u.email ? null : u.email)}
                                          className={`w-full px-3 py-2 bg-slate-100 border hover:bg-white text-xs font-bold rounded-lg flex items-center justify-between shadow-sm transition-all ${
                                            userRoleSelections[u.email]?.length ? 'border-gamboge-400 text-gamboge-700 ring-1 ring-gamboge-100' : 'border-slate-200 text-slate-600'
                                          }`}
                                        >
                                          <span className="truncate mr-2">
                                            {userRoleSelections[u.email]?.length 
                                              ? `${userRoleSelections[u.email].length} Selected` 
                                              : 'Select Roles'}
                                          </span>
                                          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openImportDropdownId === u.email ? 'rotate-180 text-gamboge-500' : 'text-slate-400'}`} />
                                        </button>

                                        {openImportDropdownId === u.email && (
                                          <div className="absolute z-50 mt-1 w-56 rounded-2xl bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-200 py-2 right-0 animate-in fade-in zoom-in-95">
                                            <div className="max-h-48 overflow-y-auto neumorphic-scrollbar px-1">
                                              {roles.length === 0 ? (
                                                <div className="px-3 py-4 text-center text-[10px] uppercase tracking-widest text-slate-400 font-bold">No roles defined</div>
                                              ) : (
                                                roles.map(role => {
                                                  const isSelected = userRoleSelections[u.email]?.includes(role.id);
                                                  return (
                                                    <label key={role.id} className="flex items-center px-3 py-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                                                      <input 
                                                        type="checkbox" 
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                          setUserRoleSelections(prev => {
                                                            const current = prev[u.email] || [];
                                                            return {
                                                              ...prev,
                                                              [u.email]: e.target.checked ? [...current, role.id] : current.filter(id => id !== role.id)
                                                            }
                                                          });
                                                        }}
                                                        className="w-4 h-4 rounded border-slate-300 text-gamboge-600 focus:ring-gamboge-500 accent-gamboge-600 mr-3 shrink-0"
                                                      />
                                                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-gamboge-700' : 'text-slate-600 group-hover:text-slate-800'}`}>
                                                        {role.name}
                                                      </span>
                                                    </label>
                                                  );
                                                })
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* STEP 4: RESULTS */}
              {importStep === 4 && importResults && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-3xl border border-slate-200">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 border border-green-200 shadow-inner">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">Import Completed</h3>
                    <p className="text-sm font-medium text-slate-500">
                      Successfully secured and provisioned <strong>{importResults.successCount}</strong> personnel.
                    </p>
                  </div>

                  {importResults.failureCount > 0 && (
                    <div className="border border-red-200 rounded-2xl overflow-hidden">
                      <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex items-center">
                        <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                        <h4 className="text-xs font-bold text-red-800 uppercase tracking-widest">{importResults.failureCount} rows failed to import</h4>
                      </div>
                      <div className="max-h-40 overflow-y-auto bg-white p-4 space-y-2 neumorphic-scrollbar">
                        {importResults.errors.map((err, i) => (
                          <div key={i} className="text-xs font-mono text-slate-600 border-b border-slate-100 pb-2 last:border-0 last:pb-0">{err}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">
              {importStep === 1 && (
                <button onClick={closeImportModal} className="px-6 py-3 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">Cancel</button>
              )}
              {importStep === 2 && (
                <>
                  <button onClick={() => setImportStep(1)} disabled={isProcessing} className="px-6 py-3 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm font-bold rounded-xl text-xs uppercase tracking-widest transition-colors">Back</button>
                  <button onClick={handleGeneratePreview} disabled={isProcessing || !emailMapping} className="shine-btn px-8 py-3 text-white font-bold rounded-xl text-xs uppercase tracking-widest disabled:opacity-50 flex items-center shadow-lg">
                    Review & Target
                  </button>
                </>
              )}
              {importStep === 3 && (
                <>
                  <button onClick={() => setImportStep(2)} disabled={isProcessing} className="px-6 py-3 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm font-bold rounded-xl text-xs uppercase tracking-widest transition-colors">Back</button>
                  <button onClick={handleExecuteImport} disabled={isProcessing} className="shine-btn px-8 py-3 text-white font-bold rounded-xl text-xs uppercase tracking-widest disabled:opacity-50 flex items-center shadow-lg">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Execute Provisioning
                  </button>
                </>
              )}
              {importStep === 4 && (
                <button onClick={closeImportModal} className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-colors shadow-md">Done</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECURITY ACTION MODAL */}
      {modal.isOpen && modal.type && modal.user && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 md:pl-32 lg:pl-140">
          <div className="embossed-card p-6 sm:p-8 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-2xl mr-4 shadow-inner shrink-0 ${
                  modal.type === 'RESET' || (modal.type === 'TOGGLE_STATUS' && modal.user?.status === 'ACTIVE') 
                    ? 'bg-red-100 text-red-600' : 'bg-gamboge-100 text-gamboge-600'
                }`}>
                  {modal.type === 'RESET' && <AlertTriangle className="w-6 h-6" />}
                  {modal.type === 'UNLOCK' && <ShieldAlert className="w-6 h-6" />}
                  {modal.type === 'TOGGLE_STATUS' && (modal.user?.status === 'ACTIVE' ? <UserX className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                    {modal.type === 'RESET' && 'Force Password Reset'}
                    {modal.type === 'UNLOCK' && 'Clear Security Lockout'}
                    {modal.type === 'TOGGLE_STATUS' && (modal.user?.status === 'ACTIVE' ? 'Revoke Workspace Access' : 'Restore Workspace Access')}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 mt-1 truncate max-w-[200px]">
                    Target: {modal.user?.email}
                  </p>
                </div>
              </div>
              <button onClick={() => setModal({ isOpen: false, type: null, user: null })} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="inner-depth p-4 rounded-2xl mb-6 text-sm font-medium text-slate-600 leading-relaxed min-h-[80px] flex items-center justify-center text-center">
              {modal.type === 'RESET' && <div className="text-left">This will <strong className="text-red-500">instantly terminate all active sessions</strong> and scramble the password for {modal.user?.first_name}.</div>}
              {modal.type === 'UNLOCK' && <div className="text-left">This will clear any active Redis lockouts triggered by failed login attempts.</div>}
              {modal.type === 'TOGGLE_STATUS' && modal.user?.status === 'ACTIVE' && <div className="text-left">Are you sure you want to <strong className="text-red-500">revoke access</strong> for {modal.user?.first_name}?</div>}
              {modal.type === 'TOGGLE_STATUS' && modal.user?.status !== 'ACTIVE' && <div className="text-left">Are you sure you want to <strong className="text-green-600">restore access</strong> for {modal.user?.first_name}?</div>}
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button onClick={() => setModal({ isOpen: false, type: null, user: null })} disabled={isProcessing} className="w-full sm:flex-1 py-3 text-slate-700 bg-lightgray border border-slate-300 hover:bg-slate-200 shadow-sm font-bold rounded-2xl text-sm tracking-widest uppercase transition-colors">
                Cancel
              </button>
              <button onClick={executeSecurityAction} disabled={isProcessing} className={`w-full sm:flex-1 py-3 text-white font-bold rounded-2xl text-sm tracking-widest uppercase disabled:opacity-50 flex justify-center items-center ${modal.type === 'RESET' || (modal.type === 'TOGGLE_STATUS' && modal.user?.status === 'ACTIVE') ? 'bg-red-500 hover:bg-red-600' : 'shine-btn'}`}>
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : 'Confirm Execution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}