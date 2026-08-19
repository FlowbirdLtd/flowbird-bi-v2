import { useParams } from 'react-router-dom'
import { useContact } from '../hooks/useContacts'
import DetailShell from '../components/detail/DetailShell'
import { SECTIONS } from '../features/contacts/detailFields'
import { PANELS } from '../features/contacts/relatedPanels'

export default function ContactDetailPage() {
  const { id } = useParams()
  const { data: contact, isLoading } = useContact(id)

  if (isLoading) return <div style={{ padding: 40 }}>Loading...</div>
  if (!contact) return <div style={{ padding: 40 }}>Contact not found.</div>

  return (
    <DetailShell
      title="View Contact Details"
      breadcrumb={{ to: '/contacts', label: 'Contacts', trail: ' > View Contact Details' }}
      sections={SECTIONS}
      panels={PANELS}
      row={contact}
      backLink={{ to: '/contacts', label: 'Back to Contacts' }}
    />
  )
}
