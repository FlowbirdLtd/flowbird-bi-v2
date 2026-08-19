import { Link } from 'react-router-dom'

/**
 * Field config for DealDetailPage, mirroring the section/label/order of the
 * pre-shared-table-system page exactly.
 *
 * Type assignment follows the original page's own rendering: every field
 * that went through `formatDate(...)` there is 'date' here (a couple of
 * date-shaped fields — e.g. Adviser Contracts Requested — used plain
 * `val()` on the original page and stay 'text' here, deliberately). Money
 * fields (values, considerations, payments, fees, costs, income, turnover,
 * EBITDA figures) are 'gbp'; the two large asset-under-advice-shaped fields
 * are 'gbpShort' to match the deals table column. Multiples are 'multiple'.
 * Percentage fields (no percent type exists) and ambiguous count/status
 * fields stay 'text' to avoid mislabeling.
 */
export const SECTIONS = [
  {
    title: 'Summary',
    fields: [
      { key: 'deal_pipedrive_id', label: 'Deal Pipedrive ID', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'value', label: 'Value', type: 'gbp' },
      { key: 'expected_close_date', label: 'Expected Close Date', type: 'date' },
      {
        key: 'contact.name', label: 'Contact Name', type: 'text',
        render: deal => (
          <Link to={`/contacts/${deal.contact.id}`} style={{ color: 'var(--accent)' }}>{deal.contact.name}</Link>
        ),
      },
      {
        key: 'organisation.name', label: 'Organisation Name', type: 'text',
        render: deal => (
          <Link to={`/organisations/${deal.organisation.id}`} style={{ color: 'var(--accent)' }}>
            {deal.organisation.name}
          </Link>
        ),
      },
      { key: 'stage', label: 'Stage', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'deal_address', label: 'Deal Address', type: 'text' },
    ],
  },
  {
    title: 'General',
    fields: [
      { key: 'fdd_lead', label: 'FDD Lead', type: 'text' },
      { key: 'deal_lead', label: 'Deal Lead', type: 'text' },
      { key: 'basis_of_deal', label: 'Basis of Deal', type: 'text' },
      { key: 'deal_size', label: 'Deal Size', type: 'text' },
      { key: 'vendor_ownership_structure', label: 'Vendor & Ownership Structure', type: 'text' },
      { key: 'deal_source', label: 'Deal Source', type: 'text' },
      { key: 'latest_status_acquisition_committee', label: 'Latest Status (Acquisition Committee)', type: 'text', wide: true },
    ],
  },
  {
    title: 'Transaction Overview',
    fields: [
      { key: 'acquisition_type', label: 'Acquisition Type', type: 'text' },
      { key: 'deal_structure', label: 'Deal Structure', type: 'text' },
      { key: 'payment_schedule', label: 'Payment Schedule', type: 'text' },
      { key: 'completion_payment', label: 'Completion Payment', type: 'gbp' },
      { key: 'headline_consideration', label: 'Headline Consideration', type: 'gbp' },
      { key: 'ri_multiple', label: 'RI Multiple', type: 'multiple' },
      { key: 'net_turnover_multiple', label: 'Net Turnover Multiple', type: 'multiple' },
      { key: 'ebitda_multiple', label: 'EBITDA Multiple', type: 'multiple' },
      { key: 'ebitda_multiple_post_cambridge', label: 'EBITDA Multiple (post-Cambridge)', type: 'multiple' },
      { key: 'introduction_date', label: 'Introduction Date', type: 'date' },
      { key: 'first_meeting_date', label: 'First Meeting Date', type: 'date' },
      { key: 'offer_made_date', label: 'Offer Made Date', type: 'date' },
      { key: 'hots_issued_date', label: 'HoTs Issued Date', type: 'date' },
      { key: 'hots_signed_date', label: 'HoTs Signed Date', type: 'date' },
      { key: 'date_dd_completed', label: 'Date DD Completed', type: 'date' },
      { key: 'deal_exchanged_date', label: 'Deal Exchanged Date', type: 'date' },
      { key: 'deal_complete_date', label: 'Deal Complete Date', type: 'date' },
    ],
  },
  {
    title: 'Intermediary Details',
    fields: [
      { key: 'introductory_company', label: 'Introductory Company', type: 'text' },
      { key: 'introductory_contact', label: 'Introductory Contact', type: 'text' },
      { key: 'broker_fee_type', label: 'Broker Fee', type: 'text' },
      { key: 'broker_fee_value', label: 'Broker Fee (£)', type: 'gbp' },
      { key: 'network_name', label: 'Network Name (if applicable)', type: 'text' },
      { key: 'law_firm_sell_side', label: 'Law Firm (Sell Side)', type: 'text' },
      { key: 'lawyer_contact_sell_side', label: 'Lawyer Contact (Sell Side)', type: 'text' },
      { key: 'law_firm_buy_side', label: 'Law Firm (Buy Side)', type: 'text' },
      { key: 'lawyer_contact_buy_side', label: 'Lawyer Contact (Buy Side)', type: 'text' },
      { key: 'legal_team_lead', label: 'Legal Team Lead', type: 'text' },
    ],
  },
  {
    title: 'Financial Overview and KPIs',
    fields: [
      { key: 'ri_adviser', label: 'RI / Adviser', type: 'gbp' },
      { key: 'nb_adviser', label: 'NB / Adviser', type: 'gbp' },
      { key: 'latest_recurring_income', label: 'Latest Recurring Income', type: 'gbp' },
      { key: 'latest_new_business', label: 'Latest New Business', type: 'gbp' },
      { key: 'latest_turnover', label: 'Latest Turnover', type: 'gbp' },
      { key: 'organic_growth_ri_pct', label: 'Organic Growth in RI %', type: 'text' },
      { key: 'forecast_recurring_income', label: 'Forecast Recurring Income', type: 'gbp' },
      { key: 'forecast_new_business', label: 'Forecast New Business', type: 'gbp' },
      { key: 'forecast_turnover', label: 'Forecast Turnover', type: 'gbp' },
      { key: 'expected_adviser_cost', label: 'Expected Adviser Cost', type: 'gbp' },
      { key: 'existing_ebitda', label: 'Existing EBITDA', type: 'gbp' },
      { key: 'perspective_ebitda', label: 'Perspective EBITDA', type: 'gbp' },
      { key: 'perspective_ebitda_post_cambridge', label: 'Perspective EBITDA (post-Cambridge)', type: 'gbp' },
      { key: 'ebitda_margin_pct', label: 'EBITDA Margin %', type: 'text' },
      { key: 'assets_under_advice', label: 'Assets Under Advice', type: 'gbpShort' },
      { key: 'expected_cambridge_opportunity_aum', label: 'Expected Cambridge Opportunity (AuM)', type: 'gbpShort' },
      { key: 'expected_cambridge_opportunity_ebitda', label: 'Expected Cambridge Opportunity (EBITDA)', type: 'gbp' },
      { key: 'households_per_adviser', label: 'Households per Adviser', type: 'number' },
      { key: 'support_staff_to_advisor_cost_ratio_pct', label: 'Support Staff to Advisor Cost Ratio %', type: 'text' },
    ],
  },
  {
    title: 'HoTs Stage - Key Dates',
    fields: [
      { key: 'board_report_issued', label: 'Board Report Issued', type: 'date' },
      { key: 'target_exchange', label: 'Target Exchange', type: 'date' },
      { key: 'target_completion', label: 'Target Completion', type: 'date' },
      { key: 'confirmed_completion', label: 'Confirmed Completion', type: 'date' },
      { key: 'fdd_rdd_kickoff_call', label: 'FDD / RDD Kick-Off Call', type: 'date' },
      { key: 'fdd_irl_sent', label: 'FDD IRL Sent', type: 'date' },
      { key: 'db_suitability_redress_review_complete', label: 'DB Suitability / Redress Review Complete', type: 'date' },
      { key: 'rdd_data_book_complete', label: 'RDD Data Book Complete', type: 'date' },
      { key: 'file_review_sample_non_db_complete', label: 'File Review Sample (non-DB) Complete', type: 'date' },
      { key: 'rdd_question_pack_response_received', label: 'RDD Question Pack Response Received', type: 'date' },
      { key: 'fdd_additional_data_request_sent', label: 'FDD Additional Data Request Sent', type: 'date' },
      { key: 'snapshot_email_circulated', label: 'Snapshot Email Circulated', type: 'date' },
      { key: 'fdd_question_pack_sent', label: 'FDD Question Pack Sent', type: 'date' },
      { key: 'fdd_question_pack_call', label: 'FDD Question Pack Call', type: 'date' },
      { key: 'lawyers_appointed', label: 'Lawyers Appointed', type: 'date' },
      { key: 'adviser_contracts_requested', label: 'Adviser Contracts Requested', type: 'text' },
      { key: 'spa_issued', label: 'SPA Issued', type: 'date' },
      { key: 'spa_markup_received', label: 'SPA Mark-Up Received', type: 'date' },
      { key: 'hr_ops_dd_complete', label: 'HR and Ops DD Complete', type: 'date' },
      { key: 'fdd_report_drafted', label: 'FDD Report Drafted', type: 'date' },
      { key: 'rdd_report_drafted', label: 'RDD Report Drafted', type: 'date' },
      { key: 'fdd_report_reviewed', label: 'FDD Report Reviewed', type: 'date' },
      { key: 'rdd_report_reviewed', label: 'RDD Report Reviewed', type: 'date' },
      { key: 'ldd_finalised', label: 'LDD Finalised', type: 'date' },
      { key: 'fdd_rdd_reports_approved', label: 'FDD / RDD Reports Approved', type: 'date' },
    ],
  },
  {
    title: 'Clients',
    fields: [
      { key: 'aua_per_household', label: 'AuA / Household', type: 'gbp' },
      { key: 'aua_per_client', label: 'AuA / Client', type: 'gbp' },
      { key: 'number_of_clients', label: 'Number of Clients', type: 'number' },
      { key: 'number_of_households', label: 'Number of Households', type: 'number' },
      { key: 'average_age_of_clients', label: 'Average Age of Clients', type: 'number' },
      { key: 'average_age_of_clients_weighted', label: 'Average Age of Clients (Weighted)', type: 'number' },
      { key: 'typical_initial_fee', label: 'Typical Initial Fee', type: 'text' },
      { key: 'typical_oac_pct_fixed_fees', label: 'Typical OAC % / Fixed Fees', type: 'text' },
      { key: 'platforms', label: 'Platforms', type: 'text', wide: true },
    ],
  },
  {
    title: 'Staff',
    fields: [
      { key: 'number_of_advisers_required', label: 'Number of Advisers Required', type: 'number' },
      { key: 'number_of_employed_advisors_retained', label: 'Number of Employed Advisors Retained', type: 'number' },
      { key: 'number_of_self_employed_advisors_retained', label: 'Number of Self-Employed Advisors Retained', type: 'number' },
      { key: 'number_of_paraplanners_retained', label: 'Number of Paraplanners Retained', type: 'number' },
      { key: 'number_of_administrators_retained', label: 'Number of Administrators Retained', type: 'number' },
      { key: 'number_of_other_staff_retained', label: 'Number of Other Staff Retained', type: 'number' },
      { key: 'number_of_staff_exiting_on_completion', label: 'Number of Staff Exiting on Completion', type: 'number' },
      { key: 'number_of_staff_redeployed_to_group_roles', label: 'Number of Staff to be Redeployed to Group Roles', type: 'number' },
      { key: 'recruitment_requirements', label: 'Recruitment Requirements', type: 'text', wide: true },
      { key: 'people_team_lead', label: 'People Team Lead', type: 'text' },
      { key: 'adviser_contracts_sent', label: 'Adviser Contracts Sent', type: 'date' },
      { key: 'eli_sent', label: 'ELI Sent', type: 'date' },
      { key: 'eli_received', label: 'ELI Received', type: 'date' },
      { key: 'tupe_measures_sent', label: 'TUPE Measures Sent', type: 'date' },
      { key: 'contact_2_name', label: 'Contact 2 Name', type: 'text' },
      { key: 'contact_2_phone', label: 'Contact 2 Phone', type: 'text' },
      { key: 'contact_2_email', label: 'Contact 2 Email', type: 'text' },
      { key: 'contact_3_name', label: 'Contact 3 Name', type: 'text' },
      { key: 'contact_3_phone', label: 'Contact 3 Phone', type: 'text' },
      { key: 'contact_3_email', label: 'Contact 3 Email', type: 'text' },
    ],
  },
  {
    title: 'Property',
    fields: [
      { key: 'details_of_property', label: 'Details of Property', type: 'text', wide: true },
      { key: 'lease_details', label: 'Lease Details', type: 'text', wide: true },
      { key: 'ownership_of_property', label: 'Ownership of Property', type: 'text' },
      { key: 'post_acquisition_office_plans', label: 'Post-Acquisition Office Plans', type: 'text', wide: true },
    ],
  },
  {
    title: 'Costs',
    fields: [
      { key: 'fca_pi_pct', label: 'FCA / PI %', type: 'text' },
      { key: 'variable_cost_pct', label: 'Variable Cost %', type: 'text' },
      { key: 'fixed_costs', label: 'Fixed Costs', type: 'gbp' },
    ],
  },
  {
    title: 'Regulatory',
    fields: [
      { key: 'rdd_lead', label: 'RDD Lead', type: 'text' },
      { key: 'defined_benefit_transfers', label: 'Defined Benefit Transfers', type: 'text' },
      { key: 'defined_benefit_transfer_total', label: 'Defined Benefit Transfer Total (£)', type: 'gbp' },
      { key: 'other_regulatory_items_of_note', label: 'Other Regulatory Items of Note', type: 'text', wide: true },
      { key: 'consumer_duty_plan_signed_off', label: 'Consumer Duty Plan Signed Off', type: 'text' },
      { key: 'cic_submitted', label: 'CiC Submitted', type: 'text' },
      { key: 'cic_submitted_date', label: 'CiC Submitted Date', type: 'date' },
      { key: 'deauthorisation_application_submitted', label: 'Deauthorisation Application Submitted', type: 'date' },
      { key: 'deauthorisation_target_date', label: 'Deauthorisation Target Date', type: 'date' },
      { key: 'deauthorisation_approved', label: 'Deauthorisation Approved', type: 'date' },
    ],
  },
  {
    title: 'Back Office',
    fields: [
      { key: 'perspective_regional_director', label: 'Perspective Regional Director', type: 'text' },
      { key: 'perspective_regional_manager', label: 'Perspective Regional Manager', type: 'text' },
      { key: 'perspective_principal', label: 'Perspective Principal', type: 'text' },
      { key: 'perspective_trading_style_registered', label: 'Perspective Trading Style Registered', type: 'text' },
      { key: 'agreed_perspective_trading_style', label: 'Agreed Perspective Trading Style', type: 'text' },
      { key: 'receiving_office', label: 'Receiving Office', type: 'text' },
      { key: 'perspective_entity', label: 'Perspective Entity', type: 'text' },
      { key: 'back_office_system', label: 'Back Office System', type: 'text' },
      { key: 'document_management_system', label: 'Document Management System', type: 'text' },
      { key: 'other_integration_notes', label: 'Other Integration Notes', type: 'text', wide: true },
      { key: 'client_letter_status', label: 'Client Letter Status', type: 'text' },
      { key: 'mailing_data_status', label: 'Mailing Data Status', type: 'text' },
      { key: 'regional_director_introduction', label: 'Regional Director / Regional Manager Introduction', type: 'text' },
      { key: 'integration_kickoff_date', label: 'Instruction for Integration Kick Off Date', type: 'date' },
      { key: 'data_meeting_held', label: 'Data Meeting Held', type: 'date' },
      { key: 'core_compliance_ca_request_sent', label: 'Core Compliance CA Request Sent', type: 'date' },
      { key: 'first_data_request_response_received', label: 'First Data Request Response Received', type: 'date' },
      { key: 'client_letter_sign_off_completed', label: 'Client Letter Sign Off Completed', type: 'date' },
      { key: 'repapering_finalised_date', label: 'Repapering Finalised and Agreed Date', type: 'date' },
      { key: 'printing_and_delivery_date', label: 'Printing and Delivery Date', type: 'date' },
      { key: 'perspective_project_manager', label: 'Perspective Project Manager', type: 'text' },
      { key: 'data_team_lead', label: 'Data Team Lead', type: 'text' },
      { key: 'client_portal', label: 'Client Portal', type: 'text' },
      { key: 'ai_solutions', label: 'AI Solutions', type: 'text' },
    ],
  },
  {
    title: 'Declined Deals',
    fields: [
      { key: 'date_declined', label: 'Date Declined', type: 'date' },
      { key: 'loss_driver', label: 'Loss Driver', type: 'text' },
      { key: 'reason_for_decline', label: 'Reason for Decline', type: 'text' },
      { key: 'reason_for_decline_detail', label: 'Reason for Decline Detail', type: 'text', wide: true },
      { key: 'other_player_sold_to', label: 'Other player sold to (if known)', type: 'text' },
    ],
  },
]
