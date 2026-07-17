import { useQuery } from '@tanstack/react-query'
import { platform } from '../lib/platformClient'

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await platform
        .from('contacts')
        .select(`
          *,
          organisation:organisations(id, name)
        `)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useContact(id) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: async () => {
      const { data, error } = await platform
        .from('contacts')
        .select(`
          *,
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
