/* TradeFlow Realtime Socket Server */

function initSocketServer(io) {
  io.on("connection", (socket) => {
    console.log("🟢 Realtime user connected:", socket.id);

    socket.on("join-workspace", (data = {}) => {
      const workspaceId = data.workspaceId || "global";
      const email = data.email || "user@tradeflow.local";

      socket.join(workspaceId);

      io.to(workspaceId).emit("tradeflow-live-event", {
        type: "presence",
        title: "User Joined Workspace",
        message: `${email} joined workspace`,
        workspaceId,
        email,
        time: new Date().toISOString()
      });
    });

    socket.on("crm-updated", (data = {}) => {
      const workspaceId = data.workspaceId || "global";

      io.to(workspaceId).emit("tradeflow-live-event", {
        type: "crm",
        title: "CRM Updated",
        message: data.message || "A CRM record was updated",
        data,
        time: new Date().toISOString()
      });
    });

    socket.on("supplier-updated", (data = {}) => {
      const workspaceId = data.workspaceId || "global";

      io.to(workspaceId).emit("tradeflow-live-event", {
        type: "supplier",
        title: "Supplier Updated",
        message: data.message || "Supplier intelligence changed",
        data,
        time: new Date().toISOString()
      });
    });

    socket.on("task-created", (data = {}) => {
      const workspaceId = data.workspaceId || "global";

      io.to(workspaceId).emit("tradeflow-live-event", {
        type: "task",
        title: "New Task Created",
        message: data.message || "A new task was created",
        data,
        time: new Date().toISOString()
      });
    });

    socket.on("ai-workflow-completed", (data = {}) => {
      const workspaceId = data.workspaceId || "global";

      io.to(workspaceId).emit("tradeflow-live-event", {
        type: "ai",
        title: "AI Workflow Completed",
        message: data.message || "Autonomous AI workflow completed",
        data,
        time: new Date().toISOString()
      });
    });

    socket.on("notification-created", (data = {}) => {
      const workspaceId = data.workspaceId || "global";

      io.to(workspaceId).emit("tradeflow-live-event", {
        type: "notification",
        title: "New Notification",
        message: data.message || "New notification received",
        data,
        time: new Date().toISOString()
      });
    });

    socket.on("disconnect", () => {
      console.log("🔴 Realtime user disconnected:", socket.id);
    });
  });
}

module.exports = {
  initSocketServer
};