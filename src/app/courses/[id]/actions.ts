"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface CheckoutPayload {
  courseId: string;
  gateway: "PAYFAST" | "PAYPAL" | "PAYSTACK" | "FLUTTERWAVE" | "SCHOLARSHIP";
  currency: string;
  amountZar: number;
  amountOriginal: number;
  gatewayFeeZar: number;
  netAmountZar: number;
  authorRoyaltyZar: number;
  awiefShareZar: number;
  paymentDetail?: string;
  scholarshipCode?: string;
}

/**
 * Server action to enroll a learner in a course directly (e.g. for free or preview courses).
 *
 * @param {string} courseId - The unique course identifier.
 * @returns {Promise<{ success: boolean; redirectUrl: string }>} Result and redirect destination.
 */
export async function enrollInCourse(courseId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { success: false, redirectUrl: `/login?callbackUrl=/courses/${courseId}` };
  }

  const userId = (session.user as any).id;

  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    update: {
      lastAccess: new Date(),
    },
    create: {
      userId,
      courseId,
      status: "IN_PROGRESS",
    },
  });

  return { success: true, redirectUrl: `/course/${courseId}` };
}

/**
 * Server action processing simulated commercial checkout across African gateways
 * (PayFast, PayPal, Paystack, Flutterwave, or Partner Scholarship grants).
 * Automatically records the auditable financial transaction with gateway fees, net revenue,
 * and author royalty distribution, then activates the learner's enrollment.
 *
 * @param {CheckoutPayload} payload - Detailed financial parameters.
 * @returns {Promise<{ success: boolean; redirectUrl?: string; error?: string }>} Execution result.
 */
export async function processCourseCheckout(payload: CheckoutPayload) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      success: false,
      redirectUrl: `/login?callbackUrl=/courses/${payload.courseId}?checkout=true`,
      error: "Please sign in or register to complete your enrollment.",
    };
  }

  const userId = (session.user as any).id;

  try {
    // Generate unique settlement reference
    const now = new Date();
    const billingMonth = now.toISOString().slice(0, 7);
    const reference = `AWIEF-${payload.gateway.substring(0, 3)}-${Date.now()}`;

    // Record the financial transaction
    await prisma.transaction.create({
      data: {
        reference,
        userId,
        courseId: payload.courseId,
        gateway: payload.gateway,
        currency: payload.currency,
        amountZar: payload.amountZar,
        amountOriginal: payload.amountOriginal,
        gatewayFeeZar: payload.gatewayFeeZar,
        netAmountZar: payload.netAmountZar,
        authorRoyaltyZar: payload.authorRoyaltyZar,
        awiefShareZar: payload.awiefShareZar,
        billingMonth,
        status: "COMPLETED",
        paymentMethodDetail: payload.paymentDetail || `${payload.gateway} Gateway Settlement`,
      },
    });

    // Activate or refresh the enrollment
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId: payload.courseId,
        },
      },
      update: {
        lastAccess: new Date(),
      },
      create: {
        userId,
        courseId: payload.courseId,
        status: "IN_PROGRESS",
        progress: 0,
      },
    });

    return { success: true, redirectUrl: `/course/${payload.courseId}` };
  } catch (error: any) {
    console.error("Error processing course checkout:", error);
    return { success: false, error: error.message || "Failed to process course checkout." };
  }
}
