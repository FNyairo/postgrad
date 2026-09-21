"use server";

import { headers } from "next/headers";
import type { StudentRegistrationInput } from "@pgsts/schema";
import { DuplicateRegistrationError } from "@pgsts/adapter-prisma";
import { registerStudent } from "@/lib/registerStudent";
import { loadTaxonomy, labelFor } from "@/lib/taxonomy";
import {
  OTHER,
  formSchema,
  readForm,
  tidy,
  toE164,
  type ActionState,
  type FieldName,
  type RawValues,
} from "./validation";

// NOTE: this module is "use server" — it may export async functions and
// nothing else. ActionState and INITIAL_STATE therefore live in
// ./validation.ts; exporting them from here silently yields `undefined` on
// the client at runtime, which `next build` does not flag.

/**
 * One action drives the whole flow, so JavaScript changes nothing about the
 * sequence: fill in → review → confirm.
 *
 * - no `confirm` field   → validate, then show the review screen
 * - `_edit=<section>`    → straight back to the form, values intact
 * - `confirm=1`          → validate again and write the row
 *
 * Validating a second time on confirm is not redundant: the review screen
 * round-trips values through hidden inputs, and nothing stops a client
 * editing them in between.
 */
export async function submitRegistration(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = readForm(formData);
  const editTarget = formData.get("_edit");

  if (typeof editTarget === "string" && editTarget) {
    return { status: "editing", values, errors: {}, focus: editTarget };
  }

  const parsed = formSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Partial<Record<FieldName, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as FieldName | undefined;
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { status: "editing", values, errors };
  }

  const confirmed = formData.get("confirm") === "1";
  if (!confirmed) {
    return { status: "review", values };
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  try {
    await registerStudent(await toPayload(values), ip);
    return { status: "done" };
  } catch (err) {
    if (err instanceof DuplicateRegistrationError) {
      // F7: a registration-number collision and an email collision are
      // indistinguishable from out here, so the form cannot be used to test
      // whether a given person is already on the register.
      return {
        status: "editing",
        values,
        errors: {},
        message:
          "We already have a record matching these details. If you think this is your record and something needs changing, contact the department and we'll sort it out.",
      };
    }
    // The student gets a neutral message, but the cause must reach the server
    // log — otherwise a production failure is undiagnosable. Passenger writes
    // stderr to stderr.log in the app root.
    console.error("[register] submission failed:", err);
    return {
      status: "editing",
      values,
      errors: {},
      message: "Something went wrong at our end. Please try again in a moment.",
    };
  }
}

/**
 * The form's split fields, composed back into the columns the Student table
 * actually has: one `fullName`, one `supervisors` string. The shape is fixed
 * — "Surname, First names" — so a later migration to real columns is a
 * deterministic split rather than a guess.
 */
async function toPayload(v: RawValues): Promise<StudentRegistrationInput> {
  // F3: the `raw` column keeps the human-readable label, `slug` keeps the
  // filterable key. The form posts slugs, so the labels are resolved back
  // from the same taxonomy the pickers were built from.
  const tax = await loadTaxonomy();

  const isOther = v.programme === OTHER;
  const programmeLabel = isOther ? tidy(v.programmeOther) : labelFor(tax.programmes, v.programme);
  const programmeSlug = isOther ? tidy(v.programmeOther) : v.programme;

  const supervisors = [`${tidy(v.supervisor1Surname)}, ${tidy(v.supervisor1First)}`];
  if (v.supervisor2Surname.trim() && v.supervisor2First.trim()) {
    supervisors.push(`${tidy(v.supervisor2Surname)}, ${tidy(v.supervisor2First)}`);
  }

  return {
    fullName: `${tidy(v.surname)}, ${tidy(v.firstNames)}`,
    regNumber: tidy(v.regNumber),
    email: v.email.trim().toLowerCase(),
    phone: toE164(v.phone),
    programme: { raw: programmeLabel, slug: programmeSlug },
    degreeLevel: { raw: labelFor(tax.degreeLevels, v.degreeLevel), slug: v.degreeLevel },
    admissionYear: Number(v.admissionYear),
    researchTitle: tidy(v.researchTopic),
    supervisors,
    stage: { raw: labelFor(tax.researchStages, v.stage), slug: v.stage },
  };
}
