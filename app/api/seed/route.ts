import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PATRICK_RESUME = `PATRICK SELNER
[City, State] | [Phone] | [Email] | [Portfolio URL] | [LinkedIn URL]

SUMMARY
Creative Graphic Designer with [X] years of experience producing compelling visual content across digital and print media. Skilled in Adobe Creative Suite, brand identity development, and marketing collateral. Passionate about visual storytelling and creating designs that connect brands with their audiences.

SKILLS
Design Tools: Adobe Illustrator, Photoshop, InDesign, Figma, After Effects
Design Disciplines: Brand Identity, Typography, Layout Design, Digital Marketing, Social Media Graphics, Print Design, Motion Graphics
Soft Skills: Creative Problem Solving, Attention to Detail, Cross-functional Collaboration, Time Management

EXPERIENCE

[Job Title] | [Company Name] | [City, State] | [Start Date – End Date]
• Designed [X] marketing assets per month including social media graphics, email headers, and print materials
• Collaborated with marketing team to develop brand guidelines and visual identity systems
• Reduced design production time by [X]% through creation of reusable template systems
• [Add specific achievement with measurable result]

[Previous Job Title] | [Company Name] | [City, State] | [Start Date – End Date]
• [Responsibility and achievement]
• [Responsibility and achievement]
• [Responsibility and achievement]

EDUCATION
[Degree] in Graphic Design / Visual Communications | [University] | [Year]
[Relevant coursework, honors, or activities]

PORTFOLIO
[Portfolio Website URL] — [Brief description of featured work]`;

const PATRICK_COVER_LETTER = `[Date]

[Hiring Manager Name]
[Title]
[Company Name]
[Company Address]

Dear [Hiring Manager Name or "Hiring Team"],

I am writing to express my enthusiastic interest in the Graphic Designer position at [Company Name]. As a designer with [X] years of experience creating compelling visual content for [type of work], I am excited by [Company]'s mission to [company mission/focus] and believe my skills align closely with what you're looking for.

In my current/previous role at [Previous Company], I [specific relevant achievement — e.g., "led the redesign of our email marketing templates, increasing click-through rates by 24%"]. I bring proficiency in [specific tools — Adobe Creative Suite, Figma, etc.] and a strong portfolio spanning [types of work — brand identity, digital marketing, print design].

What draws me particularly to [Company Name] is [specific company note — e.g., "your focus on [focus area] and the way your visual brand communicates [value]"]. I am confident I can contribute [specific value] to your team and am eager to bring my [specific skill] to support [company goal].

I would welcome the opportunity to discuss how my background and passion for design can benefit [Company Name]. Thank you for your consideration — I look forward to hearing from you.

Warmly,
Patrick Selner
[Phone] | [Email] | [Portfolio URL]`;

export async function POST() {
  // Check if Patrick already exists
  const existing = await prisma.client.findFirst({ where: { email: "patrick.selner@email.com" } });
  if (existing) {
    return NextResponse.json({ message: "Patrick Selner already seeded", clientId: existing.id });
  }

  const client = await prisma.client.create({
    data: {
      name: "Patrick Selner",
      email: "patrick.selner@email.com",
      location: "Denver, CO",
      resume: {
        create: { content: PATRICK_RESUME, fileName: "patrick-selner-resume.txt" },
      },
      coverLetter: {
        create: { content: PATRICK_COVER_LETTER },
      },
    },
    include: { resume: true, coverLetter: true },
  });

  return NextResponse.json({ message: "Seeded successfully", clientId: client.id }, { status: 201 });
}
