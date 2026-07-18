import re

with open('App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

replacement = """            onAddSubService={addSubService}
            onUpdateSubService={updateSubService}
            onDeleteSubService={deleteSubService}
          />
        } />
        <Route path="/offers" element={
          <OffersManagement
            offers={offers}
            onAddOffer={addOffer}
            onUpdateOffer={updateOffer}
            onDeleteOffer={deleteOffer}
            services={services}
          />
        } />
        <Route path="/web" element={
          <WebLeadsManagement
            webLeads={webLeads}
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

export default App;"""

code = re.sub(r'            onAddService=\{addService\}\n            onUpdateService=\{updateService\}\n            onDeleteService=\{deleteService\}[\s\S]*', '            onAddService={addService}\n            onUpdateService={updateService}\n            onDeleteService={deleteService}\n' + replacement + '\n', code)

with open('App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Fixed Routes!')
