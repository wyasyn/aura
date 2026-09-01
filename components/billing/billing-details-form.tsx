"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveBillingProfileAction } from "@/lib/billing/actions"

export type BillingDetailsValues = {
  fullName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string
  taxId: string
}

const FIELDS: {
  key: keyof BillingDetailsValues
  label: string
  placeholder?: string
  required?: boolean
  span?: boolean
  autoComplete?: string
}[] = [
  {
    key: "fullName",
    label: "Full name",
    required: true,
    autoComplete: "name",
  },
  {
    key: "email",
    label: "Billing email",
    required: true,
    autoComplete: "email",
  },
  { key: "phone", label: "Phone", autoComplete: "tel" },
  {
    key: "taxId",
    label: "Tax or VAT ID",
    placeholder: "Optional",
  },
  {
    key: "addressLine1",
    label: "Address",
    span: true,
    autoComplete: "address-line1",
  },
  {
    key: "addressLine2",
    label: "Address line 2",
    span: true,
    placeholder: "Optional",
    autoComplete: "address-line2",
  },
  { key: "city", label: "City", autoComplete: "address-level2" },
  { key: "state", label: "State or region", autoComplete: "address-level1" },
  { key: "postalCode", label: "Postal code", autoComplete: "postal-code" },
  {
    key: "country",
    label: "Country code",
    placeholder: "UG",
    required: true,
    autoComplete: "country",
  },
]

export function BillingDetailsForm({
  initialValues,
}: {
  initialValues: BillingDetailsValues
}) {
  const [values, setValues] = useState(initialValues)
  const [pending, startTransition] = useTransition()

  function set(key: keyof BillingDetailsValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await saveBillingProfileAction(values)
      if (result.ok) {
        toast.success("Billing details saved")
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div
            key={field.key}
            className={field.span ? "sm:col-span-2" : undefined}
          >
            <Label htmlFor={`billing-${field.key}`}>
              {field.label}
              {field.required ? (
                <span aria-hidden className="text-muted-foreground">
                  {" *"}
                </span>
              ) : null}
            </Label>
            <Input
              id={`billing-${field.key}`}
              className="mt-1.5"
              value={values[field.key]}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              maxLength={field.key === "country" ? 2 : undefined}
              required={field.required}
              onChange={(event) => set(field.key, event.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save billing details"}
        </Button>
        <p className="text-xs text-muted-foreground">
          These details appear on your receipts.
        </p>
      </div>
    </form>
  )
}
