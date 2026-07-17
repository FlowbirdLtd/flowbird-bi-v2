import { useQuery } from '@tanstack/react-query'
import { platform } from '../lib/platformClient'

export function useDeals() {
  return useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const { data, error } = await platform
        .from('deals')
        .select(`
          *,
          contact:contacts(id, name, email, phone),
          organisation:organisations(id, name)
        `)
        .order('date_created', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useDeal(id) {
  return useQuery({
    queryKey: ['deals', id],
    queryFn: async () => {
      const { data, error } = await platform
        .from('deals')
        .select(`
          *,
          contact:contacts(*),
          organisation:organisations(*)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}
