import axiosInstance from "./axios";

export const getUsers = async (page = 1, limit = 20, search = "") => {
  const response = await axiosInstance.get("/api/v1/users", {
    params: { page, limit, search },
  });
  return response.data;
};

export const getPlans = async () => {
  const response = await axiosInstance.get("/api/v1/plans");
  return response.data;
};

export const grantSubscription = async (data) => {
  const response = await axiosInstance.post("/api/v1/subscriptions/admin/grant", data);
  return response.data;
};

export const revokeSubscription = async (subscriptionId) => {
  const response = await axiosInstance.put(`/api/v1/subscriptions/admin/revoke/${subscriptionId}`);
  return response.data;
};
