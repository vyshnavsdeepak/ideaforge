import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/shared/services/prisma';
import { checkCostThresholds } from '@/ai';

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const alertType = searchParams.get('alertType'); // daily, weekly, monthly, threshold

    // Build where clause
    const whereClause: {
      isActive?: boolean;
      alertType?: string;
    } = {};
    if (activeOnly) {
      whereClause.isActive = true;
    }
    if (alertType) {
      whereClause.alertType = alertType;
    }

    // Get cost alerts
    const alerts = await prisma.aICostAlert.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Check current status for each alert
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alertsWithStatus = await Promise.all(
      alerts.map(async (alert) => {
        let currentValue = 0;
        let isCurrentlyTriggered = false;

        if (alert.alertType === 'daily') {
          const thresholdCheck = await checkCostThresholds(today);
          currentValue = thresholdCheck.dailyCost;
          isCurrentlyTriggered = thresholdCheck.exceeded && thresholdCheck.threshold === alert.threshold;
        } else if (alert.alertType === 'weekly') {
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          const weeklyUsage = await prisma.aIDailyUsage.findMany({
            where: {
              date: {
                gte: weekAgo,
                lte: today,
              },
            },
          });
          currentValue = weeklyUsage.reduce((sum, day) => sum + day.totalCost, 0);
          isCurrentlyTriggered = currentValue >= alert.threshold;
        } else if (alert.alertType === 'monthly') {
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          const monthlyUsage = await prisma.aIDailyUsage.findMany({
            where: {
              date: {
                gte: monthAgo,
                lte: today,
              },
            },
          });
          currentValue = monthlyUsage.reduce((sum, day) => sum + day.totalCost, 0);
          isCurrentlyTriggered = currentValue >= alert.threshold;
        }

        return {
          ...alert,
          currentValue: Math.round(currentValue * 1000000) / 1000000,
          isCurrentlyTriggered,
          percentageUsed: alert.threshold > 0 ? Math.round((currentValue / alert.threshold) * 100) : 0,
          lastTriggered: alert.lastTriggered?.toISOString() || null,
          createdAt: alert.createdAt.toISOString(),
          updatedAt: alert.updatedAt.toISOString(),
        };
      })
    );

    // Get recent triggered alerts
    const recentTriggeredAlerts = await prisma.aICostAlert.findMany({
      where: {
        lastTriggered: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      orderBy: {
        lastTriggered: 'desc',
      },
      take: 10,
    });

    const response = {
      alerts: alertsWithStatus,
      recentTriggered: recentTriggeredAlerts.map(alert => ({
        id: alert.id,
        alertType: alert.alertType,
        threshold: alert.threshold,
        description: alert.description,
        lastTriggered: alert.lastTriggered?.toISOString(),
        triggerCount: alert.triggerCount,
      })),
      summary: {
        totalAlerts: alerts.length,
        activeAlerts: alerts.filter(a => a.isActive).length,
        currentlyTriggered: alertsWithStatus.filter(a => a.isCurrentlyTriggered).length,
        totalTriggers: alerts.reduce((sum, alert) => sum + alert.triggerCount, 0),
      },
      filters: {
        activeOnly,
        alertType,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Failed to get cost alerts:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get cost alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      alertType,
      threshold,
      period,
      description,
      emailNotification = true,
      slackNotification = false,
      isActive = true,
    } = body;

    // Validate required fields
    if (!alertType || !threshold || !description) {
      return NextResponse.json(
        { error: 'alertType, threshold, and description are required' },
        { status: 400 }
      );
    }

    // Validate alert type
    if (!['daily', 'weekly', 'monthly', 'threshold'].includes(alertType)) {
      return NextResponse.json(
        { error: 'alertType must be one of: daily, weekly, monthly, threshold' },
        { status: 400 }
      );
    }

    // Validate threshold
    if (typeof threshold !== 'number' || threshold <= 0) {
      return NextResponse.json(
        { error: 'threshold must be a positive number' },
        { status: 400 }
      );
    }

    // Create the alert
    const alert = await prisma.aICostAlert.create({
      data: {
        alertType,
        threshold,
        period: period || alertType,
        description,
        emailNotification,
        slackNotification,
        isActive,
      },
    });

    console.log(`[API] Created cost alert: ${alertType} threshold $${threshold}`);

    return NextResponse.json({
      success: true,
      message: 'Cost alert created successfully',
      alert: {
        id: alert.id,
        alertType: alert.alertType,
        threshold: alert.threshold,
        period: alert.period,
        description: alert.description,
        emailNotification: alert.emailNotification,
        slackNotification: alert.slackNotification,
        isActive: alert.isActive,
        createdAt: alert.createdAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Failed to create cost alert:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create cost alert',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      alertType,
      threshold,
      period,
      description,
      emailNotification,
      slackNotification,
      isActive,
    } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: {
      alertType?: string;
      threshold?: number;
      period?: string;
      description?: string;
      emailNotification?: boolean;
      slackNotification?: boolean;
      isActive?: boolean;
    } = {};
    if (alertType !== undefined) {
      if (!['daily', 'weekly', 'monthly', 'threshold'].includes(alertType)) {
        return NextResponse.json(
          { error: 'alertType must be one of: daily, weekly, monthly, threshold' },
          { status: 400 }
        );
      }
      updateData.alertType = alertType;
    }
    if (threshold !== undefined) {
      if (typeof threshold !== 'number' || threshold <= 0) {
        return NextResponse.json(
          { error: 'threshold must be a positive number' },
          { status: 400 }
        );
      }
      updateData.threshold = threshold;
    }
    if (period !== undefined) updateData.period = period;
    if (description !== undefined) updateData.description = description;
    if (emailNotification !== undefined) updateData.emailNotification = emailNotification;
    if (slackNotification !== undefined) updateData.slackNotification = slackNotification;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update the alert
    const alert = await prisma.aICostAlert.update({
      where: { id },
      data: updateData,
    });

    console.log(`[API] Updated cost alert: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Cost alert updated successfully',
      alert: {
        id: alert.id,
        alertType: alert.alertType,
        threshold: alert.threshold,
        period: alert.period,
        description: alert.description,
        emailNotification: alert.emailNotification,
        slackNotification: alert.slackNotification,
        isActive: alert.isActive,
        updatedAt: alert.updatedAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Failed to update cost alert:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update cost alert',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      );
    }

    // Delete the alert
    await prisma.aICostAlert.delete({
      where: { id },
    });

    console.log(`[API] Deleted cost alert: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Cost alert deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Failed to delete cost alert:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete cost alert',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}