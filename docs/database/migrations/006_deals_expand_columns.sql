-- Migration 006: Expand deals table to include all Knack deal properties
-- Run in Supabase SQL Editor
-- Existing columns retained: id, deal_pipedrive_id, title, value, weighted_value,
--   currency, expected_close_date, contact_id, organisation_id, stage, status, owner,
--   basis_of_deal, deal_size, vendor_ownership_structure, deal_source,
--   latest_status_acquisition_committee, acquisition_type, deal_structure, fdd_lead,
--   rdd_lead, introductory_company, introduction_date, first_meeting_date,
--   offer_made_date, hots_issued_date, hots_signed_date, deal_exchanged_date,
--   deal_complete_date, headline_consideration, ri_multiple, net_turnover_multiple,
--   ebitda_multiple, latest_recurring_income, latest_new_business, latest_turnover,
--   assets_under_advice, number_of_clients, number_of_households, probability,
--   pipeline, label, broker_fee, receiving_office, perspective_entity,
--   perspective_principal, perspective_regional_director, reason_for_decline,
--   reason_for_decline_detail, payment_schedule, deal_address, date_created,
--   created_at, updated_at

-- ── Pipedrive / CRM activity metadata ────────────────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS pipedrive_datetime          timestamptz;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS update_time                 timestamptz;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_stage_change           text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS next_activity_date          date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_activity_date          date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS won_time                    text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS won_time_from_to            text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS won_time_formatted          text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_email_received         date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_email_sent             date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lost_time                   date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_closed_on              date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lost_reason                 text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS visible_to                  text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS total_activities            text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS done_activities             text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS activities_to_do            text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS email_messages_count        text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS product_quantity            text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS product_amount              text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS product_name                text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS mrr                         text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS arr                         text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS acv                         text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source_origin               text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source_origin_id            text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source_channel              text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source_channel_id           text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS creator                     text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS contact_person              text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS organisation_copy           text;

-- ── Financial / valuation ─────────────────────────────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ebitda_multiple_post_cambridge        text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS currency_of_headline_consideration    text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS organic_growth_ri_pct                 text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS forecast_recurring_income             text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS forecast_new_business                 text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS forecast_turnover                     text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS expected_adviser_cost                 text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS existing_ebitda                       text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS perspective_ebitda                    text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS perspective_ebitda_post_cambridge     text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ebitda_margin_pct                     text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS expected_cambridge_opportunity_aum    text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS expected_cambridge_opportunity_ebitda text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS households_per_adviser                text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS support_staff_to_advisor_cost_ratio_pct text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS aua_per_household                     text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS aua_per_client                        text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ri_adviser                            text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS nb_adviser                            text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS fca_pi_pct                            text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS variable_cost_pct                     text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS fixed_costs                           text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS enterprise_value_m                    text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recurring_income_m                    text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ri_checker                            text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ebitda_m                              text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS completion_payment                    text;
-- Display / computed variants (read-only mirrors from Knack)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS completion_payment_display            text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS perspective_ebitda_display            text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS value_display                         text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS assets_under_advice_display           text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS forecast_recurring_income_display     text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS headline_consideration_display        text;

-- ── Client / adviser / workforce ──────────────────────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS average_age_of_clients                text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS average_age_of_clients_weighted       text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS typical_initial_fee                   text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS typical_oac_pct_fixed_fees            text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS platforms                             text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS number_of_advisers_required           text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS number_of_employed_advisors_retained  text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS number_of_self_employed_advisors_retained text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS number_of_paraplanners_retained       text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS number_of_administrators_retained     text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS number_of_other_staff_retained        text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS number_of_staff_exiting_on_completion text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS number_of_staff_redeployed_to_group_roles text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recruitment_requirements              text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS defined_benefit_transfers             text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS defined_benefit_transfer_total        text;

-- ── Additional contacts ───────────────────────────────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS introductory_contact  text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS contact_2_name        text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS contact_2_email       text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS contact_2_phone       text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS contact_3_name        text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS contact_3_email       text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS contact_3_phone       text;

-- ── Property ──────────────────────────────────────────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS details_of_property   text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lease_details         text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ownership_of_property text;

-- ── Integration, compliance & operational ────────────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS other_integration_notes              text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS other_regulatory_items_of_note       text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS client_letter_status                 text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS mailing_data_status                  text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS network_name                         text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS perspective_trading_style_registered text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS agreed_perspective_trading_style     text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS post_acquisition_office_plans        text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS regional_director_introduction       text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS back_office_system                   text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS document_management_system           text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS consumer_duty_plan_signed_off        text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS cic_submitted                        text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS cic_submitted_date                   date;

-- ── Legal ─────────────────────────────────────────────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS law_firm_sell_side         text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lawyer_contact_sell_side   text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS law_firm_buy_side          text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lawyer_contact_buy_side    text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS broker_fee_query           text;

-- ── Due diligence & deal process milestone dates ──────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS date_dd_completed                    date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS board_report_issued                  date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS target_exchange                      date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS target_completion                    date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS fdd_rdd_kickoff_call                 date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS fdd_irl_sent                         date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS db_suitability_redress_review_complete date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS rdd_data_book_complete               date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS file_review_sample_non_db_complete   date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS rdd_question_pack_response_received  date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS fdd_additional_data_request_sent     date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS snapshot_email_circulated            date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS fdd_question_pack_sent               date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS fdd_question_pack_call               date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lawyers_appointed                    date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS spa_issued                           date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS spa_markup_received                  date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS hr_ops_dd_complete                   date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS fdd_report_drafted                   date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS rdd_report_drafted                   date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS fdd_report_reviewed                  date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS rdd_report_reviewed                  date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ldd_finalised                        date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS fdd_rdd_reports_approved             date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS date_declined                        date;

-- ── Post-completion / integration dates ───────────────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS adviser_contracts_requested          text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS adviser_contracts_sent               date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS eli_sent                             date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS eli_received                         date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS tupe_measures_sent                   date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS integration_kickoff_date             date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS data_meeting_held                    date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS core_compliance_ca_request_sent      date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS first_data_request_response_received date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS client_letter_sign_off_completed     date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS repapering_finalised_date            date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS printing_and_delivery_date           date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS confirmed_completion                 date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS confirmed_completion_text            text;

-- ── Deauthorisation ───────────────────────────────────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deauthorisation_application_submitted date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deauthorisation_target_date           date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deauthorisation_approved              date;

-- ── Team leads & people ───────────────────────────────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS perspective_project_manager    text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS people_team_lead               text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS legal_team_lead                text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS data_team_lead                 text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_lead                      text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_lead_bi                   text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS perspective_regional_director_old text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS perspective_regional_manager   text;

-- ── System / metadata ─────────────────────────────────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS flowbird_bi_id      text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS loss_driver         text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS client_portal       text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ai_solutions        text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS other_player_sold_to text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS database_record     text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS remove_flag         text;
