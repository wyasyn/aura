import { z } from "zod"

export const addAvailabilitySlotSchema = z
  .object({
    startTime: z.iso.datetime({ offset: true }),
    endTime: z.iso.datetime({ offset: true }),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "End time must be after start time",
    path: ["endTime"],
  })
  .refine((data) => new Date(data.startTime) > new Date(), {
    message: "Slot must be in the future",
    path: ["startTime"],
  })
  .refine(
    (data) => {
      const minutes =
        (new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) /
        60_000
      return minutes >= 15 && minutes <= 120
    },
    { message: "Slots must be between 15 and 120 minutes", path: ["endTime"] },
  )

export type AddAvailabilitySlotInput = z.infer<typeof addAvailabilitySlotSchema>
