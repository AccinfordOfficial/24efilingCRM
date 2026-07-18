import re

with open('App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace renderPage with the wrapper components
wrapper_components = '''
  const LeadDetailRoute = () => {
    const { id } = useParams();
    const lead = leads.find(l => l.id === id);
    if (!lead) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
          <div className="text-6xl">🔍</div>
          <h2 className="text-2xl font-bold text-slate-800">Lead Not Found</h2>
          <p className="text-slate-500 max-w-md">This lead may have been removed or you may not have permission to view it.</p>
          <button onClick={() => navigate(-1)} className="mt-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Go Back</button>
        </div>
      );
    }
    return <LeadDetail
      lead={lead}
      onBack={() => navigate(-1)}
      onUpdateLead={handleUpdateLead}
      onAddActivity={(content) => handleAddActivity(lead.id, content)}
      onUploadDocument={(file, docType) => handleUploadDocument(lead.id, file, docType)}
      onDeleteDocument={(docId) => handleDeleteDocument(lead.id, docId)}
      onEditLead={() => handleOpenLeadForm(lead)}
      onAddTask={(content, dueDate, priority) => handleAddTask(lead.id, content, dueDate, priority)}
      onUpdateTask={(task) => handleUpdateTask(lead.id, task)}
      onDeleteTask={(taskId) => handleDeleteTask(lead.id, taskId)}
    />;
  };

  const CustomerDetailRoute = () => {
    const { id } = useParams();
    const customer = customers.find(c => c.id === id) || customers.find(c => c.lead_id === id);
    if (!customer) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
          <div className="text-6xl">🔍</div>
          <h2 className="text-2xl font-bold text-slate-800">Customer Not Found</h2>
          <p className="text-slate-500 max-w-md">This customer record may have been removed or you may not have permission to view it.</p>
          <button onClick={() => navigate(-1)} className="mt-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Go Back</button>
        </div>
      );
    }
    return <CustomerDetail 
      customer={customer} 
      onBack={() => navigate(-1)} 
      leads={leads} 
      onAddActivityToLead={addActivityToLead} 
      refreshData={refreshData} 
      onUpdateCustomer={updateCustomer}
    />;
  };
'''

code = re.sub(r'  const renderPage = \(\) => \{[\s\S]*?  \};\n', wrapper_components + '\n', code)

# Add routes inside <Routes>
routes_to_add = '''
          <Route path="/leads/:id" element={<LeadDetailRoute />} />
          <Route path="/customers/:id" element={<CustomerDetailRoute />} />
'''
if '<Route path="/leads/:id"' not in code:
    code = code.replace('<Route path="/leads"', routes_to_add + '          <Route path="/leads"')

# Add useParams import if missing
if 'useParams' not in code:
    code = code.replace('useNavigate', 'useNavigate, useParams')

with open('App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('App.tsx cleaned!')
