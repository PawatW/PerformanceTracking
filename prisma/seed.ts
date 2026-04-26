import { PrismaClient, Role, AssignmentType, SubmissionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function randomScore(min = 55, max = 95): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function randomBool(probability = 0.2): boolean {
  return Math.random() < probability;
}

async function main() {
  console.log("🌱 Seeding database...");

  // ------------------------------------------------------------------
  // Clean up
  // ------------------------------------------------------------------
  await prisma.notification.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.rubricCriteria.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  // ------------------------------------------------------------------
  // Users
  // ------------------------------------------------------------------
  const adminPassword = await bcrypt.hash("admin123", 12);
  const instPassword = await bcrypt.hash("inst123", 12);
  const stdPassword = await bcrypt.hash("std123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "System Admin",
      email: "admin@uni.ac.th",
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  const smith = await prisma.user.create({
    data: {
      name: "Dr. Smith",
      email: "smith@uni.ac.th",
      password: instPassword,
      role: Role.INSTRUCTOR,
    },
  });

  const jones = await prisma.user.create({
    data: {
      name: "Dr. Jones",
      email: "jones@uni.ac.th",
      password: instPassword,
      role: Role.INSTRUCTOR,
    },
  });

  const yearLevels = ["ปี 1", "ปี 2", "ปี 3", "ปี 1", "ปี 2", "ปี 3"];
  const students = await Promise.all(
    [1, 2, 3, 4, 5, 6].map((i) =>
      prisma.user.create({
        data: {
          name: `Student ${i}`,
          email: `student${i}@uni.ac.th`,
          password: stdPassword,
          role: Role.STUDENT,
          yearLevel: yearLevels[i - 1],
        },
      })
    )
  );

  console.log("✅ Users created");

  // ------------------------------------------------------------------
  // Courses
  // ------------------------------------------------------------------
  const cs101 = await prisma.course.create({
    data: {
      code: "CS101",
      title: "Introduction to Programming",
      instructorId: smith.id,
      semester: "1/2567",
      year: 2567,
    },
  });

  const cs201 = await prisma.course.create({
    data: {
      code: "CS201",
      title: "Data Structures and Algorithms",
      instructorId: smith.id,
      semester: "1/2567",
      year: 2567,
    },
  });

  const math101 = await prisma.course.create({
    data: {
      code: "MATH101",
      title: "Calculus I",
      instructorId: jones.id,
      semester: "1/2567",
      year: 2567,
    },
  });

  console.log("✅ Courses created");

  // ------------------------------------------------------------------
  // Enrollments
  // CS101: students 1-4
  // CS201: students 1-3
  // MATH101: students 3-6
  // ------------------------------------------------------------------
  const cs101Students = students.slice(0, 4);
  const cs201Students = students.slice(0, 3);
  const math101Students = students.slice(2, 6);

  for (const s of cs101Students) {
    await prisma.enrollment.create({ data: { studentId: s.id, courseId: cs101.id } });
  }
  for (const s of cs201Students) {
    await prisma.enrollment.create({ data: { studentId: s.id, courseId: cs201.id } });
  }
  for (const s of math101Students) {
    await prisma.enrollment.create({ data: { studentId: s.id, courseId: math101.id } });
  }

  console.log("✅ Enrollments created");

  // ------------------------------------------------------------------
  // Assignments
  // ------------------------------------------------------------------
  const now = new Date();
  const pastDate = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000);

  const cs101Assignments = await Promise.all([
    prisma.assignment.create({
      data: {
        courseId: cs101.id,
        title: "Lab 1: Variables and Data Types",
        type: AssignmentType.HOMEWORK,
        weight: 5,
        maxScore: 100,
        dueDate: pastDate(60),
        allowLate: true,
      },
    }),
    prisma.assignment.create({
      data: {
        courseId: cs101.id,
        title: "Lab 2: Control Flow",
        type: AssignmentType.HOMEWORK,
        weight: 5,
        maxScore: 100,
        dueDate: pastDate(45),
        allowLate: true,
      },
    }),
    prisma.assignment.create({
      data: {
        courseId: cs101.id,
        title: "Quiz 1: Basic Concepts",
        type: AssignmentType.QUIZ,
        weight: 10,
        maxScore: 20,
        dueDate: pastDate(40),
        allowLate: false,
      },
    }),
    prisma.assignment.create({
      data: {
        courseId: cs101.id,
        title: "Midterm Examination",
        type: AssignmentType.MIDTERM,
        weight: 30,
        maxScore: 100,
        dueDate: pastDate(30),
        allowLate: false,
      },
    }),
    prisma.assignment.create({
      data: {
        courseId: cs101.id,
        title: "Final Project: Mini Application",
        type: AssignmentType.PROJECT,
        weight: 30,
        maxScore: 100,
        dueDate: pastDate(5),
        allowLate: true,
      },
    }),
  ]);

  const cs201Assignments = await Promise.all([
    prisma.assignment.create({
      data: {
        courseId: cs201.id,
        title: "Assignment 1: Linked Lists",
        type: AssignmentType.HOMEWORK,
        weight: 10,
        maxScore: 100,
        dueDate: pastDate(55),
        allowLate: true,
      },
    }),
    prisma.assignment.create({
      data: {
        courseId: cs201.id,
        title: "Quiz 1: Arrays and Stacks",
        type: AssignmentType.QUIZ,
        weight: 10,
        maxScore: 20,
        dueDate: pastDate(42),
        allowLate: false,
      },
    }),
    prisma.assignment.create({
      data: {
        courseId: cs201.id,
        title: "Midterm Examination",
        type: AssignmentType.MIDTERM,
        weight: 35,
        maxScore: 100,
        dueDate: pastDate(28),
        allowLate: false,
      },
    }),
    prisma.assignment.create({
      data: {
        courseId: cs201.id,
        title: "Final Project: Algorithm Visualizer",
        type: AssignmentType.PROJECT,
        weight: 35,
        maxScore: 100,
        dueDate: pastDate(3),
        allowLate: true,
      },
    }),
  ]);

  const math101Assignments = await Promise.all([
    prisma.assignment.create({
      data: {
        courseId: math101.id,
        title: "Problem Set 1: Limits",
        type: AssignmentType.HOMEWORK,
        weight: 10,
        maxScore: 100,
        dueDate: pastDate(50),
        allowLate: true,
      },
    }),
    prisma.assignment.create({
      data: {
        courseId: math101.id,
        title: "Midterm Examination",
        type: AssignmentType.MIDTERM,
        weight: 40,
        maxScore: 100,
        dueDate: pastDate(25),
        allowLate: false,
      },
    }),
    prisma.assignment.create({
      data: {
        courseId: math101.id,
        title: "Final Examination",
        type: AssignmentType.FINAL,
        weight: 40,
        maxScore: 100,
        dueDate: pastDate(2),
        allowLate: false,
      },
    }),
  ]);

  console.log("✅ Assignments created");

  // ------------------------------------------------------------------
  // Submissions & Grades  (70% submission rate)
  // ------------------------------------------------------------------
  async function createSubmissionsForCourse(
    courseStudents: typeof students,
    assignments: { id: string; allowLate: boolean }[],
    instructor: { id: string }
  ) {
    for (const student of courseStudents) {
      for (const assignment of assignments) {
        const shouldSubmit = Math.random() < 0.7;
        if (!shouldSubmit) continue;

        const isLate = randomBool(0.15);
        const submission = await prisma.submission.create({
          data: {
            assignmentId: assignment.id,
            studentId: student.id,
            status: isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED,
            isLate,
            fileName: `submission_${student.email.split("@")[0]}.pdf`,
            fileUrl: `https://storage.example.com/submissions/${assignment.id}/${student.id}.pdf`,
          },
        });

        await prisma.grade.create({
          data: {
            submissionId: submission.id,
            gradedById: instructor.id,
            score: randomScore(),
            instructorNote: "Good work! Keep it up.",
          },
        });
      }
    }
  }

  await createSubmissionsForCourse(cs101Students, cs101Assignments, smith);
  await createSubmissionsForCourse(cs201Students, cs201Assignments, smith);
  await createSubmissionsForCourse(math101Students, math101Assignments, jones);

  // Update submission status to GRADED after grade is created
  await prisma.submission.updateMany({
    where: { grade: { isNot: null } },
    data: { status: SubmissionStatus.GRADED },
  });

  console.log("✅ Submissions and grades created");

  // ------------------------------------------------------------------
  // Notifications (2-3 per student)
  // ------------------------------------------------------------------
  const notificationTemplates = [
    {
      type: "ASSIGNMENT_DUE",
      title: "งานใกล้ถึงกำหนดส่ง",
      message: "งาน Lab 2: Control Flow จะครบกำหนดในอีก 2 วัน",
      link: "/dashboard/student/assignments",
    },
    {
      type: "GRADE_RELEASED",
      title: "ประกาศผลการตรวจงาน",
      message: "อาจารย์ตรวจงาน Midterm Examination ของคุณเรียบร้อยแล้ว",
      link: "/dashboard/student/grades",
    },
    {
      type: "COURSE_ANNOUNCEMENT",
      title: "ประกาศจากรายวิชา",
      message: "อาจารย์ได้เพิ่มเอกสารประกอบการสอนใหม่",
      link: "/dashboard/student/courses",
    },
  ];

  for (const student of students) {
    const count = Math.random() < 0.5 ? 2 : 3;
    const templates = [...notificationTemplates].sort(() => Math.random() - 0.5).slice(0, count);
    for (const tmpl of templates) {
      await prisma.notification.create({
        data: {
          userId: student.id,
          ...tmpl,
          read: randomBool(0.4),
        },
      });
    }
  }

  console.log("✅ Notifications created");
  console.log("\n🎉 Seed completed successfully!");
  console.log("\nTest accounts:");
  console.log("  Admin:       admin@uni.ac.th    / admin123");
  console.log("  Instructor:  smith@uni.ac.th    / inst123");
  console.log("  Instructor:  jones@uni.ac.th    / inst123");
  console.log("  Student 1-6: student1@uni.ac.th / std123  (1-6)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
