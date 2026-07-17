import { useQuery } from '@tanstack/react-query'
import { platform } from '../lib/platformClient'

export function useOrganisations() {
  return useQuery({
    queryKey: ['organisations'],
    queryFn: async () => {
      const { data, error } = await platform
        .from('organisations')
        .select(`
          *,
          contacts(id, name, email, phone, job_title)
        `)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useOrganisation(id) {
  return useQuery({
    queryKey: ['organisations', id],
    queryFn: async () => {
      const { data, error } = await platform
        .from('organisations')
        .select(`
          *,
          contacts(*)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}
