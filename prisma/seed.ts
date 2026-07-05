import { PrismaClient, TenantRole, ProjectStatus, LeadStatus, OpportunityStatus, ActivityType, AuditAction } from "@prisma/client";
import bcrypt from "bcryptjs";
import { setTenantContext } from "../lib/db/tenant-context";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      passwordHash,
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo Corporation",
      slug: "demo",
    },
  });

  const acmeTenant = await prisma.tenant.upsert({
    where: { slug: "acme" },
    update: {},
    create: {
      name: "Acme Industries",
      slug: "acme",
    },
  });

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: acmeTenant.id, userId: user.id } },
    update: {},
    create: {
      tenantId: acmeTenant.id,
      userId: user.id,
      role: TenantRole.ADMIN,
    },
  });

  const existingAcmeCalendar = await prisma.projectCalendar.findFirst({
    where: { tenantId: acmeTenant.id },
  });
  if (!existingAcmeCalendar) {
    await setTenantContext(acmeTenant.id);
    await prisma.projectCalendar.create({
      data: {
        tenantId: acmeTenant.id,
        name: "Standard",
        hoursPerDay: 8,
        workDays: [1, 2, 3, 4, 5],
        holidays: [],
      },
    });
  }

  const existingProject = await prisma.project.findFirst({
    where: { tenantId: tenant.id, name: "Website Redesign" },
  });

  if (existingProject) {
    console.log("Seed data already exists, skipping.");
    return;
  }

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: TenantRole.OWNER,
    },
  });

  const calendar = await prisma.projectCalendar.create({
    data: {
      tenantId: tenant.id,
      name: "Standard Work Week",
      workDays: [1, 2, 3, 4, 5],
      hoursPerDay: 8,
    },
  });

  const stages = await Promise.all(
    ["Prospecting", "Qualification", "Proposal", "Negotiation", "Closed Won"].map(
      (name, i) =>
        prisma.pipelineStage.create({
          data: {
            tenantId: tenant.id,
            name,
            sortOrder: i,
            probability: [10, 25, 50, 75, 100][i],
          },
        })
    )
  );

  const crmAccount = await prisma.crmAccount.create({
    data: {
      tenantId: tenant.id,
      name: "Acme Industries",
      industry: "Manufacturing",
      website: "https://acme.example.com",
      phone: "+1-555-0100",
    },
  });

  await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      crmAccountId: crmAccount.id,
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@acme.example.com",
      title: "VP Operations",
    },
  });

  await prisma.lead.create({
    data: {
      tenantId: tenant.id,
      firstName: "Bob",
      lastName: "Johnson",
      email: "bob@startup.io",
      company: "Startup.io",
      status: LeadStatus.QUALIFIED,
      score: 75,
      source: "Website",
    },
  });

  await prisma.opportunity.create({
    data: {
      tenantId: tenant.id,
      crmAccountId: crmAccount.id,
      stageId: stages[2].id,
      name: "Enterprise PM License",
      value: 85000,
      closeDate: new Date("2026-09-30"),
    },
  });

  const project = await prisma.project.create({
    data: {
      tenantId: tenant.id,
      name: "Website Redesign",
      description: "Complete overhaul of corporate website",
      status: ProjectStatus.ACTIVE,
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-10-31"),
      crmAccountId: crmAccount.id,
      calendarId: calendar.id,
    },
  });

  const task1 = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      projectId: project.id,
      name: "Planning Phase",
      type: "SUMMARY",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-21"),
      duration: 15,
      sortOrder: 0,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      projectId: project.id,
      parentId: task1.id,
      name: "Requirements Gathering",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-07"),
      duration: 5,
      percentComplete: 100,
      sortOrder: 1,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      projectId: project.id,
      parentId: task1.id,
      name: "Design Mockups",
      startDate: new Date("2026-07-08"),
      endDate: new Date("2026-07-21"),
      duration: 10,
      percentComplete: 60,
      sortOrder: 2,
    },
  });

  const task4 = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      projectId: project.id,
      name: "Development",
      type: "SUMMARY",
      startDate: new Date("2026-07-22"),
      endDate: new Date("2026-09-15"),
      duration: 40,
      sortOrder: 3,
    },
  });

  const task5 = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      projectId: project.id,
      parentId: task4.id,
      name: "Frontend Build",
      startDate: new Date("2026-07-22"),
      endDate: new Date("2026-08-26"),
      duration: 25,
      percentComplete: 30,
      sortOrder: 4,
    },
  });

  const task6 = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      projectId: project.id,
      parentId: task4.id,
      name: "Backend API",
      startDate: new Date("2026-07-22"),
      endDate: new Date("2026-08-19"),
      duration: 20,
      percentComplete: 45,
      sortOrder: 5,
    },
  });

  await prisma.taskDependency.create({
    data: {
      tenantId: tenant.id,
      projectId: project.id,
      predecessorId: task3.id,
      successorId: task5.id,
      type: "FS",
    },
  });

  await prisma.taskDependency.create({
    data: {
      tenantId: tenant.id,
      projectId: project.id,
      predecessorId: task3.id,
      successorId: task6.id,
      type: "FS",
    },
  });

  await prisma.milestone.create({
    data: {
      tenantId: tenant.id,
      projectId: project.id,
      name: "Design Approval",
      date: new Date("2026-07-21"),
    },
  });

  const resource = await prisma.resource.create({
    data: {
      tenantId: tenant.id,
      projectId: project.id,
      name: "Alice Developer",
      type: "PERSON",
      email: "alice@demo.com",
      capacityHrs: 8,
      costRate: 75,
    },
  });

  await prisma.resourceAssignment.create({
    data: {
      tenantId: tenant.id,
      taskId: task5.id,
      resourceId: resource.id,
      units: 100,
    },
  });

  await prisma.activity.create({
    data: {
      tenantId: tenant.id,
      type: ActivityType.MEETING,
      subject: "Kickoff meeting with Acme",
      description: "Discussed project scope and timeline",
      crmAccountId: crmAccount.id,
      completedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      action: AuditAction.CREATE,
      entityType: "Project",
      entityId: project.id,
      metadata: { name: project.name },
    },
  });

  await prisma.notification.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      type: "ASSIGNMENT",
      title: "Task assigned",
      message: "You have been assigned to Frontend Build",
      link: `/projects/${project.id}/tasks`,
    },
  });

  console.log("Seed complete!");
  console.log("  Email: demo@example.com");
  console.log("  Password: password");
  console.log("  Tenant: demo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
