import axiosInstance from "./axios";

export const getQuestions = async (params = {}) => {
  const response = await axiosInstance.get("/api/v1/questions", { params });
  return response.data;
};

export const getQuestion = async (questionId) => {
  const response = await axiosInstance.get(`/api/v1/questions/${questionId}`);
  return response.data;
};

export const createQuestion = async (payload) => {
  const response = await axiosInstance.post("/api/v1/questions", payload);
  return response.data;
};

export const updateQuestion = async (questionId, payload) => {
  const response = await axiosInstance.put(
    `/api/v1/questions/${questionId}`,
    payload
  );
  return response.data;
};

export const deleteQuestion = async (questionId) => {
  const response = await axiosInstance.delete(
    `/api/v1/questions/${questionId}`
  );
  return response.data;
};
