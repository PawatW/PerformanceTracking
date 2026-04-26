# Academic Performance Tracking System

ระบบติดตามผลการเรียนและการส่งงานสำหรับสถาบันการศึกษา สร้างด้วย Next.js 14 App Router, Prisma ORM, NextAuth.js v5 และ shadcn/ui

---

## Features

### สำหรับอาจารย์ (Instructor)
- **จัดการวิชา** — ดูนักศึกษาที่ลงทะเบียน, งานทั้งหมด, คะแนนรวม
- **สร้างและแก้ไข Assignment** — กำหนดประเภท (การบ้าน / Quiz / Midterm / Final / Project), น้ำหนักคะแนน, วันกำหนดส่ง, อนุญาตส่งช้า
- **Rubric Builder** — สร้าง Rubric หลายเกณฑ์, คำนวณคะแนนรวมอัตโนมัติ
- **ตรวจงาน (Grading)** — ใส่คะแนนผ่าน Rubric หรือ manual, เขียน Instructor Note (นักศึกษาเห็น), Private Note (เฉพาะอาจารย์), ไปงานถัดไป/ก่อนหน้าได้ทันที
- **Analytics Dashboard** — Score distribution chart, Completion rate chart, At-risk student panel, Sortable performance table
- **Export CSV** — ดาวน์โหลดคะแนนรายคนพร้อม weighted total และเกรด
- **Report Preview** — ตารางคะแนนรายคน, สถิติชั้น, Grade distribution, พิมพ์ได้

### สำหรับนักศึกษา (Student)
- **Dashboard** — Summary cards (วิชา, งานที่ส่ง, งานที่ยังไม่ส่ง, คะแนนเฉลี่ย)
- **วิชาที่เรียน** — ดูคะแนนรวมปัจจุบัน, progress bar, เกรด
- **ส่งงาน** — Submit/Resubmit, Student Note, ดูผลคะแนน + Rubric breakdown หลังตรวจ
- **ความก้าวหน้า** — LineChart เปรียบเทียบคะแนนตัวเองกับค่าเฉลี่ยชั้น, RadarChart แยกตามประเภทงาน, "คะแนนที่ต้องได้เพื่อเกรด A"
- **การแจ้งเตือน** — Notification bell แจ้งเมื่อประกาศผลคะแนน

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| ORM | Prisma 5 + PostgreSQL |
| Auth | NextAuth.js v5 (Credentials + JWT) |
| UI Components | shadcn/ui (Radix Primitives + Tailwind CSS) |
| Charts | Recharts 2 |
| Forms | React Hook Form + Zod |
| Notifications | Sonner (toast) |
| Date | date-fns (Thai locale) |
| Styling | Tailwind CSS |

---

## Project Structure

```
.
├── app/
│   ├── (auth)/login/         # Login page
│   ├── (dashboard)/
│   │   ├── layout.tsx        # Shared layout: sidebar + auth guard
│   │   ├── error.tsx         # Dashboard error boundary
│   │   ├── instructor/       # Instructor pages
│   │   │   ├── page.tsx      # Dashboard
│   │   │   ├── courses/      # Courses list + detail
│   │   │   │   └── [courseId]/
│   │   │   │       ├── analytics/   # Analytics dashboard
│   │   │   │       ├── report/      # Report + CSV export
│   │   │   │       └── students/[studentId]/  # Student grade summary
│   │   │   ├── assignments/[id]/edit/
│   │   │   └── submissions/[submissionId]/grade/
│   │   └── student/          # Student pages
│   │       ├── page.tsx      # Dashboard
│   │       ├── courses/      # Courses list + detail
│   │       ├── assignments/[id]/  # Submit assignment
│   │       └── progress/     # Analytics + charts
│   ├── api/
│   │   ├── notifications/    # GET + PATCH notifications
│   │   └── export/[courseId] # GET CSV export
│   └── not-found.tsx
├── components/
│   ├── ui/                   # shadcn/ui primitives
│   ├── sidebar.tsx           # Role-based sidebar nav
│   ├── mobile-sidebar.tsx    # Hamburger + overlay drawer
│   ├── analytics-charts.tsx  # Recharts chart components
│   ├── grading-panel.tsx     # Grading UI (client)
│   ├── submit-assignment-panel.tsx
│   ├── submissions-filter.tsx
│   └── ...
├── lib/
│   ├── auth-utils.ts         # requireRole(), getCurrentUser()
│   ├── chart-utils.ts        # getScoreDistribution(), etc.
│   ├── grade-utils.ts        # scoreToGrade(), calculateWeightedScore()
│   └── db.ts                 # Prisma singleton
├── app/actions/
│   ├── assignments.ts        # createAssignment, updateAssignment, deleteAssignment
│   ├── submissions.ts        # submitAssignment
│   └── grades.ts             # saveGrade, getNext/PrevSubmission
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── Dockerfile
└── docker-compose.yml
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or use Docker Compose)

### 1. Clone and install

```bash
git clone <repository-url>
cd PerformanceTracking
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/performance_tracking"
NEXTAUTH_SECRET="your-secret-here-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a strong secret with:
```bash
openssl rand -base64 32
```

### 3. Database setup

```bash
npx prisma migrate dev --name init
npm run seed
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Docker Setup

### Using Docker Compose (recommended)

```bash
# Copy env file
cp .env.example .env
# (Edit NEXTAUTH_SECRET in .env)

# Build and start all services
docker compose up --build

# Run migrations and seed (first time only)
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run seed
```

Access at [http://localhost:3000](http://localhost:3000)

### Individual Docker build

```bash
docker build -t performance-tracking .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="..." \
  -e NEXTAUTH_URL="http://localhost:3000" \
  performance-tracking
```

### Stop services

```bash
docker compose down          # keep database volume
docker compose down -v       # remove database volume too
```

---

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@uni.ac.th | admin123 |
| Instructor | smith@uni.ac.th | inst123 |
| Instructor | jones@uni.ac.th | inst123 |
| Student | student1@uni.ac.th | std123 |
| Student | student2@uni.ac.th | std123 |
| Student | student3@uni.ac.th | std123 |
| Student | student4@uni.ac.th | std123 |
| Student | student5@uni.ac.th | std123 |
| Student | student6@uni.ac.th | std123 |

---

## Database Schema (simplified)

```
User ──── Course (instructorId)
       └─ Enrollment ──── Course
                      └─ Assignment ──── RubricCriteria
                                     └─ Submission ──── Grade
User ──── Notification
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run seed` | Seed database with demo data |
| `npx prisma studio` | Open Prisma database GUI |
| `npx prisma migrate dev` | Run and create migrations |

---

## Security Notes

- All server actions verify session and role before any database operation
- Instructors can only access their own courses
- Students can only access courses they are enrolled in
- `privateNote` on grades is never sent to the client in student-facing pages
- NEXTAUTH_SECRET must be a strong random value in production
- Change all seed passwords before deploying to production
