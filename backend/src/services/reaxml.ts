import { resolveImageSrc, type Agent, type Property } from "@kestrel/shared";
import { env } from "../config/env";

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tag(name: string, value: string | number | null | undefined, attrs = "") {
  if (value == null || value === "") return `<${name}${attrs ? ` ${attrs}` : ""}/>`;
  return `<${name}${attrs ? ` ${attrs}` : ""}>${xmlEscape(String(value))}</${name}>`;
}

function listingType(property: Property) {
  return property.transactionSide === "lease" ? "lease" : "sale";
}

function statusText(property: Property) {
  if (property.status === "under-offer") return "under offer";
  if (property.status === "sold") return "sold";
  if (property.status === "leased") return "leased";
  return property.transactionSide === "lease" ? "current" : "current";
}

function imageUrl(publicId: string) {
  return resolveImageSrc(publicId, env.cloudinary.cloudName, { width: 1600, context: "gallery" });
}

export function propertyToReaxml(property: Property, agent?: Agent | null) {
    const category =
    property.propertyType === "development-land"
      ? "Land"
      : property.propertyType === "showroom"
        ? "Showrooms/Bulky Goods"
        : property.propertyType === "house" ||
            property.propertyType === "townhouse" ||
            property.propertyType === "apartment" ||
            property.propertyType === "rural"
          ? "Other"
          : "Warehouse";
  const images = (property.images ?? [])
    .map((img, i) => {
      const url = imageUrl(img.publicId);
      return `      <img id="m${i}" modTime="${xmlEscape(property.updatedAt)}" format="jpg" url="${xmlEscape(url)}"/>`;
    })
    .join("\n");

  const commercial = [
    tag("soldDate", property.status === "sold" || property.status === "leased" ? property.updatedAt.slice(0, 10) : ""),
    tag("carSpaces", property.carSpaces ?? ""),
    tag("energyRating", ""),
    tag("zone", property.zoning),
    property.floorAreaSqm != null ? `<area unit="square">${property.floorAreaSqm}</area>` : "<area unit=\"square\"/>",
    property.landAreaSqm != null
      ? `<landArea unit="square">${property.landAreaSqm}</landArea>`
      : "<landArea unit=\"square\"/>",
    tag("return", property.yieldPercent),
    tag("outgoings", property.outgoingsPa),
  ].join("\n      ");

  const price =
    property.transactionSide === "lease"
      ? `<rent period="annual">${property.priceValue ?? ""}</rent>`
      : tag("price", property.priceValue);

  return `<?xml version="1.0" encoding="UTF-8"?>
<propertyList date="${xmlEscape(new Date().toISOString())}" username="kestrel" password="">
  <commercial modTime="${xmlEscape(property.updatedAt)}" status="${xmlEscape(statusText(property))}">
    <agentID>${xmlEscape(agent?.licenceNumber || property.agentLicenceNumber)}</agentID>
    <uniqueID>${xmlEscape(property.portalListingId || property.slug)}</uniqueID>
    <listingAgent>
      ${tag("name", agent?.name || AGENCY_FALLBACK.name)}
      ${tag("telephone", agent?.phone || "")}
      ${tag("email", agent?.email || "")}
    </listingAgent>
    <address display="yes">
      ${tag("street", property.address)}
      ${tag("suburb", property.suburb)}
      ${tag("state", property.state)}
      ${tag("postcode", property.postcode)}
      ${tag("country", "Australia")}
    </address>
    <priceDisplay>${xmlEscape(property.priceLabel)}</priceDisplay>
    ${price}
    <category name="${xmlEscape(category)}"/>
    <headline>${xmlEscape(`${property.address}, ${property.suburb}`)}</headline>
    <description>${xmlEscape(property.description)}</description>
    <commercialListingType value="${listingType(property)}"/>
    ${commercial}
    <features>
      ${tag("clearSpan", property.clearSpanM)}
      ${tag("rollerDoor", property.rollerDoorM)}
      ${tag("threePhase", property.threePhasePower ? "yes" : "no")}
      ${tag("hardstand", property.hardstand ? "yes" : "no")}
    </features>
    <objects>
${images || "      "}
    </objects>
  </commercial>
</propertyList>
`;
}

const AGENCY_FALLBACK = { name: "Kestrel Commercial" };

export function propertiesToReaxml(properties: Property[], agentByLicence: Map<string, Agent>) {
  const inner = properties
    .map((p) => {
      const xml = propertyToReaxml(p, agentByLicence.get(p.agentLicenceNumber) ?? null);
      const match = xml.match(/<commercial[\s\S]*<\/commercial>/);
      return match ? `  ${match[0]}` : "";
    })
    .filter(Boolean)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<propertyList date="${xmlEscape(new Date().toISOString())}" username="kestrel" password="">
${inner}
</propertyList>
`;
}

export function syndicationStatus(key?: string | null): "not connected" | "pending setup" | "active" {
  const value = key?.trim();
  if (!value) return "not connected";
  if (value.toLowerCase() === "pending") return "pending setup";
  return "active";
}
