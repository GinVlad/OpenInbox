# Personal Cloudflare Email System

A simple disposable email system for personal use.

---

## Features

* Custom inboxes
* Multiple domains
* Email receiving via Cloudflare Email Worker
* Web dashboard
* Message viewer
* Attachment support

---

## Tech Stack

* Cloudflare Workers
* Cloudflare Email Workers
* Cloudflare D1
* Cloudflare R2
* Next.js

---

## Setup Flow

1. Configure Cloudflare Workers
2. Create D1 database
3. Create R2 bucket
4. Configure Email Worker
5. Deploy API Worker
6. Deploy Web UI

---

## Usage

1. Add domain
2. Create inbox
3. Send email
4. View email in dashboard

---

## Architecture

Email → Worker → D1/R2 → API → UI

---

## Notes

This is NOT a SaaS product.

It is a personal system only.
