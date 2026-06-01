export const adminCompanyKeys = {
  all: ["admin_companies"] as const,
  lists: () => [...adminCompanyKeys.all, "list"] as const,
  list: (filters: Record<string, any>) => 
    [...adminCompanyKeys.lists(), { ...filters }] as const,
  details: () => [...adminCompanyKeys.all, "detail"] as const,
  detail: (id: string) => [...adminCompanyKeys.details(), id] as const,
};