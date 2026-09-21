import { z } from "zod";
import { registration } from "@pgsts/config";

export const OTHER = "__other__";

const name = z
  .string()
  .trim()
  .min(registration.nameMinLength, "Please enter at least 2 characters.")
  .max(registration.nameMaxLength, "Please use 80 characters or fewer.");

const optionalName = z.string().trim().max(registration.nameMaxLength, "Please use 80 characters or fewer.");

/**
 * The form's own shape. Deliberately separate from
 * `studentRegistrationSchema` in @pgsts/schema: that one describes what the
 * API stores (one `fullName`, an array of supervisors), this one describes
 * what the student types (split names, a programme slug, a year as a string
 * because that is what a <select> posts). `toPayload` below is the only
 * place the two are allowed to meet.
 */
export const formSchema = z
  .object({
    surname: name,
    firstNames: name,
    regNumber: z
      .string()
      .trim()
      .min(1, "Please enter your registration number.")
      .regex(
        new RegExp(registration.regNumberPattern),
        "That doesn't look like a registration number. Check your admission letter.",
      ),
    email: z
      .string()
      .trim()
      .min(1, "Please enter your email address.")
      .email("Please enter a valid email address."),
    phone: z
      .string()
      .trim()
      .min(1, "Please enter your telephone number.")
      // People type spaces, hyphens and brackets, and the hint on the field
      // literally shows a spaced number — so normalise before matching rather
      // than rejecting the format we asked for.
      .refine(
        (v) => new RegExp(registration.phonePattern).test(v.replace(/[\s()\-.]/g, "")),
        "Please enter a valid Kenyan mobile number, e.g. 0712 345 678.",
      ),
    degreeLevel: z.string().min(1, "Please choose your degree level."),
    programme: z.string().min(1, "Please choose your programme."),
    programmeOther: z.string().trim().max(150, "Please use 150 characters or fewer.").default(""),
    admissionYear: z
      .string()
      .min(1, "Please choose your year of admission.")
      .regex(/^\d{4}$/, "Please choose your year of admission."),
    researchTopic: z
      .string()
      .trim()
      .min(
        registration.researchTopicMinLength,
        `Please write at least ${registration.researchTopicMinLength} characters.`,
      )
      .max(
        registration.researchTopicMaxLength,
        `Please use ${registration.researchTopicMaxLength} characters or fewer.`,
      ),
    supervisor1First: name,
    supervisor1Surname: name,
    supervisor2First: optionalName.default(""),
    supervisor2Surname: optionalName.default(""),
    stage: z.string().min(1, "Please choose your current stage."),
    acknowledged: z
      .string()
      .refine((v) => v === "on" || v === "true", "Please confirm you have read the Privacy Notice."),
  })
  .superRefine((v, ctx) => {
    if (v.programme === OTHER && !v.programmeOther.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["programmeOther"],
        message: "Please type the name of your programme.",
      });
    }
    // Half a second supervisor is a typo, not a choice.
    const hasFirst = Boolean(v.supervisor2First.trim());
    const hasLast = Boolean(v.supervisor2Surname.trim());
    if (hasFirst !== hasLast) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasFirst ? ["supervisor2Surname"] : ["supervisor2First"],
        message: "Please give both names, or leave both blank.",
      });
    }
  });

export type FormValues = z.infer<typeof formSchema>;

/** Every field name the form posts, in the order they appear. */
export const FIELD_NAMES = [
  "surname",
  "firstNames",
  "regNumber",
  "email",
  "phone",
  "degreeLevel",
  "programme",
  "programmeOther",
  "admissionYear",
  "researchTopic",
  "supervisor1First",
  "supervisor1Surname",
  "supervisor2First",
  "supervisor2Surname",
  "stage",
  "acknowledged",
] as const;

export type FieldName = (typeof FIELD_NAMES)[number];

export type RawValues = Record<FieldName, string>;

export const EMPTY_VALUES: RawValues = FIELD_NAMES.reduce((acc, k) => {
  acc[k] = "";
  return acc;
}, {} as RawValues);

export const FIELD_LABELS: Record<FieldName, string> = {
  surname: "Surname / family name",
  firstNames: "First name(s)",
  regNumber: "Admission / registration number",
  email: "Email address",
  phone: "Telephone number",
  degreeLevel: "Degree level",
  programme: "Programme",
  programmeOther: "Programme name",
  admissionYear: "Year of admission",
  researchTopic: "Research topic or description",
  supervisor1First: "Primary supervisor — first name",
  supervisor1Surname: "Primary supervisor — surname",
  supervisor2First: "Second supervisor — first name",
  supervisor2Surname: "Second supervisor — surname",
  stage: "Current stage",
  acknowledged: "Privacy Notice acknowledgement",
};

/** Which section a field belongs to, for the error summary and Edit links. */
export const FIELD_SECTION: Record<FieldName, "about" | "programme" | "research"> = {
  surname: "about",
  firstNames: "about",
  regNumber: "about",
  email: "about",
  phone: "about",
  degreeLevel: "programme",
  programme: "programme",
  programmeOther: "programme",
  admissionYear: "programme",
  researchTopic: "research",
  supervisor1First: "research",
  supervisor1Surname: "research",
  supervisor2First: "research",
  supervisor2Surname: "research",
  stage: "research",
  acknowledged: "research",
};

/**
 * State shuttled between the form, the review screen and the action.
 *
 * This lives here rather than in actions.ts because a "use server" module may
 * only export async functions — a plain constant exported from there arrives
 * as `undefined` on the client, which the build does not catch.
 */
export type ActionState =
  | {
      status: "editing";
      values: RawValues;
      errors: Partial<Record<FieldName, string>>;
      focus?: string;
      message?: string;
    }
  | { status: "review"; values: RawValues }
  | { status: "done" };

export const INITIAL_STATE: ActionState = {
  status: "editing",
  values: EMPTY_VALUES,
  errors: {},
};

export function readForm(fd: FormData): RawValues {
  return FIELD_NAMES.reduce((acc, k) => {
    const v = fd.get(k);
    acc[k] = typeof v === "string" ? v : "";
    return acc;
  }, {} as RawValues);
}

/** Kenyan mobile numbers are stored E.164 so exports and SMS tooling agree. */
export function toE164(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+254")) return digits;
  if (digits.startsWith("254")) return `+${digits}`;
  if (digits.startsWith("0")) return `+254${digits.slice(1)}`;
  return `+254${digits}`;
}

export function tidy(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}
