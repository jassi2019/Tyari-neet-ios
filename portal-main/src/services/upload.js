import axiosInstance from "./axios";

export const uploadPDF = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosInstance.post("/api/v1/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteUpload = async (filename) => {
  const response = await axiosInstance.delete(`/api/v1/uploads/${filename}`);
  return response.data;
};
