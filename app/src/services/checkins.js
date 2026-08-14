const { pool } = require("../db");
const { fail } = require("../http");
const { checkinWindows, checkinWindowDays, cohortMinContributors } = require("../config");

/* One or two plain sentences about the window, because a chart answers "what
 * were the numbers" but not "did anything change". Kept factual: no advice, no
 * clinical interpretation. */
function buildInsight({ recordedDays, average, previousAverage, deviation, pemDays, windowDays }) {
  if (recordedDays < 5) {
    return [`記録が${recordedDays}日ぶんしかないため、傾向はまだ判断できません。`];
  }

  const sentences = [];
  const delta = previousAverage === null ? null : Number((average - previousAverage).toFixed(1));

  if (delta === null) {
    sentences.push(`この${windowDays}日の体調は平均${average}でした。比較できる前の期間がまだありません。`);
  } else if (Math.abs(delta) < 0.2) {
    sentences.push(`この${windowDays}日の体調は、前の${windowDays}日と大きく変わっていません。`);
  } else if (delta > 0) {
    sentences.push(`この${windowDays}日の体調は、前の${windowDays}日より平均${Math.abs(delta)}ぶん良い状態でした。`);
  } else {
    sentences.push(`この${windowDays}日の体調は、前の${windowDays}日より平均${Math.abs(delta)}ぶん低い状態でした。`);
  }

  if (deviation !== null) {
    if (deviation < 0.6) sentences.push("日ごとの差は小さく、落ち着いています。");
    else if (deviation < 1.1) sentences.push("日によって多少の波があります。");
    else sentences.push("日によって差が大きい状態です。");
  }

  if (pemDays > 0) {
    sentences.push(`動いた後の悪化は${pemDays}日ありました。`);
  }

  return sentences;
}

async function getCheckinBoard(userId, windowDays = checkinWindowDays) {
  const series = await pool.query(
    `select g.day::date as day,
            c.condition_level,
            c.fatigue_level,
            c.sleep_level,
            c.post_exertional_malaise,
            c.note
       from generate_series(current_date - ($2::int - 1), current_date, interval '1 day') as g(day)
       left join daily_checkins c
         on c.user_id = $1
        and c.recorded_on = g.day::date
      order by g.day`,
    [userId, windowDays]
  );

  const summary = await pool.query(
    `select count(*) filter (where recorded_on > current_date - $2::int) as recorded_days,
            avg(condition_level) filter (where recorded_on > current_date - $2::int) as current_average,
            stddev_samp(condition_level) filter (where recorded_on > current_date - $2::int) as deviation,
            count(*) filter (
              where recorded_on > current_date - $2::int and post_exertional_malaise
            ) as pem_days,
            avg(condition_level) filter (
              where recorded_on > current_date - ($2::int * 2)
                and recorded_on <= current_date - $2::int
            ) as previous_average,
            count(*) filter (
              where recorded_on > current_date - ($2::int * 2)
                and recorded_on <= current_date - $2::int
            ) as previous_recorded_days
       from daily_checkins
      where user_id = $1`,
    [userId, windowDays]
  );

  const cohort = await pool.query(
    `select d.name as disease,
            count(distinct c.user_id)::int as contributors,
            avg(c.condition_level) as average
       from daily_checkins c
       join lateral (
         select disease_id from user_conditions
          where user_id = c.user_id
          order by updated_at desc
          limit 1
       ) uc on true
       join diseases d on d.id = uc.disease_id
      where c.recorded_on > current_date - $2::int
        and uc.disease_id = (
          select disease_id from user_conditions
           where user_id = $1
           order by updated_at desc
           limit 1
        )
      group by d.name`,
    [userId, windowDays]
  );

  const days = series.rows.map((row) => ({
    date: row.day.toISOString().slice(0, 10),
    conditionLevel: row.condition_level,
    fatigueLevel: row.fatigue_level,
    sleepLevel: row.sleep_level,
    pem: row.post_exertional_malaise,
    note: row.note
  }));

  // A day still open does not break a run, so the count does not drop to zero
  // simply because today has not been filled in yet.
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].conditionLevel !== null) streak += 1;
    else if (index !== days.length - 1) break;
  }

  const row = summary.rows[0];
  const cohortRow = cohort.rows[0];
  const toAverage = (value) => (value === null || value === undefined ? null : Number(Number(value).toFixed(2)));

  const recordedDays = Number(row.recorded_days);
  const average = toAverage(row.current_average);
  // Comparing against a handful of days in the previous window would read as a
  // trend when it is noise, so it is withheld below a third of the window.
  const previousRecordedDays = Number(row.previous_recorded_days);
  const previousAverage =
    previousRecordedDays >= windowDays / 3 ? toAverage(row.previous_average) : null;
  const deviation = toAverage(row.deviation);
  const pemDays = Number(row.pem_days);

  return {
    windowDays,
    windowOptions: checkinWindows,
    today: days[days.length - 1].conditionLevel === null ? null : days[days.length - 1],
    days,
    summary: {
      recordedDays,
      average,
      previousAverage,
      deviation,
      pemDays,
      streak
    },
    insight: buildInsight({ recordedDays, average, previousAverage, deviation, pemDays, windowDays }),
    cohort: cohortRow
      ? {
          disease: cohortRow.disease,
          contributors: cohortRow.contributors,
          minContributors: cohortMinContributors,
          average: cohortRow.contributors >= cohortMinContributors ? toAverage(cohortRow.average) : null
        }
      : null
  };
}

function requireWindow(value) {
  if (value === undefined || value === "") return checkinWindowDays;
  const days = Number(value);
  if (!checkinWindows.includes(days)) {
    throw fail(400, "invalid_window", `days must be one of ${checkinWindows.join(", ")}`);
  }
  return days;
}

module.exports = { buildInsight, getCheckinBoard, requireWindow };
