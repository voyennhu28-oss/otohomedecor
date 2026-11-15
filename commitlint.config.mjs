export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [2, "always", ["backend", "frontend", "root"]],
    "scope-empty": [2, "never"],
  },
};
