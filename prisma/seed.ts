import { PrismaClient, Role, AssignmentType, SubmissionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ScoreProfile = "excellent" | "good" | "average" | "struggling" | "at_risk";

function profileScore(profile: ScoreProfile): number {
  const ranges: Record<ScoreProfile, [number, number]> = {
    excellent: [85, 98],
    good: [73, 87],
    average: [60, 76],
    struggling: [44, 62],
    at_risk: [22, 50],
  };
  const [min, max] = ranges[profile];
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function profileSubmitRate(profile: ScoreProfile): number {
  return { excellent: 0.97, good: 0.92, average: 0.82, struggling: 0.65, at_risk: 0.35 }[profile];
}

function profileLateRate(profile: ScoreProfile): number {
  return { excellent: 0.03, good: 0.07, average: 0.14, struggling: 0.25, at_risk: 0.35 }[profile];
}

function randBool(p: number): boolean {
  return Math.random() < p;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}

// Distribute a total pct score across rubric criteria with slight per-criterion variance
function buildRubricScores(
  rubrics: { id: string; maxPoints: number }[],
  scorePct: number
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const r of rubrics) {
    const v = (Math.random() - 0.5) * 0.12;
    const pct = Math.min(1, Math.max(0, scorePct / 100 + v));
    scores[r.id] = Math.round(pct * r.maxPoints * 10) / 10;
  }
  return scores;
}

// ─── Student Note Templates ────────────────────────────────────────────────────

const studentNotes = [
  "ส่งงานตามกำหนดครับ/ค่ะ",
  "แนบไฟล์ PDF ตามที่กำหนด",
  "ขอโทษที่ส่งช้า เนื่องจากป่วยกะทันหัน",
  "ทำงานร่วมกับ partner แล้วแบ่งงานตาม requirement",
  "มีข้อสงสัยบางส่วน อยากให้อาจารย์ comment เพิ่มเติมด้วยครับ",
  "แก้ไขตาม feedback รอบที่แล้วแล้ว",
  "ขอส่งช้ากว่ากำหนด เพราะมีปัญหาด้านเทคนิคกับคอมพิวเตอร์",
  null, null, null, // majority have no note
];

function randomStudentNote(): string | null {
  return studentNotes[Math.floor(Math.random() * studentNotes.length)] as string | null;
}

// ─── Instructor Note Templates ────────────────────────────────────────────────

function instructorNote(profile: ScoreProfile): string {
  const notes: Record<ScoreProfile, string[]> = {
    excellent: [
      "ทำได้ดีมาก! โค้ดสะอาดและมีประสิทธิภาพ",
      "ยอดเยี่ยม! ครบถ้วนและถูกต้องทุกข้อ",
      "งานคุณภาพสูงมาก โครงสร้างชัดเจน อธิบายได้ดี",
      "ผลงานดีเยี่ยม ทำได้เกินความคาดหมาย",
    ],
    good: [
      "ทำได้ดี แต่ยังมีบางจุดที่ปรับปรุงได้",
      "งานดี ควรเพิ่ม comment อธิบายในโค้ด",
      "ความเข้าใจดี มีข้อผิดพลาดเล็กน้อยในส่วนสุดท้าย",
      "โดยรวมดี อยากเห็นการทดสอบ edge case มากกว่านี้",
    ],
    average: [
      "พอใช้ได้ แต่ต้องฝึกฝนเพิ่มขึ้น",
      "มีความเข้าใจพื้นฐาน แต่การนำไปประยุกต์ยังขาด",
      "ควรทบทวนเนื้อหาบทที่ 3-4 อีกครั้ง",
      "งานผ่านเกณฑ์ แต่ยังมีช่องว่างที่ต้องเติม",
    ],
    struggling: [
      "ต้องปรับปรุงความเข้าใจพื้นฐานมากขึ้น โปรดมาพบอาจารย์",
      "มีข้อผิดพลาดหลายจุด แนะนำให้อ่านเอกสารประกอบเพิ่ม",
      "คะแนนต่ำกว่าเกณฑ์ กรุณาทบทวนและมาปรึกษาหากมีข้อสงสัย",
      "ต้องพยายามมากขึ้น แนะนำให้เข้ากลุ่มติว",
    ],
    at_risk: [
      "คะแนนต่ำมาก กรุณามาพบอาจารย์โดยด่วน",
      "ขอให้นักศึกษาพบอาจารย์ที่ปรึกษาเพื่อวางแผนการเรียน",
      "งานไม่ครบตาม requirement โปรดติดต่ออาจารย์",
    ],
  };
  const pool = notes[profile];
  return pool[Math.floor(Math.random() * pool.length)];
}

function privateNoteFor(profile: ScoreProfile): string | null {
  if (profile === "at_risk") return "นักศึกษาเสี่ยงไม่ผ่าน ควรติดตามพิเศษ";
  if (profile === "struggling" && randBool(0.5)) return "ควรแจ้ง advisor ติดตาม";
  if (profile === "excellent" && randBool(0.3)) return "เป็นตัวเลือกสำหรับ TA semester หน้า";
  return null;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database with rich mock data...");

  // Cleanup
  await prisma.notification.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.rubricCriteria.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  // ─── Users ────────────────────────────────────────────────────────────────

  const [adminPwd, instPwd, stdPwd] = await Promise.all([
    bcrypt.hash("admin123", 10),
    bcrypt.hash("inst123", 10),
    bcrypt.hash("std123", 10),
  ]);

  await prisma.user.create({
    data: { name: "System Admin", email: "admin@uni.ac.th", password: adminPwd, role: Role.ADMIN },
  });

  const smith = await prisma.user.create({
    data: { name: "Dr. สมศักดิ์ อัจฉริยะ", email: "smith@uni.ac.th", password: instPwd, role: Role.INSTRUCTOR },
  });
  const jones = await prisma.user.create({
    data: { name: "Dr. วิภา ณ นคร", email: "jones@uni.ac.th", password: instPwd, role: Role.INSTRUCTOR },
  });
  const wattana = await prisma.user.create({
    data: { name: "Dr. วัฒนา ทองศรี", email: "wattana@uni.ac.th", password: instPwd, role: Role.INSTRUCTOR },
  });

  // 15 students with Thai names and distinct score profiles
  type StudentDef = { name: string; email: string; yearLevel: string; profile: ScoreProfile };
  const studentDefs: StudentDef[] = [
    { name: "กมล สุขสวัสดิ์",      email: "student1@uni.ac.th",  yearLevel: "ปี 3", profile: "excellent"  },
    { name: "นภัสสร วงศ์ศรี",      email: "student2@uni.ac.th",  yearLevel: "ปี 2", profile: "excellent"  },
    { name: "ธนภัทร พันธุ์ดี",      email: "student3@uni.ac.th",  yearLevel: "ปี 3", profile: "good"       },
    { name: "สุภาพร ชัยมงคล",       email: "student4@uni.ac.th",  yearLevel: "ปี 2", profile: "good"       },
    { name: "วรรณวิสา เรืองสว่าง",  email: "student5@uni.ac.th",  yearLevel: "ปี 1", profile: "average"    },
    { name: "ปรีชา อินทรา",         email: "student6@uni.ac.th",  yearLevel: "ปี 2", profile: "average"    },
    { name: "ชนิดา ทองดี",          email: "student7@uni.ac.th",  yearLevel: "ปี 1", profile: "average"    },
    { name: "อนุชา สมบูรณ์",        email: "student8@uni.ac.th",  yearLevel: "ปี 2", profile: "struggling" },
    { name: "พิมพ์ใจ ศรีสุข",       email: "student9@uni.ac.th",  yearLevel: "ปี 1", profile: "struggling" },
    { name: "ภาณุ กาญจนา",          email: "student10@uni.ac.th", yearLevel: "ปี 3", profile: "struggling" },
    { name: "ณัฐพล ทรัพย์สิน",      email: "student11@uni.ac.th", yearLevel: "ปี 2", profile: "struggling" },
    { name: "ศิริพร มีโชค",         email: "student12@uni.ac.th", yearLevel: "ปี 1", profile: "at_risk"    },
    { name: "วีรชาติ บุญนาค",       email: "student13@uni.ac.th", yearLevel: "ปี 2", profile: "at_risk"    },
    { name: "กัญญา รักษาดี",        email: "student14@uni.ac.th", yearLevel: "ปี 1", profile: "at_risk"    },
    { name: "สมชาย ใจดี",           email: "student15@uni.ac.th", yearLevel: "ปี 1", profile: "at_risk"    },
  ];

  const students = await Promise.all(
    studentDefs.map((s) =>
      prisma.user.create({
        data: { name: s.name, email: s.email, password: stdPwd, role: Role.STUDENT, yearLevel: s.yearLevel },
      })
    )
  );

  console.log("✅ Users created (3 instructors, 15 students)");

  // ─── Courses ──────────────────────────────────────────────────────────────

  const cs101 = await prisma.course.create({
    data: { code: "CS101", title: "Introduction to Programming", instructorId: smith.id, semester: "1/2567", year: 2567 },
  });
  const cs201 = await prisma.course.create({
    data: { code: "CS201", title: "Data Structures and Algorithms", instructorId: smith.id, semester: "1/2567", year: 2567 },
  });
  const cs301 = await prisma.course.create({
    data: { code: "CS301", title: "Web Application Development", instructorId: smith.id, semester: "1/2567", year: 2567 },
  });
  const math101 = await prisma.course.create({
    data: { code: "MATH101", title: "Calculus I", instructorId: jones.id, semester: "1/2567", year: 2567 },
  });
  const eng101 = await prisma.course.create({
    data: { code: "ENG101", title: "Technical Writing and Communication", instructorId: wattana.id, semester: "1/2567", year: 2567 },
  });

  console.log("✅ Courses created (5 courses)");

  // ─── Enrollments ──────────────────────────────────────────────────────────
  // CS101 (Smith):  students 0-11  (12 students)
  // CS201 (Smith):  students 0-8   (9 students)
  // CS301 (Smith):  students 0-6, 10-12 (10 students)
  // MATH101 (Jones): students 1-10  (10 students)
  // ENG101 (Wattana): students 4-14 (11 students)

  const enrollGroups: [typeof cs101, typeof students][] = [
    [cs101,   students.slice(0, 12)],
    [cs201,   students.slice(0, 9)],
    [cs301,   [...students.slice(0, 7), ...students.slice(10, 13)]],
    [math101, students.slice(1, 11)],
    [eng101,  students.slice(4, 15)],
  ];

  for (const [course, enrolled] of enrollGroups) {
    for (const s of enrolled) {
      await prisma.enrollment.create({ data: { studentId: s.id, courseId: course.id } });
    }
  }

  console.log("✅ Enrollments created");

  // ─── Assignments + Rubrics ────────────────────────────────────────────────

  // Helper: create assignment with optional rubrics, returns { assignment, rubrics }
  async function makeAssignment(data: {
    courseId: string;
    title: string;
    description?: string;
    type: AssignmentType;
    weight: number;
    maxScore: number;
    dueDate: Date;
    allowLate?: boolean;
    rubrics?: { label: string; maxPoints: number }[];
  }) {
    const { rubrics: rubricDefs, ...rest } = data;
    const assignment = await prisma.assignment.create({ data: { ...rest, allowLate: rest.allowLate ?? false } });
    const rubrics = rubricDefs
      ? await Promise.all(
          rubricDefs.map((r, i) =>
            prisma.rubricCriteria.create({ data: { assignmentId: assignment.id, ...r, order: i } })
          )
        )
      : [];
    return { assignment, rubrics };
  }

  // ── CS101 Assignments ──
  const [
    { assignment: cs101hw1 },
    { assignment: cs101hw2 },
    { assignment: cs101quiz1 },
    { assignment: cs101mid, rubrics: cs101midRubrics },
    { assignment: cs101hw3 },
    { assignment: cs101quiz2 },
    { assignment: cs101proj, rubrics: cs101projRubrics },
  ] = await Promise.all([
    makeAssignment({
      courseId: cs101.id,
      title: "Lab 1: Variables and Data Types",
      description: "เขียนโปรแกรมใช้งาน variable types ต่าง ๆ และ type conversion",
      type: AssignmentType.HOMEWORK, weight: 5, maxScore: 20, dueDate: daysAgo(65), allowLate: true,
    }),
    makeAssignment({
      courseId: cs101.id,
      title: "Lab 2: Control Flow",
      description: "เขียนโปรแกรมใช้ if/else, switch, for loop, while loop",
      type: AssignmentType.HOMEWORK, weight: 5, maxScore: 20, dueDate: daysAgo(52), allowLate: true,
    }),
    makeAssignment({
      courseId: cs101.id,
      title: "Quiz 1: Basic Concepts",
      type: AssignmentType.QUIZ, weight: 10, maxScore: 20, dueDate: daysAgo(45), allowLate: false,
    }),
    makeAssignment({
      courseId: cs101.id,
      title: "Midterm Examination",
      description: "สอบกลางภาค ครอบคลุมเนื้อหาบทที่ 1-6",
      type: AssignmentType.MIDTERM, weight: 25, maxScore: 100, dueDate: daysAgo(30), allowLate: false,
      rubrics: [
        { label: "ความถูกต้องของคำตอบ", maxPoints: 50 },
        { label: "การวิเคราะห์ปัญหา", maxPoints: 30 },
        { label: "การเขียนโค้ด / Pseudocode", maxPoints: 20 },
      ],
    }),
    makeAssignment({
      courseId: cs101.id,
      title: "Lab 3: Functions and Modules",
      description: "ออกแบบ function, parameter, return value และ scope",
      type: AssignmentType.HOMEWORK, weight: 10, maxScore: 30, dueDate: daysAgo(18), allowLate: true,
    }),
    makeAssignment({
      courseId: cs101.id,
      title: "Quiz 2: OOP Fundamentals",
      type: AssignmentType.QUIZ, weight: 15, maxScore: 30, dueDate: daysAgo(7), allowLate: false,
    }),
    makeAssignment({
      courseId: cs101.id,
      title: "Final Project: Mini Application",
      description: "สร้าง CLI application ตามหัวข้อที่เลือก พร้อม documentation และ unit test",
      type: AssignmentType.PROJECT, weight: 30, maxScore: 100, dueDate: daysFromNow(18), allowLate: true,
      rubrics: [
        { label: "ฟังก์ชันการทำงาน (Functionality)", maxPoints: 40 },
        { label: "คุณภาพโค้ด (Code Quality)", maxPoints: 25 },
        { label: "การทดสอบ (Unit Tests)", maxPoints: 20 },
        { label: "เอกสารประกอบ (Documentation)", maxPoints: 15 },
      ],
    }),
  ]);

  // ── CS201 Assignments ──
  const [
    { assignment: cs201hw1 },
    { assignment: cs201quiz1 },
    { assignment: cs201hw2 },
    { assignment: cs201mid, rubrics: cs201midRubrics },
    { assignment: cs201proj },
  ] = await Promise.all([
    makeAssignment({
      courseId: cs201.id,
      title: "Assignment 1: Linked Lists",
      description: "Implement Singly และ Doubly Linked List พร้อม operations ครบ",
      type: AssignmentType.HOMEWORK, weight: 10, maxScore: 50, dueDate: daysAgo(60), allowLate: true,
    }),
    makeAssignment({
      courseId: cs201.id,
      title: "Quiz 1: Arrays, Stacks, and Queues",
      type: AssignmentType.QUIZ, weight: 10, maxScore: 20, dueDate: daysAgo(47), allowLate: false,
    }),
    makeAssignment({
      courseId: cs201.id,
      title: "Assignment 2: Trees and Heaps",
      description: "Implement BST, AVL Tree และ Min-Heap",
      type: AssignmentType.HOMEWORK, weight: 10, maxScore: 50, dueDate: daysAgo(32), allowLate: true,
    }),
    makeAssignment({
      courseId: cs201.id,
      title: "Midterm Examination",
      description: "ครอบคลุม Arrays, Linked Lists, Stacks, Queues, Trees",
      type: AssignmentType.MIDTERM, weight: 30, maxScore: 100, dueDate: daysAgo(22), allowLate: false,
      rubrics: [
        { label: "ความเข้าใจโครงสร้างข้อมูล", maxPoints: 40 },
        { label: "การวิเคราะห์ Time Complexity", maxPoints: 35 },
        { label: "การเขียน Pseudocode", maxPoints: 25 },
      ],
    }),
    makeAssignment({
      courseId: cs201.id,
      title: "Final Project: Algorithm Visualizer",
      description: "สร้าง web app สำหรับ visualize sorting/graph algorithms",
      type: AssignmentType.PROJECT, weight: 40, maxScore: 100, dueDate: daysFromNow(12), allowLate: true,
    }),
  ]);

  // ── CS301 Assignments ──
  const [
    { assignment: cs301lab1 },
    { assignment: cs301lab2 },
    { assignment: cs301quiz1 },
    { assignment: cs301mid, rubrics: cs301midRubrics },
    { assignment: cs301proj },
  ] = await Promise.all([
    makeAssignment({
      courseId: cs301.id,
      title: "Lab 1: HTML & CSS Fundamentals",
      type: AssignmentType.HOMEWORK, weight: 10, maxScore: 30, dueDate: daysAgo(42), allowLate: true,
    }),
    makeAssignment({
      courseId: cs301.id,
      title: "Lab 2: JavaScript & DOM",
      type: AssignmentType.HOMEWORK, weight: 10, maxScore: 30, dueDate: daysAgo(28), allowLate: true,
    }),
    makeAssignment({
      courseId: cs301.id,
      title: "Quiz 1: React Basics",
      type: AssignmentType.QUIZ, weight: 10, maxScore: 20, dueDate: daysAgo(18), allowLate: false,
    }),
    makeAssignment({
      courseId: cs301.id,
      title: "Midterm Project: React Application",
      description: "สร้าง React app จาก API ที่กำหนด มี routing และ state management",
      type: AssignmentType.PROJECT, weight: 30, maxScore: 100, dueDate: daysAgo(5), allowLate: true,
      rubrics: [
        { label: "การทำงานของ Feature หลัก", maxPoints: 45 },
        { label: "คุณภาพโค้ดและ Component Design", maxPoints: 30 },
        { label: "UI/UX และ Responsive Design", maxPoints: 25 },
      ],
    }),
    makeAssignment({
      courseId: cs301.id,
      title: "Final Project: Full-Stack Web App",
      description: "สร้าง full-stack application ด้วย Next.js + PostgreSQL ตาม spec ที่กำหนด",
      type: AssignmentType.PROJECT, weight: 40, maxScore: 100, dueDate: daysFromNow(22), allowLate: true,
    }),
  ]);

  // ── MATH101 Assignments ──
  const [
    { assignment: mathHw1 },
    { assignment: mathHw2 },
    { assignment: mathQuiz1 },
    { assignment: mathMid, rubrics: mathMidRubrics },
    { assignment: mathFinal },
  ] = await Promise.all([
    makeAssignment({
      courseId: math101.id,
      title: "Problem Set 1: Limits and Continuity",
      type: AssignmentType.HOMEWORK, weight: 10, maxScore: 50, dueDate: daysAgo(62), allowLate: true,
    }),
    makeAssignment({
      courseId: math101.id,
      title: "Problem Set 2: Derivatives",
      type: AssignmentType.HOMEWORK, weight: 10, maxScore: 50, dueDate: daysAgo(45), allowLate: true,
    }),
    makeAssignment({
      courseId: math101.id,
      title: "Quiz 1: Differentiation Rules",
      type: AssignmentType.QUIZ, weight: 10, maxScore: 20, dueDate: daysAgo(35), allowLate: false,
    }),
    makeAssignment({
      courseId: math101.id,
      title: "Midterm Examination",
      description: "สอบกลางภาค Limits, Derivatives, Chain Rule, Applications",
      type: AssignmentType.MIDTERM, weight: 35, maxScore: 100, dueDate: daysAgo(22), allowLate: false,
      rubrics: [
        { label: "ความถูกต้องของการคำนวณ", maxPoints: 60 },
        { label: "กระบวนการและการแสดงวิธีทำ", maxPoints: 25 },
        { label: "การตีความผลลัพธ์", maxPoints: 15 },
      ],
    }),
    makeAssignment({
      courseId: math101.id,
      title: "Final Examination",
      description: "สอบปลายภาค ครอบคลุมทุกบท รวมถึง Integration",
      type: AssignmentType.FINAL, weight: 35, maxScore: 100, dueDate: daysFromNow(6), allowLate: false,
    }),
  ]);

  // ── ENG101 Assignments ──
  const [
    { assignment: engWrite1, rubrics: engWrite1Rubrics },
    { assignment: engPresent, rubrics: engPresentRubrics },
    { assignment: engMidReport },
    { assignment: engFinal },
  ] = await Promise.all([
    makeAssignment({
      courseId: eng101.id,
      title: "Writing Assignment 1: Technical Summary",
      description: "เขียน technical summary ของบทความวิชาการ 1 หน้า A4",
      type: AssignmentType.HOMEWORK, weight: 15, maxScore: 100, dueDate: daysAgo(58), allowLate: true,
      rubrics: [
        { label: "ความชัดเจนและความถูกต้องของเนื้อหา", maxPoints: 40 },
        { label: "โครงสร้างการเขียน (Structure)", maxPoints: 30 },
        { label: "ไวยากรณ์และการสะกดคำ", maxPoints: 20 },
        { label: "การอ้างอิง (References)", maxPoints: 10 },
      ],
    }),
    makeAssignment({
      courseId: eng101.id,
      title: "Presentation: Research Topic",
      description: "นำเสนอหัวข้อ research ที่เลือก 10 นาที พร้อม Q&A",
      type: AssignmentType.PROJECT, weight: 20, maxScore: 100, dueDate: daysAgo(38), allowLate: false,
      rubrics: [
        { label: "เนื้อหาและความถูกต้อง", maxPoints: 40 },
        { label: "ทักษะการนำเสนอ (Delivery)", maxPoints: 35 },
        { label: "การตอบคำถาม (Q&A)", maxPoints: 25 },
      ],
    }),
    makeAssignment({
      courseId: eng101.id,
      title: "Midterm Report: Literature Review",
      description: "เขียน literature review 3-5 หน้า ในหัวข้อที่เลือก",
      type: AssignmentType.MIDTERM, weight: 30, maxScore: 100, dueDate: daysAgo(18), allowLate: true,
    }),
    makeAssignment({
      courseId: eng101.id,
      title: "Final Report: Research Paper",
      description: "เขียน research paper ฉบับสมบูรณ์ 8-12 หน้า APA format",
      type: AssignmentType.FINAL, weight: 35, maxScore: 100, dueDate: daysFromNow(9), allowLate: false,
    }),
  ]);

  console.log("✅ Assignments and rubrics created");

  // ─── Submissions & Grades ─────────────────────────────────────────────────

  type AssignmentRef = {
    assignment: { id: string; maxScore: number };
    rubrics: { id: string; maxPoints: number }[];
  };

  // courseStudents: array of { studentIndex, instructor, assignments }
  type CourseConfig = {
    instructor: typeof smith;
    enrolled: typeof students;
    assignments: AssignmentRef[];
  };

  const cs101Config: CourseConfig = {
    instructor: smith,
    enrolled: students.slice(0, 12),
    assignments: [
      { assignment: cs101hw1, rubrics: [] },
      { assignment: cs101hw2, rubrics: [] },
      { assignment: cs101quiz1, rubrics: [] },
      { assignment: cs101mid, rubrics: cs101midRubrics },
      { assignment: cs101hw3, rubrics: [] },
      { assignment: cs101quiz2, rubrics: [] },
      // cs101proj is upcoming — no submissions yet
    ],
  };

  const cs201Config: CourseConfig = {
    instructor: smith,
    enrolled: students.slice(0, 9),
    assignments: [
      { assignment: cs201hw1, rubrics: [] },
      { assignment: cs201quiz1, rubrics: [] },
      { assignment: cs201hw2, rubrics: [] },
      { assignment: cs201mid, rubrics: cs201midRubrics },
      // cs201proj is upcoming
    ],
  };

  const cs301Config: CourseConfig = {
    instructor: smith,
    enrolled: [...students.slice(0, 7), ...students.slice(10, 13)],
    assignments: [
      { assignment: cs301lab1, rubrics: [] },
      { assignment: cs301lab2, rubrics: [] },
      { assignment: cs301quiz1, rubrics: [] },
      { assignment: cs301mid, rubrics: cs301midRubrics }, // past 5 days — some ungraded
      // cs301proj upcoming
    ],
  };

  const math101Config: CourseConfig = {
    instructor: jones,
    enrolled: students.slice(1, 11),
    assignments: [
      { assignment: mathHw1, rubrics: [] },
      { assignment: mathHw2, rubrics: [] },
      { assignment: mathQuiz1, rubrics: [] },
      { assignment: mathMid, rubrics: mathMidRubrics },
      // mathFinal upcoming
    ],
  };

  const eng101Config: CourseConfig = {
    instructor: wattana,
    enrolled: students.slice(4, 15),
    assignments: [
      { assignment: engWrite1, rubrics: engWrite1Rubrics },
      { assignment: engPresent, rubrics: engPresentRubrics },
      { assignment: engMidReport, rubrics: [] },
      // engFinal upcoming
    ],
  };

  const allCourseConfigs = [cs101Config, cs201Config, cs301Config, math101Config, eng101Config];

  // CS301 midterm was just 5 days ago — only grade 60% of submissions (some still pending)
  const recentAssignmentIds = new Set([cs301mid.id]);

  for (const config of allCourseConfigs) {
    for (const student of config.enrolled) {
      const idx = studentDefs.findIndex((d) => d.email === student.email);
      const profile = studentDefs[idx]?.profile ?? "average";
      const submitRate = profileSubmitRate(profile);
      const lateRate = profileLateRate(profile);

      for (const { assignment, rubrics } of config.assignments) {
        const doSubmit = randBool(submitRate);
        if (!doSubmit) continue;

        const isLate = randBool(lateRate);
        const note = randomStudentNote();

        const submission = await prisma.submission.create({
          data: {
            assignmentId: assignment.id,
            studentId: student.id,
            status: isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED,
            isLate,
            fileName: `${student.email.split("@")[0]}_${assignment.id.slice(-4)}.pdf`,
            fileUrl: `https://storage.example.com/submissions/${assignment.id}/${student.id}.pdf`,
            studentNote: note,
          },
        });

        // For CS301 midterm (recent), only grade 60% to leave some pending
        const shouldGrade = recentAssignmentIds.has(assignment.id) ? randBool(0.6) : true;
        if (!shouldGrade) continue;

        const rawPct = profileScore(profile);
        let rubricScores: Record<string, number> | undefined;
        let totalScore = rawPct;

        if (rubrics.length > 0) {
          rubricScores = buildRubricScores(rubrics, rawPct);
          totalScore = Object.values(rubricScores).reduce((a, b) => a + b, 0);
        } else {
          totalScore = Math.min(assignment.maxScore, (rawPct / 100) * assignment.maxScore);
          totalScore = Math.round(totalScore * 10) / 10;
        }

        await prisma.grade.create({
          data: {
            submissionId: submission.id,
            gradedById: config.instructor.id,
            score: totalScore,
            instructorNote: instructorNote(profile),
            privateNote: privateNoteFor(profile),
            rubricScores: rubricScores ?? undefined,
          },
        });
      }
    }
  }

  // Mark all graded submissions as GRADED
  await prisma.submission.updateMany({
    where: { grade: { isNot: null } },
    data: { status: SubmissionStatus.GRADED },
  });

  console.log("✅ Submissions and grades created");

  // ─── Notifications ────────────────────────────────────────────────────────

  const upcomingAssignments = [
    { course: "CS101", title: "Final Project: Mini Application", link: "/dashboard/student/courses" },
    { course: "CS201", title: "Final Project: Algorithm Visualizer", link: "/dashboard/student/courses" },
    { course: "MATH101", title: "Final Examination", link: "/dashboard/student/courses" },
  ];

  for (const student of students) {
    // 1) Grade released notifications
    const submissions = await prisma.submission.findMany({
      where: { studentId: student.id, grade: { isNot: null } },
      include: { assignment: { include: { course: true } } },
      orderBy: { submittedAt: "desc" },
      take: 3,
    });

    for (const sub of submissions) {
      if (randBool(0.7)) {
        await prisma.notification.create({
          data: {
            userId: student.id,
            type: "GRADE_RELEASED",
            title: "ประกาศผลการตรวจงาน",
            message: `อาจารย์ตรวจงาน "${sub.assignment.title}" (${sub.assignment.course.code}) เรียบร้อยแล้ว`,
            link: `/dashboard/student/assignments/${sub.assignmentId}`,
            read: randBool(0.5),
          },
        });
      }
    }

    // 2) Upcoming deadline notifications
    for (const upcoming of upcomingAssignments) {
      if (randBool(0.6)) {
        await prisma.notification.create({
          data: {
            userId: student.id,
            type: "ASSIGNMENT_DUE",
            title: "งานใกล้ถึงกำหนดส่ง",
            message: `"${upcoming.title}" กำลังจะถึงกำหนดส่งเร็ว ๆ นี้ — อย่าลืมส่ง!`,
            link: upcoming.link,
            read: false,
          },
        });
      }
    }

    // 3) Course announcement for some students
    if (randBool(0.4)) {
      await prisma.notification.create({
        data: {
          userId: student.id,
          type: "COURSE_ANNOUNCEMENT",
          title: "ประกาศจากรายวิชา",
          message: "อาจารย์ได้อัพโหลดเอกสารประกอบการสอนสำหรับบทที่ 8 แล้ว",
          link: "/dashboard/student/courses",
          read: randBool(0.6),
        },
      });
    }
  }

  console.log("✅ Notifications created");

  // ─── Summary ──────────────────────────────────────────────────────────────

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.assignment.count(),
    prisma.submission.count(),
    prisma.grade.count(),
    prisma.rubricCriteria.count(),
    prisma.notification.count(),
  ]);

  console.log("\n📊 Database summary:");
  console.log(`   Users:         ${counts[0]}`);
  console.log(`   Courses:       ${counts[1]}`);
  console.log(`   Assignments:   ${counts[2]}`);
  console.log(`   Submissions:   ${counts[3]}`);
  console.log(`   Grades:        ${counts[4]}`);
  console.log(`   Rubric items:  ${counts[5]}`);
  console.log(`   Notifications: ${counts[6]}`);

  console.log("\n🎉 Seed completed!");
  console.log("\n📋 Test accounts:");
  console.log("   Admin:       admin@uni.ac.th       / admin123");
  console.log("   Instructor:  smith@uni.ac.th        / inst123  (CS101, CS201, CS301)");
  console.log("   Instructor:  jones@uni.ac.th        / inst123  (MATH101)");
  console.log("   Instructor:  wattana@uni.ac.th      / inst123  (ENG101)");
  console.log("   Student:     student1@uni.ac.th     / std123   (high performer, 3 courses)");
  console.log("   Student:     student12@uni.ac.th    / std123   (at-risk)");
  console.log("   Student:     student15@uni.ac.th    / std123   (at-risk, misses most work)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
