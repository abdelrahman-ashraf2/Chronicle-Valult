import { body } from "express-validator";

export const loginValidators = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required.")
    .isLength({ max: 50 })
    .withMessage("Username must be 50 characters or fewer."),
  body("password")
    .notEmpty()
    .withMessage("Password is required.")
];
