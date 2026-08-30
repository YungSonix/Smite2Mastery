import HostShell from '../components/HostShell';

const STEPS = [
  {
    title: 'Create a quiz',
    body: 'Home → Create +. Rename with the pencil next to the title (top bar or quiz cover). Upload a banner if you want cover art.',
  },
  {
    title: 'Add questions',
    body: 'Use + / Add Item for Multiple Choice, Short Answer, Image, Audio, Matching, and the rest. Everything here is free for you and helpers.',
  },
  {
    title: 'Student instructions',
    body: 'Under the quiz cover, write Instructions for players. They see that text on the take page before answering.',
  },
  {
    title: 'Identity fields',
    body: 'New quizzes include Discord Username and In-Game Name gates automatically. Guests fill these on the take page (not scored).',
  },
  {
    title: 'Assign / share',
    body: 'Click Assign, copy the take link, and send it to players. Only people with the link can submit.',
  },
  {
    title: 'Assign settings',
    body: 'Assign opens share link plus grading options: hide scores from players (default), attempts, and feedback. Scores stay visible to you in Responses. Per question: open Settings → Don’t show score to hide that item’s points on the take page.',
  },
  {
    title: 'Question versions',
    body: 'On a scored question, use Add version for up to 10 alternates (A plus extras). Each new take gets a different version when more than one exists, so sharing answers mid-contest is harder. Keep difficulty fair across versions.',
  },
  {
    title: 'Guest progress',
    body: 'If a guest closes the tab, reopening the same link on that browser restores Discord, In-Game Name, and answers until they submit.',
  },
  {
    title: 'Watch Responses',
    body: 'Open the Responses tab for Discord, In-Game Name, scores, and IP Address. Guests never see this screen. Local testing shows IP as localhost (::1). Export Excel/CSV downloads a spreadsheet; live data stays in the API/database.',
  },
  {
    title: 'Repo media vs database',
    body: 'Portraits and audio can come from the GitHub app/data folder. Supabase only stores submissions. Seed the Discord contest with npm run trivia:community (API running).',
  },
  {
    title: 'Analytics',
    body: 'Top nav → Analytics for score distribution, hardest questions, submission trends, and IPs with multiple Discord names.',
  },
  {
    title: 'Helpers',
    body: 'Share the host login (username + TRIVIA_HOST_SECRET). Optional allowlist locks who can sign in. No paid tier.',
  },
];

export default function Instructions() {
  return (
    <HostShell active="instructions">
      <div className="f-welcome-row">
        <div>
          <p className="f-kicker">Host guide</p>
          <h1>Instructions</h1>
        </div>
      </div>
      <p className="f-lede">
        Private contest host for you and a few helpers. Players only get the take link, never the
        editor, Responses, Analytics, or IP data.
      </p>
      <ol className="f-steps">
        {STEPS.map((step, i) => (
          <li key={step.title} className="f-step-card">
            <span className="f-step-num">{i + 1}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="f-callout">
        <h3>Privacy note (host only)</h3>
        <p>
          IP is stored silently for integrity and shown only here. Do not mention IP on the take
          page. Public disclosure stays in the Smite Scroll privacy policy.
        </p>
      </div>
    </HostShell>
  );
}
