"use client";

import { ArrowLeft24Regular } from "@fluentui/react-icons/svg/arrow-left";
import { Checkmark16Regular } from "@fluentui/react-icons/svg/checkmark";
import { CheckmarkCircle20Regular } from "@fluentui/react-icons/svg/checkmark-circle";
import { Copy20Regular } from "@fluentui/react-icons/svg/copy";
import { Dismiss24Regular } from "@fluentui/react-icons/svg/dismiss";
import { Flash16Regular } from "@fluentui/react-icons/svg/flash";
import { Open20Regular } from "@fluentui/react-icons/svg/open";
import { Rocket20Regular } from "@fluentui/react-icons/svg/rocket";
import { SlideSearch20Regular } from "@fluentui/react-icons/svg/slide-search";
import Link from "next/link";
import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react";

import styles from "./skill-details.module.css";

export type SkillDetailsContent = {
  title: string;
  description: string;
  skillUrl: string;
  starterPrompt: string;
  setupDescription: string;
  promptTitle: string;
  promptDescription: string;
  overview: ReactNode;
  analyses: readonly {
    Icon: typeof Rocket20Regular;
    title: string;
    questions: readonly string[];
  }[];
  results: string;
  safeguards: readonly {
    Icon: typeof Rocket20Regular;
    title: string;
    description: string;
  }[];
  figmaNodeId?: string;
};

const sections = [
  { id: "start-using", label: "Start using", Icon: Rocket20Regular },
  { id: "overview", label: "Overview", Icon: SlideSearch20Regular },
  { id: "results", label: "Results", Icon: CheckmarkCircle20Regular },
] as const;
type SectionId = (typeof sections)[number]["id"];

export function SkillDetails({ content, onClose }: {
  content: SkillDetailsContent;
  onClose?: () => void;
}) {
  const { title, skillUrl, starterPrompt } = content;
  const [copied, setCopied] = useState<"skill" | "prompt" | null>(null);
  const [copyError, setCopyError] = useState<{ target: "skill" | "prompt"; message: string } | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("start-using");
  const [canScrollMore, setCanScrollMore] = useState(false);
  const detailsRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const copiedTimeout = useRef<number | null>(null);
  const isModal = Boolean(onClose);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;
    const content = isModal ? contentRef.current : null;
    const scrollTarget = content ?? window;
    const updateScrollState = () => {
      const scrollTop = content?.scrollTop ?? window.scrollY;
      const viewportHeight = content?.clientHeight ?? window.innerHeight;
      const scrollHeight = content?.scrollHeight ?? document.documentElement.scrollHeight;
      if (content) setCanScrollMore(scrollHeight - viewportHeight - scrollTop > 1);
      if (scrollTop <= 2) {
        setActiveSection("start-using");
        return;
      }
      if (scrollTop + viewportHeight >= scrollHeight - 2) {
        setActiveSection("results");
        return;
      }
      const activationLine = (content?.getBoundingClientRect().top ?? 0) + 24;
      let current: SectionId = "start-using";
      for (const { id } of sections) {
        const heading = details.querySelector<HTMLElement>(`#${id} h2`);
        if (heading && heading.getBoundingClientRect().top <= activationLine + 1) current = id;
      }
      setActiveSection(current);
    };
    updateScrollState();
    scrollTarget.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    const observer = content ? new ResizeObserver(updateScrollState) : null;
    if (content && observer) {
      observer.observe(content);
      for (const section of content.children) observer.observe(section);
    }
    return () => {
      scrollTarget.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      observer?.disconnect();
    };
  }, [isModal]);

  useEffect(() => () => {
    if (copiedTimeout.current !== null) window.clearTimeout(copiedTimeout.current);
  }, []);

  const scrollToSection = (event: MouseEvent<HTMLAnchorElement>, id: SectionId) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const details = detailsRef.current;
    const heading = details?.querySelector<HTMLElement>(`#${id} h2`);
    if (!heading) return;
    event.preventDefault();
    const content = isModal ? contentRef.current : null;
    heading.focus({ preventScroll: true });
    const top = (content?.scrollTop ?? window.scrollY) + heading.getBoundingClientRect().top -
      (content?.getBoundingClientRect().top ?? 0) - 24;
    (content ?? window).scrollTo({ top, behavior: "instant" });
    setActiveSection(id);
  };

  const copyText = async (target: "skill" | "prompt") => {
    setCopied(null);
    setCopyError(null);
    if (copiedTimeout.current !== null) window.clearTimeout(copiedTimeout.current);
    try {
      await navigator.clipboard.writeText(target === "skill" ? skillUrl : starterPrompt);
      setCopied(target);
      copiedTimeout.current = window.setTimeout(() => {
        setCopied(null);
        copiedTimeout.current = null;
      }, 3000);
    } catch {
      setCopyError({
        target,
        message: `Couldn't copy the ${target === "skill" ? "skill link" : "prompt"}. Select and copy the text above manually.`,
      });
    }
  };

  return (
    <article ref={detailsRef} className={`${styles.details} ${onClose ? styles.modalDetails : ""}`} data-scroll-more={isModal && canScrollMore || undefined} data-figma-node-id={content.figmaNodeId}>
      <header className={styles.header}>
        {!onClose ? <div className={styles.topRow}>
          <Link className={styles.backAction} href="/tools"><ArrowLeft24Regular aria-hidden="true" />All tools</Link>
        </div> : null}
        <div
          aria-label={isModal ? `${title} summary` : undefined}
          className={styles.headerContent}
          role={isModal ? "region" : undefined}
          tabIndex={isModal ? 0 : undefined}
        >
          <span className={styles.skillBadge}><Flash16Regular aria-hidden="true" />Skill</span>
          <h1>{title}</h1>
          <div className={styles.titleRow}>
            <div>
              <p>{content.description}</p>
              <span>By Microsoft People Science</span>
            </div>
            {!onClose ? <a className={styles.githubAction} href={skillUrl} rel="noreferrer" target="_blank"><Open20Regular aria-hidden="true" />View on GitHub</a> : null}
          </div>
        </div>
        {onClose ? <button aria-label={`Close ${title} details`} data-dialog-initial-focus className={styles.closeAction} onClick={onClose} type="button"><Dismiss24Regular aria-hidden="true" /></button> : null}
        <nav aria-label={`${title} sections`} className={styles.sectionNav}>
          {sections.map(({ id, label, Icon }) => <a key={id} aria-current={activeSection === id ? "location" : undefined} className={activeSection === id ? styles.activeSectionLink : undefined} href={`#${id}`} onClick={(event) => scrollToSection(event, id)}><Icon aria-hidden="true" />{label}</a>)}
        </nav>
      </header>
      <div
        ref={contentRef}
        aria-label={isModal ? `${title} content` : undefined}
        className={styles.content}
        role={isModal ? "region" : undefined}
        tabIndex={isModal ? 0 : undefined}
      >
        <section className={styles.section} id="start-using">
          <h2 tabIndex={-1}>Start using</h2>
          <ol className={styles.setupSteps}>
            <li>
              <div className={styles.stepHeading}><span aria-hidden="true">1</span><div><h3>Open Copilot in your terminal</h3><p>{content.setupDescription}</p></div></div>
              <div className={styles.copyBlock}>
                <code>{skillUrl}</code>
                <div className={styles.copyActions}>
                  <button onClick={() => copyText("skill")} type="button">{copied === "skill" ? <Checkmark16Regular aria-hidden="true" /> : <Copy20Regular aria-hidden="true" />}{copied === "skill" ? "Copied" : "Copy skill link"}</button>
                  <a href={skillUrl} rel="noreferrer" target="_blank"><Open20Regular aria-hidden="true" />Visit GitHub</a>
                </div>
                {copyError?.target === "skill" ? <p className={styles.copyError} role="alert">{copyError.message}</p> : null}
              </div>
            </li>
            <li>
              <div className={styles.stepHeading}><span aria-hidden="true">2</span><div><h3>{content.promptTitle}</h3><p>{content.promptDescription}</p></div></div>
              <div className={styles.copyBlock}>
                <code>{starterPrompt}</code>
                <button onClick={() => copyText("prompt")} type="button">{copied === "prompt" ? <Checkmark16Regular aria-hidden="true" /> : <Copy20Regular aria-hidden="true" />}{copied === "prompt" ? "Copied" : "Copy starter prompt"}</button>
                {copyError?.target === "prompt" ? <p className={styles.copyError} role="alert">{copyError.message}</p> : null}
              </div>
            </li>
          </ol>
          <span aria-live="polite" className={styles.visuallyHidden}>{copied === "skill" ? "Skill link copied" : copied === "prompt" ? "Starter prompt copied" : ""}</span>
        </section>
        <section className={styles.section} id="overview">
          <h2 tabIndex={-1}>Overview</h2>
          <p className={styles.sectionLead}>{content.overview}</p>
          <div className={styles.analysisList}>
            {content.analyses.map(({ Icon, title, questions }) => <article className={styles.analysis} key={title}>
              <h3><Icon aria-hidden="true" />{title}</h3>
              <div>{questions.map((question) => <p key={question}>{question}</p>)}</div>
            </article>)}
          </div>
        </section>
        <section className={styles.section} id="results">
          <h2 tabIndex={-1}>Results</h2>
          <p className={styles.sectionLead}>{content.results}</p>
          <div className={styles.safeguardGrid}>
            {content.safeguards.map(({ Icon, title, description }) => <article className={styles.card} key={title}><Icon aria-hidden="true" /><div><h3>{title}</h3><p>{description}</p></div></article>)}
          </div>
        </section>
      </div>
    </article>
  );
}
