import {
  createExamService,
  getAllExamsService,
} from "../services/exam.service.js";

export const createExam = async (req, res, next) => {
  try {
    const exam = await createExamService({
      ...req.body,
      tenantId: req.user.tenantId,
    });

    res.status(201).json({
      success: true,
      message: "Exam created successfully",
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};
export const getAllExams = async (req, res, next) => {
  try {
    const exams = await getAllExamsService(req.user.tenantId);

    res.status(200).json({
      success: true,
      message: "Exams fetched successfully",
      data: exams,
      // Mandatory pagination object
      pagination: {
        total: exams.length,
        page: 1,
        limit: 10,
        pages: 1,
      },
    });
  } catch (error) {
    next(error);
  }
};
