import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

export const researchQueryKeys = {
  all: ['research'] as const,
  lists: () => [...researchQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...researchQueryKeys.lists(), filters] as const,
  details: () => [...researchQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...researchQueryKeys.details(), id] as const,
}

export const pdfAccessKeys = {
  all: ['pdf-access-requests'] as const,
  lists: () => [...pdfAccessKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...pdfAccessKeys.lists(), filters ?? {}] as const,
  details: () => [...pdfAccessKeys.all, 'detail'] as const,
  detail: (id: string) => [...pdfAccessKeys.details(), id] as const,
}

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...notificationKeys.lists(), filters ?? {}] as const,
}
