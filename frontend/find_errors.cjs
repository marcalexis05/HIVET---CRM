const { ESLint } = require("eslint");
(async function main() {
  const eslint = new ESLint();
  const results = await eslint.lintFiles(["src/pages/dashboard/BusinessDashboard.tsx"]);
  const errors = results.filter(r => r.errorCount > 0 || r.warningCount > 0);
  errors.forEach(r => {
    console.log(r.filePath);
    r.messages.forEach(m => console.log(`  Line ${m.line}: ${m.message} (${m.ruleId})`));
  });
})().catch(console.error);
