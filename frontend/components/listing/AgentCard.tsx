import { AGENCY, type Agent } from "@kestrel/shared";
import { Monogram } from "@/components/brand/Monogram";
import { agentPortraitSrc } from "@/lib/images";

export function AgentCard({ agent }: { agent: Agent }) {
  const photo = agentPortraitSrc(agent.photoPublicId, 240);
  return (
    <aside className="surface p-6">
      <p className="t-caption text-oxblood">Listing agent</p>
      <div className="mt-5 flex gap-4">
        {photo ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-oxblood">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt={agent.name}
              className="h-full w-full object-cover object-top"
            />
          </div>
        ) : (
          <Monogram name={agent.name} className="h-20 w-20 shrink-0 text-2xl" />
        )}
        <div>
          <h3 className="t-h3 text-ink">{agent.name}</h3>
          {agent.title ? <p className="t-body mt-1 text-mauve">{agent.title}</p> : null}
          <p className="t-mono mt-2 text-[12px] text-ink">Licence {agent.licenceNumber}</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2">
        <li>
          <a href={AGENCY.whatsappHref} target="_blank" rel="noopener noreferrer" className="t-mono text-oxblood hover:underline">
            {AGENCY.whatsapp}
          </a>
        </li>
        <li>
          <a href={`mailto:${agent.email}`} className="t-body text-oxblood hover:underline">
            {agent.email}
          </a>
        </li>
      </ul>
      <p className="t-caption mt-5 normal-case tracking-normal text-mauve">
        {AGENCY.legalName}
        <br />
        ACN {AGENCY.acn}
      </p>
    </aside>
  );
}
