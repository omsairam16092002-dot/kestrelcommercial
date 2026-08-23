import { ABOUT_FULL_BIO } from "./aboutCopy";
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
    bio: ABOUT_FULL_BIO,
    photoPublicId: "kestrel/agents/jignesh",
  },
];

/**
 * Offline API fallback only. Live stock is Mongo (Axtra + information packs).
 * Starter Unsplash warehouses were removed — do not put them back.
 */
export const PROPERTIES: Property[] = [];
