import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ENTITY_PATH: Record<string, string> = {
  organisations: 'organizations',
  contacts: 'persons',
  deals: 'deals',
}

// ── Custom field keys (account-specific Pipedrive hash codes) ─────────────────

const ORG_FIELDS = {
  companyStatus:            'de17bde9331b4917c4069ba9decfa0976323f775',
  vendorOwnershipStructure: '625853a1d3db74ba16e1aef6c7c34fea01db5448',
  authorisationStatus:      '87539c56be7fd5f4d54c731527088c40bdb5a175',
  fcaNumber:                'f94ee07e10577bb215883042a1d5b796be1ea8a9',
}

const CONTACT_FIELDS = {
  age:      '53c46096f80e8c3568d2dc336195f65753450935',
  jobTitle: 'e3bf6e282bdf15009e42ac7042a58ab010063b62',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeLabel(s: string): string {
  return s.toLowerCase().replace(/[\s_\-&]+/g, '')
}

// Fetch ALL Pipedrive field definitions (paginated) and return:
//   labelMap  — normalized-label → field key
//   enumMaps  — field key → Map<optionId, optionLabel>
//   setFields — keys whose field_type is "set" (multi-select, comma-separated IDs)
async function fetchFieldMeta(
  apiToken: string,
  endpoint: string
): Promise<{ labelMap: Map<string, string>; enumMaps: Map<string, Map<string, string>>; setFields: Set<string> }> {
  const labelMap = new Map<string, string>()
  const enumMaps = new Map<string, Map<string, string>>()
  const setFields = new Set<string>()
  let start = 0
  while (true) {
    const res = await fetch(
      `https://api.pipedrive.com/v1/${endpoint}?api_token=${apiToken}&limit=500&start=${start}`
    )
    if (!res.ok) break
    const json = await res.json()
    for (const field of json.data ?? []) {
      if (field.name && field.key) {
        labelMap.set(normalizeLabel(field.name), field.key)
      }
      if (field.options?.length) {
        const optMap = new Map<string, string>()
        for (const opt of field.options) {
          optMap.set(String(opt.id), opt.label)
        }
        enumMaps.set(field.key, optMap)
      }
      if (field.field_type === 'set') {
        setFields.add(field.key)
      }
    }
    if (!json.additional_data?.pagination?.more_items_in_collection) break
    start = json.additional_data.pagination.next_start
  }
  return { labelMap, enumMaps, setFields }
}

// Resolve a Pipedrive enum field (raw option ID → label)
function resolveEnum(
  record: any,
  key: string,
  enumMaps: Map<string, Map<string, string>>
): string | null {
  const raw = record[key]
  if (raw == null) return null
  return enumMaps.get(key)?.get(String(raw)) ?? null
}

// Look up a custom field value by label name.
// - enum (single-select): option ID → label
// - set  (multi-select):  comma-separated option IDs → comma-separated labels
// - other: raw string value
function customFieldResolved(
  record: any,
  labelMap: Map<string, string>,
  enumMaps: Map<string, Map<string, string>>,
  setFields: Set<string>,
  ...labels: string[]
): string | null {
  for (const lbl of labels) {
    const key = labelMap.get(normalizeLabel(lbl))
    if (key === undefined) continue
    if (record[key] == null) continue
    const optMap = enumMaps.get(key)
    if (optMap) {
      if (setFields.has(key)) {
        // Multi-select: resolve each comma-separated ID to its label
        const resolved = String(record[key])
          .split(',')
          .map(id => optMap.get(id.trim()) ?? id.trim())
          .filter(Boolean)
          .join(', ')
        return resolved || null
      }
      // Single-select: resolve the one option ID to its label
      const enumLabel = optMap.get(String(record[key]))
      if (enumLabel !== undefined) return enumLabel
    }
    // Object types (user, person, org): extract the name property
    const raw = record[key]
    if (raw !== null && typeof raw === 'object' && raw.name) return String(raw.name)
    return String(raw)
  }
  return null
}

// Like customFieldResolved but truncates to a date string ("YYYY-MM-DD")
function customFieldDate(
  record: any,
  labelMap: Map<string, string>,
  ...labels: string[]
): string | null {
  for (const label of labels) {
    const key = labelMap.get(normalizeLabel(label))
    if (key !== undefined && record[key] != null) return toDate(String(record[key]))
  }
  return null
}

// Look up a custom field value by label (text only, no enum resolution)
function customField(record: any, labelMap: Map<string, string>, ...labels: string[]): string | null {
  for (const label of labels) {
    const key = labelMap.get(normalizeLabel(label))
    if (key !== undefined && record[key] != null) return String(record[key])
  }
  return null
}

// Read a direct hash-key field as a string
function directField(record: any, key: string): string | null {
  return record[key] != null ? String(record[key]) : null
}

// Truncate a datetime string to "YYYY-MM-DD", returns null for non-date values like "TBC"
function toDate(val: string | null | undefined): string | null {
  if (!val) return null
  const s = String(val).substring(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

// Format a raw numeric value as a GBP currency string e.g. 12000 → "£12,000", 12000.5 → "£12,000.50"
function toGBP(val: string | null): string | null {
  if (val == null) return null
  const num = parseFloat(val)
  if (isNaN(num)) return val
  const [intPart, decPart] = (Math.round(num * 100) / 100).toFixed(2).split('.')
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return '£' + intFormatted + '.' + decPart
}

async function pipedriveGetAll(apiToken: string, path: string): Promise<any[]> {
  const items: any[] = []
  let start = 0
  while (true) {
    const url = `https://api.pipedrive.com/v1/${path}?api_token=${apiToken}&limit=500&start=${start}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Pipedrive /${path} error ${res.status}: ${await res.text()}`)
    const json = await res.json()
    if (!json.success) throw new Error(json.error || `Pipedrive /${path} returned success=false`)
    if (!json.data || json.data.length === 0) break
    items.push(...json.data)
    if (!json.additional_data?.pagination?.more_items_in_collection) break
    start = json.additional_data.pagination.next_start
  }
  return items
}

async function fetchSinglePipedriveRecord(
  apiToken: string,
  type: string,
  field: string,
  value: string
): Promise<any | null> {
  const entityPath = ENTITY_PATH[type]

  if (field === 'pipedrive_id') {
    const res = await fetch(
      `https://api.pipedrive.com/v1/${entityPath}/${encodeURIComponent(value)}?api_token=${apiToken}`
    )
    if (!res.ok) return null
    const json = await res.json()
    return json.success && json.data ? json.data : null
  }

  const exactMatch = field === 'email' ? 'true' : 'false'
  const searchRes = await fetch(
    `https://api.pipedrive.com/v1/${entityPath}/search?term=${encodeURIComponent(value)}&fields=${field}&exact_match=${exactMatch}&api_token=${apiToken}`
  )
  if (!searchRes.ok) return null
  const searchJson = await searchRes.json()
  if (!searchJson.success || !searchJson.data?.items?.length) return null

  const foundId = searchJson.data.items[0].item.id
  const fullRes = await fetch(
    `https://api.pipedrive.com/v1/${entityPath}/${foundId}?api_token=${apiToken}`
  )
  if (!fullRes.ok) return null
  const fullJson = await fullRes.json()
  return fullJson.success && fullJson.data ? fullJson.data : null
}

function notFound(headers: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Record not found in Pipedrive' }),
    { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
  )
}

// ── Row builders ──────────────────────────────────────────────────────────────

function mapOrg(
  o: any,
  labelMap: Map<string, string>,
  enumMaps: Map<string, Map<string, string>>
): Record<string, unknown> {
  return {
    org_pipedrive_id: String(o.id),
    name: o.name || null,
    address: o.address || null,
    company_status: resolveEnum(o, ORG_FIELDS.companyStatus, enumMaps),
    authorisation_status: resolveEnum(o, ORG_FIELDS.authorisationStatus, enumMaps),
    vendor_ownership_structure: directField(o, ORG_FIELDS.vendorOwnershipStructure),
    fca_number: directField(o, ORG_FIELDS.fcaNumber),
    website: customField(o, labelMap, 'Website'),
    id_urn: customField(o, labelMap, 'ID URN', 'ID Run', 'URN'),
    date_created: toDate(o.add_time),
  }
}

function mapContact(p: any, orgId: string | null): Record<string, unknown> {
  return {
    contact_pipedrive_id: String(p.id),
    name: p.name || null,
    email: p.email?.[0]?.value || null,
    phone: p.phone?.[0]?.value || null,
    organisation_id: orgId,
    age: directField(p, CONTACT_FIELDS.age),
    job_title: directField(p, CONTACT_FIELDS.jobTitle),
    date_created: toDate(p.add_time),
  }
}

function mapDeal(
  d: any,
  stageMap: Map<number, string>,
  pipelineMap: Map<number, string>,
  labelMap: Map<string, string>,
  enumMaps: Map<string, Map<string, string>>,
  setFields: Set<string>
): Record<string, unknown> {
  // Shorthand helpers scoped to this record
  const cf = (...lbls: string[]) => customFieldResolved(d, labelMap, enumMaps, setFields, ...lbls)
  const dt = (...lbls: string[]) => customFieldDate(d, labelMap, ...lbls)

  return {
    // ── Standard Pipedrive fields ─────────────────────────────────────────────
    deal_pipedrive_id:  String(d.id),
    title:              d.title || null,
    value:              toGBP(d.value != null ? String(d.value) : null),
    weighted_value:     d.weighted_value != null ? String(d.weighted_value) : null,
    currency:           d.currency || 'GBP',
    expected_close_date: d.expected_close_date || null,
    stage:              d.stage_id ? (stageMap.get(d.stage_id) ?? null) : null,
    pipeline:           d.pipeline_id ? (pipelineMap.get(d.pipeline_id) ?? null) : null,
    status:             d.status || null,
    owner:              d.user_id?.name || null,
    probability:        d.probability != null ? String(d.probability) : null,
    label:              d.label || null,
    contact_id:         d.person_id?.value ? String(d.person_id.value) : null,
    organisation_id:    d.org_id?.value ? String(d.org_id.value) : null,
    date_created:       toDate(d.add_time),

    // ── General ───────────────────────────────────────────────────────────────
    fdd_lead:                             cf('FDD Lead'),
    deal_lead:                            cf('Deal Lead'),
    basis_of_deal:                        cf('Basis of Deal'),
    deal_size:                            cf('Deal Size'),
    vendor_ownership_structure:           cf('Vendor & Ownership Structure'),
    deal_source:                          cf('Deal Source'),
    latest_status_acquisition_committee:  cf('Latest Status (Acquisition Committee)'),
    deal_address:                         cf('Deal Address'),

    // ── Transaction Overview ──────────────────────────────────────────────────
    acquisition_type:               cf('Acquisition Type'),
    deal_structure:                 cf('Deal Structure'),
    payment_schedule:               cf('Payment Schedule'),
    completion_payment:             toGBP(cf('Completion Payment')),
    headline_consideration:         toGBP(cf('Headline Consideration')),
    ri_multiple:                    cf('RI Multiple'),
    net_turnover_multiple:          cf('Net Turnover Multiple'),
    ebitda_multiple:                cf('EBITDA Multiple'),
    ebitda_multiple_post_cambridge: cf('EBITDA Multiple (post-Cambridge)'),
    introduction_date:              dt('Introduction Date'),
    first_meeting_date:             dt('First Meeting Date'),
    offer_made_date:                dt('Offer Made Date'),
    hots_issued_date:               dt('HoTs Issued Date'),
    hots_signed_date:               dt('HoTs Signed Date'),
    date_dd_completed:              dt('Date DD Completed'),
    deal_exchanged_date:            dt('Deal Exchanged Date'),
    deal_complete_date:             dt('Deal Complete Date'),

    // ── Intermediary Details ──────────────────────────────────────────────────
    introductory_company:       cf('Introductory Company'),
    introductory_contact:       cf('Introductory Contact'),
    broker_fee_type:            cf('Broker Fee'),
    broker_fee_value:           toGBP(cf('Broker Fee (£)', 'Broker Fee (?)')),
    network_name:               cf('Network Name (if applicable)', 'Network Name'),
    law_firm_sell_side:         cf('Law Firm (Sell Side)'),
    lawyer_contact_sell_side:   cf('Lawyer Contact (Sell Side)'),
    law_firm_buy_side:          cf('Law Firm (Buy Side)'),
    lawyer_contact_buy_side:    cf('Lawyer Contact (Buy Side)'),
    legal_team_lead:            cf('Legal Team Lead'),

    // ── Financial Overview and KPIs ───────────────────────────────────────────
    ri_adviser:                               toGBP(cf('RI / Adviser')),
    nb_adviser:                               toGBP(cf('NB / Adviser')),
    latest_recurring_income:                  toGBP(cf('Latest Recurring Income')),
    latest_new_business:                      toGBP(cf('Latest New Business')),
    latest_turnover:                          toGBP(cf('Latest Turnover')),
    organic_growth_ri_pct:                    cf('Organic Growth in RI %'),
    forecast_recurring_income:                toGBP(cf('Forecast Recurring Income')),
    forecast_new_business:                    toGBP(cf('Forecast New Business')),
    forecast_turnover:                        toGBP(cf('Forecast Turnover')),
    expected_adviser_cost:                    toGBP(cf('Expected Adviser Cost')),
    existing_ebitda:                          toGBP(cf('Existing EBITDA')),
    perspective_ebitda:                       toGBP(cf('Perspective EBITDA')),
    perspective_ebitda_post_cambridge:        toGBP(cf('Perspective EBITDA (post-Cambridge)')),
    ebitda_margin_pct:                        cf('EBITDA Margin %'),
    assets_under_advice:                      toGBP(cf('Assets Under Advice')),
    expected_cambridge_opportunity_aum:       toGBP(cf('Expected Cambridge Opportunity (AuM)')),
    expected_cambridge_opportunity_ebitda:    toGBP(cf('Expected Cambridge Opportunity (EBITDA)')),
    households_per_adviser:                   cf('Households per Adviser'),
    support_staff_to_advisor_cost_ratio_pct:  cf('Support Staff to Advisor Cost Ratio %'),

    // ── HoTs Stage - Key Dates ────────────────────────────────────────────────
    board_report_issued:                    dt('Board Report Issued'),
    target_exchange:                        dt('Target Exchange'),
    target_completion:                      dt('Target Completion'),
    confirmed_completion:                   dt('Confirmed Completion', 'Confirmed Completion.'),
    fdd_rdd_kickoff_call:                   dt('FDD / RDD Kick-Off Call'),
    fdd_irl_sent:                           dt('FDD IRL Sent'),
    db_suitability_redress_review_complete: dt('DB Suitability / Redress Review Complete'),
    rdd_data_book_complete:                 dt('RDD Data Book Complete'),
    file_review_sample_non_db_complete:     dt('File Review Sample (non-DB) Complete'),
    rdd_question_pack_response_received:    dt('RDD Question Pack Response Received'),
    fdd_additional_data_request_sent:       dt('FDD Additional Data Request Sent'),
    snapshot_email_circulated:              dt('Snapshot Email Circulated'),
    fdd_question_pack_sent:                 dt('FDD Question Pack Sent'),
    fdd_question_pack_call:                 dt('FDD Question Pack Call'),
    lawyers_appointed:                      dt('Lawyers Appointed'),
    adviser_contracts_requested:            cf('Adviser Contracts Requested'),
    spa_issued:                             dt('SPA Issued'),
    spa_markup_received:                    dt('SPA Mark-Up Received'),
    hr_ops_dd_complete:                     dt('HR and Ops DD Complete'),
    fdd_report_drafted:                     dt('FDD Report Drafted'),
    rdd_report_drafted:                     dt('RDD Report Drafted'),
    fdd_report_reviewed:                    dt('FDD Report Reviewed'),
    rdd_report_reviewed:                    dt('RDD Report Reviewed'),
    ldd_finalised:                          dt('LDD Finalised'),
    fdd_rdd_reports_approved:               dt('FDD / RDD Reports Approved'),

    // ── Clients ───────────────────────────────────────────────────────────────
    aua_per_household:                  toGBP(cf('AuA / Household')),
    aua_per_client:                     toGBP(cf('AuA / Client')),
    number_of_clients:                  cf('Number of Clients'),
    number_of_households:               cf('Number of Households'),
    average_age_of_clients:             cf('Average Age of Clients'),
    average_age_of_clients_weighted:    cf('Average Age of Clients (Weighted)'),
    typical_initial_fee:                cf('Typical Initial Fee'),
    typical_oac_pct_fixed_fees:         cf('Typical OAC % / Fixed Fees'),
    platforms:                          cf('Platforms'),

    // ── Staff ─────────────────────────────────────────────────────────────────
    number_of_advisers_required:              cf('Number of Advisers Required'),
    number_of_employed_advisors_retained:     cf('Number of Employed Advisors Retained'),
    number_of_self_employed_advisors_retained: cf('Number of Self-Employed Advisors Retained'),
    number_of_paraplanners_retained:          cf('Number of Paraplanners Retained'),
    number_of_administrators_retained:        cf('Number of Administrators Retained'),
    number_of_other_staff_retained:           cf('Number of Other Staff Retained'),
    number_of_staff_exiting_on_completion:    cf('Number of Staff Exiting on Completion'),
    number_of_staff_redeployed_to_group_roles: cf('Number of Staff to be Redeployed to Group Roles'),
    recruitment_requirements:                 cf('Recruitment Requirements'),
    people_team_lead:                         cf('People Team Lead'),
    adviser_contracts_sent:                   dt('Adviser Contracts Sent'),
    eli_sent:                                 dt('ELI Sent'),
    eli_received:                             dt('ELI Received'),
    tupe_measures_sent:                       dt('TUPE Measures Sent'),
    contact_2_name:                           cf('Contact 2 Name'),
    contact_2_phone:                          cf('Contact 2 Phone'),
    contact_2_email:                          cf('Contact 2 Email'),
    contact_3_name:                           cf('Contact 3 Name'),
    contact_3_phone:                          cf('Contact 3 Phone'),
    contact_3_email:                          cf('Contact 3 Email'),

    // ── Property ──────────────────────────────────────────────────────────────
    details_of_property:        cf('Details of Property'),
    lease_details:              cf('Lease Details'),
    ownership_of_property:      cf('Ownership of Property'),
    post_acquisition_office_plans: cf('Post-Acquisition Office Plans'),

    // ── Costs ─────────────────────────────────────────────────────────────────
    fca_pi_pct:       cf('FCA / PI %'),
    variable_cost_pct: cf('Variable Cost %'),
    fixed_costs:      toGBP(cf('Fixed Costs')),

    // ── Regulatory ────────────────────────────────────────────────────────────
    rdd_lead:                               cf('RDD Lead'),
    defined_benefit_transfers:              cf('Defined Benefit Transfers'),
    defined_benefit_transfer_total:         toGBP(cf('Defined Benefit Transfer Total (£)', 'Defined Benefit Transfer Total (?)')),
    other_regulatory_items_of_note:         cf('Other Regulatory Items of Note'),
    consumer_duty_plan_signed_off:          cf('Consumer Duty Plan Signed Off'),
    cic_submitted:                          cf('CiC Submitted'),
    cic_submitted_date:                     dt('CiC Submitted Date'),
    deauthorisation_application_submitted:  dt('Deauthorisation Application Submitted'),
    deauthorisation_target_date:            dt('Deauthorisation Target Date'),
    deauthorisation_approved:               dt('Deauthorisation Approved'),

    // ── Back Office ───────────────────────────────────────────────────────────
    perspective_regional_director:          cf('Perspective Regional Director'),
    perspective_regional_manager:           cf('Perspective Regional Manager'),
    perspective_principal:                  cf('Perspective Principal'),
    perspective_trading_style_registered:   cf('Perspective Trading Style Registered'),
    agreed_perspective_trading_style:       cf('Agreed Perspective Trading Style'),
    receiving_office:                       cf('Receiving Office'),
    perspective_entity:                     cf('Perspective Entity'),
    back_office_system:                     cf('Back Office System'),
    document_management_system:             cf('Document Management System'),
    other_integration_notes:                cf('Other Integration Notes'),
    client_letter_status:                   cf('Client Letter Status'),
    mailing_data_status:                    cf('Mailing Data Status'),
    regional_director_introduction:         cf('Regional Director / Regional Manager Introduction'),
    integration_kickoff_date:               dt('Instruction for Integration Kick Off Date'),
    data_meeting_held:                      dt('Data Meeting Held'),
    core_compliance_ca_request_sent:        dt('Core Compliance CA Request Sent'),
    first_data_request_response_received:   dt('First Data Request Response Received'),
    client_letter_sign_off_completed:       dt('Client Letter Sign Off Completed'),
    repapering_finalised_date:              dt('Repapering Finalised and Agreed Date'),
    printing_and_delivery_date:             dt('Printing and Delivery Date'),
    perspective_project_manager:            cf('Perspective Project Manager'),
    data_team_lead:                         cf('Data Team Lead'),
    client_portal:                          cf('Client Portal'),
    ai_solutions:                           cf('AI Solutions'),

    // ── Declined Deals ────────────────────────────────────────────────────────
    date_declined:          dt('Date Declined'),
    loss_driver:            cf('Loss Driver'),
    reason_for_decline:     cf('Reason for Decline'),
    reason_for_decline_detail: cf('Reason for Decline Detail'),
    other_player_sold_to:   cf('Other player sold to (if known)'),

    // ── Pipedrive / CRM activity metadata ────────────────────────────────────
    source_origin:  cf('Source Origin', 'Source origin'),
    source_channel: cf('Source Channel', 'Source channel'),
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (callerErr || !caller) throw new Error('Unauthorized')

    const { data: userRow, error: userErr } = await supabaseAdmin
      .from('users')
      .select('pipedrive_api_token')
      .eq('id', caller.id)
      .single()
    if (userErr) throw userErr
    if (!userRow?.pipedrive_api_token) {
      throw new Error('No Pipedrive API token configured. Save one in Account Settings first.')
    }

    const apiToken = userRow.pipedrive_api_token
    const body = await req.json()
    const type: string = body.type ?? 'organisations'
    const search: { field: string; value: string } | undefined = body.search

    if (!['organisations', 'contacts', 'deals'].includes(type)) {
      throw new Error(`Unknown sync type: ${type}`)
    }

    // ── Shared deal metadata fetcher ──────────────────────────────────────────
    async function fetchDealMeta() {
      const [stagesRes, pipelinesRes, dealFieldMeta] = await Promise.all([
        fetch(`https://api.pipedrive.com/v1/stages?api_token=${apiToken}`),
        fetch(`https://api.pipedrive.com/v1/pipelines?api_token=${apiToken}`),
        fetchFieldMeta(apiToken, 'dealFields'),
      ])
      const stagesJson = stagesRes.ok ? await stagesRes.json() : { data: [] }
      const pipelinesJson = pipelinesRes.ok ? await pipelinesRes.json() : { data: [] }
      const stageMap = new Map<number, string>(
        (stagesJson.data ?? []).map((s: any) => [s.id as number, s.name as string])
      )
      const pipelineMap = new Map<number, string>(
        (pipelinesJson.data ?? []).map((p: any) => [p.id as number, p.name as string])
      )
      return { stageMap, pipelineMap, labelMap: dealFieldMeta.labelMap, enumMaps: dealFieldMeta.enumMaps, setFields: dealFieldMeta.setFields }
    }

    // ── SINGLE RECORD MODE ────────────────────────────────────────────────────
    if (search) {
      const { field, value } = search

      if (type === 'organisations') {
        const [org, { labelMap, enumMaps }] = await Promise.all([
          fetchSinglePipedriveRecord(apiToken, type, field, value),
          fetchFieldMeta(apiToken, 'organizationFields'),
        ])
        if (!org) return notFound(corsHeaders)

        const { error } = await supabaseAdmin
          .from('organisations')
          .upsert(mapOrg(org, labelMap, enumMaps), { onConflict: 'org_pipedrive_id' })
        if (error) throw error

        await supabaseAdmin.from('users')
          .update({ pipedrive_last_synced_at: new Date().toISOString() }).eq('id', caller.id)

        return new Response(
          JSON.stringify({ success: true, type, record: { pipedrive_id: String(org.id), label: org.name } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (type === 'contacts') {
        const person = await fetchSinglePipedriveRecord(apiToken, type, field, value)
        if (!person) return notFound(corsHeaders)

        const orgId = person.org_id?.value ? String(person.org_id.value) : null

        const { error } = await supabaseAdmin
          .from('contacts')
          .upsert(mapContact(person, orgId), { onConflict: 'contact_pipedrive_id' })
        if (error) throw error

        await supabaseAdmin.from('users')
          .update({ pipedrive_last_synced_at: new Date().toISOString() }).eq('id', caller.id)

        return new Response(
          JSON.stringify({ success: true, type, record: { pipedrive_id: String(person.id), label: person.name } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (type === 'deals') {
        const [deal, { stageMap, pipelineMap, labelMap, enumMaps, setFields }] = await Promise.all([
          fetchSinglePipedriveRecord(apiToken, type, field, value),
          fetchDealMeta(),
        ])
        if (!deal) return notFound(corsHeaders)

        const { error } = await supabaseAdmin.from('deals').upsert(
          mapDeal(deal, stageMap, pipelineMap, labelMap, enumMaps, setFields),
          { onConflict: 'deal_pipedrive_id' }
        )
        if (error) throw error

        await supabaseAdmin.from('users')
          .update({ pipedrive_last_synced_at: new Date().toISOString() }).eq('id', caller.id)

        return new Response(
          JSON.stringify({ success: true, type, record: { pipedrive_id: String(deal.id), label: deal.title } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ── FULL TYPE SYNC MODE ───────────────────────────────────────────────────
    const synced: Record<string, number> = { organisations: 0, contacts: 0, deals: 0 }

    if (type === 'organisations') {
      const [pipedriveOrgs, { labelMap, enumMaps }] = await Promise.all([
        pipedriveGetAll(apiToken, 'organizations'),
        fetchFieldMeta(apiToken, 'organizationFields'),
      ])
      if (pipedriveOrgs.length > 0) {
        const { error } = await supabaseAdmin.from('organisations').upsert(
          pipedriveOrgs.map((o: any) => mapOrg(o, labelMap, enumMaps)),
          { onConflict: 'org_pipedrive_id' }
        )
        if (error) throw error
      }
      synced.organisations = pipedriveOrgs.length
    }

    if (type === 'contacts') {
      const pipedrivePersons = await pipedriveGetAll(apiToken, 'persons')
      if (pipedrivePersons.length > 0) {
        const { error } = await supabaseAdmin.from('contacts').upsert(
          pipedrivePersons.map(p =>
            mapContact(p, p.org_id?.value ? String(p.org_id.value) : null)
          ),
          { onConflict: 'contact_pipedrive_id' }
        )
        if (error) throw error
      }
      synced.contacts = pipedrivePersons.length
    }

    if (type === 'deals') {
      const [
        { stageMap, pipelineMap, labelMap, enumMaps, setFields },
        pipedriveDeals,
      ] = await Promise.all([
        fetchDealMeta(),
        pipedriveGetAll(apiToken, 'deals'),
      ])

      if (pipedriveDeals.length > 0) {
        const { error } = await supabaseAdmin.from('deals').upsert(
          pipedriveDeals.map((d: any) =>
            mapDeal(d, stageMap, pipelineMap, labelMap, enumMaps, setFields)
          ),
          { onConflict: 'deal_pipedrive_id' }
        )
        if (error) throw error
      }
      synced.deals = pipedriveDeals.length
    }

    await supabaseAdmin.from('users')
      .update({ pipedrive_last_synced_at: new Date().toISOString() }).eq('id', caller.id)

    return new Response(
      JSON.stringify({ success: true, type, synced }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    const message = err instanceof Error
      ? err.message
      : (err?.message ? String(err.message) : JSON.stringify(err))
    return new Response(
      JSON.stringify({ error: message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
