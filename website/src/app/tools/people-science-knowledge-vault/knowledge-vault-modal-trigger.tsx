"use client";

import type { ReactNode } from "react";

import { SkillDetails } from "../skill-details";
import { SkillModalTrigger } from "../skill-modal-trigger";
import { knowledgeVaultContent } from "./knowledge-vault-content";

function KnowledgeVaultDetails({ onClose }: { onClose?: () => void }) {
  return <SkillDetails content={knowledgeVaultContent} onClose={onClose} />;
}

export function KnowledgeVaultModalTrigger({ children, className }: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <SkillModalTrigger title={knowledgeVaultContent.title} Details={KnowledgeVaultDetails} className={className}>
      {children}
    </SkillModalTrigger>
  );
}
