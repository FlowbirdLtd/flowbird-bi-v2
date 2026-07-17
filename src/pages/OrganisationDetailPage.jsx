import { useParams, Link } from 'react-router-dom'
import { useOrganisation } from '../hooks/useOrganisations'

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

export default function OrganisationDetailPage() {
  const { id } = useParams()
  const { data: org, isLoading } = useOrganisation(id)

  if (isLoading) return <div style={{ padding: 40 }}>Loading...</div>
  if (!org) return <div style={{ padding: 40 }}>Organisation not found.</div>

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
        <Link to="/organisations" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Organisations</Link>
        {' > Organisation Details'}
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--nav)', marginBottom: 20 }}>Organisation Details</h1>

      <Section title="Details">
        <Field label="Organisation Name">{val(org.name)}</Field>
        <Field label="Address">{val(org.address)}</Field>
        <Field label="Company Status">{val(org.company_status)}</Field>
        <Field label="Website">
          {org.website ? (
            <a href={org.website} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{org.website}</a>
          ) : ''}
        </Field>
        <Field label="Vendor & Ownership Structure">{val(org.vendor_ownership_structure)}</Field>
        <Field label="Authorisation Status">{val(org.authorisation_status)}</Field>
        <Field label="FCA Number">{val(org.fca_number)}</Field>
        <Field label="id_urn">{val(org.id_urn)}</Field>
        <Field label="Date Created">{val(org.date_created)}</Field>
      </Section>

      <Section title="Contacts">
        {(org.contacts || []).length === 0 ? (
          <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-muted)' }}>No contacts linked.</div>
        ) : (
          (org.contacts || []).map(contact => (
            <div key={contact.id} style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '8px 12px' }}>
              <Link to={`/contacts/${contact.id}`} style={{ color: 'var(--accent)', fontSize: 13 }}>
                {contact.name}
              </Link>
              {contact.job_title && (
                <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 13 }}>— {contact.job_title}</span>
              )}
            </div>
          ))
        )}
      </Section>

      <div style={{ marginTop: 24 }}>
        <Link to="/organisations" style={{ color: 'var(--accent)', fontSize: 13 }}>&larr; Back to Organisations</Link>
      </div>
    </div>
  )
}
