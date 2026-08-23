import {
  formatAud,
  formatLandArea,
  formatMetres,
  formatSqm,
  isClosedListing,
  isIndustrialPropertyType,
  propertyTypeLabel,
  type Property,
} from "@kestrel/shared";

function bedsLabel(value: number | null | undefined) {
  if (value == null) return null;
  return Number.isInteger(value) ? String(value) : String(value);
}

export function SpecTable({ property }: { property: Property }) {
  const industrial = isIndustrialPropertyType(property.propertyType);
  const rows: { k: string; v: string }[] = [
    { k: "Address", v: `${property.address}, ${property.suburb}` },
    { k: "Postcode", v: `${property.state} ${property.postcode}` },
    { k: "Type", v: propertyTypeLabel(property.propertyType) },
    { k: "Zoning", v: property.zoning },
    { k: "Floor area", v: formatSqm(property.floorAreaSqm) },
    { k: "Land area", v: formatLandArea(property.landAreaSqm) },
  ];
  if (property.bedrooms != null) rows.push({ k: "Bedrooms", v: bedsLabel(property.bedrooms)! });
  if (property.bathrooms != null) rows.push({ k: "Bathrooms", v: bedsLabel(property.bathrooms)! });
  if (property.carSpaces != null) rows.push({ k: "Car spaces", v: String(property.carSpaces) });
  if (industrial) {
    rows.push(
      { k: "Clear span", v: formatMetres(property.clearSpanM) },
      { k: "Roller door", v: formatMetres(property.rollerDoorM) },
      { k: "Three-phase", v: property.threePhasePower ? "Yes" : "No" },
      { k: "Hardstand", v: property.hardstand ? "Yes" : "No" },
    );
  }
  if (!isClosedListing(property.status)) {
    rows.push({ k: "Price / rent", v: property.priceLabel });
  }
  if (property.yieldPercent != null) {
    rows.push({ k: "Passing yield", v: `${property.yieldPercent.toFixed(2)}%` });
  }
  if (property.leaseTermYears != null) {
    rows.push({ k: "Lease term", v: `${property.leaseTermYears} yrs` });
  }
  if (property.outgoingsPa != null) {
    rows.push({ k: "Outgoings", v: `${formatAud(property.outgoingsPa)} pa` });
  }

  return (
    <div className="surface overflow-hidden">
      <div className="border-b border-oxblood/10 px-5 py-4">
        <p className="t-caption text-oxblood">Specification</p>
      </div>
      <dl>
        {rows.map((row, i) => (
          <div
            key={row.k}
            className={`grid grid-cols-12 ${i % 2 === 1 ? "bg-paper/70" : ""}`}
          >
            <dt className="col-span-5 px-5 py-3 text-sm text-mauve sm:col-span-4">{row.k}</dt>
            <dd className="col-span-7 px-5 py-3 t-mono tabular text-[14px] text-ink sm:col-span-8">{row.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
