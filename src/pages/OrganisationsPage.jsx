import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrganisations } from '../hooks/useOrganisations'
import ExportModal from '../components/ExportModal'

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export default function OrganisationsPage() {
  const { data: orgs = [], isLoading } = useOrganisations()
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(100)
  const [showExport, setShowExport] = useState(false)

  const filtered = orgs.filter(o =>
    !searchTerm || (o.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const start = (safePage - 1) * perPage
  const paginated = filtered.slice(start, start + perPage)

  function handleSearch() {
    setSearchTerm(searchInput)
    setCurrentPage(1)
  }

  function handlePerPageChange(e) {
    setPerPage(Number(e.target.value))
    setCurrentPage(1)
  }

  return (
    <div style={{ padding: 24 }}>
      {showExport && (
        <ExportModal data={filtered} filename="organisations" onClose={() => setShowExport(false)} />
      )}
      <div style={{ background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search organisations..."
            style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', fontSize: 13, width: 240 }}
          />
          <button
            onClick={handleSearch}
            style={{ background: 'var(--nav)', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
          >
            Search
          </button>
          <button
            style={{ background: '#fff', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}
          >
            Add filters
          </button>
        </div>

        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Showing {filtered.length === 0 ? 0 : start + 1}–{Math.min(start + perPage, filtered.length)} of {filtered.length}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowExport(true)}
              style={{ background: 'var(--nav)', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 12px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <DownloadIcon /> Export
            </button>
            <select value={perPage} onChange={handlePerPageChange} style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 13 }}>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <select
              value={safePage}
              onChange={e => setCurrentPage(Number(e.target.value))}
              style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 13 }}
            >
              {Array.from({ length: totalPages }, (_, i) => (
                <option key={i + 1} value={i + 1}>Page {i + 1}</option>
              ))}
            </select>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              style={{ border: '1px solid var(--border)', background: '#fff', borderRadius: 4, padding: '4px 8px', cursor: safePage <= 1 ? 'default' : 'pointer', opacity: safePage <= 1 ? 0.5 : 1 }}
            >
              &lt;
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              style={{ border: '1px solid var(--border)', background: '#fff', borderRadius: 4, padding: '4px 8px', cursor: safePage >= totalPages ? 'default' : 'pointer', opacity: safePage >= totalPages ? 0.5 : 1 }}
            >
              &gt;
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['View', 'Organisation', 'Address', 'Company Status', 'Website', 'Contacts'].map(col => (
                    <th key={col} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text)', background: '#f9fafb', whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((org, i) => (
                  <tr
                    key={org.id}
                    style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f9fafb'}
                  >
                    <td style={{ padding: '8px 12px' }}>
                      <button
                        onClick={() => navigate(`/organisations/${org.id}`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', display: 'flex', alignItems: 'center' }}
                        title="View organisation"
                      >
                        <EyeIcon />
                      </button>
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{org.name}</td>
                    <td style={{ padding: '8px 12px' }}>{org.address}</td>
                    <td style={{ padding: '8px 12px' }}>{org.company_status}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {org.website ? (
                        <a href={org.website} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{org.website}</a>
                      ) : ''}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {(org.contacts || []).map(c => c.name).join(', ')}
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No organisations found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
