import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/lib/notification-service";

/**
 * GET /api/notifications?unreadOnly=true&limit=50&offset=0
 * Récupérer les notifications de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    // Check session auth
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const notifications = await getUserNotifications(userId, {
      unreadOnly,
      limit,
      offset,
    });

    const unreadCount = await getUnreadCount(userId);

    return NextResponse.json({
      notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des notifications" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Marquer des notifications comme lues
 * Body: { notificationId?: string, markAll?: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check session auth
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      // Marquer toutes les notifications comme lues
      await markAllNotificationsAsRead(userId);
      return NextResponse.json({ success: true, message: "Toutes les notifications ont été marquées comme lues" });
    } else if (notificationId) {
      // Marquer une notification spécifique comme lue
      await markNotificationAsRead(notificationId, userId);
      return NextResponse.json({ success: true, message: "Notification marquée comme lue" });
    } else {
      return NextResponse.json(
        { error: "notificationId ou markAll requis" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications?id=xxx
 * Supprimer une notification
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check session auth
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");

    if (!notificationId) {
      return NextResponse.json(
        { error: "ID de notification requis" },
        { status: 400 }
      );
    }

    await deleteNotification(notificationId, userId);
    return NextResponse.json({ success: true, message: "Notification supprimée" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}
