import { useApiCore } from './useApiCore';
import { useBranchesApi } from './useBranchesApi';
import { useSettingsApi } from './useSettingsApi';
import { useServicesApi } from './useServicesApi';
import { useOffersApi } from './useOffersApi';
import { useNotificationsApi } from './useNotificationsApi';
import { useWebApi } from './useWebApi';
import { useWhatsAppApi } from './useWhatsAppApi';
import { useSupportApi } from './useSupportApi';
import { useWorkOrdersApi } from './useWorkOrdersApi';
import { useInvoicesApi } from './useInvoicesApi';
import { useTasksApi } from './useTasksApi';
import { useActivitiesApi } from './useActivitiesApi';
import { useDocumentsApi } from './useDocumentsApi';
import { useUsersApi } from './useUsersApi';
import { useCustomersApi } from './useCustomersApi';
import { useLeadsApi } from './useLeadsApi';

export function useApi(options: { fetchOnMount?: boolean } = { fetchOnMount: true }) {
    const core = useApiCore(options);

    const activitiesApi = useActivitiesApi();
    
    const notificationsApi = useNotificationsApi(core);
    
    const leadsApi = useLeadsApi({
        ...core,
        addNotification: notificationsApi.addNotification,
        addActivityToLead: activitiesApi.addActivityToLead
    });
    
    const branchesApi = useBranchesApi(core);
    
    const settingsApi = useSettingsApi(core);
    
    const servicesApi = useServicesApi(core);
    
    const offersApi = useOffersApi(core);
    
    const webApi = useWebApi({
        ...core,
        addLead: leadsApi.addLead
    });
    
    const whatsAppApi = useWhatsAppApi(core);
    
    const supportApi = useSupportApi(core);
    
    const workOrdersApi = useWorkOrdersApi(core);
    
    const invoicesApi = useInvoicesApi(core);
    
    const tasksApi = useTasksApi({
        ...core,
        addActivityToLead: activitiesApi.addActivityToLead
    });
    
    const documentsApi = useDocumentsApi(core);
    
    const usersApi = useUsersApi(core);
    
    const customersApi = useCustomersApi(core);

    return {
        ...core,
        ...branchesApi,
        ...settingsApi,
        ...servicesApi,
        ...offersApi,
        ...notificationsApi,
        ...webApi,
        ...whatsAppApi,
        ...supportApi,
        ...workOrdersApi,
        ...invoicesApi,
        ...tasksApi,
        ...activitiesApi,
        ...documentsApi,
        ...usersApi,
        ...customersApi,
        ...leadsApi
    };
}
export type UseApiReturn = ReturnType<typeof useApi>;
