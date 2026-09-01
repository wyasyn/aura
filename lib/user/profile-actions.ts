"use server"

import { revalidatePath } from "next/cache"

import { revalidateUserScanContext } from "@/lib/ai/context/cache-tags"
import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { deriveAgeBand } from "@/lib/onboarding/constants"
import {
  basicsSchema,
  lifestyleSchema,
  locationSchema,
  routineSchema,
  skinSchema,
} from "@/lib/onboarding/schemas"
import { refreshClimateForPlace } from "@/lib/climate/context"

export async function updateBasicsAction(input: unknown) {
  const session = await requireSession()
  const data = basicsSchema.parse(input)
  const dateOfBirth = new Date(data.dateOfBirth)

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: data.name },
  })

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: {
      dateOfBirth,
      ageBand: deriveAgeBand(dateOfBirth),
      biologicalSex: data.biologicalSex,
    },
  })

  revalidatePath("/dashboard/profile")
  revalidateUserScanContext(session.user.id)
}

export async function updateSkinAction(input: unknown) {
  const session = await requireSession()
  const data = skinSchema.parse(input)

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: {
      skinType: data.skinType ?? null,
      fitzpatrickBand: data.fitzpatrickBand ?? null,
      skinDosha: data.skinDosha ?? null,
      primaryConcerns: data.primaryConcerns,
      skinGoals: data.skinGoals,
      allergies: data.allergies ?? null,
      expertReviewRequested: data.expertReviewRequested ?? false,
    },
  })

  revalidatePath("/dashboard/profile")
  revalidateUserScanContext(session.user.id)
}

export async function updateRoutineAction(input: unknown) {
  const session = await requireSession()
  const data = routineSchema.parse(input)

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: {
      currentRoutine: data.currentRoutine,
      previousPrescriptions: data.previousPrescriptions ?? [],
      medications: data.medications ?? [],
    },
  })

  revalidatePath("/dashboard/profile")
  revalidateUserScanContext(session.user.id)
}

export async function updateLifestyleAction(input: unknown) {
  const session = await requireSession()
  const data = lifestyleSchema.parse(input)

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: { lifestyleFactors: data.lifestyleFactors },
  })

  revalidatePath("/dashboard/profile")
  revalidateUserScanContext(session.user.id)
}

export async function updateLocationAction(input: unknown) {
  const session = await requireSession()
  const data = locationSchema.parse(input)

  let climate = null
  let latitude = data.latitude
  let longitude = data.longitude

  try {
    const refreshed = await refreshClimateForPlace(data)
    if (refreshed) {
      climate = refreshed.climate
      latitude = refreshed.latitude
      longitude = refreshed.longitude
    }
  } catch {
    // Keep saved place even if weather lookup fails.
  }

  await prisma.userLocation.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      city: data.city,
      region: data.region,
      country: data.country,
      postalCode: data.postalCode,
      latitude,
      longitude,
      locationSource: data.locationSource,
      ...climate,
      lastSyncedAt: climate ? new Date() : undefined,
    },
    update: {
      city: data.city,
      region: data.region,
      country: data.country,
      postalCode: data.postalCode,
      latitude,
      longitude,
      locationSource: data.locationSource,
      ...climate,
      lastSyncedAt: climate ? new Date() : undefined,
    },
  })

  revalidatePath("/dashboard/profile")
  revalidateUserScanContext(session.user.id)
}
