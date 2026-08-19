import { useParams } from 'react-router-dom'
import { useDeal } from '../hooks/useDeals'
import DetailShell from '../components/detail/DetailShell'
import { SECTIONS } from '../features/deals/detailFields'
import { PANELS } from '../features/deals/relatedPanels'

export default function DealDetailPage() {
  const { id } = useParams()
  const { data: deal, isLoading } = useDeal(id)

  if (isLoading) return <div style={{ padding: 40 }}>Loading...</div>
  if (!deal) return <div style={{ padding: 40 }}>Deal not found.</div>

  return (
    <DetailShell
      title="Deal Information"
      breadcrumb={{ to: '/deals', label: 'Deals', trail: ' > View Deal Details.' }}
      sections={SECTIONS}
      panels={PANELS}
      row={deal}
      backLink={{ to: '/deals', label: 'Back to Deals' }}
    />
  )
}
