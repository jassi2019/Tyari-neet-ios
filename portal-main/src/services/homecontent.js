import axiosInstance from "./axios";

export const getHomeContents = async () => {
  const response = await axiosInstance.get("/api/v1/home-content/all");
  return response.data;
};

export const createHomeContent = async (payload) => {
  const response = await axiosInstance.post("/api/v1/home-content", payload);
  return response.data;
};

export const updateHomeContent = async (id, payload) => {
  const response = await axiosInstance.put(`/api/v1/home-content/${id}`, payload);
  return response.data;
};

export const deleteHomeContent = async (id) => {
  const response = await axiosInstance.delete(`/api/v1/home-content/${id}`);
  return response.data;
};
