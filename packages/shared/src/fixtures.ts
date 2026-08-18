import { AGENCY } from "./constants";
import type { Agent, Property } from "./types";

export const AGENTS: Agent[] = [
  {
    id: "agent-jignesh",
    name: "Jignesh Jhanjaria",
    licenceNumber: AGENCY.licenceNumber,
    phone: AGENCY.phone,
    email: AGENCY.email,
    title: "Director · Property Specialist",
    bio: "With over 15 years of experience in real estate, Jignesh has built a career across commercial, residential and off-the-plan property, completing 700+ property transactions throughout his career. Based in Melbourne, he brings extensive experience across sales, leasing, investment and development opportunities, with a strong understanding of the Melbourne property market and its evolving commercial landscape. Jignesh works with property owners, investors, developers, buyers and businesses, providing practical market insight, strategic advice and a personalised approach from initial appraisal through to negotiation and completion. His philosophy is simple: understand the property, understand the client, and create the right strategy to achieve the best possible outcome.",
    photoPublicId: "kestrel/agents/jignesh",
  },
];

/**
 * Offline API fallback only. Live stock is Mongo (Axtra + information packs).
 * Starter Unsplash warehouses were removed — do not put them back.
 */
export const PROPERTIES: Property[] = [];
