"use client";

import { useId, useRef, useState } from "react";
import styles from "./CollapsibleCard.module.css";

type CollapsibleCardProps = {
  title: string;
  /** Optional one-line teaser shown next to the title when collapsed. */
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

const FALLBACK_DURATION_MS = 240;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function motionDurationMs() {
  if (typeof window === "undefined") return FALLBACK_DURATION_MS;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--motion-duration")
    .trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? FALLBACK_DURATION_MS : parsed;
}

/**
 * Accessible, animated <details>/<summary> accordion — the MD3 "expansion
 * panel" pattern from the landing-page brief.
 *
 * Progressive enhancement: the server-rendered markup is a plain native
 * <details>/<summary> pair, which already opens and closes correctly with
 * zero JavaScript. This component only ADDS, once hydrated: a spring-ish
 * height animation (200-300ms), aria-expanded kept in sync on the header,
 * and a rotating chevron. prefers-reduced-motion skips the animation
 * entirely and falls back to the same instant native toggle everyone
 * without JS already gets.
 */
export function CollapsibleCard({
  title,
  summary,
  defaultOpen = false,
  children,
}: CollapsibleCardProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  function handleSummaryClick(event: React.MouseEvent<HTMLElement>) {
    const details = detailsRef.current;
    const content = contentRef.current;
    if (!details || !content) return;

    // We drive `details.open` ourselves below so we can animate the
    // transition; without this the browser would toggle it instantly
    // before our code runs.
    event.preventDefault();

    if (prefersReducedMotion()) {
      const nextOpen = !details.open;
      details.open = nextOpen;
      setIsOpen(nextOpen);
      return;
    }

    animationRef.current?.cancel();
    const duration = motionDurationMs();
    const easing = "cubic-bezier(.2, 0, 0, 1)"; // MD3 "standard" easing

    if (!details.open) {
      // Opening: mark it open so the content is rendered and measurable,
      // then animate the wrapper from 0 up to its natural height.
      details.open = true;
      setIsOpen(true);
      const target = content.scrollHeight;
      content.style.height = "0px";
      animationRef.current = content.animate(
        [{ height: "0px" }, { height: `${target}px` }],
        { duration, easing },
      );
      animationRef.current.onfinish = () => {
        content.style.height = "auto";
      };
    } else {
      // Closing: animate from the current height down to 0, then actually
      // close the <details> so its no-JS semantics (and assistive tech)
      // agree with what's on screen.
      const start = content.scrollHeight;
      setIsOpen(false);
      animationRef.current = content.animate(
        [{ height: `${start}px` }, { height: "0px" }],
        { duration, easing },
      );
      animationRef.current.onfinish = () => {
        details.open = false;
        content.style.height = "";
      };
    }
  }

  return (
    <details ref={detailsRef} className={styles.card} open={defaultOpen}>
      <summary
        className={styles.summary}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={handleSummaryClick}
      >
        <span className={styles.summaryText}>
          <span className={styles.title}>{title}</span>
          {summary ? <span className={styles.teaser}>{summary}</span> : null}
        </span>
        <svg
          className={styles.chevron}
          data-open={isOpen}
          viewBox="0 0 20 20"
          width="20"
          height="20"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div id={contentId} ref={contentRef} className={styles.content}>
        <div className={styles.contentInner}>{children}</div>
      </div>
    </details>
  );
}
