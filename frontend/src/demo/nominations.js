/**
 * Seeded recognition — nineteen nominations in fifteen submissions, spread over
 * the current month and the two before it.
 *
 * Every constraint the real service enforces is respected here, because a
 * fixture that violates one shows the reviewer a state the system cannot
 * actually produce:
 *
 *   - at most two nominations per (nominator, nominee, period) — the cap in
 *     `MAX_PER_NOMINEE_PER_PERIOD`;
 *   - every story between 10 and 40 words — `MIN_COMMENT_WORDS` and
 *     `MAX_COMMENT_WORDS`;
 *   - each behaviour belongs to the group implied by the nominee's level, since
 *     the recognise screen derives the available behaviours that way, and a
 *     Staff member recognised for a leadership behaviour would be unreachable
 *     through the form;
 *   - nobody who is not nominatable appears as a nominee.
 *
 * The distribution is chosen rather than arbitrary. One person has four
 * nominations from three different colleagues, which is the only way to see the
 * behaviour-visibility threshold of three do anything. Six people have given
 * nothing, so the tracker's "Never submitted" list is populated. Three gave
 * recognition in an earlier month but not this one, which is the "Quiet this
 * period" case — the distinction the tracker exists to draw. And all twelve
 * behaviours appear at least once, so the bubble chart has a shape rather than a
 * flat ring.
 */

import { monthsAgoAt, periodKeyFor } from './period'

/**
 * Submissions, each becoming one `submissionId` with one or more entries.
 *
 * Written as submissions rather than flat nominations because that is the unit a
 * person actually creates — recognising one colleague for two behaviours is one
 * sitting and two stories, and the tracker counts those separately.
 */
const SEED_SUBMISSIONS = [
  {
    from: 'u01', to: 'u03', monthsAgo: 0, day: 2,
    entries: [
      ['teams', 'Farai spent three afternoons coaching me through my first district budget rather than taking it over, and the version I submitted was genuinely mine.'],
      ['accountability', 'When our reporting slipped two weeks running, Farai raised it directly with the team, agreed new dates with us, and then actually checked them.']
    ]
  },
  {
    from: 'u05', to: 'u03', monthsAgo: 0, day: 1,
    entries: [
      ['matrix', 'Farai got the malaria and HIV teams into one room after a month of email, and left with a plan both sides had signed up to.']
    ]
  },
  {
    from: 'u02', to: 'u03', monthsAgo: 1, day: 18,
    entries: [
      ['decisions', 'The survey data was incomplete and the deadline was that afternoon. Farai made the call, wrote down why, and owned it when it needed revisiting.']
    ]
  },
  {
    from: 'u03', to: 'u01', monthsAgo: 0, day: 1,
    entries: [
      ['integrity', 'Tendai found an error in a dashboard we had already shared with the ministry, and raised it the same morning rather than waiting to be asked.'],
      ['onechai', 'Tendai rewrote our data request so the Malaria team could reuse it, which saved them a week of work nobody would have known to credit.']
    ]
  },
  {
    from: 'u07', to: 'u02', monthsAgo: 0, day: 2,
    entries: [
      ['curious', 'Rudo noticed the coverage numbers looked too good, went back to the source records, and found a double-counting problem the rest of us had accepted.']
    ]
  },
  {
    from: 'u09', to: 'u05', monthsAgo: 0, day: 1,
    entries: [
      ['decisions', 'Takudzwa chose between two suppliers with half the information we wanted, documented the reasoning clearly, and the decision has held up since.']
    ]
  },
  {
    from: 'u01', to: 'u07', monthsAgo: 1, day: 9,
    entries: [
      ['culture', 'In a tense review meeting, Simbarashe made space for the two quietest people to speak, and the actual problem only surfaced because of that.'],
      ['transform', 'Simbarashe got a sceptical team genuinely interested in the new reporting approach by explaining what it would fix, not by announcing that it was happening.']
    ]
  },
  {
    from: 'u06', to: 'u01', monthsAgo: 1, day: 22,
    entries: [
      ['impact', 'Tendai pushed us to drop two indicators nobody used and spend the time on the stockout analysis instead, which is what the districts actually needed.']
    ]
  },
  {
    from: 'u10', to: 'u09', monthsAgo: 2, day: 14,
    entries: [
      ['accountability', 'Blessing set clear delivery dates with the supplier and followed up every week, which is the only reason the consignment arrived before the campaign.']
    ]
  },
  {
    from: 'u02', to: 'u13', monthsAgo: 2, day: 7,
    entries: [
      ['influence', 'Ngonidzashe presented our financing case to three ministry directors who each wanted something different, and came away with support from all of them.']
    ]
  },
  {
    from: 'u16', to: 'u02', monthsAgo: 0, day: 2,
    entries: [
      ['onechai', 'Rudo volunteered to walk the operations team through the new data tool, well outside any job description, and stayed until everyone could actually use it.']
    ]
  },
  {
    from: 'u05', to: 'u10', monthsAgo: 1, day: 11,
    entries: [
      ['curious', 'Kudakwashe asked why we had always calculated the denominator that way, and it turned out nobody knew. The method changed because of that question.'],
      ['integrity', 'Kudakwashe told me plainly that my analysis would not support the conclusion I wanted, which was not a comfortable conversation to start.']
    ]
  },
  {
    from: 'u09', to: 'u06', monthsAgo: 2, day: 19,
    entries: [
      ['impact', 'Nomsa reorganised the commodity tracker so district teams could read it without training, and the number of queries we get each month dropped sharply.']
    ]
  },
  {
    from: 'u14', to: 'u01', monthsAgo: 0, day: 1,
    entries: [
      ['integrity', 'Tendai raised a procurement concern with me directly, knowing it would be awkward and that nobody else was going to say anything about it.']
    ]
  },
  {
    from: 'u03', to: 'u13', monthsAgo: 1, day: 5,
    entries: [
      ['direction', 'Ngonidzashe cut our twelve priorities down to three and explained how each one connected to the country strategy, so the team finally knew what mattered.']
    ]
  }
]

/**
 * The seed flattened into nomination rows.
 *
 * One row per behaviour, shaped like the database row rather than like the
 * response: `{ nominatorId, nomineeId, behaviorId, story, periodKey }`. The
 * visibility rules and the cap are both expressed over rows, and regrouping into
 * submissions is a presentation step that happens later — the same split the
 * backend makes between `Nomination` and `toFrontendFeedback`.
 */
export function seedNominations() {
  const rows = []

  SEED_SUBMISSIONS.forEach((submission, i) => {
    const submissionId = `seed_sub_${String(i + 1).padStart(2, '0')}`
    const createdAt = monthsAgoAt(submission.monthsAgo, submission.day)
    const periodKey = periodKeyFor(new Date(createdAt))

    submission.entries.forEach(([behaviorId, story], j) => {
      rows.push({
        id: `${submissionId}_${j + 1}`,
        submissionId,
        nominatorId: submission.from,
        nomineeId: submission.to,
        behaviorId,
        story,
        // Each entry a minute apart, so a submission has a stable internal order
        // instead of all its rows sharing one timestamp.
        createdAt: createdAt + j * 60000,
        periodKey
      })
    })
  })

  return rows
}
