import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient();

async function main() {
  // Create test applicant user
  const applicant = await db.user.upsert({
    where: { email: "applicant@test.com" },
    update: {},
    create: {
      email: "applicant@test.com",
      name: "Test Applicant",
      role: "APPLICANT",
      organization: "Acme Holdings Ltd.",
    },
  });

  // Create test reviewer user
  const reviewer = await db.user.upsert({
    where: { email: "reviewer@test.com" },
    update: {},
    create: {
      email: "reviewer@test.com",
      name: "Opacity Reviewer",
      role: "REVIEWER",
      organization: "Opacity Network",
    },
  });

  // Create a sample application with mock extracted data
  const app = await db.application.create({
    data: {
      userId: applicant.id,
      companyName: "Acme Holdings Ltd.",
      jurisdiction: "Delaware, USA",
      registrationNum: "DE-7891234",
      status: "SUBMITTED",
    },
  });

  // Create mock documents
  const doc1 = await db.document.create({
    data: {
      applicationId: app.id,
      fileName: "articles_of_incorporation.pdf",
      fileUrl: "mock/articles_of_incorporation.pdf",
      fileType: "application/pdf",
      fileSize: 245000,
      extractionStatus: "DONE",
      extractedText: `CERTIFICATE OF INCORPORATION
OF
ACME HOLDINGS LTD.

ARTICLE I - NAME
The name of the corporation is Acme Holdings Ltd., incorporated in the State of Delaware.

ARTICLE II - REGISTERED AGENT
The registered agent of the corporation is CT Corporation System, 1209 Orange Street, Wilmington, Delaware 19801.

ARTICLE III - PURPOSE
The purpose of the corporation is to engage in any lawful act or activity for which corporations may be organized under the General Corporation Law of the State of Delaware.

ARTICLE IV - CAPITAL STOCK
The total number of shares of stock which the corporation shall have authority to issue is 10,000,000 shares of Common Stock, par value $0.01 per share.

The authorized shares are allocated as follows:
- John Q. Richardson: 4,500,000 shares (45%)
- Pacific Ventures Fund II LP: 3,000,000 shares (30%)
- Sarah M. Chen: 1,500,000 shares (15%)
- Meridian Trust Company (as trustee for the Richardson Family Trust): 1,000,000 shares (10%)

ARTICLE V - INCORPORATOR
The name and mailing address of the incorporator is John Q. Richardson, 350 Fifth Avenue, Suite 5400, New York, NY 10118.

ARTICLE VI - DIRECTORS
The board of directors shall consist of not less than three (3) and not more than nine (9) members.

Initial directors:
1. John Q. Richardson - Chairman
2. Sarah M. Chen - Director
3. Michael Torres - Director (appointed by Pacific Ventures Fund II LP)

ARTICLE VII - INDEMNIFICATION
The corporation shall indemnify its directors and officers to the fullest extent permitted by the Delaware General Corporation Law.

Filed with the Delaware Secretary of State on March 15, 2023.`,
    },
  });

  const doc2 = await db.document.create({
    data: {
      applicationId: app.id,
      fileName: "shareholder_register.pdf",
      fileUrl: "mock/shareholder_register.pdf",
      fileType: "application/pdf",
      fileSize: 128000,
      extractionStatus: "DONE",
      extractedText: `SHAREHOLDER REGISTER - ACME HOLDINGS LTD.
As of December 31, 2024

REGISTERED SHAREHOLDERS:

1. Name: John Q. Richardson
   Address: 350 Fifth Avenue, Suite 5400, New York, NY 10118
   Shares: 4,500,000 Common Stock
   Percentage: 45.0%
   Date Acquired: March 15, 2023
   Classification: Individual - Founder

2. Name: Pacific Ventures Fund II LP
   Address: 2000 Sand Hill Road, Menlo Park, CA 94025
   Shares: 3,000,000 Common Stock
   Percentage: 30.0%
   Date Acquired: June 1, 2023
   Classification: Limited Partnership
   General Partner: Pacific Ventures Management LLC
   Managing Partner of GP: David Park (100% of GP)

3. Name: Sarah M. Chen
   Address: 88 Kearny Street, Suite 1200, San Francisco, CA 94108
   Shares: 1,500,000 Common Stock
   Percentage: 15.0%
   Date Acquired: March 15, 2023
   Classification: Individual - Co-Founder

4. Name: Meridian Trust Company
   (As Trustee for the Richardson Family Trust)
   Address: 100 Wall Street, New York, NY 10005
   Shares: 1,000,000 Common Stock
   Percentage: 10.0%
   Date Acquired: September 1, 2023
   Classification: Trust
   Beneficiaries: Richardson Family Trust beneficiaries (John Q. Richardson, primary beneficiary)

TOTAL ISSUED SHARES: 10,000,000
TOTAL AUTHORIZED SHARES: 10,000,000

Certified by: Jane Williams, Corporate Secretary
Date: December 31, 2024`,
    },
  });

  // Create extracted entities
  const acmeEntity = await db.extractedEntity.create({
    data: {
      documentId: doc1.id,
      applicationId: app.id,
      entityName: "Acme Holdings Ltd.",
      entityType: "COMPANY",
      ownershipPct: null,
      sourceText: "The name of the corporation is Acme Holdings Ltd., incorporated in the State of Delaware.",
      sourcePageNum: 1,
      confidence: 0.98,
      isUbo: false,
    },
  });

  const johnEntity = await db.extractedEntity.create({
    data: {
      documentId: doc1.id,
      applicationId: app.id,
      entityName: "John Q. Richardson",
      entityType: "INDIVIDUAL",
      ownershipPct: 45.0,
      parentEntityId: acmeEntity.id,
      sourceText: "John Q. Richardson: 4,500,000 shares (45%)",
      sourcePageNum: 1,
      confidence: 0.95,
      isUbo: true,
    },
  });

  const pacificEntity = await db.extractedEntity.create({
    data: {
      documentId: doc1.id,
      applicationId: app.id,
      entityName: "Pacific Ventures Fund II LP",
      entityType: "FUND",
      ownershipPct: 30.0,
      parentEntityId: acmeEntity.id,
      sourceText: "Pacific Ventures Fund II LP: 3,000,000 shares (30%)",
      sourcePageNum: 1,
      confidence: 0.95,
      isUbo: false,
    },
  });

  await db.extractedEntity.create({
    data: {
      documentId: doc2.id,
      applicationId: app.id,
      entityName: "David Park",
      entityType: "INDIVIDUAL",
      ownershipPct: 30.0,
      parentEntityId: pacificEntity.id,
      sourceText: "Managing Partner of GP: David Park (100% of GP)",
      sourcePageNum: 1,
      confidence: 0.8,
      isUbo: true,
    },
  });

  const sarahEntity = await db.extractedEntity.create({
    data: {
      documentId: doc1.id,
      applicationId: app.id,
      entityName: "Sarah M. Chen",
      entityType: "INDIVIDUAL",
      ownershipPct: 15.0,
      parentEntityId: acmeEntity.id,
      sourceText: "Sarah M. Chen: 1,500,000 shares (15%)",
      sourcePageNum: 1,
      confidence: 0.95,
      isUbo: false,
    },
  });

  const trustEntity = await db.extractedEntity.create({
    data: {
      documentId: doc1.id,
      applicationId: app.id,
      entityName: "Meridian Trust Company (Richardson Family Trust)",
      entityType: "TRUST",
      ownershipPct: 10.0,
      parentEntityId: acmeEntity.id,
      sourceText: "Meridian Trust Company (as trustee for the Richardson Family Trust): 1,000,000 shares (10%)",
      sourcePageNum: 1,
      confidence: 0.85,
      isUbo: false,
    },
  });

  // Build org structure JSON
  const orgStructure = [
    {
      id: acmeEntity.id,
      name: "Acme Holdings Ltd.",
      type: "COMPANY",
      ownershipPct: null,
      confidence: 0.98,
      isUbo: false,
      children: [
        {
          id: johnEntity.id,
          name: "John Q. Richardson",
          type: "INDIVIDUAL",
          ownershipPct: 45.0,
          confidence: 0.95,
          isUbo: true,
          children: [],
        },
        {
          id: pacificEntity.id,
          name: "Pacific Ventures Fund II LP",
          type: "FUND",
          ownershipPct: 30.0,
          confidence: 0.95,
          isUbo: false,
          children: [
            {
              id: "david-park",
              name: "David Park",
              type: "INDIVIDUAL",
              ownershipPct: 30.0,
              confidence: 0.8,
              isUbo: true,
              children: [],
            },
          ],
        },
        {
          id: sarahEntity.id,
          name: "Sarah M. Chen",
          type: "INDIVIDUAL",
          ownershipPct: 15.0,
          confidence: 0.95,
          isUbo: false,
          children: [],
        },
        {
          id: trustEntity.id,
          name: "Meridian Trust Company (Richardson Family Trust)",
          type: "TRUST",
          ownershipPct: 10.0,
          confidence: 0.85,
          isUbo: false,
          children: [],
        },
      ],
    },
  ];

  await db.orgStructure.create({
    data: {
      applicationId: app.id,
      structureJson: JSON.stringify(orgStructure),
      version: 1,
    },
  });

  // Create attestation
  await db.attestationLog.create({
    data: {
      applicationId: app.id,
      userId: applicant.id,
      statement:
        "I hereby attest that the information provided is true and accurate to the best of my knowledge.\n\nSigned by: Test Applicant, CFO",
      ipAddress: "127.0.0.1",
    },
  });

  console.log("Seed complete:");
  console.log(`  Applicant: applicant@test.com`);
  console.log(`  Reviewer:  reviewer@test.com`);
  console.log(`  Application: ${app.id} (${app.companyName})`);
  console.log(`  Documents: ${doc1.fileName}, ${doc2.fileName}`);
  console.log(`  Entities: 6 (2 UBOs identified)`);
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
