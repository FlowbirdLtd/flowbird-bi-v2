import { useNavigate } from 'react-router-dom'
import { useOrganisations } from '../hooks/useOrganisations'
import TableShell from '../components/table/TableShell'
import { useTableState } from '../components/table/useTableState'
import { ORGANISATION_COLUMNS, organisationStats } from '../features/organisations/columns'

const SEARCH_KEYS = ['name', 'address', 'company_status', 'fca_number']

export default function OrganisationsPage() {
  const { data: organisations = [], isLoading, isError, error } = useOrganisations()
  const navigate = useNavigate()

  const table = useTableState({
    rows: organisations,
    columns: ORGANISATION_COLUMNS,
    storageKey: 'organisations',
    searchKeys: SEARCH_KEYS,
    defaultSort: { key: 'name', dir: 'asc' },
    defaultPerPage: 100,
  })

  return (
    <TableShell
      title="Organisations"
      subtitle="Companies and accounts on file"
      stats={organisationStats(table.filteredRows)}
      table={table}
      columns={ORGANISATION_COLUMNS}
      getRowKey={org => org.id}
      onRowClick={org => navigate(`/organisations/${org.id}`)}
      emptyMessage="No organisations found."
      searchPlaceholder="Search organisations, addresses…"
      exportFilename="organisations"
      isLoading={isLoading}
      error={isError ? error : null}
    />
  )
}
