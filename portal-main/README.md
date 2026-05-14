# Taiyari NEET Ki — Admin Portal

Admin panel for managing the Taiyari NEET Ki mobile app content.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Deployment:** Docker + Caddy reverse proxy on Hostinger VPS
- **API:** Express.js backend at `api.taiyarineetki.com`

## Features

### Navigation (Sidebar)

| Section | Description |
|---------|-------------|
| Dashboard | Admin overview |
| Classes | Manage NEET classes |
| Subjects | Manage subjects (Physics, Chemistry, Biology) |
| Chapters | Manage chapters per subject |
| Topics | Manage topics with PDF upload + rich text content |
| Questions | Question bank management |
| Home Content | Mobile app home screen content |
| Members | Registered users list |
| Notifications | Push notifications |

### Feature Content

| Feature | Admin Flow | Content Type |
|---------|-----------|--------------|
| Explanation | Flat list + form | PDF / URL based content |
| Revision Recall | Subject → Class → Chapter → Questions | MCQ / Fill in Blank / Match the Following |
| Hidden Links | Subject → Class → Chapter → Pages | PDF / URL based pages |
| Exercise Revival | Subject → Class → Chapter → 5 Sections → Questions | MCQ / Fill in Blank / Match |
| Master Exemplar | Subject → Class → Chapter → 5 Sections → Questions | MCQ / Fill in Blank / Match |
| PYQs | Subject → Class → Chapter → 5 Sections → Questions | MCQ / Fill in Blank / Match |
| Chapter Checkpoint | Test questions (flat list) | MCQ / Fill in Blank / Match |

### 5 Sections (Exercise Revival / Master Exemplar / PYQs)

1. Questions
2. Explanation
3. Source Line
4. Hidden Concepts & Q&A
5. MCQ Practice Zone

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

```bash
# On VPS
cd /opt/app/portal-main && git pull origin main
cd /opt/app && docker compose -f docker-compose.prod.yml build --no-cache portal
docker compose -f docker-compose.prod.yml up -d portal
```

## Environment Variables

- `NEXT_PUBLIC_API_URL` — Backend API URL (set in docker-compose.prod.yml)
