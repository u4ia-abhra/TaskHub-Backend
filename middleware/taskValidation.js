const { check, validationResult } = require("express-validator");

allowedCategories = [
      "assignment",
      "lab file",
      "workshop file",
      "presentation slide",
      "other",
    ];

const validateTaskInput = [
  check("title")
    .notEmpty()
    .withMessage("Title is required."),
  check("description")
    .notEmpty()
    .withMessage("Description is required."),
  check("category")
    .notEmpty()
    .withMessage("Category is required.")
    .isIn(allowedCategories)
    .withMessage("Invalid category."),
  check("deadline")
    .notEmpty()
    .withMessage("Deadline is required.")
    .isISO8601()
    .withMessage("Deadline must be a valid date (YYYY-MM-DD format).")
    .toDate(),
  check("budget")
    .notEmpty()
    .withMessage("Budget is required.")
    .isFloat({ gt: 10 })
    .withMessage("Budget must be at least 10."),

  // Middleware to catch validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next(); // If no errors, proceed to the next middleware/route handler
  },
];

const validateTaskUpdate = [
  check("title")
    .notEmpty()
    .withMessage("Title is required."),
  check("description")
    .notEmpty()
    .withMessage("Description is required."),
  check("category")
    .notEmpty()
    .withMessage("Category is required.")
    .isIn(allowedCategories)
    .withMessage("Invalid category."),
  check("deadline")
    .notEmpty()
    .withMessage("Deadline is required.")
    .isISO8601()
    .withMessage("Deadline must be a valid date (YYYY-MM-DD format).")
    .toDate(),
  check("budget")
    .notEmpty()
    .withMessage("Budget is required.")
    .isFloat({ gt: 10 })
    .withMessage("Budget must be at least 10."),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = {
  validateTaskInput,
  validateTaskUpdate,
};