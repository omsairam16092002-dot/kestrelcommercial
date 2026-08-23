/** Verbatim client copy for /services feature sections — do not paraphrase. */

export type ServiceFeatureCopy = {
  title: string;
  tagline: string;
  intro?: string;
  bullets: { title: string; description: string }[];
  standaloneParagraph?: string;
  /** Client did not provide a closing line for Selling — do not invent one. */
  closingLine?: string;
};

export const SERVICES_FEATURE_COPY: ServiceFeatureCopy[] = [
  {
    title: "Selling",
    tagline: "Private Treaty or EOI",
    intro: "The method that suits the asset — not the one that simply fills a Saturday.",
    bullets: [
      {
        title: "Market Appraisal",
        description: "A considered assessment of the property, market position and opportunity.",
      },
      {
        title: "Campaign or Off-Market",
        description: "A tailored approach designed around the property, the vendor and the target market.",
      },
      {
        title: "Buyer Qualification",
        description: "Identifying genuine buyers and understanding their position, motivation and capacity.",
      },
      {
        title: "Negotiation to Settlement",
        description: "Strategic negotiation from the first offer through to a successful settlement.",
      },
    ],
    // No closing line provided by client for Selling.
  },
  {
    title: "Leasing",
    tagline: "The Right Tenant. The Right Terms. The Right Outcome.",
    bullets: [
      {
        title: "Rental Assessment",
        description:
          "A precise assessment of market conditions, rental value and positioning to maximise the asset's leasing potential.",
      },
      {
        title: "Tenant Sourcing",
        description:
          "Targeted marketing and considered tenant selection focused on quality, suitability and long-term stability.",
      },
      {
        title: "Lease Negotiation",
        description:
          "Strategic negotiation of commercial terms designed to protect the owner's position while securing a sustainable tenancy.",
      },
      {
        title: "Incentive Strategy",
        description:
          "Thoughtfully structured incentives that attract the right tenant while protecting the property's long-term value.",
      },
    ],
    standaloneParagraph:
      "We look beyond the offer. Financial strength, business suitability and covenant matter — because the right tenant is worth more than simply filling a vacancy.",
    closingLine:
      "A lower vacancy cost today can create a higher cost tomorrow. We focus on the right tenancy, not just a quick tenancy.",
  },
  {
    title: "Management",
    tagline: "Strategic Oversight. Precise Execution. Asset Protection.",
    intro:
      "Commercial and industrial property requires more than day-to-day administration. It requires disciplined oversight, clear communication and a focus on protecting the asset while maximising long-term performance.",
    bullets: [
      {
        title: "Rent & Outgoings",
        description:
          "Detailed management of rental income, recoveries and outgoings, ensuring financial obligations are monitored and the asset performs as intended.",
      },
      {
        title: "Arrears & Rent Reviews",
        description:
          "Proactive management of arrears and carefully timed rental reviews, protecting income while maintaining strong and professional tenant relationships.",
      },
      {
        title: "Maintenance & Asset Care",
        description:
          "End-to-end coordination of maintenance, contractors and essential works, with close attention to quality, cost, compliance and minimising disruption to tenants.",
      },
      {
        title: "Budget & Forecasting",
        description:
          "Forward-looking financial planning that provides owners with greater visibility over expenditure, income and future asset requirements.",
      },
      {
        title: "Owner Reporting",
        description:
          "Clear, concise and commercially relevant reporting — giving owners the information that matters, presented in a format that is easy to understand and act upon.",
      },
    ],
    closingLine:
      "Because effective management is not simply about maintaining an asset. It is about protecting its income, preserving its value and positioning it for the future.",
  },
  {
    title: "Advisory",
    tagline: "Clarity. Strategy. Better Decisions.",
    intro:
      "Independent advice across the moments that matter — whether you are buying, developing, holding or deciding when to sell.",
    bullets: [
      {
        title: "Buyer Representation",
        description: "Strategic acquisition advice, negotiation and execution.",
      },
      {
        title: "Development Sites",
        description: "Assessing opportunity, feasibility, risk and potential.",
      },
      {
        title: "Off-the-Plan Campaigns",
        description: "Positioning projects to attract the right buyers and maximise value.",
      },
      {
        title: "Hold or Sell",
        description: "Clear advice on timing, strategy and long-term value.",
      },
    ],
    closingLine: "Know the opportunity. Understand the risk. Make the right move.",
  },
];
