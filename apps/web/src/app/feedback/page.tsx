import { submitFeedback } from "./actions";
import { CancelLink, Field, FormError, Select, SubmitButton, TextArea, TextInput, TopBar } from "@/components/form";

export default function FeedbackPage({
  searchParams,
}: {
  searchParams: { error?: string; submitted?: string };
}) {
  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-16 pt-6">
      <TopBar title="Send feedback" />
      <form action={submitFeedback} className="mt-8 space-y-5">
        {searchParams.submitted === "1" ? (
          <p role="status" className="rounded-lg border border-obsidian-cyan/40 bg-obsidian-cyan/10 px-3 py-2 text-sm text-obsidian-platinum">
            Feedback received. Thank you for helping improve Obsidian Rides.
          </p>
        ) : null}
        <FormError message={searchParams.error} />
        <Field label="Category">
          <Select name="category" defaultValue="improvement" required>
            <option value="bug">Bug</option>
            <option value="improvement">Improvement</option>
            <option value="feature_request">Feature request</option>
            <option value="question">Question</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Short title">
          <TextInput name="title" required maxLength={120} autoComplete="off" />
        </Field>
        <Field label="Description" hint="Do not include passwords, API keys, or private customer information.">
          <TextArea name="description" required maxLength={4000} rows={7} />
        </Field>
        <Field label="Page or feature" hint="Optional">
          <TextInput name="page_or_feature" maxLength={160} autoComplete="off" />
        </Field>
        <Field label="Priority" hint="Optional, from your perspective">
          <Select name="priority" defaultValue="">
            <option value="">No priority</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </Select>
        </Field>
        <div className="flex gap-3">
          <SubmitButton pendingLabel="Sending…">Send feedback</SubmitButton>
          <CancelLink href="/">Cancel</CancelLink>
        </div>
      </form>
    </main>
  );
}
