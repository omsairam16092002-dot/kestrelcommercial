export const PROPERTY_STATUSES = [
  "for-sale",
  "for-lease",
  "under-offer",
  "sold",
  "leased",
] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export type TransactionSide = "sale" | "lease";

export type PropertyType =
  | "office-warehouse"
  | "warehouse"
  | "development-land"
  | "showroom"
  | "yard"
  | "office"
  | "retail"
  | "house"
  | "townhouse"
  | "apartment"
  | "rural";

export const PACKAGE_SEGMENTS = ["owner-occupied", "investor", "co-living", "dual-occupancy"] as const;

/** Who a house & land package is pitched at. A listing can suit more than one. */
export type PackageSegment = (typeof PACKAGE_SEGMENTS)[number];

export const ASSET_CATEGORIES = ["commercial", "residential", "development-site"] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const ENQUIRY_SOURCES = [
  "web",
  "phone",
  "eoi",
  "appraisal",
  "appraisal-quick",
  "contact",
  "newsletter",
  "portal-rea",
  "portal-realcommercial",
] as const;

export type EnquirySource = (typeof ENQUIRY_SOURCES)[number];

export type EnquiryIntent = "enquire" | "inspection" | "brochure";

export const ENQUIRY_INTENTS = ["enquire", "inspection", "brochure"] as const;

export type CrmStage =
  | "new"
  | "contacted"
  | "qualified"
  | "inspecting"
  | "negotiating"
  | "won"
  | "lost";

export type EnquiryTopic =
  | "selling"
  | "leasing-out"
  | "buying-or-leasing"
  | "smsf"
  | "management"
  | "appraisal"
  | "other";

export type InspectionWindow = "morning" | "afternoon" | "flexible";

export type InspectionAttendance = "booked" | "attended" | "no-show" | "cancelled";

export const INSPECTION_ATTENDANCE = ["booked", "attended", "no-show", "cancelled"] as const;

export type ContactRole = "buyer" | "tenant" | "vendor" | "landlord" | "occupier" | "other";

export const CONTACT_ROLES = ["buyer", "tenant", "vendor", "landlord", "occupier", "other"] as const;

export type DeskTaskKind = "follow-up" | "call" | "inspect" | "appraisal" | "other";

export const DESK_TASK_KINDS = ["follow-up", "call", "inspect", "appraisal", "other"] as const;

export type DeskTaskStatus = "open" | "done";

export const BOOKING_KINDS = ["inspection", "meeting", "appraisal"] as const;

export type BookingKind = (typeof BOOKING_KINDS)[number];

export const BOOKING_STATUSES = ["confirmed", "cancelled", "completed", "no-show"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** How a booking happens. Meetings are online, at the office or by phone; inspections and appraisals are on site. */
export const BOOKING_MODES = ["online", "office", "phone", "onsite"] as const;

export type BookingMode = (typeof BOOKING_MODES)[number];

/** A recurring weekly window. `day` is 0 (Sunday) – 6 (Saturday); times are HH:MM in the booking timezone. */
export interface BookingHours {
  day: number;
  start: string;
  end: string;
}

export interface BookingSettings {
  enabled: boolean;
  timezone: string;
  slotMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxDaysAhead: number;
  hours: BookingHours[];
  /** YYYY-MM-DD days with no bookings (leave, public holidays). */
  blackoutDates: string[];
  meetingLocation: string;
}

export interface BookingSlot {
  start: string;
  end: string;
}

export interface Booking {
  id: string;
  kind: BookingKind;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  notes?: string;
  propertySlug?: string | null;
  propertyLabel?: string | null;
  location?: string;
  mode: BookingMode;
  /** Zoho Meeting join link for online meetings. */
  meetingUrl?: string | null;
  /** Zoho Meeting host (start) link — desk only. */
  meetingHostUrl?: string | null;
  enquiryId?: string | null;
  contactId?: string | null;
  zohoEventId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Hot: booked, inspecting, appraisal or EOI. Warm: documents or a listing-specific enquiry. Cold: general. */
export type LeadScore = "hot" | "warm" | "cold";

export const LEAD_SCORES = ["hot", "warm", "cold"] as const;

export type SavedSearchOrigin = "public" | "desk";

export interface SavedSearch {
  id: string;
  email: string;
  name?: string;
  contactId?: string | null;
  origin: SavedSearchOrigin;
  label: string;
  /** Spec-filter query string, e.g. `side=sale&category=commercial&maxPrice=2000000`. */
  query: string;
  confirmed: boolean;
  active: boolean;
  /** Desk requirements can be kept for matching without emailing the contact. */
  emailAlerts: boolean;
  alertCount?: number;
  lastAlertAt?: string | null;
  createdAt: string;
}

export interface PropertyImage {
  /** Cloudinary public_id, or `unsplash:<photo-id>` for local fixtures. */
  publicId: string;
  isHero?: boolean;
  alt?: string;
  width?: number;
  height?: number;
  /** When true, hidden from public listing galleries. */
  excludeFromGallery?: boolean;
}

export interface Property {
  id: string;
  slug: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  status: PropertyStatus;
  /** Drives oxblood vs tan. Required for under-offer. */
  transactionSide: TransactionSide;
  priceLabel: string;
  /** Sale price or annual rent, GST exclusive, AUD. Null when "contact agent". */
  priceValue: number | null;
  floorAreaSqm: number | null;
  landAreaSqm: number | null;
  clearSpanM: number | null;
  rollerDoorM: number | null;
  threePhasePower: boolean;
  hardstand: boolean;
  bedrooms?: number | null;
  bathrooms?: number | null;
  carSpaces?: number | null;
  zoning: string;
  propertyType: PropertyType;
  /** Primary browse category — commercial, residential, or development-site. */
  assetCategory: AssetCategory;
  description: string;
  images: PropertyImage[];
  /** Blueprint / floorplate image. Null when land or not yet drawn. */
  floorplanPublicId?: string | null;
  /** Optional hosted IM PDF. When null, the API generates one. */
  brochureUrl?: string | null;
  agentLicenceNumber: string;
  featured: boolean;
  lat?: number | null;
  lng?: number | null;
  yieldPercent?: number | null;
  leaseTermYears?: number | null;
  outgoingsPa?: number | null;
  /** One-line sold/leased result for flagship case studies. */
  evidenceLine?: string | null;
  houseLandPackage?: boolean;
  packageSegments?: PackageSegment[];
  /** Desk only — stripped from public listing JSON. */
  internalNotes?: string | null;
  archived?: boolean;
  leadCount?: number;
  /** PEXA Clear workspace id — desk only, not shown on the public listing. */
  pexaWorkspaceId?: string | null;
  /** Portal listing ID used to match inbound REA / realcommercial enquiry emails. */
  portalListingId?: string | null;
  syndicateToRealcommercial?: boolean;
  syndicateToCommercialRealEstate?: boolean;
  externalListingIds?: {
    realcommercial?: string | null;
    commercialRealEstate?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  licenceNumber: string;
  phone: string;
  email: string;
  photoPublicId?: string;
  title?: string;
  bio?: string;
}

export interface EnquiryPropertySummary {
  id: string;
  slug: string;
  address: string;
  suburb: string;
  priceLabel: string;
}

export interface Enquiry {
  id: string;
  propertyId?: string | null;
  propertySlug?: string | null;
  property?: EnquiryPropertySummary | null;
  contactId?: string | null;
  name: string;
  company?: string;
  email: string;
  phone: string;
  message: string;
  topic?: EnquiryTopic;
  intent?: EnquiryIntent;
  preferredInspectionAt?: string | null;
  inspectionWindow?: InspectionWindow | null;
  inspectionAttendance?: InspectionAttendance | null;
  source: EnquirySource;
  crmStage: CrmStage;
  followUpAt?: string | null;
  followUpNote?: string;
  notifiedAt?: string | null;
  notifyChannels?: string[];
  notes?: { text: string; at: string; by?: string }[];
  inboundEmailId?: string | null;
  bookingId?: string | null;
  leadScore?: LeadScore | null;
  firstResponseAt?: string | null;
  escalatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PortalKind = "rea" | "realcommercial" | "unknown";

export type InboundParseStatus = "pending" | "parsed" | "needsReview" | "duplicate";

export interface InboundEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  receivedAt: string;
  dedupeKey: string;
  parseStatus: InboundParseStatus;
  needsReview: boolean;
  portal: PortalKind;
  enquiryId?: string | null;
  parseError?: string;
  parsedFields?: {
    name?: string;
    phone?: string;
    email?: string;
    message?: string;
    listingId?: string;
    address?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const COMMUNICATION_KINDS = [
  "acknowledgement",
  "stale-follow-up",
  "inspection-reminder",
  "newsletter-welcome",
  "booking-confirmation",
  "booking-desk",
  "booking-update",
  "booking-reminder",
  "lead-escalation",
  "alert-confirm",
  "listing-alert",
] as const;

export type CommunicationKind = (typeof COMMUNICATION_KINDS)[number];

export type CommunicationStatus = "sent" | "skipped" | "failed";

export interface Communication {
  id: string;
  kind: CommunicationKind;
  to: string;
  subject: string;
  enquiryId?: string | null;
  contactId?: string | null;
  providerMessageId?: string | null;
  status: CommunicationStatus;
  error?: string;
  createdAt: string;
}

export type SyndicationPortalStatus = "not connected" | "pending setup" | "active";

export interface DeskContact {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  role: ContactRole;
  source?: string;
  notes?: { text: string; at: string; by?: string }[];
  lastTouchAt?: string | null;
  enquiryCount?: number;
  openTaskCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeskTask {
  id: string;
  title: string;
  kind: DeskTaskKind;
  status: DeskTaskStatus;
  dueAt?: string | null;
  note?: string;
  contactId?: string | null;
  enquiryId?: string | null;
  propertySlug?: string | null;
  contactName?: string | null;
  doneAt?: string | null;
  by?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpecFilters {
  side?: TransactionSide | "all";
  status?: PropertyStatus[];
  assetCategory?: AssetCategory;
  minFloorAreaSqm?: number;
  maxFloorAreaSqm?: number;
  minClearSpanM?: number;
  minRollerDoorM?: number;
  minLandAreaSqm?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  minCarSpaces?: number;
  maxPrice?: number;
  zoning?: string;
  suburb?: string;
  propertyType?: PropertyType;
  threePhasePower?: boolean;
  hardstand?: boolean;
  featured?: boolean;
  houseLandPackage?: boolean;
  packageSegment?: PackageSegment;
}

export const SPEC_FILTER_QUERY_KEYS = [
  "side",
  "status",
  "category",
  "minFloor",
  "maxFloor",
  "minSpan",
  "minDoor",
  "minLand",
  "minBeds",
  "minBaths",
  "minCars",
  "maxPrice",
  "zoning",
  "suburb",
  "type",
  "power",
  "hardstand",
  "houseLand",
  "package",
] as const;

export type SpecFilterQueryKey = (typeof SPEC_FILTER_QUERY_KEYS)[number];
