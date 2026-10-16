import adminClient from "./adminClient";

export const login = ({ email, password }) =>
  adminClient.post("/admin/auth/login", { email, password });

export const fetchMe = () => adminClient.get("/admin/auth/me");

export const fetchAdminStats = ({ signal } = {}) =>
  adminClient.get("/admin/stats", { signal });

export const fetchAdminDashboard = ({ signal } = {}) =>
  adminClient.get("/admin/dashboard", { signal });
