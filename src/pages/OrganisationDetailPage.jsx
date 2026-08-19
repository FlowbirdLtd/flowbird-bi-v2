import { useParams } from 'react-router-dom'
import { useOrganisation } from '../hooks/useOrganisations'
import DetailShell from '../components/detail/DetailShell'
import { SECTIONS } from '../features/organisations/detailFields'
import { PANELS } from '../features/organisations/relatedPanels'

/** Trading status and regulatory standing are the two facts that change how
 *  you read everything else on an organisation, so they lead. */
function subtitleFor(org) {
  return [org.company_status, org.authorisation_status].filter(Boolean).join(' · ')
}

export default function OrganisationDetailPage() {
  const { id } = useParams()
  const { data: org, isLoading } = useOrganisation(id)

  return (
    <DetailShell
      title={org?.name || 'Unnamed organisation'}
      subtitle={org && subtitleFor(org)}
      sections={SECTIONS}
      panels={PANELS}
      row={org}
      isLoading={isLoading}
      missingLabel="organisation"
      backLink={{ to: '/organisations', label: 'Back to Organisations' }}
    />
  )
}
