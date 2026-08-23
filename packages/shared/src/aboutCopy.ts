/** Verbatim client copy for /about — do not paraphrase. */

export const ABOUT_BIO_PARAGRAPHS = [
  "With over 15 years of experience in real estate, Jignesh has built an accomplished career spanning commercial, residential and off-the-plan property, with more than 700 successful property transactions completed throughout his career.",
  "Based in Melbourne, Jignesh brings extensive expertise across sales, leasing, investment and development, supported by a strong understanding of Melbourne's diverse property market and its evolving commercial landscape.",
  "His experience extends beyond Australia, with involvement in property transactions and opportunities across Singapore, India, Malaysia, China and Australia, giving him a broad perspective on local and international property markets.",
  "Jignesh works closely with property owners, investors, developers, buyers and businesses, providing practical market insight, strategic advice and a highly personalised approach. From the initial appraisal and campaign strategy through to negotiation and completion, his focus is on developing the right strategy to achieve the best possible outcome.",
] as const;

export const ABOUT_PHILOSOPHY =
  "Understand the property. Understand the client. Create the right strategy. Deliver the right outcome.";

export const ABOUT_POST_PHILOSOPHY =
  "With a proven track record and a relationship-driven approach, Jignesh is committed to creating long-term value for his clients, rather than simply completing a transaction.";

export const ABOUT_SELECTED_EXPERIENCE_LABEL = "Selected Sales & Leasing Experience:";

export const ABOUT_SELECTED_EXPERIENCE = [
  "Heidelberg Heights",
  "Ringwood",
  "Reservoir",
  "Williamstown North",
  "Fraser Rise",
] as const;

export const ABOUT_CLOSING_LINE =
  "One experienced desk. Hundreds of transactions. One strategy tailored to every property.";

/** One-line homepage agent teaser — full story lives on /about. */
export const ABOUT_HOME_TEASER = ABOUT_CLOSING_LINE;

export const ABOUT_WHY_HEADING = "Why We're the Choice for a Straight Deal in the West";

export const ABOUT_WHY_SUBHEADING = "Local Knowledge. Straight Advice. One Desk.";

export const ABOUT_WHY_INTRO =
  "Occupiers and investors choose us for corridor knowledge — not marketing noise. We understand what actually trades across Melbourne's west and price assets against the market, not a brochure.";

export const ABOUT_WHY_CARDS = [
  {
    title: "Spec-First Advice",
    description: "Span, power, access, doors and hardstand — before suburb talk.",
  },
  {
    title: "Real Market Evidence",
    description: "Pricing grounded in actual west-side transactions, not CBD benchmarks.",
  },
  {
    title: "One Desk. End to End.",
    description:
      "From first enquiry through negotiation to settlement, one experienced team stays across the deal.",
  },
] as const;

export const ABOUT_WHY_CLOSING = "Know the asset. Know the corridor. Do the deal properly.";

/** Full bio string for Mongo/fixture agent.bio field. */
export const ABOUT_FULL_BIO = [
  ...ABOUT_BIO_PARAGRAPHS,
  `His philosophy is simple: ${ABOUT_PHILOSOPHY}`,
  ABOUT_POST_PHILOSOPHY,
].join(" ");
