"use client";

import { ArrowDownExclamation24Regular } from "@fluentui/react-icons/svg/arrow-down-exclamation";
import { ArrowLeft24Regular } from "@fluentui/react-icons/svg/arrow-left";
import { CameraSwitch24Regular } from "@fluentui/react-icons/svg/camera-switch";
import { Checkmark16Regular } from "@fluentui/react-icons/svg/checkmark";
import { CheckmarkCircle20Regular } from "@fluentui/react-icons/svg/checkmark-circle";
import { Copy20Regular } from "@fluentui/react-icons/svg/copy";
import { DataFunnel24Regular } from "@fluentui/react-icons/svg/data-funnel";
import { Dismiss24Regular } from "@fluentui/react-icons/svg/dismiss";
import { EyeCircle24Regular } from "@fluentui/react-icons/svg/eye-circle";
import { Flash16Regular } from "@fluentui/react-icons/svg/flash";
import { Fluid24Regular } from "@fluentui/react-icons/svg/fluid";
import { Open20Regular } from "@fluentui/react-icons/svg/open";
import { PeopleCheckmark24Regular } from "@fluentui/react-icons/svg/people-checkmark";
import { PersonWarning24Regular } from "@fluentui/react-icons/svg/person-warning";
import { Production24Regular } from "@fluentui/react-icons/svg/production";
import { Rocket20Regular } from "@fluentui/react-icons/svg/rocket";
import { ShieldTask24Regular } from "@fluentui/react-icons/svg/shield-task";
import { SlideSearch20Regular } from "@fluentui/react-icons/svg/slide-search";
import Link from "next/link";
import { type MouseEvent, useEffect, useRef, useState } from "react";

import styles from "./analyze-survey-details.module.css";

const skillUrl = "https://github.com/microsoft/glintlabs/blob/main/skills/analyze-survey/SKILL.md";
const starterPrompt = "I want to analyze employee survey data.";

const analyses = [
  { Icon: Fluid24Regular, title: "Correlation", questions: [
    "How related are the questions to each-other?",
    "Are there any topics that cluster?",
    "Do we potentially have redundant items?",
  ] },
  { Icon: Production24Regular, title: "Factor Analysis", questions: [
    "Can we group items together into unique dimensions? If so, how much of the overall survey variance does that explain?",
  ] },
  { Icon: PersonWarning24Regular, title: "Attrition", questions: [
    "Why are our people leaving?",
    "We have exit data, are the employees leaving scoring worse on survey items before they exit?",
  ] },
  { Icon: PeopleCheckmark24Regular, title: "Attrition Insights", questions: ["What groups should I target?"] },
  { Icon: CameraSwitch24Regular, title: "Scores Change", questions: [
    "I have two surveys. Can you tell me how the scores have changed? And if those changes are statistically significant?",
  ] },
  { Icon: DataFunnel24Regular, title: "Attribute Deep Dive", questions: [
    "I want all of this analysis filterable by user attributes I provide.",
  ] },
] as const;

const safeguards = [
  {
    Icon: ArrowDownExclamation24Regular,
    title: "Do not infer causation",
    description: "Correlation and factor results describe patterns in the supplied data. They do not establish that one workplace condition caused another.",
  },
  {
    Icon: ShieldTask24Regular,
    title: "Protect employee privacy",
    description: "Confirm small-group suppression, attribute handling, and the contents of the share package before results leave the approved environment.",
  },
  {
    Icon: EyeCircle24Regular,
    title: "Review before acting",
    description: "A qualified reviewer should inspect data quality, assumptions, caveats, and surprising findings before the analysis informs a consequential decision.",
  },
] as const;

const sections = [
  { id: "start-using", label: "Start using", Icon: Rocket20Regular },
  { id: "overview", label: "Overview", Icon: SlideSearch20Regular },
  { id: "results", label: "Results", Icon: CheckmarkCircle20Regular },
] as const;
type SectionId = (typeof sections)[number]["id"];

export function AnalyzeSurveyDetails({ onClose }: { onClose?: () => void }) {
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
    <article ref={detailsRef} className={`${styles.details} ${onClose ? styles.modalDetails : ""}`} data-scroll-more={isModal && canScrollMore || undefined} data-figma-node-id="1747:42711">
      <header className={styles.header}>
        {!onClose ? <div className={styles.topRow}>
          <Link className={styles.backAction} href="/tools"><ArrowLeft24Regular aria-hidden="true" />All tools</Link>
        </div> : null}
        <div className={styles.headerContent}>
          <span className={styles.skillBadge}><Flash16Regular aria-hidden="true" />Skill</span>
          <h1>Analyze Survey</h1>
          <div className={styles.titleRow}>
            <div>
              <p>Turn employee survey data into advanced analysis with an AI-guided, no-code workflow. Explore inter-item correlations, factor analysis, attrition analysis, and comparisons across surveys in an interactive report you can filter, export, and share.</p>
              <span>By Microsoft People Science</span>
            </div>
            {!onClose ? <a className={styles.githubAction} href={skillUrl} rel="noreferrer" target="_blank"><Open20Regular aria-hidden="true" />View on GitHub</a> : null}
          </div>
        </div>
        {onClose ? <button aria-label="Close Analyze Survey details" data-dialog-initial-focus className={styles.closeAction} onClick={onClose} type="button"><Dismiss24Regular aria-hidden="true" /></button> : null}
        <nav aria-label="Analyze Survey sections" className={styles.sectionNav}>
          {sections.map(({ id, label, Icon }) => <a key={id} aria-current={activeSection === id ? "location" : undefined} className={activeSection === id ? styles.activeSectionLink : undefined} href={`#${id}`} onClick={(event) => scrollToSection(event, id)}><Icon aria-hidden="true" />{label}</a>)}
        </nav>
      </header>
      <div
        ref={contentRef}
        aria-label={isModal ? "Analyze Survey content" : undefined}
        className={styles.content}
        role={isModal ? "region" : undefined}
        tabIndex={isModal ? 0 : undefined}
      >
        <section className={styles.section} id="start-using">
          <h2 tabIndex={-1}>Start using</h2>
          <ol className={styles.setupSteps}>
            <li>
              <div className={styles.stepHeading}><span aria-hidden="true">1</span><div><h3>Open Copilot in your terminal</h3><p>Open your terminal and start GitHub Copilot CLI. Copy the link below, paste it into Copilot, and ask it to use the Analyze Survey skill.</p></div></div>
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
              <div className={styles.stepHeading}><span aria-hidden="true">2</span><div><h3>Start an analysis</h3><p>When Copilot opens, paste this prompt. The skill will ask how you want to provide survey data before it runs.</p></div></div>
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
          <p className={styles.sectionLead}>The Analyze Survey skill uses advanced statistical methods from our <a href="https://github.com/microsoft/vivaglint_py" rel="noreferrer" target="_blank">Viva Glint Analytics Library</a>. Every run of Analyze Survey is inspected and evaluated for accuracy and repeatability.</p>
          <div className={styles.analysisList}>
            {analyses.map(({ Icon, title, questions }) => <article className={styles.analysis} key={title}>
              <h3><Icon aria-hidden="true" />{title}</h3>
              <div>{questions.map((question) => <p key={question}>{question}</p>)}</div>
            </article>)}
          </div>
        </section>
        <section className={styles.section} id="results">
          <h2 tabIndex={-1}>Results</h2>
          <p className={styles.sectionLead}>Analyze Survey makes a repeatable workflow easier to run. It does not remove the need for methodological review, organizational context, or responsible handling of employee data.</p>
          <div className={styles.safeguardGrid}>
            {safeguards.map(({ Icon, title, description }) => <article className={styles.card} key={title}><Icon aria-hidden="true" /><div><h3>{title}</h3><p>{description}</p></div></article>)}
          </div>
        </section>
      </div>
    </article>
  );
}
