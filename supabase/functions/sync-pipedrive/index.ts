import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Pipedrive API version notes:
// - Record endpoints (deals, persons, organizations, stages, pipelines and
//   their /search variants) use API v2 — v1 versions are deprecated.
// - Field-definition endpoints (dealFields, personFields, organizationFields)
//   and the users endpoint have NO v2 equivalent and are not part of the v1
//   deprecation, so they remain on v1.

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

// Authenticated GET against the Pipedrive API. The api_token query parameter
// works on both versions; the x-api-token header is v2's documented scheme —
// send both for maximum compatibility.
function pdFetch(url: string, apiToken: string): Promise<Response> {
  const sep = url.includes('?') ? '&' : '?'
  return fetch(`${url}${sep}api_token=${apiToken}`, {
    headers: { 'x-api-token': apiToken },
  })
}

function normalizeLabel(s: string): string {
  return s.toLowerCase().replace(/[\s_\-&]+/g, '')
}

// Fetch ALL Pipedrive field definitions (v1, start-based pagination) and return:
//   labelMap   — normalized-label → field key
//   enumMaps   — field key → Map<optionId, optionLabel>
//   userFields — keys whose field_type is "user" (value is a Pipedrive user ID)
async function fetchFieldMeta(
  apiToken: string,
  endpoint: string
): Promise<{ labelMap: Map<string, string>; enumMaps: Map<string, Map<string, string>>; userFields: Set<string> }> {
  const labelMap = new Map<string, string>()
  const enumMaps = new Map<string, Map<string, string>>()
  const userFields = new Set<string>()
  let start = 0
  while (true) {
    const res = await pdFetch(
      `https://api.pipedrive.com/v1/${endpoint}?limit=500&start=${start}`,
      apiToken
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
      if (field.field_type === 'user') {
        userFields.add(field.key)
      }
    }
    if (!json.additional_data?.pagination?.more_items_in_collection) break
    start = json.additional_data.pagination.next_start
  }
  return { labelMap, enumMaps, userFields }
}

// Pipedrive user list (v1 — no v2 equivalent). Used to resolve owner and
// user-type custom fields, since v2 returns bare user IDs instead of objects.
async function fetchUserMap(apiToken: string): Promise<Map<string, string>> {
  const res = await pdFetch('https://api.pipedrive.com/v1/users', apiToken)
  if (!res.ok) return new Map()
  const json = await res.json()
  return new Map((json.data ?? []).map((u: any) => [String(u.id), u.name as string]))
}

// Read a custom field value from a v2 record (nested under custom_fields)
function customFieldValue(record: any, key: string): any {
  return record.custom_fields?.[key]
}

// Reduce a v2 custom field value to a display string:
// - array (multi-select "set"): option IDs → comma-separated labels
// - enum / user (with an option map): ID → label
// - object (monetary {value,currency}, address {value,...}): use value/name
// - anything else: raw string
function stringifyCustomValue(
  raw: any,
  optMap: Map<string, string> | undefined
): string | null {
  if (raw == null) return null
  if (Array.isArray(raw)) {
    const resolved = raw
      .map(v => optMap?.get(String(v)) ?? String(v))
      .filter(Boolean)
      .join(', ')
    return resolved || null
  }
  if (optMap) {
    const label = optMap.get(String(raw))
    if (label !== undefined) return label
  }
  if (typeof raw === 'object') {
    if (raw.name != null) return String(raw.name)
    if (raw.value != null) return String(raw.value)
    return null
  }
  return String(raw)
}

// Resolve a direct hash-key enum field (option ID → label)
function resolveEnum(
  record: any,
  key: string,
  enumMaps: Map<string, Map<string, string>>
): string | null {
  const raw = customFieldValue(record, key)
  if (raw == null) return null
  return enumMaps.get(key)?.get(String(raw)) ?? null
}

// Look up a custom field value by label name, resolving enum/set/user IDs
function customFieldResolved(
  record: any,
  labelMap: Map<string, string>,
  enumMaps: Map<string, Map<string, string>>,
  ...labels: string[]
): string | null {
  for (const lbl of labels) {
    const key = labelMap.get(normalizeLabel(lbl))
    if (key === undefined) continue
    const raw = customFieldValue(record, key)
    if (raw == null) continue
    return stringifyCustomValue(raw, enumMaps.get(key))
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
    if (key === undefined) continue
    const raw = customFieldValue(record, key)
    if (raw == null) continue
    return toDate(String(typeof raw === 'object' ? raw.value ?? '' : raw))
  }
  return null
}

// Look up a custom field value by label (no enum resolution)
function customField(record: any, labelMap: Map<string, string>, ...labels: string[]): string | null {
  for (const label of labels) {
    const key = labelMap.get(normalizeLabel(label))
    if (key === undefined) continue
    const raw = customFieldValue(record, key)
    if (raw != null) return stringifyCustomValue(raw, undefined)
  }
  return null
}

// Read a direct hash-key field as a string
function directField(record: any, key: string): string | null {
  return stringifyCustomValue(customFieldValue(record, key), undefined)
}

// Truncate a datetime string to "YYYY-MM-DD", returns null for non-date values like "TBC"
function toDate(val: string | null | undefined): string | null {
  if (!val) return null
  const s = String(val).substring(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

// Format a raw numeric value as a GBP currency string e.g. 12000 → "£12,000.00"
function toGBP(val: string | null): string | null {
  if (val == null) return null
  const num = parseFloat(val)
  if (isNaN(num)) return val
  const [intPart, decPart] = (Math.round(num * 100) / 100).toFixed(2).split('.')
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return '£' + intFormatted + '.' + decPart
}

// Fetch every record from a v2 collection endpoint (cursor-based pagination)
async function pipedriveGetAll(apiToken: string, path: string, extraParams = ''): Promise<any[]> {
  const items: any[] = []
  let cursor: string | null = null
  while (true) {
    const url = `https://api.pipedrive.com/api/v2/${path}?limit=500${extraParams}`
      + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '')
    const res = await pdFetch(url, apiToken)
    if (!res.ok) throw new Error(`Pipedrive /${path} error ${res.status}: ${await res.text()}`)
    const json = await res.json()
    if (!json.success) throw new Error(json.error || `Pipedrive /${path} returned success=false`)
    items.push(...(json.data ?? []))
    cursor = json.additional_data?.next_cursor ?? null
    if (!cursor) break
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
    const res = await pdFetch(
      `https://api.pipedrive.com/api/v2/${entityPath}/${encodeURIComponent(value)}`,
      apiToken
    )
    if (!res.ok) return null
    const json = await res.json()
    return json.success && json.data ? json.data : null
  }

  const exactMatch = field === 'email' ? 'true' : 'false'
  const searchRes = await pdFetch(
    `https://api.pipedrive.com/api/v2/${entityPath}/search?term=${encodeURIComponent(value)}&fields=${field}&exact_match=${exactMatch}`,
    apiToken
  )
  if (!searchRes.ok) return null
  const searchJson = await searchRes.json()
  if (!searchJson.success || !searchJson.data?.items?.length) return null

  const foundId = searchJson.data.items[0].item.id
  const fullRes = await pdFetch(
    `https://api.pipedrive.com/api/v2/${entityPath}/${foundId}`,
    apiToken
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

// ── Row builders (v2 record shapes) ──────────────────────────────────────────

function mapOrg(
  o: any,
  labelMap: Map<string, string>,
  enumMaps: Map<string, Map<string, string>>
): Record<string, unknown> {
  return {
    org_pipedrive_id: String(o.id),
    name: o.name || null,
    // v2 returns address as an object; the full formatted string is in .value
    address: (typeof o.address === 'object' ? o.address?.value : o.address) || null,
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
  // v2 renamed email/phone to emails/phones; prefer the primary entry
  const primaryEmail = p.emails?.find((e: any) => e.primary)?.value ?? p.emails?.[0]?.value
  const primaryPhone = p.phones?.find((ph: any) => ph.primary)?.value ?? p.phones?.[0]?.value
  return {
    contact_pipedrive_id: String(p.id),
    name: p.name || null,
    email: primaryEmail || null,
    phone: primaryPhone || null,
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
  userMap: Map<string, string>
): Record<string, unknown> {
  // Shorthand helpers scoped to this record
  const cf = (...lbls: string[]) => customFieldResolved(d, labelMap, enumMaps, ...lbls)
  const dt = (...lbls: string[]) => customFieldDate(d, labelMap, ...lbls)

  // v2 replaced the label string with label_ids; resolve via dealFields options
  const labelOptions = enumMaps.get('label')
  const labelNames = Array.isArray(d.label_ids) && d.label_ids.length
    ? d.label_ids.map((id: number) => labelOptions?.get(String(id)) ?? String(id)).join(', ')
    : null

  return {
    // ── Standard Pipedrive fields ─────────────────────────────────────────────
    deal_pipedrive_id:  String(d.id),
    title:              d.title || null,
    value:              toGBP(d.value != null ? String(d.value) : null),
    // v2 no longer returns weighted_value; keep any value present, else null
    weighted_value:     d.weighted_value != null ? String(d.weighted_value) : null,
    currency:           d.currency || 'GBP',
    expected_close_date: d.expected_close_date || null,
    stage:              d.stage_id ? (stageMap.get(d.stage_id) ?? null) : null,
    pipeline:           d.pipeline_id ? (pipelineMap.get(d.pipeline_id) ?? null) : null,
    status:             d.status || null,
    // v2 returns owner_id (integer) instead of a user object
    owner:              d.owner_id != null ? (userMap.get(String(d.owner_id)) ?? null) : null,
    probability:        d.probability != null ? String(d.probability) : null,
    label:              labelNames,
    // v2 returns person_id / org_id as plain integers
    contact_id:         d.person_id != null ? String(d.person_id) : null,
    organisation_id:    d.org_id != null ? String(d.org_id) : null,
    date_created:       toDate(d.add_time),
    archive_time:       d.archive_time || null,

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
      const [stages, pipelines, dealFieldMeta, userMap] = await Promise.all([
        pipedriveGetAll(apiToken, 'stages'),
        pipedriveGetAll(apiToken, 'pipelines'),
        fetchFieldMeta(apiToken, 'dealFields'),
        fetchUserMap(apiToken),
      ])
      const stageMap = new Map<number, string>(
        stages.map((s: any) => [s.id as number, s.name as string])
      )
      const pipelineMap = new Map<number, string>(
        pipelines.map((p: any) => [p.id as number, p.name as string])
      )
      // User-type custom fields hold bare user IDs in v2 — register the user
      // map as their option map so they resolve to names like enums do.
      for (const key of dealFieldMeta.userFields) {
        dealFieldMeta.enumMaps.set(key, userMap)
      }
      return { stageMap, pipelineMap, labelMap: dealFieldMeta.labelMap, enumMaps: dealFieldMeta.enumMaps, userMap }
    }

    // Fetch all deals: v2 filters archived deals out by default, so request
    // active and archived explicitly and dedupe by ID.
    async function fetchAllDeals(): Promise<any[]> {
      const [active, archived] = await Promise.all([
        pipedriveGetAll(apiToken, 'deals', '&is_archived=false'),
        pipedriveGetAll(apiToken, 'deals', '&is_archived=true'),
      ])
      const seen = new Set<string>()
      return [...active, ...archived].filter((d: any) => {
        const id = String(d.id)
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
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

        // v2 returns org_id as a plain integer
        const orgId = person.org_id != null ? String(person.org_id) : null

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
        const [deal, { stageMap, pipelineMap, labelMap, enumMaps, userMap }] = await Promise.all([
          fetchSinglePipedriveRecord(apiToken, type, field, value),
          fetchDealMeta(),
        ])
        if (!deal) return notFound(corsHeaders)

        const { error } = await supabaseAdmin.from('deals').upsert(
          mapDeal(deal, stageMap, pipelineMap, labelMap, enumMaps, userMap),
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
            mapContact(p, p.org_id != null ? String(p.org_id) : null)
          ),
          { onConflict: 'contact_pipedrive_id' }
        )
        if (error) throw error
      }
      synced.contacts = pipedrivePersons.length
    }

    if (type === 'deals') {
      const [
        { stageMap, pipelineMap, labelMap, enumMaps, userMap },
        pipedriveDeals,
      ] = await Promise.all([
        fetchDealMeta(),
        fetchAllDeals(),
      ])

      if (pipedriveDeals.length > 0) {
        const { error } = await supabaseAdmin.from('deals').upsert(
          pipedriveDeals.map((d: any) =>
            mapDeal(d, stageMap, pipelineMap, labelMap, enumMaps, userMap)
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
