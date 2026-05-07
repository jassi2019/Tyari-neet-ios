import axiosInstance from "./axios";

export const getUsers = async (page = 1, limit = 20, search = "") => {
  const response = await axiosInstance.get("/api/v1/users", {
    params: { page, limit, search },
  });
  return response.data;
};
