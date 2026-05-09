import axiosInstance from "./axios";

export const getAllNotifications = async () => {
  const response = await axiosInstance.get("/api/v1/notifications/all");
  return response.data;
};

export const createNotification = async (data) => {
  const response = await axiosInstance.post("/api/v1/notifications", data);
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await axiosInstance.delete("/api/v1/notifications/" + id);
  return response.data;
};
