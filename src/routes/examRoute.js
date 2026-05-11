import express from "express";
import { createExam, getAllExams } from "../controllers/exam.controller.js";
import { validate } from "../middlewares/validate.js"; // Assume this helper exists [cite: 27]
import { createExamSchema } from "../validations/exam.validation.js";

const router = express.Router();

// Apply validation here [cite: 24]
router.post("/", validate(createExamSchema), createExam);
router.get("/", getAllExams);

export default router;
