/**
 * Application data — Groups (standards) and Behaviors. The roster comes from the API.
 */

export const GROUPS = {
  prof: {
    key: "prof",
    short: "PRO",
    label: "Professional standards",
    kicker: "How we work together",
    who: "Every person at CHAI, in every role and at every level.",
    desc: "The foundation for everyone at CHAI. Rates how a colleague acts with integrity, drives impact, stays curious, and works as one CHAI.",
    color: "#003E78"
  },
  mgr: {
    key: "mgr",
    short: "MGR",
    label: "Manager standards",
    kicker: "How we lead teams",
    who: "For those who lead and develop people.",
    desc: "Rates how people make decisions, build exceptional teams, lead across the matrix, and drive accountability.",
    color: "#117996"
  },
  lead: {
    key: "lead",
    short: "LEAD",
    label: "Leadership standards",
    kicker: "How we lead the organization",
    who: "For those who set direction and shape culture.",
    desc: "Rates how peopleset direction, inspire transformation, influence broadly, and shape culture.",
    color: "#2563EB"
  }
};

export const BEHAVIORS = [
  {
    id: "integrity", g: "prof", name: "Act with integrity",
    scenario: "You discover that a report already shared with a key stakeholder contains an error. Correcting it could make your team's performance look worse and raise difficult questions. Which colleague would you trust to raise the issue and make sure it's corrected, even if it's uncomfortable?",
    direct: "Who consistently does the right thing, even when it's inconvenient, and is willing to speak up when something isn't right?"
  },
  {
    id: "impact", g: "prof", name: "Drive impact",
    scenario: "Your team has been working on an activity for several months, but the work is producing very little progress toward the intended outcome. Which colleague would you turn to for help challenging the current approach and refocusing the team on what will make the biggest difference?",
    direct: "Who consistently keeps the focus on meaningful outcomes for the people and health systems CHAI serves?"
  },
  {
    id: "curious", g: "prof", name: "Be curious",
    scenario: "Your team receives data suggesting a program is performing very well, but something about the results doesn't add up. Which colleague would you approach to investigate further, ask the hard questions, and look for evidence before accepting the conclusion?",
    direct: "Who is most likely to challenge assumptions, ask questions others may have missed, and follow the evidence before reaching a conclusion?"
  },
  {
    id: "onechai", g: "prof", name: "Work as one CHAI",
    scenario: "You're working on a project that needs input from several CHAI teams, but each team is focused on its own priorities and communication has broken down. Which colleague would you turn to to bring the different teams together and find a way forward?",
    direct: "Who consistently builds relationships across teams, programs, and countries to get the best outcome for CHAI?"
  },
  {
    id: "decisions", g: "mgr", name: "Make decisions",
    scenario: "A project needs an important decision today, but you don't have all the information you'd ideally want. Waiting could delay implementation. Which colleague would you trust to assess what's available, make a sound decision, and take responsibility for the outcome?",
    direct: "Who can make thoughtful decisions when information is incomplete, and confidently take ownership of the call?"
  },
  {
    id: "teams", g: "mgr", name: "Build exceptional teams",
    scenario: "A colleague on your team is capable but has been struggling with a new responsibility. Rather than taking the work away from them, which colleague would you trust to coach them, give constructive feedback, and help them become more confident and capable?",
    direct: "Who consistently helps the people around them grow, develop, and become stronger colleagues?"
  },
  {
    id: "matrix", g: "mgr", name: "Lead across the matrix",
    scenario: "A project has stalled because several teams need to work together, but no single person has formal authority over everyone involved. You need someone who can bring the right people together, build alignment, and get the project moving again. Which colleague would you go to for support?",
    direct: "Who is particularly effective at building alignment and getting things moving across teams, even when they don't have formal authority?"
  },
  {
    id: "accountability", g: "mgr", name: "Drive accountability",
    scenario: "A team member repeatedly misses agreed deadlines, and it's starting to affect the rest of the project. Which colleague would you trust to address the issue directly, clarify expectations, and hold the person accountable while keeping the relationship constructive?",
    direct: "Who sets clear expectations and consistently follows through when commitments aren't met?"
  },
  {
    id: "direction", g: "lead", name: "Set direction",
    scenario: "Your team is working hard, but people have different ideas about what should be prioritized and why. Which colleague would you look to for clarity on where the team should focus and how the work connects to CHAI's bigger goal?",
    direct: "Who makes it clear where we are going, what matters most, and why it matters?"
  },
  {
    id: "transform", g: "lead", name: "Inspire transformation",
    scenario: "CHAI is introducing a major change to how a program operates. Some colleagues are comfortable with the current approach and hesitant about changing it. Which colleague would you trust to help people understand the reason for the change, build enthusiasm, and encourage others to embrace a new way of working?",
    direct: "Who inspires people to embrace change and rethink how work can be done, rather than simply adapting to change themselves?"
  },
  {
    id: "influence", g: "lead", name: "Influence broadly",
    scenario: "CHAI is trying to gain support for an important initiative. Different stakeholders have different priorities, and success depends on aligning government, partners, and funders. Which colleague would you trust to represent CHAI's position, understand different perspectives, and build support for the initiative?",
    direct: "Who is particularly effective at building relationships, influencing stakeholders, and communicating CHAI's value to governments, partners, and funders?"
  },
  {
    id: "culture", g: "lead", name: "Shape culture",
    scenario: "You join a meeting where there's pressure, disagreement, and uncertainty. One colleague consistently creates an environment where people feel respected, focused, and comfortable speaking openly. Who has that kind of influence on the culture around them?",
    direct: "Who consistently models the behaviors and attitudes that shape how others work together at CHAI?"
  }
];

// The roster used to live here as a static array. It has been removed: the
// directory is now the User table, served by GET /people, and a second copy in
// the frontend could only ever drift from it.
