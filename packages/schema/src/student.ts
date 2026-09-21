import { z } from "zod";

// F3 (spec fix): taxonomy fields store the raw input the student typed, plus
// a normalised slug derived from it, so free text and filterable values
// coexist. See docs/kickoff/00-decision-record.md, F3.
const taxonomyField = z.object({
  raw: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
});

export const studentRegistrationSchema = z.object({
  fullName: z.string().min(1).max(200),
  regNumber: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  programme: taxonomyField,
  degreeLevel: taxonomyField,
  admissionYear: z.number().int().gte(2000).lte(2100),
  researchTitle: z.string().min(1).max(500),
  supervisors: z.array(z.string().min(1).max(200)).min(1),
  stage: taxonomyField,
  // F7 (spec fix): duplicate regNumber and duplicate email must fail
  // identically at the application layer, to avoid enumeration — enforced
  // in the route handler / repo, not expressible as a Zod rule here.
});

export type StudentRegistrationInput = z.infer<typeof studentRegistrationSchema>;
