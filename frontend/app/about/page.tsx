import type { Metadata } from "next";
import { AGENTS } from "@kestrel/shared";
import { AboutHeroBio } from "@/components/about/AboutHeroBio";
import { AboutWhyChoose } from "@/components/about/AboutWhyChoose";
import { ReasonCards } from "@/components/brand/ReasonCards";
import { DualCtaBand } from "@/components/brand/DualCtaBand";
import { getAgents } from "@/lib/api";
import { agentPortraitSrc } from "@/lib/images";

export const metadata: Metadata = {
  title: "About",
  description:
    "Jignesh Jhanjaria, Director of Kestrel Commercial — 15+ years and 700+ transactions across industrial, commercial, residential and development property.",
};

export const revalidate = 60;

export default async function AboutPage() {
  const agent = (await getAgents())[0] ?? AGENTS[0];
  const portrait = agentPortraitSrc(agent.photoPublicId, 1400);

  return (
    <div className="bg-paper">
      <AboutHeroBio agent={agent} portrait={portrait} />
      <ReasonCards />
      <AboutWhyChoose />
      <DualCtaBand
        page="about"
        title={
          <>
            Talk to the desk. <em className="font-serif font-normal italic text-oxblood">Direct.</em>
          </>
        }
        lede="Call, WA or text. Or write an enquiry."
        phoneActions
      />
    </div>
  );
}
