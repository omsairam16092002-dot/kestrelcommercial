import PDFDocument from "pdfkit";
import { AGENCY, formatLandArea, formatMetres, formatSqm, fullAddress, isIndustrialPropertyType, propertyTypeLabel, type Property } from "@kestrel/shared";

function line(doc: InstanceType<typeof PDFDocument>, label: string, value: string) {
  const y = doc.y;
  doc.fillColor("#654f49").fontSize(9).text(label.toUpperCase(), 48, y, { width: 140, characterSpacing: 1.2 });
  doc.fillColor("#2a1418").fontSize(11).text(value, 200, y, { width: 360 });
  doc.moveDown(0.85);
}

export function buildBrochurePdf(property: Property): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, info: {
      Title: `${property.address} — Information memorandum`,
      Author: AGENCY.tradingName,
    }});
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, 595, 72).fill("#5c1f27");
    doc.fillColor("#d9a26b").fontSize(9).text("KESTREL COMMERCIAL", 48, 22, { characterSpacing: 2 });
    doc.fillColor("#f6f1ec").fontSize(11).text("Industrial · Melbourne west", 48, 40);
    doc.fillColor("#d9a26b").fontSize(9).text(`Licence ${AGENCY.licenceNumber}`, 400, 40, { width: 147, align: "right" });

    doc.moveDown(3);
    doc.fillColor("#5c1f27").fontSize(9).text(
      property.transactionSide === "lease" ? "FOR LEASE" : "FOR SALE",
      48,
      100,
      { characterSpacing: 1.6 },
    );
    doc.fillColor("#2a1418").fontSize(22).text(property.address, 48, 118, { width: 500 });
    doc.fillColor("#654f49").fontSize(11).text(fullAddress(property), 48, doc.y + 4);
    doc.fillColor("#5c1f27").fontSize(16).text(property.priceLabel, 48, doc.y + 10);

    doc.moveDown(1.2);
    doc.fillColor("#5c1f27").fontSize(9).text("SPECIFICATION PLATE", { characterSpacing: 1.4 });
    doc.moveDown(0.6);
    line(doc, "Type", propertyTypeLabel(property.propertyType));
    line(doc, "Zoning", property.zoning);
    line(doc, "Floor area", formatSqm(property.floorAreaSqm));
    line(doc, "Land area", formatLandArea(property.landAreaSqm));
    if (property.bedrooms != null) line(doc, "Bedrooms", String(property.bedrooms));
    if (property.bathrooms != null) line(doc, "Bathrooms", String(property.bathrooms));
    if (property.carSpaces != null) line(doc, "Car spaces", String(property.carSpaces));
    if (isIndustrialPropertyType(property.propertyType)) {
      line(doc, "Clear span", formatMetres(property.clearSpanM));
      line(doc, "Roller door", formatMetres(property.rollerDoorM));
      line(doc, "Three-phase", property.threePhasePower ? "Yes" : "No");
      line(doc, "Hardstand", property.hardstand ? "Yes" : "No");
    }
    if (property.yieldPercent != null) line(doc, "Passing yield", `${property.yieldPercent.toFixed(2)}%`);
    if (property.leaseTermYears != null) line(doc, "Lease term", `${property.leaseTermYears} yrs`);

    doc.moveDown(0.6);
    doc.fillColor("#5c1f27").fontSize(9).text("THE BUILDING", { characterSpacing: 1.4 });
    doc.moveDown(0.4);
    doc.fillColor("#2a1418").fontSize(10).text(property.description.replace(/\n+/g, "\n\n"), {
      width: 500,
      align: "left",
      lineGap: 3,
    });

    doc.moveDown(1.2);
    doc.fillColor("#5c1f27").fontSize(9).text("DESK", { characterSpacing: 1.4 });
    doc.moveDown(0.3);
    doc.fillColor("#2a1418").fontSize(11).text(`${AGENCY.licenceHolder} · ${AGENCY.phone}`);
    doc.fillColor("#654f49").fontSize(10).text(AGENCY.email);
    doc.text(AGENCY.whatsapp ? `WhatsApp ${AGENCY.whatsapp}` : "");

    const footerY = 800;
    doc.fillColor("#654f49").fontSize(8).text(
      `${AGENCY.legalName} · ACN ${AGENCY.acn} · Licence ${AGENCY.licenceNumber}. Figures are GST exclusive unless stated. This memorandum is not an offer. Verify all specs on inspection.`,
      48,
      footerY,
      { width: 500 },
    );

    doc.end();
  });
}
