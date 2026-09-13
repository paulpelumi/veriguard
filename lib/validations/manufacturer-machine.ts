import { z } from "zod"

export const machineDescriptionSchema = z.object({
  description: z.string().trim().min(10, "Describe the machine in a bit more detail"),
  serialisationLevel: z.enum(["unit", "carton", "pallet"], {
    message: "Select a serialisation level",
  }),
  unitsPerHour: z.coerce.number().int().positive().optional().or(z.literal("")),
})

export type MachineDescriptionValues = z.infer<typeof machineDescriptionSchema>

export const machineConfirmSchema = z.object({
  machineName: z.string().trim().min(2, "Enter a name for this machine"),
  notes: z.string().trim().optional(),
})

export type MachineConfirmValues = z.infer<typeof machineConfirmSchema>
