import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { platform } from '../lib/platformClient'
import { useAuth } from '../contexts/AuthContext'

const inputStyle = {
  border: '1px solid var(--border)', borderRadius: 4,
  padding: '8px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box',
}
const labelStyle = { fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'block' }
const fieldWrap = { marginBottom: 16 }

const SEARCH_FIELDS = {
  organisations: [
    { value: 'pipedrive_id', label: 'Pipedrive Company ID', placeholder: 'e.g. 12345' },
    { value: 'name',         label: 'Company Name',         placeholder: 'e.g. Acme Corp' },
  ],
  contacts: [
    { value: 'pipedrive_id', label: 'Pipedrive Person ID',  placeholder: 'e.g. 12345' },
    { value: 'email',        label: 'Email Address',        placeholder: 'e.g. john@example.com' },
  ],
  deals: [
    { value: 'pipedrive_id', label: 'Pipedrive Deal ID',    placeholder: 'e.g. 12345' },
    { value: 'title',        label: 'Deal Title',           placeholder: 'e.g. Acquisition Deal' },
  ],
}

const NAV_ITEMS = [
  { key: 'profile',      label: 'My Profile' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'import',       label: 'Import' },
]

const IMPORT_TARGETS = {
  organisations: { table: 'organisations', conflict: 'org_pipedrive_id' },
  contacts:      { table: 'contacts',      conflict: 'contact_pipedrive_id' },
  deals:         { table: 'deals',         conflict: 'deal_pipedrive_id' },
}

// Columns that must be mapped (and non-empty per row) for each type:
// the Pipedrive ID is the upsert identity and NOT NULL in the database.
const REQUIRED_COLUMNS = {
  organisations: ['org_pipedrive_id'],
  contacts:      ['contact_pipedrive_id'],
  deals:         ['deal_pipedrive_id'],
}

// FK columns per import type — values must exist in the referenced table,
// otherwise the row's link is cleared before upserting.
const IMPORT_FK_CHECKS = {
  contacts: [
    { column: 'organisation_id', table: 'organisations', refColumn: 'org_pipedrive_id', label: 'organisation' },
  ],
  deals: [
    { column: 'contact_id',      table: 'contacts',      refColumn: 'contact_pipedrive_id', label: 'contact' },
    { column: 'organisation_id', table: 'organisations', refColumn: 'org_pipedrive_id',     label: 'organisation' },
  ],
}

const DB_COLUMNS = {
  organisations: [
    'org_pipedrive_id','name','address','company_status','website',
    'vendor_ownership_structure','authorisation_status','fca_number','id_urn','date_created',
  ],
  contacts: [
    'contact_pipedrive_id','name','email','phone','age','job_title','date_created','organisation_id',
  ],
  deals: [
    'deal_pipedrive_id','title','value','weighted_value','currency','expected_close_date',
    'contact_id','organisation_id','stage','pipeline','status','owner','probability','label','date_created',
    'basis_of_deal','deal_size','vendor_ownership_structure','deal_source',
    'latest_status_acquisition_committee','deal_address','fdd_lead','deal_lead',
    'acquisition_type','deal_structure','payment_schedule','completion_payment',
    'headline_consideration','ri_multiple','net_turnover_multiple','ebitda_multiple',
    'ebitda_multiple_post_cambridge','introduction_date','first_meeting_date','offer_made_date',
    'hots_issued_date','hots_signed_date','date_dd_completed','deal_exchanged_date','deal_complete_date',
    'introductory_company','introductory_contact','broker_fee_type','broker_fee_value','network_name',
    'law_firm_sell_side','lawyer_contact_sell_side','law_firm_buy_side','lawyer_contact_buy_side','legal_team_lead',
    'ri_adviser','nb_adviser','latest_recurring_income','latest_new_business','latest_turnover',
    'organic_growth_ri_pct','forecast_recurring_income','forecast_new_business','forecast_turnover',
    'expected_adviser_cost','existing_ebitda','perspective_ebitda','perspective_ebitda_post_cambridge',
    'ebitda_margin_pct','assets_under_advice','expected_cambridge_opportunity_aum',
    'expected_cambridge_opportunity_ebitda','households_per_adviser','support_staff_to_advisor_cost_ratio_pct',
    'board_report_issued','target_exchange','target_completion','confirmed_completion',
    'confirmed_completion_text','fdd_rdd_kickoff_call','fdd_irl_sent','db_suitability_redress_review_complete',
    'rdd_data_book_complete','file_review_sample_non_db_complete','rdd_question_pack_response_received',
    'fdd_additional_data_request_sent','snapshot_email_circulated','fdd_question_pack_sent',
    'fdd_question_pack_call','lawyers_appointed','adviser_contracts_requested','spa_issued',
    'spa_markup_received','hr_ops_dd_complete','fdd_report_drafted','rdd_report_drafted',
    'fdd_report_reviewed','rdd_report_reviewed','ldd_finalised','fdd_rdd_reports_approved',
    'number_of_clients','number_of_households','aua_per_household','aua_per_client',
    'average_age_of_clients','average_age_of_clients_weighted','typical_initial_fee',
    'typical_oac_pct_fixed_fees','platforms',
    'number_of_advisers_required','number_of_employed_advisors_retained',
    'number_of_self_employed_advisors_retained','number_of_paraplanners_retained',
    'number_of_administrators_retained','number_of_other_staff_retained',
    'number_of_staff_exiting_on_completion','number_of_staff_redeployed_to_group_roles',
    'recruitment_requirements','people_team_lead','adviser_contracts_sent','eli_sent','eli_received',
    'tupe_measures_sent','contact_2_name','contact_2_phone','contact_2_email',
    'contact_3_name','contact_3_phone','contact_3_email',
    'details_of_property','lease_details','ownership_of_property','post_acquisition_office_plans',
    'fca_pi_pct','variable_cost_pct','fixed_costs',
    'rdd_lead','defined_benefit_transfers','defined_benefit_transfer_total',
    'other_regulatory_items_of_note','consumer_duty_plan_signed_off','cic_submitted',
    'cic_submitted_date','deauthorisation_application_submitted','deauthorisation_target_date','deauthorisation_approved',
    'perspective_regional_director','perspective_regional_manager','perspective_principal',
    'perspective_trading_style_registered','agreed_perspective_trading_style','receiving_office',
    'perspective_entity','back_office_system','document_management_system','other_integration_notes',
    'client_letter_status','mailing_data_status','regional_director_introduction','integration_kickoff_date',
    'data_meeting_held','core_compliance_ca_request_sent','first_data_request_response_received',
    'client_letter_sign_off_completed','repapering_finalised_date','printing_and_delivery_date',
    'perspective_project_manager','data_team_lead','client_portal','ai_solutions',
    'date_declined','loss_driver','reason_for_decline','reason_for_decline_detail','other_player_sold_to',
    'source_origin','source_channel','deal_lead_bi','flowbird_bi_id','database_record','remove_flag',
  ],
}

// Columns with a `date` type in the database — their CSV values must be
// converted to ISO format before upserting.
const DATE_COLUMNS = {
  organisations: ['date_created'],
  contacts: ['date_created'],
  deals: [
    'expected_close_date','date_created',
    'introduction_date','first_meeting_date','offer_made_date','hots_issued_date',
    'hots_signed_date','date_dd_completed','deal_exchanged_date','deal_complete_date',
    'board_report_issued','target_exchange','target_completion','confirmed_completion',
    'fdd_rdd_kickoff_call','fdd_irl_sent','db_suitability_redress_review_complete',
    'rdd_data_book_complete','file_review_sample_non_db_complete','rdd_question_pack_response_received',
    'fdd_additional_data_request_sent','snapshot_email_circulated','fdd_question_pack_sent',
    'fdd_question_pack_call','lawyers_appointed','spa_issued','spa_markup_received',
    'hr_ops_dd_complete','fdd_report_drafted','rdd_report_drafted','fdd_report_reviewed',
    'rdd_report_reviewed','ldd_finalised','fdd_rdd_reports_approved',
    'adviser_contracts_sent','eli_sent','eli_received','tupe_measures_sent',
    'cic_submitted_date','deauthorisation_application_submitted','deauthorisation_target_date',
    'deauthorisation_approved','integration_kickoff_date','data_meeting_held',
    'core_compliance_ca_request_sent','first_data_request_response_received',
    'client_letter_sign_off_completed','repapering_finalised_date','printing_and_delivery_date',
    'date_declined',
  ],
}

// Convert a CSV date value to ISO "YYYY-MM-DD" for date-typed columns.
// Accepts "DD/MM/YYYY" (UK format, as exported by Pipedrive) or "YYYY-MM-DD",
// with or without a trailing time part. Anything else (e.g. "TBC") becomes
// null so a stray value doesn't fail the whole import.
function toISODate(val) {
  if (val == null) return null
  const s = String(val).trim()
  const uk = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (uk) return `${uk[3]}-${uk[2].padStart(2, '0')}-${uk[1].padStart(2, '0')}`
  const iso = s.match(/^\d{4}-\d{2}-\d{2}/)
  if (iso) return iso[0]
  return null
}

// Columns stored as GBP currency strings ("£237,000.00") — matches the
// formatting the sync-pipedrive edge function applies to the same columns.
const CURRENCY_COLUMNS = {
  organisations: [],
  contacts: [],
  deals: [
    'value','completion_payment','headline_consideration','ri_adviser','nb_adviser',
    'latest_recurring_income','latest_new_business','latest_turnover',
    'forecast_recurring_income','forecast_new_business','forecast_turnover',
    'expected_adviser_cost','existing_ebitda','perspective_ebitda',
    'perspective_ebitda_post_cambridge','assets_under_advice',
    'expected_cambridge_opportunity_aum','expected_cambridge_opportunity_ebitda',
    'aua_per_household','aua_per_client','fixed_costs','defined_benefit_transfer_total',
    'broker_fee_value',
  ],
}

// Format a CSV value as a GBP string, e.g. "237000" → "£237,000.00".
// Accepts raw numbers or already-formatted values ("£237,000.00", "237,000.5");
// non-numeric values are returned unchanged.
function toGBP(val) {
  if (val == null) return null
  const cleaned = String(val).trim().replace(/^£/, '').replace(/,/g, '')
  if (cleaned === '' || isNaN(Number(cleaned))) return val
  const [intPart, decPart] = (Math.round(Number(cleaned) * 100) / 100).toFixed(2).split('.')
  return '£' + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + decPart
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return null
  const parseRow = (line) => {
    const result = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(cur); cur = ''
      } else {
        cur += ch
      }
    }
    result.push(cur)
    return result
  }
  const headers = parseRow(lines[0]).map(h => h.trim())
  const rows = lines.slice(1).map(line => {
    const vals = parseRow(line)
    const obj = {}
    headers.forEach((h, i) => {
      const v = (vals[i] ?? '').trim()
      obj[h] = v === '' ? null : v
    })
    return obj
  })
  return { headers, rows }
}

function Feedback({ msg }) {
  if (!msg) return null
  const isSuccess = msg.type === 'success'
  return (
    <div style={{
      background: isSuccess ? '#f0fdf4' : '#fef2f2',
      border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`,
      borderRadius: 4, padding: '8px 12px', fontSize: 13,
      color: isSuccess ? '#15803d' : '#b91c1c', marginBottom: 16,
    }}>
      {msg.text}
    </div>
  )
}

function PrimaryBtn({ onClick, disabled, children, style = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? '#6b7280' : '#111827',
        color: '#fff', border: 'none', borderRadius: 4,
        padding: '9px 20px', fontSize: 13,
        cursor: disabled ? 'default' : 'pointer', fontWeight: 600,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// Searchable dropdown for column mapping. The panel is position:fixed so it
// isn't clipped by the scrollable mapping table; it closes on outside
// click/scroll/resize since its coordinates are captured at open time.
function SearchableSelect({ value, options, onChange, invalid }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const btnRef = useRef(null)
  const panelRef = useRef(null)
  const searchRef = useRef(null)

  const PANEL_H = 260

  function openPanel() {
    const r = btnRef.current.getBoundingClientRect()
    const openUp = window.innerHeight - r.bottom < PANEL_H && r.top > PANEL_H
    setPos({ top: openUp ? r.top - PANEL_H - 4 : r.bottom + 4, left: r.left, width: r.width })
    setQuery('')
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    function onDown(e) {
      if (panelRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setOpen(false)
    }
    function onScroll(e) {
      if (panelRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const filtered = options.filter(o => o.toLowerCase().includes(query.trim().toLowerCase()))

  function pick(val) {
    onChange(val)
    setOpen(false)
  }

  const optionStyle = (selected) => ({
    display: 'block', width: '100%', textAlign: 'left', border: 'none',
    padding: '6px 10px', fontSize: 12, cursor: 'pointer',
    background: selected ? '#eff4ff' : 'transparent',
    color: selected ? 'var(--accent)' : 'var(--text)',
    fontWeight: selected ? 700 : 400,
  })

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : openPanel())}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          border: `1px solid ${invalid ? '#fca5a5' : 'var(--border)'}`,
          borderRadius: 4, padding: '5px 8px', fontSize: 12,
          background: invalid ? '#fff7f7' : '#fff', cursor: 'pointer', width: '100%',
          color: value ? 'var(--text)' : 'var(--text-muted)', textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || "— Don't import —"}
        </span>
        <span style={{ fontSize: 9, flexShrink: 0, color: 'var(--text-muted)' }}>▼</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
            zIndex: 1000, background: '#fff', border: '1px solid var(--border)',
            borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', overflow: 'hidden',
          }}
        >
          <div style={{ padding: 6, borderBottom: '1px solid var(--border)' }}>
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') setOpen(false)
                if (e.key === 'Enter' && filtered.length > 0) pick(filtered[0])
              }}
              placeholder="Search columns…"
              style={{
                width: '100%', boxSizing: 'border-box', border: '1px solid var(--border)',
                borderRadius: 4, padding: '5px 8px', fontSize: 12,
              }}
            />
          </div>
          <div style={{ maxHeight: PANEL_H - 60, overflowY: 'auto' }}>
            <button
              type="button"
              onClick={() => pick('')}
              onMouseEnter={e => { if (value) e.currentTarget.style.background = '#f3f4f6' }}
              onMouseLeave={e => { if (value) e.currentTarget.style.background = 'transparent' }}
              style={{ ...optionStyle(!value), fontStyle: 'italic' }}
            >
              — Don't import —
            </button>
            {filtered.map(col => (
              <button
                key={col}
                type="button"
                onClick={() => pick(col)}
                onMouseEnter={e => { if (col !== value) e.currentTarget.style.background = '#f3f4f6' }}
                onMouseLeave={e => { if (col !== value) e.currentTarget.style.background = 'transparent' }}
                style={optionStyle(col === value)}
              >
                {col}
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
                No matching columns
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function AccountSettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('profile')

  const { data: profile } = useQuery({
    queryKey: ['users', user?.id],
    queryFn: async () => {
      const { data, error } = await platform.from('users').select('*').eq('id', user.id).single()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  // Visibility rules: My Profile — everyone; Import — Admin and Developer;
  // Integrations — Developer only.
  const perms = profile?.user_permissions ?? []
  const isDeveloper = perms.includes('Developer')
  const canManage = isDeveloper || perms.includes('Admin')
  const navItems = NAV_ITEMS.filter(item => {
    if (item.key === 'integrations') return isDeveloper
    if (item.key === 'import') return canManage
    return true
  })

  // Profile form
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '' })
  const [profileMsg, setProfileMsg] = useState(null)

  // Password form
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' })
  const [pwMsg, setPwMsg] = useState(null)

  // Pipedrive
  const [pipedriveToken, setPipedriveToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [pipedriveMsg, setPipedriveMsg] = useState(null)
  const [syncResults, setSyncResults] = useState({ organisations: null, contacts: null, deals: null })

  // Single-record sync
  const [singleType,  setSingleType]  = useState('organisations')
  const [singleField, setSingleField] = useState('pipedrive_id')
  const [singleValue, setSingleValue] = useState('')
  const [singleMsg,   setSingleMsg]   = useState(null)

  // Import
  const [importType,     setImportType]     = useState('organisations')
  const [importParsed,   setImportParsed]   = useState(null)
  const [importFileName, setImportFileName] = useState(null)
  const [importMappings, setImportMappings] = useState({})
  const [importMsg,      setImportMsg]      = useState(null)
  const [importing,      setImporting]      = useState(false)
  const [importProgress, setImportProgress] = useState(null)

  const { data: importHistory = [] } = useQuery({
    queryKey: ['import_history'],
    queryFn: async () => {
      const { data, error } = await platform
        .from('import_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (!profile) return
    const parts = (profile.name || '').split(' ')
    setProfileForm({
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      email: profile.email || '',
    })
    setPipedriveToken(profile.pipedrive_api_token || '')
  }, [profile?.id])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const profileMutation = useMutation({
    mutationFn: async () => {
      const fullName = `${profileForm.firstName.trim()} ${profileForm.lastName.trim()}`.trim()
      const { data, error } = await platform.functions.invoke('manage-user', {
        body: { action: 'update-self', name: fullName, email: profileForm.email.trim() },
      })
      if (error) throw new Error(error.message ?? 'Failed to reach the edge function')
      if (data?.error) throw new Error(data.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', user.id] })
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
    },
    onError: (err) => setProfileMsg({ type: 'error', text: err.message }),
  })

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!pwForm.newPassword) throw new Error('Enter a new password')
      if (pwForm.newPassword.length < 8) throw new Error('Password must be at least 8 characters')
      if (pwForm.newPassword !== pwForm.confirmPassword) throw new Error('Passwords do not match')
      const { error } = await platform.auth.updateUser({ password: pwForm.newPassword })
      if (error) throw error
    },
    onSuccess: () => {
      setPwForm({ newPassword: '', confirmPassword: '' })
      setPwMsg({ type: 'success', text: 'Password updated successfully.' })
    },
    onError: (err) => setPwMsg({ type: 'error', text: err.message }),
  })

  const saveTokenMutation = useMutation({
    mutationFn: async () => {
      const { error } = await platform
        .from('users')
        .update({ pipedrive_api_token: pipedriveToken.trim() })
        .eq('id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', user.id] })
      setPipedriveMsg({ type: 'success', text: 'API token saved.' })
    },
    onError: (err) => setPipedriveMsg({ type: 'error', text: err.message }),
  })

  const syncMutation = useMutation({
    mutationFn: async (type) => {
      const { data, error } = await platform.functions.invoke('sync-pipedrive', { body: { type } })
      if (error) throw new Error(error.message ?? 'Failed to reach the edge function')
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users', user.id] })
      queryClient.invalidateQueries({ queryKey: [data.type] })
      setSyncResults(prev => ({ ...prev, [data.type]: data.synced[data.type] }))
      setPipedriveMsg({ type: 'success', text: `${cap(data.type)} synced successfully.` })
    },
    onError: (err) => setPipedriveMsg({ type: 'error', text: err.message }),
  })

  const singleSyncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await platform.functions.invoke('sync-pipedrive', {
        body: { type: singleType, search: { field: singleField, value: singleValue.trim() } },
      })
      if (error) throw new Error(error.message ?? 'Failed to reach the edge function')
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [singleType] })
      setSingleMsg({ type: 'success', text: `Synced: "${data.record.label}"` })
      setSingleValue('')
    },
    onError: (err) => setSingleMsg({ type: 'error', text: err.message }),
  })

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1) }

  const tokenSaved = !!profile?.pipedrive_api_token

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportMsg(null)
    setImportProgress(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result)
      if (!parsed || parsed.rows.length === 0) {
        setImportMsg({ type: 'error', text: 'Could not parse file. Ensure it is a valid CSV with a header row.' })
        setImportParsed(null)
        setImportMappings({})
      } else {
        setImportParsed(parsed)
        const dbCols = DB_COLUMNS[importType]
        const auto = {}
        for (const h of parsed.headers) {
          auto[h] = dbCols.includes(h) ? h : ''
        }
        setImportMappings(auto)
      }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!importParsed) return
    const { table, conflict } = IMPORT_TARGETS[importType]
    const BATCH = 100
    const dateCols = new Set(DATE_COLUMNS[importType] ?? [])
    const currencyCols = new Set(CURRENCY_COLUMNS[importType] ?? [])
    const transformedRows = importParsed.rows.map(row => {
      const obj = {}
      Object.entries(importMappings).forEach(([csvCol, dbCol]) => {
        if (!dbCol) return
        obj[dbCol] = dateCols.has(dbCol) ? toISODate(row[csvCol])
          : currencyCols.has(dbCol) ? toGBP(row[csvCol])
          : row[csvCol]
      })
      return obj
    }).filter(row => Object.keys(row).length > 0)
    if (transformedRows.length === 0) {
      setImportMsg({ type: 'error', text: 'No columns are mapped. Assign at least one database column before importing.' })
      return
    }

    // The Pipedrive ID (and any other NOT NULL column) must be mapped —
    // without it the upsert cannot identify records and the insert fails.
    const required = REQUIRED_COLUMNS[importType] ?? []
    const mappedCols = new Set(Object.values(importMappings).filter(Boolean))
    const missingReq = required.filter(c => !mappedCols.has(c))
    if (missingReq.length > 0) {
      setImportMsg({ type: 'error', text: `Required column${missingReq.length > 1 ? 's' : ''} not mapped: ${missingReq.join(', ')}. Map ${missingReq.join(' and ')} to a CSV column before importing.` })
      return
    }

    // Skip rows with an empty value in a required column (e.g. a blank ID cell)
    const validRows = transformedRows.filter(r => required.every(c => r[c] != null && String(r[c]).trim() !== ''))
    const skippedCount = transformedRows.length - validRows.length
    if (validRows.length === 0) {
      setImportMsg({ type: 'error', text: `No rows have a value for ${required.join(' and ')} — nothing to import.` })
      return
    }

    setImporting(true)
    setImportMsg(null)
    setImportProgress({ done: 0, total: validRows.length })
    try {
      // Validate FK columns: clear links whose value has no matching row in the
      // referenced table, otherwise the upsert fails with an FK violation.
      const clearedNotes = []
      if (skippedCount > 0) {
        clearedNotes.push(`${skippedCount} row${skippedCount !== 1 ? 's' : ''} skipped (empty ${required.join('/')})`)
      }
      for (const fk of IMPORT_FK_CHECKS[importType] ?? []) {
        const values = [...new Set(validRows.map(r => r[fk.column]).filter(Boolean))]
        if (values.length === 0) continue
        const existing = new Set()
        for (let i = 0; i < values.length; i += 500) {
          const { data, error } = await platform
            .from(fk.table)
            .select(fk.refColumn)
            .in(fk.refColumn, values.slice(i, i + 500))
          if (error) throw error
          data.forEach(r => existing.add(r[fk.refColumn]))
        }
        let cleared = 0
        for (const row of validRows) {
          if (row[fk.column] && !existing.has(row[fk.column])) {
            row[fk.column] = null
            cleared++
          }
        }
        if (cleared > 0) {
          clearedNotes.push(`${cleared} ${fk.label} link${cleared !== 1 ? 's' : ''} cleared (no matching ${fk.label} in the database)`)
        }
      }

      for (let i = 0; i < validRows.length; i += BATCH) {
        const batch = validRows.slice(i, i + BATCH)
        const { error } = await platform.from(table).upsert(batch, { onConflict: conflict })
        if (error) throw error
        setImportProgress({ done: Math.min(i + BATCH, validRows.length), total: validRows.length })
      }
      queryClient.invalidateQueries({ queryKey: [importType] })

      // Record in import history, keeping only the 10 most recent entries.
      // Failure here must not fail the import itself.
      try {
        await platform.from('import_history').insert({
          file_name: importFileName,
          object_type: importType,
          row_count: validRows.length,
          imported_by: profile?.name ?? user?.email ?? null,
        })
        const { data: old } = await platform
          .from('import_history')
          .select('id')
          .order('created_at', { ascending: false })
          .range(10, 999)
        if (old?.length) {
          await platform.from('import_history').delete().in('id', old.map(r => r.id))
        }
        queryClient.invalidateQueries({ queryKey: ['import_history'] })
      } catch (histErr) {
        console.warn('Could not record import history:', histErr.message)
      }

      setImportMsg({
        type: 'success',
        text: `${validRows.length} record${validRows.length !== 1 ? 's' : ''} imported into ${cap(importType)}.`
          + (clearedNotes.length ? ` ${clearedNotes.join('. ')}.` : ''),
      })
      setImportParsed(null)
      setImportMappings({})
      setImportProgress(null)
    } catch (err) {
      setImportMsg({ type: 'error', text: err.message })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: 'var(--text)' }}>
        Account Settings
      </h1>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* ── Left nav ───────────────────────────────────────────────────────── */}
        <div style={{
          width: 200, flexShrink: 0,
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 8, overflow: 'hidden',
        }}>
          {navItems.map((item, i) => {
            const isActive = activeTab === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                style={{
                  display: 'flex', alignItems: 'center', width: '100%',
                  padding: '12px 16px', fontSize: 13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--accent)' : 'var(--text)',
                  background: isActive ? '#eff4ff' : 'transparent',
                  border: 'none', borderBottom: i < navItems.length - 1 ? '1px solid var(--border)' : 'none',
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        {/* ── Right content ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ── My Profile ─────────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{
                padding: '14px 20px', background: '#f3f4f6',
                borderBottom: '1px solid var(--border)',
                borderRadius: '8px 8px 0 0', fontWeight: 700, fontSize: 15,
              }}>
                My Profile
              </div>
              <div style={{ padding: '24px 24px 28px' }}>

                <div style={fieldWrap}>
                  <label style={labelStyle}>
                    Name <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      value={profileForm.firstName}
                      onChange={e => setProfileForm(f => ({ ...f, firstName: e.target.value }))}
                      placeholder="First"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <input
                      value={profileForm.lastName}
                      onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))}
                      placeholder="Last"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                  </div>
                </div>

                <div style={{ ...fieldWrap, marginBottom: 20 }}>
                  <label style={labelStyle}>
                    Email <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <Feedback msg={profileMsg} />
                <PrimaryBtn
                  onClick={() => { setProfileMsg(null); profileMutation.mutate() }}
                  disabled={profileMutation.isPending}
                >
                  {profileMutation.isPending ? 'Saving…' : 'Save Profile'}
                </PrimaryBtn>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '28px 0' }} />

                <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>
                  Change Password
                </p>

                <div style={fieldWrap}>
                  <label style={labelStyle}>New Password</label>
                  <input
                    type="password"
                    value={pwForm.newPassword}
                    onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                    placeholder="Min. 8 characters"
                    style={inputStyle}
                  />
                </div>

                <div style={{ ...fieldWrap, marginBottom: 20 }}>
                  <label style={labelStyle}>Confirm Password</label>
                  <input
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <Feedback msg={pwMsg} />
                <PrimaryBtn
                  onClick={() => { setPwMsg(null); passwordMutation.mutate() }}
                  disabled={passwordMutation.isPending || !pwForm.newPassword}
                >
                  {passwordMutation.isPending ? 'Updating…' : 'Update Password'}
                </PrimaryBtn>

              </div>
            </div>
          )}

          {/* ── Integrations ───────────────────────────────────────────────── */}
          {activeTab === 'integrations' && isDeveloper && (
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{
                padding: '14px 20px', background: '#f3f4f6',
                borderBottom: '1px solid var(--border)',
                borderRadius: '8px 8px 0 0', fontWeight: 700, fontSize: 15,
              }}>
                Integrations
              </div>
              <div style={{ padding: '24px 24px 28px' }}>

                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>

                  {/* Pipedrive header */}
                  <div style={{
                    padding: '14px 18px', background: '#f9f9f9',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 6,
                      background: '#017737',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 15, fontWeight: 800, flexShrink: 0,
                      letterSpacing: '-0.5px',
                    }}>
                      PD
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                        Pipedrive
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                        Sync your CRM data into Flowbird BI
                      </div>
                    </div>
                    {tokenSaved && (
                      <div style={{
                        marginLeft: 'auto', fontSize: 11, fontWeight: 600,
                        color: '#15803d', background: '#f0fdf4',
                        border: '1px solid #bbf7d0', borderRadius: 12,
                        padding: '3px 10px',
                      }}>
                        Connected
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '18px 18px 22px' }}>

                    <div style={{ ...fieldWrap, marginBottom: 14 }}>
                      <label style={labelStyle}>API Token</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type={showToken ? 'text' : 'password'}
                          value={pipedriveToken}
                          onChange={e => setPipedriveToken(e.target.value)}
                          placeholder="Paste your Pipedrive API token"
                          style={{
                            ...inputStyle, flex: 1,
                            fontFamily: showToken && pipedriveToken ? 'monospace' : 'inherit',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(s => !s)}
                          style={{
                            border: '1px solid var(--border)', borderRadius: 4, background: '#fff',
                            padding: '0 12px', cursor: 'pointer', fontSize: 12, color: '#6b7280',
                            whiteSpace: 'nowrap', flexShrink: 0,
                          }}
                        >
                          {showToken ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 5, marginBottom: 0 }}>
                        Find your token in Pipedrive → Settings → Personal preferences → API.
                      </p>
                    </div>

                    <Feedback msg={pipedriveMsg} />

                    <PrimaryBtn
                      onClick={() => { setPipedriveMsg(null); saveTokenMutation.mutate() }}
                      disabled={saveTokenMutation.isPending || !pipedriveToken.trim()}
                      style={{ marginBottom: 22 }}
                    >
                      {saveTokenMutation.isPending ? 'Saving…' : 'Save Token'}
                    </PrimaryBtn>

                    {/* Per-object sync panel */}
                    <div style={{
                      background: '#f9fafb', border: '1px solid var(--border)',
                      borderRadius: 6, overflow: 'hidden',
                    }}>
                      <div style={{
                        padding: '10px 16px', borderBottom: '1px solid var(--border)',
                        fontSize: 12, color: '#6b7280',
                      }}>
                        Last synced:{' '}
                        <strong style={{ color: 'var(--text)' }}>
                          {profile?.pipedrive_last_synced_at
                            ? new Date(profile.pipedrive_last_synced_at).toLocaleString('en-GB')
                            : 'Never'}
                        </strong>
                      </div>

                      {[
                        { type: 'organisations', label: 'Organisations' },
                        { type: 'contacts',      label: 'Contacts' },
                        { type: 'deals',         label: 'Deals' },
                      ].map(({ type, label }) => {
                        const isActive = syncMutation.isPending && syncMutation.variables === type
                        const result = syncResults[type]
                        return (
                          <div
                            key={type}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderBottom: type !== 'deals' ? '1px solid var(--border)' : 'none',
                              background: isActive ? '#f0f9ff' : 'transparent',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                {label}
                              </div>
                              {result != null && (
                                <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>
                                  {result} record{result !== 1 ? 's' : ''} synced
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => { setPipedriveMsg(null); syncMutation.mutate(type) }}
                              disabled={syncMutation.isPending || !tokenSaved}
                              style={{
                                background: isActive ? '#6b7280' : 'var(--nav)',
                                color: '#fff', border: 'none', borderRadius: 4,
                                padding: '6px 14px', fontSize: 12,
                                cursor: (syncMutation.isPending || !tokenSaved) ? 'default' : 'pointer',
                                fontWeight: 600, opacity: !tokenSaved ? 0.4 : 1,
                                whiteSpace: 'nowrap', flexShrink: 0,
                              }}
                            >
                              {isActive ? 'Syncing…' : `Sync ${label}`}
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    {!tokenSaved && (
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, marginBottom: 0 }}>
                        Save an API token above to enable sync.
                      </p>
                    )}

                  </div>

                  {/* Single Record Sync */}
                  <div style={{ borderTop: '1px solid var(--border)', padding: '18px 18px 20px' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: 'var(--text)' }}>
                      Sync Single Record
                    </p>

                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...labelStyle, marginBottom: 4 }}>Object Type</label>
                        <select
                          value={singleType}
                          onChange={e => {
                            const t = e.target.value
                            setSingleType(t)
                            setSingleField(SEARCH_FIELDS[t][0].value)
                            setSingleValue('')
                            setSingleMsg(null)
                          }}
                          style={{ ...inputStyle, cursor: 'pointer' }}
                        >
                          <option value="organisations">Organisation</option>
                          <option value="contacts">Contact</option>
                          <option value="deals">Deal</option>
                        </select>
                      </div>

                      <div style={{ flex: 1 }}>
                        <label style={{ ...labelStyle, marginBottom: 4 }}>Search By</label>
                        <select
                          value={singleField}
                          onChange={e => { setSingleField(e.target.value); setSingleValue(''); setSingleMsg(null) }}
                          style={{ ...inputStyle, cursor: 'pointer' }}
                        >
                          {SEARCH_FIELDS[singleType].map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginBottom: singleMsg ? 10 : 0 }}>
                      <input
                        value={singleValue}
                        onChange={e => setSingleValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && singleValue.trim() && tokenSaved && !singleSyncMutation.isPending) {
                            setSingleMsg(null)
                            singleSyncMutation.mutate()
                          }
                        }}
                        placeholder={SEARCH_FIELDS[singleType].find(f => f.value === singleField)?.placeholder}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => { setSingleMsg(null); singleSyncMutation.mutate() }}
                        disabled={singleSyncMutation.isPending || !singleValue.trim() || !tokenSaved}
                        style={{
                          background: singleSyncMutation.isPending ? '#6b7280' : '#111827',
                          color: '#fff', border: 'none', borderRadius: 4,
                          padding: '8px 14px', fontSize: 12, fontWeight: 600,
                          cursor: (singleSyncMutation.isPending || !singleValue.trim() || !tokenSaved)
                            ? 'default' : 'pointer',
                          whiteSpace: 'nowrap', flexShrink: 0,
                          opacity: !tokenSaved ? 0.4 : 1,
                        }}
                      >
                        {singleSyncMutation.isPending ? 'Syncing…' : 'Sync Record'}
                      </button>
                    </div>

                    {singleMsg && (
                      <div style={{
                        background: singleMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${singleMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                        borderRadius: 4, padding: '7px 11px', fontSize: 12,
                        color: singleMsg.type === 'success' ? '#15803d' : '#b91c1c',
                      }}>
                        {singleMsg.text}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* ── Import ─────────────────────────────────────────────────────── */}
          {activeTab === 'import' && canManage && (
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{
                padding: '14px 20px', background: '#f3f4f6',
                borderBottom: '1px solid var(--border)',
                borderRadius: '8px 8px 0 0', fontWeight: 700, fontSize: 15,
              }}>
                Import
              </div>
              <div style={{ padding: '24px 24px 28px' }}>

                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                  Upload a CSV file, then map each CSV column to a database column. Existing records are updated based on their Pipedrive ID; new records are inserted.
                </p>

                {/* Object type */}
                <div style={fieldWrap}>
                  <label style={labelStyle}>Object Type</label>
                  <select
                    value={importType}
                    onChange={e => { setImportType(e.target.value); setImportParsed(null); setImportFileName(null); setImportMappings({}); setImportMsg(null); setImportProgress(null) }}
                    style={{ ...inputStyle, maxWidth: 300, cursor: 'pointer' }}
                  >
                    <option value="organisations">Organisations</option>
                    <option value="contacts">Contacts</option>
                    <option value="deals">Deals</option>
                  </select>
                </div>

                {/* File upload */}
                <div style={{ ...fieldWrap, marginBottom: 20 }}>
                  <label style={labelStyle}>CSV File</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: '#111827', color: '#fff', borderRadius: 4,
                      padding: '9px 18px', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      Choose File
                      <input
                        key={importType}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={e => {
                          handleFileChange(e)
                          setImportFileName(e.target.files?.[0]?.name ?? null)
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <span style={{ fontSize: 13, color: importFileName ? 'var(--text)' : 'var(--text-muted)' }}>
                      {importFileName ?? 'No file chosen'}
                    </span>
                  </div>
                </div>

                {/* Column mapping table */}
                {importParsed && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        <strong style={{ color: 'var(--text)' }}>{importParsed.rows.length}</strong> row{importParsed.rows.length !== 1 ? 's' : ''} &nbsp;·&nbsp;{' '}
                        <strong style={{ color: 'var(--text)' }}>
                          {Object.values(importMappings).filter(Boolean).length}
                        </strong> of {importParsed.headers.length} columns mapped
                      </span>
                    </div>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                      {/* Table header */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                        background: '#f3f4f6', borderBottom: '1px solid var(--border)',
                        padding: '8px 14px', gap: 12,
                      }}>
                        {['CSV Column Header', 'Sample Value', 'Database Column'].map(h => (
                          <span key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {h}
                          </span>
                        ))}
                      </div>
                      {/* Scrollable rows (~50 visible at a time) */}
                      <div style={{ maxHeight: 2600, overflowY: 'auto' }}>
                        {importParsed.headers.map((h, i) => {
                          const sample = importParsed.rows.find(r => r[h] != null)?.[h] ?? '—'
                          const isMapped = !!importMappings[h]
                          return (
                            <div
                              key={h}
                              style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                                alignItems: 'center', gap: 12,
                                padding: '9px 14px',
                                borderBottom: i < importParsed.headers.length - 1 ? '1px solid var(--border)' : 'none',
                                background: isMapped ? '#fff' : '#fafafa',
                              }}
                            >
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{h}</span>
                              <span style={{
                                fontSize: 12, color: 'var(--text-muted)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {String(sample).substring(0, 60)}{String(sample).length > 60 ? '…' : ''}
                              </span>
                              <SearchableSelect
                                value={importMappings[h] ?? ''}
                                options={DB_COLUMNS[importType]}
                                invalid={!isMapped}
                                onChange={val => setImportMappings(m => ({ ...m, [h]: val }))}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress */}
                {importProgress && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                      Importing… {importProgress.done} / {importProgress.total}
                    </div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3, background: 'var(--accent)',
                        width: `${Math.round((importProgress.done / importProgress.total) * 100)}%`,
                        transition: 'width 0.2s',
                      }} />
                    </div>
                  </div>
                )}

                <Feedback msg={importMsg} />

                <PrimaryBtn
                  onClick={handleImport}
                  disabled={!importParsed || importing}
                >
                  {importing ? 'Importing…' : `Import ${importParsed ? importParsed.rows.length + ' Records' : 'Records'}`}
                </PrimaryBtn>

                {/* Import history (10 most recent) */}
                {importHistory.length > 0 && (
                  <div style={{ marginTop: 32 }}>
                    <label style={labelStyle}>Import History</label>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{
                        display: 'grid', gridTemplateColumns: '2fr 1fr 0.6fr 1.2fr 1.2fr',
                        background: '#f3f4f6', borderBottom: '1px solid var(--border)',
                        padding: '8px 14px', gap: 12,
                      }}>
                        {['File', 'Type', 'Rows', 'Imported By', 'Date'].map(h => (
                          <span key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {h}
                          </span>
                        ))}
                      </div>
                      {importHistory.map((entry, i) => (
                        <div
                          key={entry.id}
                          style={{
                            display: 'grid', gridTemplateColumns: '2fr 1fr 0.6fr 1.2fr 1.2fr',
                            alignItems: 'center', gap: 12, padding: '8px 14px', fontSize: 12,
                            borderBottom: i < importHistory.length - 1 ? '1px solid var(--border)' : 'none',
                            background: i % 2 === 0 ? '#fff' : '#fafafa',
                          }}
                        >
                          <span style={{ fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.file_name ?? '—'}
                          </span>
                          <span style={{ color: 'var(--text)' }}>{cap(entry.object_type ?? '')}</span>
                          <span style={{ color: 'var(--text)' }}>{entry.row_count ?? '—'}</span>
                          <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.imported_by ?? '—'}
                          </span>
                          <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {entry.created_at
                              ? new Date(entry.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
