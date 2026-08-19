import { useParams, Link } from 'react-router-dom'
import { useOrganisation } from '../hooks/useOrganisations'
import DetailShell from '../components/detail/DetailShell'
import { SECTIONS } from '../features/organisations/detailFields'

/**
 * Linked contacts aren't a scalar field — they're a list of related records —
 * so they render as a second card, in the same visual language as
 * DetailSection, rather than through the field-config system.
 */
function ContactsCard({ contacts }) {
  return (
    <div
      style={{
        marginTop: 16,
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: 'var(--surface-alt)', borderBottom: '1px solid var(--line-strong)',
          padding: '9px 14px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-data)', fontSize: 10.5, fontWeight: 600,
            letterSpacing: '.085em', textTransform: 'uppercase', color: 'var(--ink-faint)',
          }}
        >
          Contacts
        </span>
      </div>

      {contacts.length === 0 ? (
        <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--ink-soft)' }}>No contacts linked.</div>
      ) : (
        contacts.map(contact => (
          <div
            key={contact.id}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 8,
              padding: '10px 14px', borderBottom: '1px solid var(--line)',
            }}
          >
            <Link to={`/contacts/${contact.id}`} style={{ color: 'var(--accent)', fontSize: 13 }}>
              {contact.name}
            </Link>
            {contact.job_title && (
              <span style={{ color: 'var(--ink-soft)', fontSize: 13 }}>— {contact.job_title}</span>
            )}
          </div>
        ))
      )}
    </div>
  )
}

export default function OrganisationDetailPage() {
  const { id } = useParams()
  const { data: org, isLoading } = useOrganisation(id)

  if (isLoading) return <div style={{ padding: 40 }}>Loading...</div>
  if (!org) return <div style={{ padding: 40 }}>Organisation not found.</div>

  return (
    <DetailShell
      title="Organisation Details"
      breadcrumb={{ to: '/organisations', label: 'Organisations', trail: ' > Organisation Details' }}
      sections={SECTIONS}
      row={org}
      backLink={{ to: '/organisations', label: 'Back to Organisations' }}
    >
      <ContactsCard contacts={org.contacts || []} />
    </DetailShell>
  )
}
