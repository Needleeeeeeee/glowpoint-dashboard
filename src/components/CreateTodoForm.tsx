"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { createTodo } from "@/actions";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { PlusCircle } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="icon" disabled={pending}>
      <PlusCircle className="h-4 w-4" />
    </Button>
  );
}

export function CreateTodoForm({ dueDate }: { dueDate: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createTodo(formData);
        formRef.current?.reset();
      }}
      className="flex items-center gap-2 mt-4"
    >
      <Input type="text" name="task" placeholder="Add a new task..." required className="flex-grow" />
      <input type="hidden" name="dueDate" value={dueDate} />
      <SubmitButton />
    </form>
  );
}
