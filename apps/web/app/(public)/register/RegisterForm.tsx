"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { studentRegistrationSchema, type StudentRegistrationInput } from "@pgsts/schema";
import { institution } from "@pgsts/config";

// Field-level combobox suggestions from the Taxonomy table (the seeded
// "MEd / M.Ed / Masters in Education" alias matching) are not built yet —
// these are plain text inputs for now. See
// docs/kickoff/02-repo-structure.md, components/form/.
type FormShape = {
  fullName: string;
  regNumber: string;
  email: string;
  phone: string;
  programme: string;
  degreeLevel: string;
  admissionYear: number;
  researchTitle: string;
  supervisors: string; // comma-separated in the UI, split on submit
  stage: string;
  acknowledged: boolean;
};

export default function RegisterForm() {
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormShape>();

  const onSubmit = async (values: FormShape) => {
    if (!values.acknowledged) {
      setErrorMessage(
        institution.lawfulBasisMode === "consent"
          ? "Please tick the consent box to continue."
          : "Please confirm you've read the notice to continue.",
      );
      return;
    }

    const payload: StudentRegistrationInput = {
      fullName: values.fullName,
      regNumber: values.regNumber,
      email: values.email,
      phone: values.phone,
      programme: { raw: values.programme, slug: values.programme },
      degreeLevel: { raw: values.degreeLevel, slug: values.degreeLevel },
      admissionYear: Number(values.admissionYear),
      researchTitle: values.researchTitle,
      supervisors: values.supervisors.split(",").map((s) => s.trim()).filter(Boolean),
      stage: { raw: values.stage, slug: values.stage },
    };

    const check = studentRegistrationSchema.safeParse(payload);
    if (!check.success) {
      setErrorMessage("Please check the highlighted fields.");
      return;
    }

    setSubmitState("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/v1/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 409) {
        // F7: identical message for a regNumber or an email collision.
        setSubmitState("error");
        setErrorMessage("A record with this registration number or email already exists.");
        return;
      }
      if (!res.ok) {
        setSubmitState("error");
        setErrorMessage("Something went wrong. Please try again.");
        return;
      }
      setSubmitState("done");
    } catch {
      setSubmitState("error");
      setErrorMessage("Could not reach the server. Please check your connection and try again.");
    }
  };

  if (submitState === "done") {
    return <p>Thank you — your registration was received.</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: "0.9rem", maxWidth: 480 }}>
      <label>Full name<input {...register("fullName", { required: true })} /></label>
      <label>Admission / registration number<input {...register("regNumber", { required: true })} /></label>
      <label>Email<input type="email" {...register("email", { required: true })} /></label>
      <label>Phone<input {...register("phone", { required: true })} /></label>
      <label>Programme<input {...register("programme", { required: true })} /></label>
      <label>Degree level<input {...register("degreeLevel", { required: true })} /></label>
      <label>Year of admission<input type="number" {...register("admissionYear", { required: true, valueAsNumber: true })} /></label>
      <label>Research title<input {...register("researchTitle", { required: true })} /></label>
      <label>Supervisor(s), comma-separated<input {...register("supervisors", { required: true })} /></label>
      <label>Current stage<input {...register("stage", { required: true })} /></label>

      <label style={{ display: "flex", gap: "0.5rem", alignItems: "start" }}>
        <input type="checkbox" {...register("acknowledged")} />
        <span>
          {institution.lawfulBasisMode === "consent"
            ? "I agree to the Department of Education registering my details as described in the Privacy Notice."
            : "I have read the Privacy Notice and understand how the Department of Education will use my information."}
        </span>
      </label>

      {errorMessage && <p role="alert" style={{ color: "#B3261E" }}>{errorMessage}</p>}
      {Object.keys(errors).length > 0 && <p role="alert" style={{ color: "#B3261E" }}>Please fill in all required fields.</p>}

      <button type="submit" disabled={submitState === "submitting"}>
        {submitState === "submitting" ? "Submitting…" : "Register"}
      </button>
    </form>
  );
}
