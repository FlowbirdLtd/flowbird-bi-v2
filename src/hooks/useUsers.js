import { useQuery } from '@tanstack/react-query'
import { platform } from '../lib/platformClient'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await platform
        .from('users')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useUser(id) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data, error } = await platform
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}
