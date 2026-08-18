import { useNavigate } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import TableShell from '../components/table/TableShell'
import { useTableState } from '../components/table/useTableState'
import { CONTACT_COLUMNS, contactStats } from '../features/contacts/columns'

const SEARCH_KEYS = ['name', 'email', 'phone', 'organisation.name', 'job_title']

export default function ContactsPage() {
  const { data: contacts = [], isLoading, isError, error } = useContacts()
  const navigate = useNavigate()

  const table = useTableState({
    rows: contacts,
    columns: CONTACT_COLUMNS,
    storageKey: 'contacts',
    searchKeys: SEARCH_KEYS,
    defaultSort: { key: 'name', dir: 'asc' },
    defaultPerPage: 25,
  })

  return (
    <TableShell
      title="Contacts"
      subtitle="Mirrored from Pipedrive"
      stats={contactStats(table.filteredRows)}
      table={table}
      columns={CONTACT_COLUMNS}
      getRowKey={contact => contact.id}
      onRowClick={contact => navigate(`/contacts/${contact.id}`)}
      emptyMessage="No contacts found."
      searchPlaceholder="Search contacts, emails, organisations…"
      exportFilename="contacts"
      isLoading={isLoading}
      error={isError ? error : null}
    />
  )
}
