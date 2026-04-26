# Performance Tracking System

ระบบติดตามผลการเรียนและการส่งงานสำหรับสถาบันการศึกษา สร้างด้วย Next.js 14 App Router

## Tech Stack

| ชั้น | เทคโนโลยี |
|------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Database ORM | Prisma + PostgreSQL |
| Auth | NextAuth.js v5 (Credentials Provider) |
| Validation | Zod + react-hook-form |
| UI Components | lucide-react, sonner (toasts), recharts |
| Date Utilities | date-fns |

## โครงสร้างโปรเจกต์

```
performance-tracking/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx          # หน้า login
│   ├── (dashboard)/
│   │   ├── admin/                # หน้าสำหรับ Admin
│   │   ├── instructor/           # หน้าสำหรับอาจารย์
│   │   └── student/              # หน้าสำหรับนักศึกษา
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts      # NextAuth API route
│   ├── globals.css
│   └── layout.tsx                # Root layout
├── components/
│   ├── ui/                       # shadcn/ui components
│   └── providers.tsx             # Session provider wrapper
├── lib/
│   ├── auth-utils.ts             # Auth helper functions
│   └── db.ts                     # Prisma client singleton
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Seed data
├── auth.ts                       # NextAuth configuration
├── middleware.ts                 # Route protection middleware
├── .env.example                  # Environment variables template
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Role และสิทธิ์

| Role | คำอธิบาย | หน้าหลัก |
|------|----------|----------|
| `ADMIN` | ผู้ดูแลระบบ | `/dashboard/admin` |
| `INSTRUCTOR` | อาจารย์ผู้สอน | `/dashboard/instructor` |
| `STUDENT` | นักศึกษา | `/dashboard/student` |

## การ Setup

### 1. Clone และติดตั้ง dependencies

```bash
git clone <repo-url>
cd performance-tracking
npm install
```

### 2. ตั้งค่า Environment Variables

```bash
cp .env.example .env
```

แก้ไข `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/performance_tracking"
NEXTAUTH_SECRET="your-secret-key"   # สร้างด้วย: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
```

### 3. ตั้งค่าฐานข้อมูล

```bash
# Push schema ไปยัง database
npm run db:push

# หรือใช้ migrations
npm run db:migrate
```

### 4. Seed ข้อมูลทดสอบ

```bash
npm run seed
```

ข้อมูลทดสอบที่จะถูกสร้าง:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@uni.ac.th | admin123 |
| Instructor | smith@uni.ac.th | inst123 |
| Instructor | jones@uni.ac.th | inst123 |
| Student 1-6 | student1-6@uni.ac.th | std123 |

### 5. รัน Development Server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) ในเบราว์เซอร์

## คำสั่งที่ใช้บ่อย

```bash
npm run dev          # รัน dev server
npm run build        # Build สำหรับ production
npm run seed         # Seed ข้อมูลทดสอบ
npm run db:push      # Push schema changes (no migration history)
npm run db:migrate   # Run migrations
npm run db:studio    # เปิด Prisma Studio (GUI)
npm run lint         # ตรวจสอบ code style
```

## Environment Variables

| Variable | คำอธิบาย | ตัวอย่าง |
|----------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `NEXTAUTH_SECRET` | JWT signing secret (สร้างด้วย `openssl rand -base64 32`) | `abc123...` |
| `NEXTAUTH_URL` | Base URL ของแอป | `http://localhost:3000` |
