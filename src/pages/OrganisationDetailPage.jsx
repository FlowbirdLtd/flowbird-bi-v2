import { useParams } from 'react-router-dom'
import { useOrganisation } from '../hooks/useOrganisations'
import DetailShell from '../components/detail/DetailShell'
import { SECTIONS } from '../features/organisations/detailFields'
import { PANELS } from '../features/organisations/relatedPanels'

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
      panels={PANELS}
      row={org}
      backLink={{ to: '/organisations', label: 'Back to Organisations' }}
    />
  )
}
