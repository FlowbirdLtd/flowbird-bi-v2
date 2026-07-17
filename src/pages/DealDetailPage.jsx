import { useParams, Link } from 'react-router-dom'
import { useDeal } from '../hooks/useDeals'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB')
}

function val(v) {
  if (v === null || v === undefined) return ''
  return String(v)
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontWeight: 700, fontSize: 15, color: 'var(--nav)',
        paddingBottom: 6, marginBottom: 0, borderBottom: '2px solid var(--border)',
      }}>
        {title}
      </div>
      <div style={{ border: '1px solid var(--border)', borderTop: 'none' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        background: '#f5f6fa', fontWeight: 600, width: 320, flexShrink: 0,
        padding: '8px 12px', color: '#374151', fontSize: 13,
      }}>
        {label}
      </div>
      <div style={{
        background: '#fff', flex: 1, padding: '8px 12px',
        color: 'var(--text)', fontSize: 13,
      }}>
        {children}
      </div>
    </div>
  )
}

export default function DealDetailPage() {
  const { id } = useParams()
  const { data: deal, isLoading } = useDeal(id)

  if (isLoading) return <div style={{ padding: 40 }}>Loading...</div>
  if (!deal) return <div style={{ padding: 40 }}>Deal not found.</div>

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
        <Link to="/deals" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Deals</Link>
        {' > View Deal Details.'}
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--nav)', marginBottom: 20 }}>
        Deal Information
      </h1>

      {/* ── Summary ─────────────────────────────────────────────────────────── */}
      <Section title="Summary">
        <Field label="Deal Pipedrive ID">{val(deal.deal_pipedrive_id)}</Field>
        <Field label="Title">{val(deal.title)}</Field>
        <Field label="Value">{val(deal.value)}</Field>
        <Field label="Expected Close Date">{formatDate(deal.expected_close_date)}</Field>
        <Field label="Contact Name">
          {deal.contact
            ? <Link to={`/contacts/${deal.contact.id}`} style={{ color: 'var(--accent)' }}>{deal.contact.name}</Link>
            : ''}
        </Field>
        <Field label="Organisation Name">
          {deal.organisation
            ? <Link to={`/organisations/${deal.organisation.id}`} style={{ color: 'var(--accent)' }}>{deal.organisation.name}</Link>
            : ''}
        </Field>
        <Field label="Stage">{val(deal.stage)}</Field>
        <Field label="Status">{val(deal.status)}</Field>
        <Field label="Deal Address">{val(deal.deal_address)}</Field>
      </Section>

      {/* ── General ─────────────────────────────────────────────────────────── */}
      <Section title="General">
        <Field label="FDD Lead">{val(deal.fdd_lead)}</Field>
        <Field label="Deal Lead">{val(deal.deal_lead)}</Field>
        <Field label="Basis of Deal">{val(deal.basis_of_deal)}</Field>
        <Field label="Deal Size">{val(deal.deal_size)}</Field>
        <Field label="Vendor &amp; Ownership Structure">{val(deal.vendor_ownership_structure)}</Field>
        <Field label="Deal Source">{val(deal.deal_source)}</Field>
        <Field label="Latest Status (Acquisition Committee)">{val(deal.latest_status_acquisition_committee)}</Field>
      </Section>

      {/* ── Transaction Overview ─────────────────────────────────────────────── */}
      <Section title="Transaction Overview">
        <Field label="Acquisition Type">{val(deal.acquisition_type)}</Field>
        <Field label="Deal Structure">{val(deal.deal_structure)}</Field>
        <Field label="Payment Schedule">{val(deal.payment_schedule)}</Field>
        <Field label="Completion Payment">{val(deal.completion_payment)}</Field>
        <Field label="Headline Consideration">{val(deal.headline_consideration)}</Field>
        <Field label="RI Multiple">{val(deal.ri_multiple)}</Field>
        <Field label="Net Turnover Multiple">{val(deal.net_turnover_multiple)}</Field>
        <Field label="EBITDA Multiple">{val(deal.ebitda_multiple)}</Field>
        <Field label="EBITDA Multiple (post-Cambridge)">{val(deal.ebitda_multiple_post_cambridge)}</Field>
        <Field label="Introduction Date">{formatDate(deal.introduction_date)}</Field>
        <Field label="First Meeting Date">{formatDate(deal.first_meeting_date)}</Field>
        <Field label="Offer Made Date">{formatDate(deal.offer_made_date)}</Field>
        <Field label="HoTs Issued Date">{formatDate(deal.hots_issued_date)}</Field>
        <Field label="HoTs Signed Date">{formatDate(deal.hots_signed_date)}</Field>
        <Field label="Date DD Completed">{formatDate(deal.date_dd_completed)}</Field>
        <Field label="Deal Exchanged Date">{formatDate(deal.deal_exchanged_date)}</Field>
        <Field label="Deal Complete Date">{formatDate(deal.deal_complete_date)}</Field>
      </Section>

      {/* ── Intermediary Details ─────────────────────────────────────────────── */}
      <Section title="Intermediary Details">
        <Field label="Introductory Company">{val(deal.introductory_company)}</Field>
        <Field label="Introductory Contact">{val(deal.introductory_contact)}</Field>
        <Field label="Broker Fee">{val(deal.broker_fee_type)}</Field>
        <Field label="Broker Fee (£)">{val(deal.broker_fee_value)}</Field>
        <Field label="Network Name (if applicable)">{val(deal.network_name)}</Field>
        <Field label="Law Firm (Sell Side)">{val(deal.law_firm_sell_side)}</Field>
        <Field label="Lawyer Contact (Sell Side)">{val(deal.lawyer_contact_sell_side)}</Field>
        <Field label="Law Firm (Buy Side)">{val(deal.law_firm_buy_side)}</Field>
        <Field label="Lawyer Contact (Buy Side)">{val(deal.lawyer_contact_buy_side)}</Field>
        <Field label="Legal Team Lead">{val(deal.legal_team_lead)}</Field>
      </Section>

      {/* ── Financial Overview and KPIs ──────────────────────────────────────── */}
      <Section title="Financial Overview and KPIs">
        <Field label="RI / Adviser">{val(deal.ri_adviser)}</Field>
        <Field label="NB / Adviser">{val(deal.nb_adviser)}</Field>
        <Field label="Latest Recurring Income">{val(deal.latest_recurring_income)}</Field>
        <Field label="Latest New Business">{val(deal.latest_new_business)}</Field>
        <Field label="Latest Turnover">{val(deal.latest_turnover)}</Field>
        <Field label="Organic Growth in RI %">{val(deal.organic_growth_ri_pct)}</Field>
        <Field label="Forecast Recurring Income">{val(deal.forecast_recurring_income)}</Field>
        <Field label="Forecast New Business">{val(deal.forecast_new_business)}</Field>
        <Field label="Forecast Turnover">{val(deal.forecast_turnover)}</Field>
        <Field label="Expected Adviser Cost">{val(deal.expected_adviser_cost)}</Field>
        <Field label="Existing EBITDA">{val(deal.existing_ebitda)}</Field>
        <Field label="Perspective EBITDA">{val(deal.perspective_ebitda)}</Field>
        <Field label="Perspective EBITDA (post-Cambridge)">{val(deal.perspective_ebitda_post_cambridge)}</Field>
        <Field label="EBITDA Margin %">{val(deal.ebitda_margin_pct)}</Field>
        <Field label="Assets Under Advice">{val(deal.assets_under_advice)}</Field>
        <Field label="Expected Cambridge Opportunity (AuM)">{val(deal.expected_cambridge_opportunity_aum)}</Field>
        <Field label="Expected Cambridge Opportunity (EBITDA)">{val(deal.expected_cambridge_opportunity_ebitda)}</Field>
        <Field label="Households per Adviser">{val(deal.households_per_adviser)}</Field>
        <Field label="Support Staff to Advisor Cost Ratio %">{val(deal.support_staff_to_advisor_cost_ratio_pct)}</Field>
      </Section>

      {/* ── HoTs Stage - Key Dates ───────────────────────────────────────────── */}
      <Section title="HoTs Stage - Key Dates">
        <Field label="Board Report Issued">{formatDate(deal.board_report_issued)}</Field>
        <Field label="Target Exchange">{formatDate(deal.target_exchange)}</Field>
        <Field label="Target Completion">{formatDate(deal.target_completion)}</Field>
        <Field label="Confirmed Completion">{formatDate(deal.confirmed_completion)}</Field>
        <Field label="FDD / RDD Kick-Off Call">{formatDate(deal.fdd_rdd_kickoff_call)}</Field>
        <Field label="FDD IRL Sent">{formatDate(deal.fdd_irl_sent)}</Field>
        <Field label="DB Suitability / Redress Review Complete">{formatDate(deal.db_suitability_redress_review_complete)}</Field>
        <Field label="RDD Data Book Complete">{formatDate(deal.rdd_data_book_complete)}</Field>
        <Field label="File Review Sample (non-DB) Complete">{formatDate(deal.file_review_sample_non_db_complete)}</Field>
        <Field label="RDD Question Pack Response Received">{formatDate(deal.rdd_question_pack_response_received)}</Field>
        <Field label="FDD Additional Data Request Sent">{formatDate(deal.fdd_additional_data_request_sent)}</Field>
        <Field label="Snapshot Email Circulated">{formatDate(deal.snapshot_email_circulated)}</Field>
        <Field label="FDD Question Pack Sent">{formatDate(deal.fdd_question_pack_sent)}</Field>
        <Field label="FDD Question Pack Call">{formatDate(deal.fdd_question_pack_call)}</Field>
        <Field label="Lawyers Appointed">{formatDate(deal.lawyers_appointed)}</Field>
        <Field label="Adviser Contracts Requested">{val(deal.adviser_contracts_requested)}</Field>
        <Field label="SPA Issued">{formatDate(deal.spa_issued)}</Field>
        <Field label="SPA Mark-Up Received">{formatDate(deal.spa_markup_received)}</Field>
        <Field label="HR and Ops DD Complete">{formatDate(deal.hr_ops_dd_complete)}</Field>
        <Field label="FDD Report Drafted">{formatDate(deal.fdd_report_drafted)}</Field>
        <Field label="RDD Report Drafted">{formatDate(deal.rdd_report_drafted)}</Field>
        <Field label="FDD Report Reviewed">{formatDate(deal.fdd_report_reviewed)}</Field>
        <Field label="RDD Report Reviewed">{formatDate(deal.rdd_report_reviewed)}</Field>
        <Field label="LDD Finalised">{formatDate(deal.ldd_finalised)}</Field>
        <Field label="FDD / RDD Reports Approved">{formatDate(deal.fdd_rdd_reports_approved)}</Field>
      </Section>

      {/* ── Clients ─────────────────────────────────────────────────────────── */}
      <Section title="Clients">
        <Field label="AuA / Household">{val(deal.aua_per_household)}</Field>
        <Field label="AuA / Client">{val(deal.aua_per_client)}</Field>
        <Field label="Number of Clients">{val(deal.number_of_clients)}</Field>
        <Field label="Number of Households">{val(deal.number_of_households)}</Field>
        <Field label="Average Age of Clients">{val(deal.average_age_of_clients)}</Field>
        <Field label="Average Age of Clients (Weighted)">{val(deal.average_age_of_clients_weighted)}</Field>
        <Field label="Typical Initial Fee">{val(deal.typical_initial_fee)}</Field>
        <Field label="Typical OAC % / Fixed Fees">{val(deal.typical_oac_pct_fixed_fees)}</Field>
        <Field label="Platforms">{val(deal.platforms)}</Field>
      </Section>

      {/* ── Staff ───────────────────────────────────────────────────────────── */}
      <Section title="Staff">
        <Field label="Number of Advisers Required">{val(deal.number_of_advisers_required)}</Field>
        <Field label="Number of Employed Advisors Retained">{val(deal.number_of_employed_advisors_retained)}</Field>
        <Field label="Number of Self-Employed Advisors Retained">{val(deal.number_of_self_employed_advisors_retained)}</Field>
        <Field label="Number of Paraplanners Retained">{val(deal.number_of_paraplanners_retained)}</Field>
        <Field label="Number of Administrators Retained">{val(deal.number_of_administrators_retained)}</Field>
        <Field label="Number of Other Staff Retained">{val(deal.number_of_other_staff_retained)}</Field>
        <Field label="Number of Staff Exiting on Completion">{val(deal.number_of_staff_exiting_on_completion)}</Field>
        <Field label="Number of Staff to be Redeployed to Group Roles">{val(deal.number_of_staff_redeployed_to_group_roles)}</Field>
        <Field label="Recruitment Requirements">{val(deal.recruitment_requirements)}</Field>
        <Field label="People Team Lead">{val(deal.people_team_lead)}</Field>
        <Field label="Adviser Contracts Sent">{formatDate(deal.adviser_contracts_sent)}</Field>
        <Field label="ELI Sent">{formatDate(deal.eli_sent)}</Field>
        <Field label="ELI Received">{formatDate(deal.eli_received)}</Field>
        <Field label="TUPE Measures Sent">{formatDate(deal.tupe_measures_sent)}</Field>
        <Field label="Contact 2 Name">{val(deal.contact_2_name)}</Field>
        <Field label="Contact 2 Phone">{val(deal.contact_2_phone)}</Field>
        <Field label="Contact 2 Email">{val(deal.contact_2_email)}</Field>
        <Field label="Contact 3 Name">{val(deal.contact_3_name)}</Field>
        <Field label="Contact 3 Phone">{val(deal.contact_3_phone)}</Field>
        <Field label="Contact 3 Email">{val(deal.contact_3_email)}</Field>
      </Section>

      {/* ── Property ────────────────────────────────────────────────────────── */}
      <Section title="Property">
        <Field label="Details of Property">{val(deal.details_of_property)}</Field>
        <Field label="Lease Details">{val(deal.lease_details)}</Field>
        <Field label="Ownership of Property">{val(deal.ownership_of_property)}</Field>
        <Field label="Post-Acquisition Office Plans">{val(deal.post_acquisition_office_plans)}</Field>
      </Section>

      {/* ── Costs ───────────────────────────────────────────────────────────── */}
      <Section title="Costs">
        <Field label="FCA / PI %">{val(deal.fca_pi_pct)}</Field>
        <Field label="Variable Cost %">{val(deal.variable_cost_pct)}</Field>
        <Field label="Fixed Costs">{val(deal.fixed_costs)}</Field>
      </Section>

      {/* ── Regulatory ──────────────────────────────────────────────────────── */}
      <Section title="Regulatory">
        <Field label="RDD Lead">{val(deal.rdd_lead)}</Field>
        <Field label="Defined Benefit Transfers">{val(deal.defined_benefit_transfers)}</Field>
        <Field label="Defined Benefit Transfer Total (£)">{val(deal.defined_benefit_transfer_total)}</Field>
        <Field label="Other Regulatory Items of Note">{val(deal.other_regulatory_items_of_note)}</Field>
        <Field label="Consumer Duty Plan Signed Off">{val(deal.consumer_duty_plan_signed_off)}</Field>
        <Field label="CiC Submitted">{val(deal.cic_submitted)}</Field>
        <Field label="CiC Submitted Date">{formatDate(deal.cic_submitted_date)}</Field>
        <Field label="Deauthorisation Application Submitted">{formatDate(deal.deauthorisation_application_submitted)}</Field>
        <Field label="Deauthorisation Target Date">{formatDate(deal.deauthorisation_target_date)}</Field>
        <Field label="Deauthorisation Approved">{formatDate(deal.deauthorisation_approved)}</Field>
      </Section>

      {/* ── Back Office ─────────────────────────────────────────────────────── */}
      <Section title="Back Office">
        <Field label="Perspective Regional Director">{val(deal.perspective_regional_director)}</Field>
        <Field label="Perspective Regional Manager">{val(deal.perspective_regional_manager)}</Field>
        <Field label="Perspective Principal">{val(deal.perspective_principal)}</Field>
        <Field label="Perspective Trading Style Registered">{val(deal.perspective_trading_style_registered)}</Field>
        <Field label="Agreed Perspective Trading Style">{val(deal.agreed_perspective_trading_style)}</Field>
        <Field label="Receiving Office">{val(deal.receiving_office)}</Field>
        <Field label="Perspective Entity">{val(deal.perspective_entity)}</Field>
        <Field label="Back Office System">{val(deal.back_office_system)}</Field>
        <Field label="Document Management System">{val(deal.document_management_system)}</Field>
        <Field label="Other Integration Notes">{val(deal.other_integration_notes)}</Field>
        <Field label="Client Letter Status">{val(deal.client_letter_status)}</Field>
        <Field label="Mailing Data Status">{val(deal.mailing_data_status)}</Field>
        <Field label="Regional Director / Regional Manager Introduction">{val(deal.regional_director_introduction)}</Field>
        <Field label="Instruction for Integration Kick Off Date">{formatDate(deal.integration_kickoff_date)}</Field>
        <Field label="Data Meeting Held">{formatDate(deal.data_meeting_held)}</Field>
        <Field label="Core Compliance CA Request Sent">{formatDate(deal.core_compliance_ca_request_sent)}</Field>
        <Field label="First Data Request Response Received">{formatDate(deal.first_data_request_response_received)}</Field>
        <Field label="Client Letter Sign Off Completed">{formatDate(deal.client_letter_sign_off_completed)}</Field>
        <Field label="Repapering Finalised and Agreed Date">{formatDate(deal.repapering_finalised_date)}</Field>
        <Field label="Printing and Delivery Date">{formatDate(deal.printing_and_delivery_date)}</Field>
        <Field label="Perspective Project Manager">{val(deal.perspective_project_manager)}</Field>
        <Field label="Data Team Lead">{val(deal.data_team_lead)}</Field>
        <Field label="Client Portal">{val(deal.client_portal)}</Field>
        <Field label="AI Solutions">{val(deal.ai_solutions)}</Field>
      </Section>

      {/* ── Declined Deals ──────────────────────────────────────────────────── */}
      <Section title="Declined Deals">
        <Field label="Date Declined">{formatDate(deal.date_declined)}</Field>
        <Field label="Loss Driver">{val(deal.loss_driver)}</Field>
        <Field label="Reason for Decline">{val(deal.reason_for_decline)}</Field>
        <Field label="Reason for Decline Detail">{val(deal.reason_for_decline_detail)}</Field>
        <Field label="Other player sold to (if known)">{val(deal.other_player_sold_to)}</Field>
      </Section>

      <div style={{ marginTop: 24 }}>
        <Link to="/deals" style={{ color: 'var(--accent)', fontSize: 13 }}>&larr; Back to Deals</Link>
      </div>
    </div>
  )
}
