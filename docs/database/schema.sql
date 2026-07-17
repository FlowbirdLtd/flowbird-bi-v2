-- Flowbird BI v2 – Supabase PostgreSQL Schema
-- Current as of migration 006 (deals expanded columns)
--
-- Run this on a fresh Supabase project to recreate the full database.
-- Requires auth.users to exist (built-in to every Supabase project).

-- ── Extensions ────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto with schema extensions;

-- ── Tables ────────────────────────────────────────────────────────────────────

create table organisations (
  id                        uuid primary key default gen_random_uuid(),
  org_pipedrive_id          text unique not null,
  name                      text,
  address                   text,
  company_status            text,
  website                   text,
  vendor_ownership_structure text,
  authorisation_status      text,
  fca_number                text,
  id_urn                    text,
  date_created              date,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

alter table organisations enable row level security;


create table contacts (
  id                    uuid primary key default gen_random_uuid(),
  contact_pipedrive_id  text unique not null,
  name                  text,
  email                 text,
  phone                 text,
  age                   text,
  job_title             text,
  date_created          date,
  organisation_id       text references organisations(org_pipedrive_id) on delete set null,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

alter table contacts enable row level security;


create table deals (
  id                    uuid primary key default gen_random_uuid(),
  deal_pipedrive_id     text unique not null,
  title                 text,

  -- ── Core Pipedrive fields ──────────────────────────────────────────────────
  value                 text,
  weighted_value        text,
  currency              text default 'GBP',
  expected_close_date   date,
  contact_id            text references contacts(contact_pipedrive_id) on delete set null,
  organisation_id       text references organisations(org_pipedrive_id) on delete set null,
  stage                 text,
  pipeline              text,
  status                text,
  owner                 text,
  probability           text,
  label                 text,
  date_created          date,

  -- ── General ───────────────────────────────────────────────────────────────
  basis_of_deal                         text,
  deal_size                             text,
  vendor_ownership_structure            text,
  deal_source                           text,
  latest_status_acquisition_committee  text,
  deal_address                          text,
  fdd_lead                              text,
  deal_lead                             text,

  -- ── Transaction Overview ──────────────────────────────────────────────────
  acquisition_type                text,
  deal_structure                  text,
  payment_schedule                text,
  completion_payment              text,
  headline_consideration          text,
  ri_multiple                     text,
  net_turnover_multiple           text,
  ebitda_multiple                 text,
  ebitda_multiple_post_cambridge  text,
  introduction_date               date,
  first_meeting_date              date,
  offer_made_date                 date,
  hots_issued_date                date,
  hots_signed_date                date,
  date_dd_completed               date,
  deal_exchanged_date             date,
  deal_complete_date              date,

  -- ── Intermediary Details ──────────────────────────────────────────────────
  introductory_company        text,
  introductory_contact        text,
  broker_fee_type             text,
  broker_fee_value            text,
  network_name                text,
  law_firm_sell_side          text,
  lawyer_contact_sell_side    text,
  law_firm_buy_side           text,
  lawyer_contact_buy_side     text,
  legal_team_lead             text,

  -- ── Financial Overview and KPIs ───────────────────────────────────────────
  ri_adviser                              text,
  nb_adviser                              text,
  latest_recurring_income                 text,
  latest_new_business                     text,
  latest_turnover                         text,
  organic_growth_ri_pct                   text,
  forecast_recurring_income               text,
  forecast_new_business                   text,
  forecast_turnover                       text,
  expected_adviser_cost                   text,
  existing_ebitda                         text,
  perspective_ebitda                      text,
  perspective_ebitda_post_cambridge       text,
  ebitda_margin_pct                       text,
  assets_under_advice                     text,
  expected_cambridge_opportunity_aum      text,
  expected_cambridge_opportunity_ebitda   text,
  households_per_adviser                  text,
  support_staff_to_advisor_cost_ratio_pct text,
  enterprise_value_m                      text,
  recurring_income_m                      text,
  ri_checker                              text,
  ebitda_m                                text,
  fca_pi_pct                              text,
  variable_cost_pct                       text,
  fixed_costs                             text,
  currency_of_headline_consideration      text,
  -- Display / computed variants
  completion_payment_display              text,
  perspective_ebitda_display              text,
  value_display                           text,
  assets_under_advice_display             text,
  forecast_recurring_income_display       text,
  headline_consideration_display          text,

  -- ── HoTs Stage – Key Dates ────────────────────────────────────────────────
  board_report_issued                     date,
  target_exchange                         date,
  target_completion                       date,
  confirmed_completion                    date,
  confirmed_completion_text               text,
  fdd_rdd_kickoff_call                    date,
  fdd_irl_sent                            date,
  db_suitability_redress_review_complete  date,
  rdd_data_book_complete                  date,
  file_review_sample_non_db_complete      date,
  rdd_question_pack_response_received     date,
  fdd_additional_data_request_sent        date,
  snapshot_email_circulated               date,
  fdd_question_pack_sent                  date,
  fdd_question_pack_call                  date,
  lawyers_appointed                       date,
  adviser_contracts_requested             text,
  spa_issued                              date,
  spa_markup_received                     date,
  hr_ops_dd_complete                      date,
  fdd_report_drafted                      date,
  rdd_report_drafted                      date,
  fdd_report_reviewed                     date,
  rdd_report_reviewed                     date,
  ldd_finalised                           date,
  fdd_rdd_reports_approved                date,

  -- ── Clients ───────────────────────────────────────────────────────────────
  number_of_clients                   text,
  number_of_households                text,
  aua_per_household                   text,
  aua_per_client                      text,
  average_age_of_clients              text,
  average_age_of_clients_weighted     text,
  typical_initial_fee                 text,
  typical_oac_pct_fixed_fees          text,
  platforms                           text,

  -- ── Staff ─────────────────────────────────────────────────────────────────
  number_of_advisers_required               text,
  number_of_employed_advisors_retained      text,
  number_of_self_employed_advisors_retained text,
  number_of_paraplanners_retained           text,
  number_of_administrators_retained         text,
  number_of_other_staff_retained            text,
  number_of_staff_exiting_on_completion     text,
  number_of_staff_redeployed_to_group_roles text,
  recruitment_requirements                  text,
  people_team_lead                          text,
  adviser_contracts_sent                    date,
  eli_sent                                  date,
  eli_received                              date,
  tupe_measures_sent                        date,
  contact_2_name                            text,
  contact_2_phone                           text,
  contact_2_email                           text,
  contact_3_name                            text,
  contact_3_phone                           text,
  contact_3_email                           text,

  -- ── Property ──────────────────────────────────────────────────────────────
  details_of_property         text,
  lease_details               text,
  ownership_of_property       text,
  post_acquisition_office_plans text,

  -- ── Costs ─────────────────────────────────────────────────────────────────

  -- ── Regulatory ────────────────────────────────────────────────────────────
  rdd_lead                                text,
  defined_benefit_transfers               text,
  defined_benefit_transfer_total          text,
  other_regulatory_items_of_note          text,
  consumer_duty_plan_signed_off           text,
  cic_submitted                           text,
  cic_submitted_date                      date,
  deauthorisation_application_submitted   date,
  deauthorisation_target_date             date,
  deauthorisation_approved                date,

  -- ── Back Office ───────────────────────────────────────────────────────────
  perspective_regional_director           text,
  perspective_regional_manager            text,
  perspective_principal                   text,
  perspective_trading_style_registered    text,
  agreed_perspective_trading_style        text,
  receiving_office                        text,
  perspective_entity                      text,
  back_office_system                      text,
  document_management_system              text,
  other_integration_notes                 text,
  client_letter_status                    text,
  mailing_data_status                     text,
  regional_director_introduction          text,
  integration_kickoff_date                date,
  data_meeting_held                       date,
  core_compliance_ca_request_sent         date,
  first_data_request_response_received    date,
  client_letter_sign_off_completed        date,
  repapering_finalised_date               date,
  printing_and_delivery_date              date,
  perspective_project_manager             text,
  data_team_lead                          text,
  client_portal                           text,
  ai_solutions                            text,

  -- ── Declined Deals ────────────────────────────────────────────────────────
  date_declined               date,
  loss_driver                 text,
  reason_for_decline          text,
  reason_for_decline_detail   text,
  other_player_sold_to        text,

  -- ── Pipedrive / CRM activity metadata ────────────────────────────────────
  pipedrive_datetime      timestamptz,
  update_time             timestamptz,
  last_stage_change       text,
  next_activity_date      date,
  last_activity_date      date,
  won_time                text,
  won_time_from_to        text,
  won_time_formatted      text,
  last_email_received     date,
  last_email_sent         date,
  lost_time               date,
  deal_closed_on          date,
  lost_reason             text,
  visible_to              text,
  total_activities        text,
  done_activities         text,
  activities_to_do        text,
  email_messages_count    text,
  product_quantity        text,
  product_amount          text,
  product_name            text,
  mrr                     text,
  arr                     text,
  acv                     text,
  source_origin           text,
  source_origin_id        text,
  source_channel          text,
  source_channel_id       text,
  creator                 text,
  contact_person          text,
  organisation_copy       text,

  -- ── Team leads ────────────────────────────────────────────────────────────
  deal_lead_bi                        text,
  perspective_regional_director_old   text,

  -- ── System / metadata ─────────────────────────────────────────────────────
  flowbird_bi_id      text,
  database_record     text,
  remove_flag         text,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table deals enable row level security;


-- Note: auth.users is built into every Supabase project.
create table users (
  id                      uuid primary key references auth.users(id) on delete cascade,
  name                    text not null,
  email                   text unique not null,
  user_status             text default 'pending',
  organisation_id         uuid references organisations(id) on delete set null,
  pipedrive_id            text,
  user_permissions        text[] default '{}'
    check (user_permissions <@ ARRAY['Staff', 'Admin', 'Developer']::text[]),
  pipedrive_api_token     text,
  pipedrive_last_synced_at timestamptz,
  date_created            date,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

alter table users enable row level security;


-- Records each file import made from Account Settings → Import.
-- The app keeps only the 10 most recent entries.
create table import_history (
  id           uuid primary key default gen_random_uuid(),
  file_name    text,
  object_type  text,
  row_count    integer,
  imported_by  text,
  created_at   timestamptz default now()
);

alter table import_history enable row level security;

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index idx_contacts_organisation_id on contacts(organisation_id);
create index idx_deals_contact_id on deals(contact_id);
create index idx_deals_organisation_id on deals(organisation_id);
create index idx_deals_stage on deals(stage);
create index idx_users_email on users(email);

-- ── Functions & Triggers ─────────────────────────────────────────────────────

-- Cascade delete from public.users → auth.users
-- (The FK only cascades auth → public; this trigger handles the reverse.)
create or replace function public.handle_user_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = OLD.id;
  return OLD;
end;
$$;

create trigger on_public_user_deleted
  after delete on public.users
  for each row
  execute function public.handle_user_delete();


-- RPC: create a user in auth.users + public.users atomically
-- Called by the manage-user edge function (service role) or directly via RPC.
create or replace function public.create_user_with_auth(
  p_name        text,
  p_email       text,
  p_permissions text[] default ARRAY['Staff']::text[]
)
returns uuid
language plpgsql
security definer
set search_path = extensions, public, auth
as $$
declare
  v_user_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud, confirmation_token, recovery_token
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    extensions.crypt('Flowbird2024!', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', p_name),
    false, 'authenticated', 'authenticated', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email', p_email, now(), now(), now()
  );

  insert into public.users (
    id, name, email, user_permissions, user_status, date_created, created_at, updated_at
  ) values (
    v_user_id, p_name, p_email, p_permissions, 'pending', now()::date, now(), now()
  );

  return v_user_id;
end;
$$;

grant execute on function public.create_user_with_auth(text, text, text[]) to authenticated;
