import Joi from "joi";

export const createExamSchema = Joi.object({
  title: Joi.string().required(),
  subject: Joi.string().required(),
  duration: Joi.number().positive().required(),
  passMark: Joi.number().min(0).required(),
  // D. Attempt Rules
  attemptsAllowed: Joi.number().integer().min(1).required(),
  // B. Scheduling Validation
  startDate: Joi.date().required(),
  endDate: Joi.date().greater(Joi.ref("startDate")).required(),
  // C. Question Assignment
  randomQuestionCount: Joi.number().integer().min(0).optional(),
  instructions: Joi.string().optional(),
  description: Joi.string().optional(),
});
