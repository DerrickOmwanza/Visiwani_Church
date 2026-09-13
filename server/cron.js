const cron = require('node-cron');
const { generateQuarterToDisk } = require('./routes/reports');

const QUARTER_END_MONTH_DAY = {
  1: { month: 3, day: 31 },
  2: { month: 6, day: 30 },
  3: { month: 9, day: 30 },
  4: { month: 12, day: 31 },
};

// Runs once a day just after midnight. If yesterday was the last day of a
// quarter, the quarter's report set is generated automatically and saved
// under data/reports/generated - the treasurer can download it from the
// Reports page any time, with no manual step required.
function start() {
  cron.schedule('5 0 * * *', async () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    for (const [quarter, { month, day }] of Object.entries(QUARTER_END_MONTH_DAY)) {
      if (yesterday.getMonth() + 1 === month && yesterday.getDate() === day) {
        try {
          await generateQuarterToDisk(yesterday.getFullYear(), Number(quarter));
          console.log(`Auto-generated Q${quarter} ${yesterday.getFullYear()} report.`);
        } catch (err) {
          console.error('Scheduled quarterly report generation failed:', err);
        }
      }
    }
  });
}

module.exports = { start };
