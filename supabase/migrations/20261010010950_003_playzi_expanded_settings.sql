/*
# PLAYZI Expanded Settings & Popup System

## Overview
Expands the site_settings table with full SEO controls, favicon, and popup/announcement system.
Adds an announcements table for managing custom popups shown to website visitors.

## Modified Tables

### site_settings (new columns added)
- favicon_url (text) - custom favicon image URL
- meta_keywords (text) - SEO meta keywords
- og_image_url (text) - Open Graph social share image
- twitter_card_type (text) - Twitter card type (default 'summary_large_image')
- primary_color (text) - custom primary color hex (default '#78F6E1')
- footer_text (text) - custom footer text
- popup_enabled (boolean, default false) - whether the site popup is active
- popup_title (text) - popup heading text
- popup_message (text) - popup body text
- popup_button_text (text) - popup CTA button label
- popup_button_url (text) - popup CTA button link
- popup_image_url (text) - popup image
- popup_dismissible (boolean, default true) - whether users can close the popup
- popup_start_date (timestamptz) - when popup becomes active (optional)
- popup_end_date (timestamptz) - when popup expires (optional)

## New Tables
None (popup data stored directly in site_settings for simplicity)

## Security
- Public can read site_settings (existing policy covers new columns)
- Admin can update site_settings (existing policy covers new columns)
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS meta_keywords text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS twitter_card_type text NOT NULL DEFAULT 'summary_large_image',
  ADD COLUMN IF NOT EXISTS primary_color text NOT NULL DEFAULT '#78F6E1',
  ADD COLUMN IF NOT EXISTS footer_text text DEFAULT 'PLAYZI - Unlimited Cloud Gaming. All games are embedded from external sources.',
  ADD COLUMN IF NOT EXISTS popup_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popup_title text,
  ADD COLUMN IF NOT EXISTS popup_message text,
  ADD COLUMN IF NOT EXISTS popup_button_text text,
  ADD COLUMN IF NOT EXISTS popup_button_url text,
  ADD COLUMN IF NOT EXISTS popup_image_url text,
  ADD COLUMN IF NOT EXISTS popup_dismissible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS popup_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS popup_end_date timestamptz;
