import { useParams, Link } from 'react-router-dom'
import { useContact } from '../hooks/useContacts'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB')
}

function val(v) {
  if (v === null || v === undefined) return ''
  return String(v)
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--nav)', paddingBottom: 6, marginBottom: 0, borderBottom: '2px solid var(--border)' }}>
        {title}
      </div>
      <div style={{ border: '1px solid var(--border)', borderTop: 'none' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
      <div style={{ background: '#f9fafb', fontWeight: 600, minWidth: 220, padding: '8px 12px', color: '#374151', fontSize: 13 }}>
        {label}
      </div>
      <div style={{ background: '#fff', flex: 1, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }}>
        {children}
      </div>
    </div>
  )
}

export default function ContactDetailPage() {
  const { id } = useParams()
  const { data: contact, isLoading } = useContact(id)

  if (isLoading) return <div style={{ padding: 40 }}>Loading...</div>
  if (!contact) return <div style={{ padding: 40 }}>Contact not found.</div>

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
        <Link to="/contacts" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Contacts</Link>
        {' > View Contact Details'}
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--nav)', marginBottom: 20 }}>View Contact Details</h1>

      <Section title="Contact Information">
        <Field label="Contact Pipedrive ID">{val(contact.contact_pipedrive_id)}</Field>
        <Field label="Contact Name">{val(contact.name)}</Field>
        <Field label="Phone">{val(contact.phone)}</Field>
        <Field label="Email">
          {contact.email ? (
            <a href={`mailto:${contact.email}`} style={{ color: 'var(--accent)' }}>{contact.email}</a>
          ) : ''}
        </Field>
        <Field label="Date Created">{formatDate(contact.date_created)}</Field>
        <Field label="Age">{val(contact.age)}</Field>
        <Field label="Job Title">{val(contact.job_title)}</Field>
        <Field label="Organisation">
          {contact.organisation ? (
            <Link to={`/organisations/${contact.organisation.id}`} style={{ color: 'var(--accent)' }}>
              {contact.organisation.name}
            </Link>
          ) : ''}
        </Field>
      </Section>

      <div style={{ marginTop: 24 }}>
        <Link to="/contacts" style={{ color: 'var(--accent)', fontSize: 13 }}>&larr; Back to Contacts</Link>
      </div>
    </div>
  )
}
