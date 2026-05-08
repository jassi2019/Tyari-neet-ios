import axiosInstance from "./axios";

export const getFeatureContents = async (featureType, params = {}) => {
  const response = await axiosInstance.get("/api/v1/feature-content", { params: { featureType, ...params } });
  return response.data;
};

export const createFeatureContent = async (data) => {
  const response = await axiosInstance.post("/api/v1/feature-content", data);
  return response.data;
};

export const updateFeatureContent = async (id, data) => {
  const response = await axiosInstance.put("/api/v1/feature-content/" + id, data);
  return response.data;
};

export const deleteFeatureContent = async (id) => {
  const response = await axiosInstance.delete("/api/v1/feature-content/" + id);
  return response.data;
};
