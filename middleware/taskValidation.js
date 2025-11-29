const { check, validationResult } = require("express-validator");

const validateTaskInput = [
  check("title")
    .notEmpty()
    .withMessage("Title is required.")
    .isLength({ min: 1 })
    .withMessage("Title must be at least 3 characters long."),
  check("description")
    .notEmpty()
    .withMessage("Description is required.")
    .isLength({ min: 1 })
    .withMessage("Description must be at least 10 characters long."),
  check("category")
    .notEmpty()
    .withMessage("Category is required.")
    .isIn([
      "assignment",
      "lab file",
      "workshop file",
      "presentation slide",
      "other",
    ])
    .withMessage("Invalid category."),
  check("deadline")
    .notEmpty()
    .withMessage("Deadline is required.")
    .isISO8601()
    .toDate()
    .withMessage("Deadline must be a valid date (YYYY-MM-DD format)."),
  check("budget")
    .notEmpty()
    .withMessage("Budget is required.")
    .isFloat({ gt: 0 })
    .withMessage("Budget must be a positive number."),

  // Middleware to catch validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next(); // If no errors, proceed to the next middleware/route handler
  },
];

module.exports = { validateTaskInput };
