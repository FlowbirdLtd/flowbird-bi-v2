import { useParams } from 'react-router-dom'
import { useContact } from '../hooks/useContacts'
import DetailShell from '../components/detail/DetailShell'
import { SECTIONS } from '../features/contacts/detailFields'
import { PANELS } from '../features/contacts/relatedPanels'

/** Reads as "Job Title at Organisation", degrading to whichever half exists. */
function subtitleFor(contact) {
  const { job_title: jobTitle, organisation } = contact
  if (jobTitle && organisation?.name) return `${jobTitle} at ${organisation.name}`
  return jobTitle || organisation?.name || ''
}

export default function ContactDetailPage() {
  const { id } = useParams()
  const { data: contact, isLoading } = useContact(id)

  return (
    <DetailShell
      title={contact?.name || 'Unnamed contact'}
      subtitle={contact && subtitleFor(contact)}
      sections={SECTIONS}
      panels={PANELS}
      row={contact}
      isLoading={isLoading}
      missingLabel="contact"
      backLink={{ to: '/contacts', label: 'Back to Contacts' }}
    />
  )
}
