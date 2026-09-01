"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import {
  revalidateAiUserContext,
  revalidateScanHistoryContext,
  revalidateUserScanContext,
} from "@/lib/ai/context/cache-tags"
import { auth } from "@/lib/auth/server"
import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"

export async function deleteProfileDataAction() {
  const session = await requireSession()

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: {
      dateOfBirth: null,
      ageBand: null,
      biologicalSex: null,
      skinType: null,
      fitzpatrickBand: null,
      primaryConcerns: [],
      skinGoals: [],
      allergies: null,
      currentRoutine: undefined,
      previousPrescriptions: undefined,
      medications: undefined,
      lifestyleFactors: undefined,
      marketingConsent: false,
      expertReviewRequested: false,
    },
  })

  revalidatePath("/dashboard/profile")
  revalidatePath("/dashboard/privacy")
  revalidateUserScanContext(session.user.id)
}

export async function deleteLocationDataAction() {
  const session = await requireSession()

  await prisma.userLocation.update({
    where: { userId: session.user.id },
    data: {
      city: null,
      region: null,
      country: null,
      postalCode: null,
      latitude: null,
      longitude: null,
      timezone: null,
      uvIndexBand: null,
      humidityBand: null,
      temperatureBand: null,
      climateZone: null,
      seasonBand: null,
      lastSyncedAt: null,
    },
  })

  revalidatePath("/dashboard/profile")
  revalidatePath("/dashboard/privacy")
  revalidateUserScanContext(session.user.id)
}

export async function deleteScanAction(scanId: string) {
  const session = await requireSession()

  const scan = await prisma.scan.findFirst({
    where: { id: scanId, userId: session.user.id },
  })
  if (!scan) throw new Error("Scan not found")

  await prisma.scan.delete({ where: { id: scanId } })
  revalidatePath("/reports")
  revalidatePath("/dashboard/privacy")
  revalidatePath("/dashboard/usage")
  revalidateScanHistoryContext(session.user.id)
}

export async function deleteAllScansAction() {
  const session = await requireSession()
  await prisma.scan.deleteMany({ where: { userId: session.user.id } })
  revalidatePath("/reports")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/usage")
  revalidateScanHistoryContext(session.user.id)
}

export async function deleteAllPersonalDataAction() {
  const session = await requireSession()

  await prisma.$transaction([
    prisma.scan.deleteMany({ where: { userId: session.user.id } }),
    prisma.scanLedger.deleteMany({ where: { userId: session.user.id } }),
    // Chat transcripts and any images attached to them used to survive this
    // action entirely, because they hang off userId rather than off a scan.
    // The UI and the data-deletion page both claimed otherwise.
    prisma.chatMessage.deleteMany({
      where: { conversation: { userId: session.user.id } },
    }),
    prisma.chatConversation.deleteMany({ where: { userId: session.user.id } }),
    prisma.scanFeedback.deleteMany({ where: { userId: session.user.id } }),
    prisma.scanBalance.update({
      where: { userId: session.user.id },
      data: { remaining: 0, lifetimeUsed: 0, lifetimeGranted: 0 },
    }),
    prisma.userProfile.update({
      where: { userId: session.user.id },
      data: {
        dateOfBirth: null,
        ageBand: null,
        biologicalSex: null,
        skinType: null,
        fitzpatrickBand: null,
        primaryConcerns: [],
        skinGoals: [],
        allergies: null,
        currentRoutine: undefined,
        previousPrescriptions: undefined,
        medications: undefined,
        lifestyleFactors: undefined,
        photoProcessingConsent: false,
        marketingConsent: false,
        consentVersion: null,
        consentAcceptedAt: null,
        expertReviewRequested: false,
      },
    }),
    prisma.userLocation.update({
      where: { userId: session.user.id },
      data: {
        city: null,
        region: null,
        country: null,
        postalCode: null,
        latitude: null,
        longitude: null,
        timezone: null,
        uvIndexBand: null,
        humidityBand: null,
        temperatureBand: null,
        climateZone: null,
        seasonBand: null,
        lastSyncedAt: null,
      },
    }),
  ])

  revalidatePath("/dashboard")
  revalidatePath("/reports")
  revalidatePath("/dashboard/privacy")
  revalidateAiUserContext(session.user.id)
}

/**
 * Marketing consent used to be settable only during onboarding, and the privacy
 * policy told people to withdraw it by deleting their profile data. That is a
 * destructive workaround for a checkbox.
 */
export async function setMarketingConsentAction(granted: boolean) {
  const session = await requireSession()

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: { marketingConsent: granted },
  })

  revalidatePath("/dashboard/privacy")
  revalidatePath("/settings")
}

export async function deleteAccountAction() {
  const session = await requireSession()

  await prisma.$transaction([
    prisma.scan.deleteMany({ where: { userId: session.user.id } }),
    prisma.scanLedger.deleteMany({ where: { userId: session.user.id } }),
    prisma.scanBalance.deleteMany({ where: { userId: session.user.id } }),
    prisma.userProfile.deleteMany({ where: { userId: session.user.id } }),
    prisma.userLocation.deleteMany({ where: { userId: session.user.id } }),
  ])

  await auth.api.deleteUser({
    body: {},
    headers: await headers(),
  })

  redirect("/login")
}
