import { useParams } from 'react-router-dom'
import { useDeal } from '../hooks/useDeals'
import DetailShell from '../components/detail/DetailShell'
import { SECTIONS } from '../features/deals/detailFields'
import { PANELS } from '../features/deals/relatedPanels'

/** Stage and counterparty are what distinguish one deal from another at a
 *  glance, so they carry the subtitle. Either can be absent in the mirror. */
function subtitleFor(deal) {
  return [deal.stage, deal.organisation?.name].filter(Boolean).join(' · ')
}

export default function DealDetailPage() {
  const { id } = useParams()
  const { data: deal, isLoading } = useDeal(id)

  return (
    <DetailShell
      title={deal?.title || 'Untitled deal'}
      subtitle={deal && subtitleFor(deal)}
      sections={SECTIONS}
      panels={PANELS}
      row={deal}
      isLoading={isLoading}
      missingLabel="deal"
      backLink={{ to: '/deals', label: 'Back to Deals' }}
    />
  )
}
