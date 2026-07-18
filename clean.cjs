const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

// 1. Remove pageToHash and hashToState
code = code.replace(/  \/\/ Routing helper functions[\s\S]*?  const initialRoutingState = useMemo[^;]+;/g, '');

// 2. Remove the state that depends on it and the hash effects
code = code.replace(/  const \[activePage, _setActivePage\] = useState[^\n]+\n/g, '');
code = code.replace(/  const \[previousPage, setPreviousPage\] = useState[^\n]+\n/g, '');
code = code.replace(/  const \[viewingLeadId, _setViewingLeadId\] = useState[^\n]+\n/g, '');
code = code.replace(/  const \[viewingCustomerId, _setViewingCustomerId\] = useState[^\n]+\n/g, '');
code = code.replace(/  const \[initialPageSet, setInitialPageSet\] = useState[^\n]+\n/g, '');
code = code.replace(/  \/\/ Wrapper functions to update location hash[\s\S]*?  \}, \[profile, initialPageSet\]\);\n/g, '');

// 3. Replace the legacy navigation handlers
const navReplacement = `
  const handleViewLead = useCallback((leadId: string) => {
    navigate('/leads/' + leadId);
  }, [navigate]);

  const handleViewCustomer = useCallback((customerId: string) => {
    navigate('/customers/' + customerId);
  }, [navigate]);

  const handleBackFromDetail = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleNavigateToCreateLead = useCallback(() => {
    navigate('/leads/new');
  }, [navigate]);

  const handleCancelCreateLead = useCallback(() => {
    navigate(-1);
  }, [navigate]);
`;
code = code.replace(/  const handleViewLead = useCallback[\s\S]*?  \}, \[previousPage, pageToHash\]\);/g, navReplacement.trim());

// 4. Remove renderPage completely
code = code.replace(/  const renderPage = \(\) => \{[\s\S]*?  \}\n\n  return \(/g, '  return (');

// 5. Remove handleNavigate which has setActivePage
code = code.replace(/  const handleNavigate = \([\s\S]*?  \};\n/g, '');

fs.writeFileSync('App.tsx', code);
console.log('App.tsx updated');
