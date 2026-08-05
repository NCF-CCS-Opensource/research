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
