with open('App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = []
for idx, line in enumerate(lines):
    if 'const renderPage = () => {' in line:
        break
    out.append(line)

routes_code = """
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

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={
          <DashboardOverview
            leads={roleScopedLeads}
            users={users}
            customers={customers}
            branches={branches}
            cities={cities}
            userActivities={userActivities}
            currentUser={viewProfile!}
            dateRange={dateRange}
            setDateRange={setDateRange}
            onViewCustomer={handleViewCustomer}
            onViewLead={handleViewLead}
            onNavigate={handleNavigate}
            services={services}
            onAddActivityToLead={addActivityToLead}
            refreshData={refreshData}
            onUpdateLead={handleUpdateLead}
            onUpdateCustomer={updateCustomer}
          />
        } />
        <Route path="/leads" element={
          <LeadsOverview
            leads={roleScopedLeads}
            users={users}
            currentUser={viewProfile!}
            onUpdateLead={handleUpdateLead}
            onUpdateMultipleLeads={updateMultipleLeads}
            onDeleteMultipleLeads={deleteMultipleLeads}
            onViewLead={handleViewLead}
            onAddActivity={addActivityToLead}
            dateRange={dateRange}
            services={services}
            offers={offers}
          />
        } />
        <Route path="/leads/new" element={
          <CreateLead 
            onAddLead={handleAddLead} 
            onCancel={handleCancelCreateLead} 
            salesExecutives={activeSalesExecutives} 
            services={services} 
            leads={leads} 
            offers={offers} 
          />
        } />
        <Route path="/leads/:id" element={<LeadDetailRoute />} />
        <Route path="/my-leads" element={
          <LeadsOverview
            leads={roleScopedLeads.filter(l => l.assigned_to?.id === viewProfile?.id)}
            users={users}
            currentUser={viewProfile!}
            onUpdateLead={handleUpdateLead}
            onUpdateMultipleLeads={updateMultipleLeads}
            onDeleteMultipleLeads={deleteMultipleLeads}
            onViewLead={handleViewLead}
            onAddActivity={addActivityToLead}
            dateRange={dateRange}
            services={services}
            offers={offers}
          />
        } />
        <Route path="/lead-workflow" element={
          <LeadWorkflow
            leads={roleScopedLeads}
            users={users}
            currentUser={viewProfile!}
            onUpdateLead={handleUpdateLead}
            onViewLead={handleViewLead}
            services={services}
            offers={offers}
          />
        } />
        <Route path="/customers" element={
          <Customers
            customers={roleScopedCustomers}
            leads={roleScopedLeads}
            users={users}
            onViewCustomer={handleViewCustomer}
            onUpdateCustomer={updateCustomer}
            currentUser={viewProfile!}
          />
        } />
        <Route path="/customers/:id" element={<CustomerDetailRoute />} />
        <Route path="/reports" element={
          <Reports
            leads={roleScopedLeads}
            users={roleScopedUsers}
            currentUser={viewProfile!}
            dateRange={dateRange}
            services={services}
          />
        } />
        <Route path="/payments" element={
          <PaymentTracker
            leads={roleScopedLeads}
            customers={roleScopedCustomers}
            users={users}
            currentUser={viewProfile!}
            onUpdateLead={handleUpdateLead}
          />
        } />
        <Route path="/activity" element={
          <ActivityFeed
            activities={roleScopedActivities}
            users={users}
            leads={leads}
            customers={customers}
            currentUser={viewProfile!}
          />
        } />
        <Route path="/users" element={
          isAdminOrAbove ? (
            <UserManagement
              users={roleScopedUsers}
              currentUser={viewProfile!}
              branches={branches}
              cities={cities}
              onAddUser={() => setIsUserFormOpen(true)}
              onEditUser={(user) => { setEditingUser(user); setIsUserFormOpen(true); }}
              onDeleteUsers={deleteMultipleUsers}
              onTransferUser={transferUser}
            />
          ) : <AccessDenied requiredRole="Admin or Super Admin" />
        } />
        <Route path="/branch-management" element={
          isSuperAdmin ? (
            <BranchManagement
              branches={branches}
              cities={cities}
              users={users}
              onAddBranch={addBranch}
              onUpdateBranch={updateBranch}
              onDeleteBranch={deleteBranch}
              onAddCity={addCity}
            />
          ) : <AccessDenied requiredRole="Super Admin" />
        } />
        <Route path="/team" element={
          isAdminOrAbove ? (
            <TeamManagement
              users={roleScopedUsers}
              currentUser={viewProfile!}
              leads={roleScopedLeads}
              onUpdateUser={updateUser}
            />
          ) : <AccessDenied requiredRole="Admin or Super Admin" />
        } />
        <Route path="/verify-documents" element={
          isAdminOrAbove ? (
            <DocumentVerification
              leads={roleScopedLeads}
              onUpdateDocumentStatus={updateDocumentStatus}
              currentUser={viewProfile!}
            />
          ) : <AccessDenied requiredRole="Admin or Super Admin" />
        } />
        <Route path="/follow-ups" element={
          <FollowUps
            leads={roleScopedLeads}
            users={users}
            currentUser={viewProfile!}
            onViewLead={handleViewLead}
            onUpdateLead={handleUpdateLead}
            onAddActivity={addActivityToLead}
          />
        } />
        <Route path="/client-documents" element={
          <ClientDocuments
            leads={roleScopedLeads}
            customers={roleScopedCustomers}
            currentUser={viewProfile!}
            onViewLead={handleViewLead}
            onViewCustomer={handleViewCustomer}
            onUploadDocument={(leadId, file, docType) => handleUploadDocument(leadId, file, docType)}
          />
        } />
        <Route path="/notifications" element={
          <Notifications
            notifications={notifications}
            onMarkAsRead={markNotificationsAsRead}
            onViewLead={handleViewLead}
            onViewCustomer={handleViewCustomer}
          />
        } />
        <Route path="/settings" element={
          <Settings
            profile={viewProfile!}
            onUpdateProfile={updateUser}
            services={services}
            onAddService={addService}
            onUpdateService={updateService}
            onDeleteService={deleteService}
            onAddSubService={addSubService}
            onUpdateSubService={updateSubService}
            onDeleteSubService={deleteSubService}
          />
        } />
        <Route path="/offers" element={
          <OffersAndCoupons
            offers={offers}
            onAddOffer={addOffer}
            onUpdateOffer={updateOffer}
            onDeleteOffer={deleteOffer}
            currentUser={viewProfile!}
            services={services}
          />
        } />
        <Route path="/web" element={
          <WebLeads
            webLeads={webLeads}
            users={users}
            currentUser={viewProfile!}
            onUpdateWebLead={updateWebLead}
            onDeleteMultipleWebLeads={deleteMultipleWebLeads}
            onAssignWebLead={assignWebLead}
            onUpdateWebLeadStatus={updateWebLeadStatus}
            onConvertWebLeadToCrmLead={convertWebLeadToCrmLead}
          />
        } />
      </Route>
    </Routes>
  );
}

export default App;
"""

out.append(routes_code)
with open('App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(out)
print('Sliced App.tsx!')
