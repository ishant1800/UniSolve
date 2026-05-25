/**
 * Modular schema-based validation middleware (no external dependencies).
 * @param {Object} schema Map of field names to validation rule configurations
 * @param {string} [source='body'] Source object inside the request: 'body' | 'query' | 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source] || {};
    const errors = {};

    Object.entries(schema).forEach(([field, rules]) => {
      const value = data[field];

      // 1. Required check
      if (rules.required && (value === undefined || value === null || String(value).trim() === '')) {
        errors[field] = `${field} is required`;
        return;
      }

      // If optional and not provided, skip rest of the rules
      if (!rules.required && (value === undefined || value === null || String(value).trim() === '')) {
        return;
      }

      const stringValue = String(value).trim();

      // 2. Minimum length check
      if (rules.minLength && stringValue.length < rules.minLength) {
        errors[field] = `${field} must be at least ${rules.minLength} characters`;
        return;
      }

      // 3. Maximum length check
      if (rules.maxLength && stringValue.length > rules.maxLength) {
        errors[field] = `${field} cannot exceed ${rules.maxLength} characters`;
        return;
      }

      // 4. Email check
      if (rules.isEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(stringValue)) {
          errors[field] = 'Please provide a valid email address';
          return;
        }
      }

      // 5. Strong Password check
      if (rules.isStrongPassword) {
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(stringValue)) {
          errors[field] = 'Password must be at least 8 characters and contain both letters and numbers';
          return;
        }
      }

      // 6. Enum range check
      if (rules.enum && !rules.enum.includes(value)) {
        errors[field] = `Invalid value for ${field}. Allowed options: ${rules.enum.join(', ')}`;
        return;
      }
    });

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: 'Request validation failed',
        errors,
      });
    }

    next();
  };
};

module.exports = validate;
