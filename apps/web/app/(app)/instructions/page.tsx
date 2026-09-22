"use client";

import { InstructionsForm } from "./InstructionsForm";

export default function Instructions() {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-light">Instructions</h1>
      <InstructionsForm />
    </div>
  );
}
