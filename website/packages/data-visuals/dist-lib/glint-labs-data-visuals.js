"use client";
import { Fragment as e, jsx as t, jsxs as n } from "react/jsx-runtime";
import { Fragment as r, useId as i, useState as a } from "react";
//#region src/lib/visual-frame.tsx
function o({ children: e, className: n = "", ...r }) {
	return /* @__PURE__ */ t("section", {
		className: `glint-visual-frame ${n}`.trim(),
		...r,
		children: e
	});
}
function s({ eyebrow: e, title: r, subtitle: i }) {
	return /* @__PURE__ */ n("header", {
		className: "glint-visual-header",
		children: [
			e ? /* @__PURE__ */ t("p", {
				className: "glint-visual-eyebrow",
				children: e
			}) : null,
			/* @__PURE__ */ t("h2", { children: r }),
			i ? /* @__PURE__ */ t("p", {
				className: "glint-visual-subtitle",
				children: i
			}) : null
		]
	});
}
function c({ children: e }) {
	return /* @__PURE__ */ t("p", {
		className: "glint-visual-annotation",
		children: e
	});
}
function l({ children: e }) {
	return /* @__PURE__ */ t("p", {
		className: "glint-visual-source",
		children: e
	});
}
//#endregion
//#region src/lib/data-cards.tsx
function u({ children: e, className: n, labelledBy: r }) {
	return /* @__PURE__ */ t("article", {
		className: `glint-data-card ${n}`,
		"aria-labelledby": r,
		children: e
	});
}
function d({ title: e, statement: r, titleId: i }) {
	return /* @__PURE__ */ n("header", {
		className: "glint-data-card__heading",
		children: [/* @__PURE__ */ t("h3", {
			id: i,
			children: e
		}), /* @__PURE__ */ t("p", { children: r })]
	});
}
function f({ title: e, statement: r, interpretation: a }) {
	let o = i();
	return /* @__PURE__ */ n(u, {
		className: "glint-data-card--insight",
		labelledBy: o,
		children: [/* @__PURE__ */ t(d, {
			title: e,
			statement: r,
			titleId: o
		}), a ? /* @__PURE__ */ t("p", {
			className: "glint-data-card__interpretation",
			children: a
		}) : null]
	});
}
//#endregion
//#region src/lib/lead-statement.tsx
function p({ children: e }) {
	return /* @__PURE__ */ t("aside", {
		className: "glint-lead-statement",
		children: /* @__PURE__ */ t("p", { children: e })
	});
}
//#endregion
//#region src/lib/outcome-metric-card.tsx
function m(e, t) {
	if (!Number.isInteger(e) || e < 0) throw Error("OutcomeMetricCard numerator must be a nonnegative integer.");
	if (!Number.isInteger(t) || t <= 0) throw Error("OutcomeMetricCard denominator must be a positive integer.");
	if (e > t) throw Error("OutcomeMetricCard numerator cannot be greater than its denominator.");
}
function h() {
	return /* @__PURE__ */ t("svg", {
		className: "glint-outcome-metric__icon",
		"aria-hidden": "true",
		viewBox: "0 0 19 20.5",
		children: /* @__PURE__ */ t("path", { d: "M3 0c1.306 0 2.414.835 2.826 2h8.924A4.25 4.25 0 0 1 19 6.25a4.25 4.25 0 0 1-4.25 4.25h-9.5a2.75 2.75 0 1 0 0 5.5h11.19l-1.72-1.72a.75.75 0 0 1 1.06-1.06l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 0 1-1.06-1.06l1.72-1.72H5.25A4.25 4.25 0 0 1 1 13.25 4.25 4.25 0 0 1 5.25 9h9.5a2.75 2.75 0 1 0 0-5.5H5.958A3 3 0 1 1 3 0Zm0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" })
	});
}
function g({ title: e, description: r, numerator: a, denominator: o }) {
	m(a, o);
	let s = i(), c = i(), l = Math.round(a / o * 100);
	return /* @__PURE__ */ n("article", {
		className: "glint-outcome-metric",
		"aria-labelledby": s,
		"aria-describedby": c,
		children: [
			/* @__PURE__ */ t(h, {}),
			/* @__PURE__ */ t("h3", {
				id: s,
				children: e
			}),
			/* @__PURE__ */ t("p", {
				className: "glint-outcome-metric__description",
				id: c,
				children: r
			}),
			/* @__PURE__ */ n("p", {
				className: "glint-outcome-metric__value",
				"aria-label": `${a} of ${o}, ${l}%`,
				children: [/* @__PURE__ */ n("strong", { children: [
					a,
					" / ",
					o
				] }), /* @__PURE__ */ n("span", { children: [
					"(",
					l,
					"%)"
				] })]
			})
		]
	});
}
//#endregion
//#region src/lib/outcome-focus-card.tsx
function _() {
	return /* @__PURE__ */ n("svg", {
		className: "glint-outcome-focus__illustration",
		"aria-hidden": "true",
		viewBox: "0 0 128 128",
		children: [
			/* @__PURE__ */ t("path", {
				d: "M59.639 63.885h40.177c1.923 0 3.126 2.08 2.167 3.747l-20.98 36.464a10 10 0 0 1-8.668 5.013h-38.32l25.624-45.224Z",
				fill: "#f6fafe"
			}),
			/* @__PURE__ */ t("path", {
				d: "M72.212 22.546a4.75 4.75 0 0 1 6.521-.005l24.484 23.07c1.482 1.396.494 3.887-1.543 3.887H97.4a2.47 2.47 0 0 0-2.469 2.465 66 66 0 0 1-8.909 33.058l-10.965 18.967a9.75 9.75 0 0 1-8.441 4.87H33.573l13.641-23.595a66 66 0 0 0 8.971-33.29 2.473 2.473 0 0 0-2.469-2.475h-4.364c-2.035 0-3.025-2.487-1.546-3.885l24.406-23.067Z",
				fill: "#2764e7",
				stroke: "#889096",
				strokeWidth: ".5"
			}),
			/* @__PURE__ */ t("path", {
				d: "m30.414 68.05 14.359-13.571a2.5 2.5 0 0 1 3.432-.003l14.433 13.6c1.497 1.41.499 3.926-1.558 3.926h-.883c-.765 0-1.386.62-1.388 1.385a41.3 41.3 0 0 1-5.59 20.742l-7.216 12.482a5 5 0 0 1-4.328 2.498H24.36c-1.925 0-3.128-2.085-2.164-3.752l6.494-11.233a41.3 41.3 0 0 0 5.587-20.731 1.389 1.389 0 0 0-1.387-1.39h-.904c-2.07 0-3.077-2.53-1.572-3.953Z",
				fill: "#b3e0ff"
			})
		]
	});
}
function v() {
	return /* @__PURE__ */ n("svg", {
		className: "glint-outcome-focus__illustration",
		"aria-hidden": "true",
		viewBox: "0 0 512 512",
		children: [
			/* @__PURE__ */ t("path", {
				d: "M344.549 149.838C380.323 179.506 369.058 252.109 319.389 312.002C269.72 371.895 200.455 396.398 164.681 366.731C129.186 337.295 139.997 265.591 188.682 205.972L189.839 204.566C239.12 145.141 307.692 120.556 343.703 149.152L344.549 149.838ZM370.161 114.55C333.122 83.834 292.371 82.859 255.523 95.893C217.529 109.334 180.532 136.488 150.873 172.252C121.214 208.016 101.374 249.398 95.196 289.222C89.204 327.845 101.735 368.939 138.774 399.655C175.813 430.371 216.859 433.709 253.706 420.674C291.7 407.234 328.696 380.08 358.355 344.316C388.014 308.553 407.855 267.17 414.033 227.346C420.025 188.722 407.199 145.266 370.161 114.55Z",
				fill: "#f6fafe"
			}),
			/* @__PURE__ */ t("path", {
				d: "M249.945 97.481C283.771 83.811 326.396 79.272 358.092 105.557C389.789 131.843 393.698 175.95 386.524 211.716C379.135 248.558 360.41 286.417 332.004 320.671C303.605 354.915 267.449 381.28 232.6 395.362C198.775 409.031 156.149 413.571 124.454 387.287C92.759 361.002 89.334 318.273 96.509 282.502C101.031 259.957 110.196 236.616 123.147 214.038C123.345 213.693 123.436 213.296 123.407 212.897L119.275 155.684C118.519 145.218 126.391 136.12 136.857 135.364C147.323 134.609 156.419 142.48 157.176 152.946L157.738 160.736C157.866 162.504 160.048 163.233 161.226 161.938C187.766 132.747 218.768 110.079 249.945 97.481ZM327.614 140.883C312.661 129.03 290.739 128.566 266.986 137.086C242.824 145.753 216.546 163.778 193.214 189.057C191.793 190.596 193.398 193 195.369 192.258L213.575 185.395C223.394 181.694 234.354 186.654 238.055 196.473C241.756 206.291 236.797 217.252 226.978 220.953L157.537 247.128C156.292 247.597 155.029 247.927 153.766 248.125C153.114 248.228 152.53 248.643 152.239 249.265C142.268 270.567 137.076 291.329 137.204 309.137C137.329 326.666 142.616 341.433 153.693 350.939L154.225 351.388L154.235 351.396L154.969 351.988L155.008 352.02L155.05 352.047C160.778 355.8 169.296 357.307 179.458 356.656C189.645 356.004 201.606 353.175 214.334 348.115C239.792 337.994 268.42 318.906 292.204 290.227L293.317 288.872C316.812 260.144 331.701 229.47 337.685 202.934C343.653 176.469 340.815 153.821 328.385 141.515L328.354 141.483L328.32 141.456L327.614 140.883Z",
				fill: "#2764e7",
				stroke: "#889096",
				strokeWidth: "2"
			}),
			/* @__PURE__ */ t("path", {
				d: "M152.794 248.676C140.1 253.593 126.224 245.011 124.956 231.457L123.258 213.312",
				fill: "none",
				stroke: "#750b1c",
				strokeWidth: "1.993"
			}),
			/* @__PURE__ */ t("circle", {
				cx: "177.186",
				cy: "363.899",
				fill: "#f6fafe",
				r: "27.5"
			})
		]
	});
}
function y() {
	return /* @__PURE__ */ n("svg", {
		className: "glint-outcome-focus__illustration",
		"aria-hidden": "true",
		viewBox: "0 0 512 512",
		children: [
			/* @__PURE__ */ t("path", {
				d: "M339.128 434.373H74.248C58.843 434.373 49.221 417.689 56.937 404.356L131.888 274.836C139.039 262.48 152.233 254.871 166.509 254.871L431.209 254.872C446.604 254.872 456.227 271.538 448.53 284.871L373.77 414.372C366.624 426.748 353.419 434.373 339.128 434.373Z",
				fill: "#2764e7",
				stroke: "#889096",
				strokeWidth: "2"
			}),
			/* @__PURE__ */ t("path", {
				d: "M339.774 264.17C339.774 285.2 302.564 302.248 256.646 302.248C210.728 302.248 173.518 285.2 173.518 264.17V231.663C173.518 186.022 210.728 149.013 256.646 149.013C302.564 149.013 339.774 186.009 339.774 231.663V264.17Z",
				fill: "#f6fafe"
			}),
			/* @__PURE__ */ t("circle", {
				cx: "256.644",
				cy: "118.437",
				fill: "#b3e0ff",
				r: "41.833"
			}),
			/* @__PURE__ */ t("circle", {
				cx: "278.15",
				cy: "369.645",
				fill: "#f6fafe",
				r: "31.135"
			}),
			/* @__PURE__ */ t("path", {
				d: "M175.151 258.267C176.697 260.324 178.906 263.277 181.557 266.868C186.858 274.05 193.925 283.775 200.991 293.953C208.059 304.135 215.117 314.756 220.403 323.731C223.047 328.22 225.237 332.28 226.764 335.657C228.311 339.081 229.106 341.658 229.106 343.242C229.106 349.905 223.27 356.25 213.107 360.989C203.026 365.69 189.03 368.625 173.52 368.625C158.009 368.625 144.013 365.692 133.932 360.993C123.769 356.256 117.933 349.91 117.933 343.242C117.933 341.657 118.728 339.078 120.275 335.654C121.802 332.276 123.992 328.216 126.636 323.726C131.922 314.751 138.98 304.131 146.048 293.95C153.114 283.772 160.181 274.047 165.482 266.866C168.133 263.276 170.342 260.322 171.888 258.266C172.565 257.365 173.114 256.636 173.519 256.102C173.923 256.637 174.473 257.366 175.151 258.267Z",
				fill: "#16bbda",
				stroke: "#babaff",
				strokeWidth: "2"
			}),
			/* @__PURE__ */ t("circle", {
				cx: "173.515",
				cy: "244.978",
				fill: "#102784",
				r: "32.051",
				stroke: "#73edd8",
				strokeWidth: "2"
			}),
			/* @__PURE__ */ t("path", {
				d: "M402.096 322.261C402.096 334.447 380.637 344.316 354.16 344.316C327.682 344.316 306.224 334.437 306.224 322.261V241.564H402.086V322.261H402.096Z",
				fill: "#b3e0ff"
			}),
			/* @__PURE__ */ t("ellipse", {
				cx: "354.16",
				cy: "241.542",
				fill: "#2764e7",
				rx: "47.936",
				ry: "22.054"
			}),
			/* @__PURE__ */ t("circle", {
				cx: "354.16",
				cy: "194.669",
				fill: "#9299f7",
				r: "35.392",
				stroke: "#889096",
				strokeWidth: "1.993"
			})
		]
	});
}
function b({ illustration: e }) {
	return t(e === "action" ? v : e === "trust" ? y : _, {});
}
function x({ illustration: e = "growth", label: r }) {
	let a = i();
	return /* @__PURE__ */ n("article", {
		className: "glint-outcome-focus",
		"aria-labelledby": a,
		children: [/* @__PURE__ */ t(b, { illustration: e }), /* @__PURE__ */ t("p", {
			id: a,
			children: r
		})]
	});
}
//#endregion
//#region src/lib/pull-quote.tsx
function S({ quote: r, attribution: a, role: o, annotation: s }) {
	let c = i();
	return /* @__PURE__ */ n("figure", {
		className: "glint-pull-quote",
		"aria-labelledby": c,
		children: [
			/* @__PURE__ */ t("span", {
				className: "glint-pull-quote__rule",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ t("span", {
				className: "glint-pull-quote__mark",
				"aria-hidden": "true",
				children: "“"
			}),
			/* @__PURE__ */ t("blockquote", {
				id: c,
				children: /* @__PURE__ */ t("p", { children: r })
			}),
			a ? /* @__PURE__ */ n("figcaption", { children: [
				/* @__PURE__ */ t("strong", { children: a }),
				o ? /* @__PURE__ */ n(e, { children: [/* @__PURE__ */ t("span", {
					"aria-hidden": "true",
					children: "/"
				}), /* @__PURE__ */ t("span", { children: o })] }) : null,
				s ? /* @__PURE__ */ n(e, { children: [/* @__PURE__ */ t("span", {
					"aria-hidden": "true",
					children: "/"
				}), /* @__PURE__ */ t("span", {
					className: "glint-pull-quote__annotation",
					children: s
				})] }) : null
			] }) : null
		]
	});
}
//#endregion
//#region src/lib/right-fit-guardrails.tsx
function C({ className: e, label: r, question: i }) {
	return /* @__PURE__ */ n("section", {
		className: `glint-guardrail-card ${e}`,
		children: [/* @__PURE__ */ t("h3", { children: r }), /* @__PURE__ */ t("p", { children: i })]
	});
}
function w() {
	return /* @__PURE__ */ n("svg", {
		className: "glint-guardrails__connectors",
		"aria-hidden": "true",
		viewBox: "0 0 678 496",
		children: [
			/* @__PURE__ */ t("path", {
				d: "M250 69.5h35c11.046 0 20 8.954 20 20v61",
				stroke: "#c4e7ff"
			}),
			/* @__PURE__ */ t("path", {
				d: "M435.5 69.5h-35c-11.046 0-20 8.954-20 20v61",
				stroke: "#7fbce7"
			}),
			/* @__PURE__ */ t("path", {
				d: "M343 346v20",
				stroke: "#9299f7"
			}),
			/* @__PURE__ */ t("path", {
				d: "M172 248h20",
				stroke: "#626ad5"
			}),
			/* @__PURE__ */ t("path", {
				d: "M486 248h20",
				stroke: "#38cce8"
			})
		]
	});
}
function T() {
	return /* @__PURE__ */ t("svg", {
		"aria-hidden": "true",
		viewBox: "0 0 24 24",
		children: /* @__PURE__ */ t("path", {
			d: "M11.25 6.75a.75.75 0 0 1 1.5 0v1.5a.75.75 0 0 1-1.5 0v-1.5Zm5.03 1.466a.75.75 0 0 0-1.06 0l-1.061 1.06a.75.75 0 1 0 1.06 1.061l1.061-1.06a.75.75 0 0 0 0-1.061Zm-7.5 0a.75.75 0 0 0-1.06 1.06l1.06 1.061a.75.75 0 0 0 1.061-1.06l-1.06-1.061ZM12 2a7.25 7.25 0 0 1 4.587 12.992.75.75 0 0 0-.175.265l-1.163 4.999A2.25 2.25 0 0 1 13.057 22h-2.114a2.25 2.25 0 0 1-2.192-1.745l-1.13-4.895a.75.75 0 0 0-.206-.367A7.25 7.25 0 0 1 12 2Zm2.115 16.499H9.884l.329 1.419a.75.75 0 0 0 .73.581h2.114a.75.75 0 0 0 .73-.581l.328-1.42ZM12 3.5a5.75 5.75 0 0 0-3.537 10.419c.31.303.527.686.62 1.104l.455 1.976h1.712V10.75a.75.75 0 0 1 1.5 0v6.249h1.711l.458-1.977c.094-.415.307-.797.62-1.102A5.75 5.75 0 0 0 12 3.5Z",
			fill: "currentColor"
		})
	});
}
function E({ title: e, description: r, trustworthy: a, intelligent: o, embedded: s, responsive: c, outcomeDriven: l, centerLabel: u, centerStatement: d, centerConstraint: f, footer: p }) {
	let m = i(), h = i();
	return /* @__PURE__ */ n("article", {
		className: "glint-guardrails",
		"aria-labelledby": m,
		"aria-describedby": h,
		children: [
			/* @__PURE__ */ n("header", {
				className: "glint-guardrails__header",
				children: [/* @__PURE__ */ t("h2", {
					id: m,
					children: e
				}), /* @__PURE__ */ t("p", {
					id: h,
					children: r
				})]
			}),
			/* @__PURE__ */ n("div", {
				className: "glint-guardrails__diagram",
				children: [
					/* @__PURE__ */ t(w, {}),
					/* @__PURE__ */ t(C, {
						...a,
						className: "glint-guardrail-card--trustworthy"
					}),
					/* @__PURE__ */ t(C, {
						...o,
						className: "glint-guardrail-card--intelligent"
					}),
					/* @__PURE__ */ t(C, {
						...s,
						className: "glint-guardrail-card--embedded"
					}),
					/* @__PURE__ */ t(C, {
						...c,
						className: "glint-guardrail-card--responsive"
					}),
					/* @__PURE__ */ t(C, {
						...l,
						className: "glint-guardrail-card--outcome"
					}),
					/* @__PURE__ */ n("section", {
						className: "glint-guardrails__center",
						children: [
							/* @__PURE__ */ t("h3", { children: u }),
							/* @__PURE__ */ t("p", {
								className: "glint-guardrails__statement",
								children: d
							}),
							/* @__PURE__ */ t("p", { children: f })
						]
					})
				]
			}),
			/* @__PURE__ */ t("div", { className: "glint-guardrails__divider" }),
			/* @__PURE__ */ n("footer", {
				className: "glint-guardrails__footer",
				children: [/* @__PURE__ */ t("span", { children: /* @__PURE__ */ t(T, {}) }), /* @__PURE__ */ t("p", { children: p })]
			})
		]
	});
}
//#endregion
//#region src/lib/skill-priority-stack.tsx
function D(e) {
	if (e.length !== 3) throw Error("SkillPriorityStack requires exactly three layers.");
	e.forEach((e) => {
		if (!Number.isInteger(e.percentage) || e.percentage < 0 || e.percentage > 100) throw Error("SkillPriorityStack percentages must be integers from 0 to 100.");
		if (e.details.length === 0) throw Error("SkillPriorityStack layers require at least one supporting detail.");
	});
}
function O({ eyebrow: e, title: a, description: o, layers: s }) {
	D(s);
	let c = i(), l = i();
	return /* @__PURE__ */ n("article", {
		className: "glint-skill-stack",
		"aria-labelledby": c,
		"aria-describedby": l,
		children: [/* @__PURE__ */ n("div", {
			className: "glint-skill-stack__intro",
			children: [/* @__PURE__ */ t("p", {
				className: "glint-skill-stack__eyebrow",
				children: e
			}), /* @__PURE__ */ n("header", {
				className: "glint-skill-stack__header",
				children: [/* @__PURE__ */ t("h2", {
					id: c,
					children: a
				}), /* @__PURE__ */ t("p", {
					id: l,
					children: o
				})]
			})]
		}), /* @__PURE__ */ t("div", {
			className: "glint-skill-stack__layers",
			children: s.map((e, i) => /* @__PURE__ */ n(r, { children: [/* @__PURE__ */ n("section", {
				className: "glint-skill-stack__layer",
				children: [/* @__PURE__ */ n("div", {
					className: "glint-skill-stack__metric",
					children: [/* @__PURE__ */ t("p", {
						className: "glint-skill-stack__badge",
						children: e.badge
					}), /* @__PURE__ */ n("h3", { children: [
						e.percentage,
						"% ",
						e.skill
					] })]
				}), /* @__PURE__ */ n("div", {
					className: "glint-skill-stack__details",
					children: [/* @__PURE__ */ t("p", { children: e.summary }), /* @__PURE__ */ t("ul", { children: e.details.map((e) => /* @__PURE__ */ t("li", { children: e }, e)) })]
				})]
			}), i < s.length - 1 ? /* @__PURE__ */ t("div", { className: "glint-skill-stack__divider" }) : null] }, e.badge))
		})]
	});
}
//#endregion
//#region src/lib/listening-speed-gap.tsx
var k = [
	{
		id: "minimum",
		markerCount: 1,
		zone: "Insufficient signal",
		title: "Important changes may be going unheard",
		description: "With few listening moments, shifts can go undetected until decisions are underway or conditions have already changed.",
		action: "Start with the highest-priority business questions and add a timely listening channel.",
		positive: !1
	},
	{
		id: "low",
		markerCount: 3,
		zone: "Insufficient signal",
		title: "Your listening approach may leave important signal gaps",
		description: "Current business questions can remain unanswered while understanding becomes outdated between listening moments.",
		action: "Add or diversify listening where decisions lack timely, relevant evidence.",
		positive: !1
	},
	{
		id: "balanced",
		markerCount: 5,
		zone: "Right-fit listening",
		title: "Signal and synthesis are in balance",
		description: "Listening is frequent enough to keep understanding current without outpacing the organization’s ability to interpret and act.",
		action: "What change in priorities or pace would require reassessing this balance?",
		positive: !0
	},
	{
		id: "high",
		markerCount: 10,
		zone: "Synthesis overload",
		title: "Feedback may be arriving faster than it can be used",
		description: "More collection can create synthesis backlog, delay action, and ask employees for input without a visible response.",
		action: "Prioritize key questions, sequence collection, or increase synthesis capacity.",
		positive: !1
	},
	{
		id: "overload",
		markerCount: 16,
		zone: "Synthesis overload",
		title: "Listening volume is outpacing synthesis capacity",
		description: "A growing backlog can make feedback stale, obscure priorities, and weaken trust when employees do not see a visible response.",
		action: "Pause lower-priority collection, clear the synthesis backlog, and close the loop before adding new listening.",
		positive: !1
	}
];
function ee() {
	return /* @__PURE__ */ t("svg", {
		"aria-hidden": "true",
		preserveAspectRatio: "none",
		viewBox: "0 0 668 42",
		children: [
			16,
			1,
			10,
			24,
			8,
			16,
			1,
			12
		].map((e, n) => {
			let r = n * 83.5, i = r + 41.75, a = r + 83.5;
			return /* @__PURE__ */ t("path", { d: `M${r} 40C${r + 22.3376} 40 ${r + 27.3901} ${e} ${i} ${e}C${r + 56.1099} ${e} ${r + 61.1624} 40 ${a} 40` }, `${e}-${n}`);
		})
	});
}
function te() {
	return /* @__PURE__ */ t("svg", {
		"aria-hidden": "true",
		viewBox: "0 0 20 20",
		children: /* @__PURE__ */ t("path", {
			d: "M6.5 10a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1M7 13.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0M3 6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zm2.5-1a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1zM8 9.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0m0 4a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0m1-4a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 0-1h-5a.5.5 0 0 0-.5.5m.5 3.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1z",
			fill: "currentColor"
		})
	});
}
function ne() {
	return /* @__PURE__ */ t("svg", {
		"aria-hidden": "true",
		viewBox: "0 0 20 20",
		children: /* @__PURE__ */ t("path", {
			d: "M7.37 3.553c1.14-2.074 4.12-2.074 5.259 0l5.496 10.005c1.098 1.999-.349 4.444-2.63 4.444H4.504c-2.281 0-3.727-2.445-2.629-4.444zm4.383.482c-.76-1.383-2.746-1.383-3.506 0L2.751 14.039c-.732 1.333.232 2.963 1.753 2.963h10.991c1.52 0 2.485-1.63 1.753-2.963zM10 12.748a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5m0-6.25a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5",
			fill: "currentColor"
		})
	});
}
function re() {
	return /* @__PURE__ */ t("svg", {
		"aria-hidden": "true",
		viewBox: "0 0 20 20",
		children: /* @__PURE__ */ t("path", {
			d: "M10.053 2.29c.34-.978 1.632-1.428 2.431-.591.163.17.325.355.435.519.32.48.454 1.113.504 1.73.05.628.016 1.302-.048 1.912a18 18 0 0 1-.252 1.635h.884c1.872 0 3.287 1.695 2.952 3.537l-.684 3.761c-.472 2.596-3.066 4.23-5.612 3.536l-5.6-1.526a2.5 2.5 0 0 1-1.793-1.922l-.353-1.765c-.278-1.389.784-2.559 1.913-3.005.323-.127.614-.289.841-.49 1.706-1.513 2.324-2.723 3.384-4.849.354-.71.718-1.676.998-2.483m1.965 5.584.01-.04c.007-.028.016-.07.028-.124.025-.108.059-.265.097-.46.076-.388.167-.92.228-1.495.06-.577.088-1.185.045-1.728-.045-.555-.16-.985-.34-1.255a3 3 0 0 0-.326-.383c-.199-.208-.628-.16-.762.228-.283.814-.664 1.83-1.048 2.6-1.067 2.141-1.756 3.502-3.616 5.152-.34.302-.744.517-1.136.672-.881.348-1.447 1.148-1.301 1.879l.353 1.765c.111.557.528 1.003 1.076 1.153l5.6 1.527c1.98.54 3.997-.732 4.364-2.751l.685-3.761c.223-1.228-.72-2.358-1.968-2.358h-1.504a.5.5 0 0 1-.485-.622",
			fill: "currentColor"
		})
	});
}
function ie() {
	return /* @__PURE__ */ t("svg", {
		"aria-hidden": "true",
		viewBox: "0 0 20 20",
		children: /* @__PURE__ */ t("path", {
			d: "M12.646 3.646a.5.5 0 0 0 0 .708L16.293 8H9.5A7.5 7.5 0 0 0 2 15.5a.5.5 0 0 0 1 0A6.5 6.5 0 0 1 9.5 9h6.793l-3.647 3.646a.5.5 0 0 0 .708.708l4.5-4.5a.5.5 0 0 0 0-.708l-4.5-4.5a.5.5 0 0 0-.708 0",
			fill: "currentColor"
		})
	});
}
function ae({ defaultFit: e = "balanced", description: r = "The goal is not maximum collection. It is enough timely signal to understand what is changing without overwhelming the ability to synthesize and act.", eyebrow: o = "Right-fit listening signal", fit: s, onFitChange: c, title: l = "Match listening to the questions, decisions, and pace of work" }) {
	let [u, d] = a(e), f = i(), p = s ?? u, m = k.findIndex((e) => e.id === p), h = m === -1 ? 2 : m, g = k[h];
	function _(e) {
		let t = k[e]?.id;
		t !== void 0 && (s === void 0 && d(t), c?.(t));
	}
	return /* @__PURE__ */ n("section", {
		"aria-labelledby": f,
		className: "glint-listening-speed",
		children: [
			/* @__PURE__ */ t("p", {
				className: "glint-listening-speed__eyebrow",
				children: o
			}),
			/* @__PURE__ */ n("div", {
				className: "glint-listening-speed__heading",
				children: [/* @__PURE__ */ t("h2", {
					id: f,
					children: l
				}), /* @__PURE__ */ t("p", { children: r })]
			}),
			/* @__PURE__ */ t("div", { className: "glint-listening-speed__header-divider" }),
			/* @__PURE__ */ n("div", {
				className: "glint-listening-speed__visual",
				children: [
					/* @__PURE__ */ t("p", {
						className: "glint-listening-speed__visual-title",
						children: "Pace of work relative to listening density"
					}),
					/* @__PURE__ */ n("div", {
						className: "glint-listening-speed__signal",
						children: [/* @__PURE__ */ t("div", {
							className: "glint-listening-speed__wave",
							children: /* @__PURE__ */ t(ee, {})
						}), /* @__PURE__ */ t("div", {
							"aria-label": `${g.markerCount} listening moments at the ${g.zone.toLowerCase()} position`,
							className: `glint-listening-speed__density ${g.markerCount === 1 ? "glint-listening-speed__density--single" : ""}`,
							role: "img",
							children: Array.from({ length: g.markerCount }, (e, n) => /* @__PURE__ */ t("span", {
								"aria-hidden": "true",
								className: "glint-listening-speed__marker",
								children: /* @__PURE__ */ t(te, {})
							}, n))
						})]
					}),
					/* @__PURE__ */ t("label", {
						className: "glint-listening-speed__prompt",
						htmlFor: `${f}-fit`,
						children: "Drag to explore your listening fit"
					}),
					/* @__PURE__ */ n("div", {
						className: "glint-listening-speed__range-wrap",
						children: [
							/* @__PURE__ */ t("div", {
								"aria-hidden": "true",
								className: "glint-listening-speed__range-track"
							}),
							/* @__PURE__ */ n("span", {
								"aria-hidden": "true",
								className: "glint-listening-speed__range-ticks",
								children: [
									/* @__PURE__ */ t("i", {}),
									/* @__PURE__ */ t("i", {}),
									/* @__PURE__ */ t("i", {})
								]
							}),
							/* @__PURE__ */ t("input", {
								"aria-valuetext": `${g.zone}. ${g.title}.`,
								id: `${f}-fit`,
								max: k.length - 1,
								min: 0,
								onChange: (e) => _(Number(e.target.value)),
								step: 1,
								type: "range",
								value: h
							})
						]
					}),
					/* @__PURE__ */ n("div", {
						"aria-hidden": "true",
						className: "glint-listening-speed__scale",
						children: [
							/* @__PURE__ */ t("span", { children: "Insufficient signal" }),
							/* @__PURE__ */ t("i", {}),
							/* @__PURE__ */ t("span", { children: "Right-fit listening" }),
							/* @__PURE__ */ t("i", {}),
							/* @__PURE__ */ t("span", { children: "Synthesis overload" })
						]
					})
				]
			}),
			/* @__PURE__ */ n("div", {
				"aria-live": "polite",
				className: `glint-listening-speed__result ${g.positive ? "glint-listening-speed__result--positive" : ""}`,
				children: [
					/* @__PURE__ */ n("div", {
						className: "glint-listening-speed__result-column",
						children: [
							/* @__PURE__ */ t("span", {
								className: "glint-listening-speed__result-icon",
								children: g.positive ? /* @__PURE__ */ t(re, {}) : /* @__PURE__ */ t(ne, {})
							}),
							/* @__PURE__ */ t("p", {
								className: "glint-listening-speed__result-title",
								children: g.title
							}),
							/* @__PURE__ */ t("p", {
								className: "glint-listening-speed__result-copy",
								children: g.description
							})
						]
					}),
					/* @__PURE__ */ t("span", {
						"aria-hidden": "true",
						className: "glint-listening-speed__result-divider"
					}),
					/* @__PURE__ */ n("div", {
						className: "glint-listening-speed__result-column",
						children: [
							/* @__PURE__ */ t("span", {
								className: "glint-listening-speed__result-icon",
								children: /* @__PURE__ */ t(ie, {})
							}),
							/* @__PURE__ */ t("p", {
								className: "glint-listening-speed__result-action-title",
								children: "Consider next"
							}),
							/* @__PURE__ */ t("p", {
								className: "glint-listening-speed__result-copy",
								children: g.action
							})
						]
					})
				]
			}),
			/* @__PURE__ */ n("table", {
				className: "glint-visually-hidden",
				children: [
					/* @__PURE__ */ t("caption", { children: "Listening fit states and recommended actions" }),
					/* @__PURE__ */ t("thead", { children: /* @__PURE__ */ n("tr", { children: [
						/* @__PURE__ */ t("th", { children: "State" }),
						/* @__PURE__ */ t("th", { children: "Listening moments" }),
						/* @__PURE__ */ t("th", { children: "Interpretation" }),
						/* @__PURE__ */ t("th", { children: "Consider next" })
					] }) }),
					/* @__PURE__ */ t("tbody", { children: k.map((e) => /* @__PURE__ */ n("tr", { children: [
						/* @__PURE__ */ t("th", { children: e.zone }),
						/* @__PURE__ */ t("td", { children: e.markerCount }),
						/* @__PURE__ */ t("td", { children: e.description }),
						/* @__PURE__ */ t("td", { children: e.action })
					] }, e.id)) })
				]
			})
		]
	});
}
//#endregion
//#region src/lib/listening-maturity.tsx
var oe = [
	{
		id: "participation",
		title: "Inclusive participation and access",
		question: "Who can the system reliably hear?",
		color: "#c4e7ff",
		options: [
			{
				pattern: "constrained",
				label: "We rely on one or two familiar channels."
			},
			{
				pattern: "uneven",
				label: "We use several channels, but some groups remain harder to hear."
			},
			{
				pattern: "embedded",
				label: "We design different ways for different employees to participate."
			}
		],
		next: "Ask which employee group is still easiest to miss, then identify one participation route that better fits their work."
	},
	{
		id: "accountability",
		title: "Action and accountability",
		question: "What happens after the organization hears?",
		color: "#7fbce7",
		options: [
			{
				pattern: "constrained",
				label: "Insights often stop at the readout."
			},
			{
				pattern: "uneven",
				label: "Follow-through depends on the leader or team."
			},
			{
				pattern: "embedded",
				label: "Ownership, decisions, and updates are built into the cycle."
			}
		],
		next: "Trace one insight from readout to decision and identify where ownership became unclear."
	},
	{
		id: "impact",
		title: "Strategic impact",
		question: "Where does employee evidence shape decisions?",
		color: "#38cce8",
		options: [
			{
				pattern: "constrained",
				label: "Listening mainly informs HR programs."
			},
			{
				pattern: "uneven",
				label: "Employee evidence sometimes shapes business decisions."
			},
			{
				pattern: "embedded",
				label: "Employee evidence regularly changes priorities or investments."
			}
		],
		next: "Choose one upcoming decision that should include employee evidence before direction is set."
	},
	{
		id: "intelligence",
		title: "Adaptive intelligence",
		question: "How does listening respond to change?",
		color: "#9299f7",
		options: [
			{
				pattern: "constrained",
				label: "Listening follows a fixed calendar."
			},
			{
				pattern: "uneven",
				label: "We add follow-up when a significant issue appears."
			},
			{
				pattern: "embedded",
				label: "Emerging signals reshape what and how we ask."
			}
		],
		next: "Name one emerging signal that should trigger a response before the next survey."
	}
];
function A(e) {
	return e.length === 0 ? "" : e.length === 1 ? e[0] : e.length === 2 ? `${e[0]} and ${e[1]}` : `${e.slice(0, -1).join(", ")}, and ${e.at(-1)}`;
}
function j(e, t, n) {
	let r = new Set(e.map((e) => e.id));
	Object.entries(t ?? {}).forEach(([e, t]) => {
		if (!r.has(e)) throw Error(`ListeningMaturity ${n} contains the unknown capability "${e}".`);
		if (t !== "constrained" && t !== "uneven" && t !== "embedded") throw Error(`ListeningMaturity ${n} contains an invalid pattern for "${e}".`);
	});
}
function se(e, t, n) {
	if (e.length !== 4) throw Error("ListeningMaturity requires exactly four capabilities.");
	let r = e.map((e) => e.id);
	if (new Set(r).size !== r.length) throw Error("ListeningMaturity capability ids must be unique.");
	e.forEach((e) => {
		let t = e.options.map((e) => e.pattern);
		if (e.options.length !== 3 || new Set(t).size !== 3 || !t.includes("constrained") || !t.includes("uneven") || !t.includes("embedded")) throw Error(`ListeningMaturity capability "${e.id}" requires one constrained, uneven, and embedded option.`);
	}), j(e, t, "selections"), j(e, n, "defaultSelections");
}
function ce() {
	return /* @__PURE__ */ t("svg", {
		"aria-hidden": "true",
		viewBox: "0 0 32 32",
		children: /* @__PURE__ */ t("path", {
			d: "M13.28 1.26a13 13 0 0 1 3.09 1.3 1 1 0 0 1-1.08 1.69 11 11 0 0 0-2.47-1.04 1 1 0 1 1 .46-1.95ZM18.12 5.4a1 1 0 0 1 1.38.33 12 12 0 0 1 1.39 3.77 11.4 11.4 0 0 0-2 .19 10 10 0 0 0-1.1-2.91 1 1 0 0 1 .33-1.38ZM9.69 18.89a11 11 0 0 1-3-1.14 1 1 0 1 0-1.07 1.69 13 13 0 0 0 3.88 1.45c.01-.68.07-1.35.19-2ZM10.02 1.99a1 1 0 0 1-.76 1.2 10 10 0 0 0-2.48 1.01 1 1 0 1 1-1.05-1.7 12 12 0 0 1 3.1-1.26 1 1 0 0 1 1.19.75ZM3.94 5.32a1 1 0 0 1 .31 1.38 10 10 0 0 0-1.04 2.47 1 1 0 1 1-1.95-.46 12 12 0 0 1 1.3-3.08 1 1 0 0 1 1.38-.31ZM1.99 11.97a1 1 0 0 1 1.2.76 10 10 0 0 0 1.01 2.48 1 1 0 1 1-1.7 1.05 12 12 0 0 1-1.26-3.1 1 1 0 0 1 .75-1.19Zm24.22 7.24a1 1 0 0 0-1.42-1.42L20 22.58l-2.29-2.29a1 1 0 1 0-1.42 1.42l3 3a1 1 0 0 0 1.42 0l5.5-5.5ZM21 31a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-2a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z",
			fill: "currentColor"
		})
	});
}
function le() {
	return /* @__PURE__ */ t("svg", {
		"aria-hidden": "true",
		viewBox: "0 0 20 20",
		children: /* @__PURE__ */ t("path", {
			d: "M10.5 2.5a.5.5 0 0 0-1 0v6.29L5.05 4.34a.5.5 0 0 0-.71.71L8.79 9.5H2.5a.5.5 0 0 0 0 1h6.29l-4.45 4.45a.5.5 0 0 0 .71.71l4.45-4.45v6.29a.5.5 0 0 0 1 0v-6.29l4.45 4.45a.5.5 0 0 0 .71-.71l-4.45-4.45h6.29a.5.5 0 0 0 0-1h-6.29l4.45-4.45a.5.5 0 0 0-.71-.71L10.5 8.79V2.5Z",
			fill: "currentColor"
		})
	});
}
function ue() {
	return /* @__PURE__ */ t("svg", {
		"aria-hidden": "true",
		viewBox: "0 0 20 20",
		children: /* @__PURE__ */ t("path", {
			d: "M12.65 3.65a.5.5 0 0 0 0 .7L16.29 8H9.5A7.5 7.5 0 0 0 2 15.5a.5.5 0 0 0 1 0A6.5 6.5 0 0 1 9.5 9h6.79l-3.64 3.65a.5.5 0 0 0 .7.7l4.5-4.5a.5.5 0 0 0 0-.7l-4.5-4.5a.5.5 0 0 0-.7 0Z",
			fill: "currentColor"
		})
	});
}
function de({ capabilities: r = oe, selections: o, defaultSelections: s = {}, onSelectionsChange: c, eyebrow: l = "Listening maturity", title: u = "What does your listening system look like?", description: d = "Choose one statement in each area. Your reflection updates as you go.", resultPanelTop: f = "16px" }) {
	se(r, o, s);
	let [p, m] = a(s), h = i(), g = o ?? p, _ = r.flatMap((e) => {
		let t = g[e.id];
		return t ? [{
			capability: e,
			pattern: t
		}] : [];
	}), v = _.filter(({ pattern: e }) => e === "embedded").map(({ capability: e }) => e.title.toLowerCase()), y = _.filter(({ pattern: e }) => e === "uneven").map(({ capability: e }) => e.title.toLowerCase()), b = _.filter(({ pattern: e }) => e === "constrained").map(({ capability: e }) => e.title.toLowerCase()), x = _.length > 0, S = "Listening maturity is developing unevenly.", C = "Some practices are taking hold; others still vary by team or moment.";
	v.length === r.length ? (S = "Listening is embedded in how the organization works.", C = "The system can hear broadly, act visibly, influence decisions, and adapt.") : b.length >= 2 ? (S = "The system has intent, but its foundations are fragile.", C = "Listening activity exists, but the path from participation to decisions and learning still depends on individual effort.") : v.length >= 2 && b.length === 0 && (S = "A connected listening system is taking shape.", C = "Several capabilities are becoming standard practice. The opportunity is consistency.");
	let w = v.length > 0 ? `The clearest strength is ${A(v)}.` : y.length > 0 ? `Promising practices are emerging in ${A(y)}, but they are not yet consistent.` : "The current choices do not yet show an embedded capability. Start by naming what already works in isolated teams.", T = _.find(({ pattern: e }) => e === "constrained")?.capability ?? _.find(({ pattern: e }) => e === "uneven")?.capability ?? r[0];
	function E(e, t) {
		let n = {
			...g,
			[e]: t
		};
		o === void 0 && m(n), c?.(n);
	}
	return /* @__PURE__ */ n("section", {
		className: "glint-listening-maturity",
		style: { "--glint-listening-maturity-result-top": f },
		children: [/* @__PURE__ */ n("header", {
			className: "glint-listening-maturity__header",
			children: [
				/* @__PURE__ */ t("p", {
					className: "glint-listening-maturity__eyebrow",
					children: l
				}),
				/* @__PURE__ */ t("h2", { children: u }),
				/* @__PURE__ */ t("p", { children: d })
			]
		}), /* @__PURE__ */ n("div", {
			className: "glint-listening-maturity__content",
			children: [/* @__PURE__ */ t("div", {
				className: "glint-listening-maturity__capabilities",
				children: r.map((e) => /* @__PURE__ */ n("fieldset", {
					className: "glint-listening-maturity__capability",
					style: { "--maturity-accent": e.color },
					children: [
						/* @__PURE__ */ t("legend", { children: e.title }),
						/* @__PURE__ */ t("p", { children: e.question }),
						/* @__PURE__ */ t("div", {
							className: "glint-listening-maturity__options",
							children: e.options.map((r) => /* @__PURE__ */ n("label", {
								className: "glint-listening-maturity__option",
								children: [/* @__PURE__ */ t("input", {
									checked: g[e.id] === r.pattern,
									name: `${h}-${e.id}`,
									onChange: () => E(e.id, r.pattern),
									type: "radio",
									value: r.pattern
								}), /* @__PURE__ */ t("span", { children: r.label })]
							}, r.pattern))
						})
					]
				}, e.id))
			}), /* @__PURE__ */ t("aside", {
				"aria-live": "polite",
				className: "glint-listening-maturity__result",
				children: x ? /* @__PURE__ */ n(e, { children: [
					/* @__PURE__ */ t("span", {
						className: "glint-listening-maturity__badge",
						children: "Your listening system"
					}),
					/* @__PURE__ */ n("div", {
						className: "glint-listening-maturity__result-introduction",
						children: [/* @__PURE__ */ t("h3", { children: S }), /* @__PURE__ */ t("p", { children: C })]
					}),
					/* @__PURE__ */ n("div", {
						className: "glint-listening-maturity__result-section",
						children: [/* @__PURE__ */ n("h4", { children: [/* @__PURE__ */ t(le, {}), /* @__PURE__ */ t("span", { children: "What stands out" })] }), /* @__PURE__ */ t("p", { children: w })]
					}),
					/* @__PURE__ */ n("div", {
						className: "glint-listening-maturity__result-section",
						children: [/* @__PURE__ */ n("h4", { children: [/* @__PURE__ */ t(ue, {}), /* @__PURE__ */ t("span", { children: "Consider next" })] }), /* @__PURE__ */ t("p", { children: T.next })]
					})
				] }) : /* @__PURE__ */ n("div", {
					className: "glint-listening-maturity__result-empty",
					children: [/* @__PURE__ */ t(ce, {}), /* @__PURE__ */ t("strong", { children: "Start by choosing a statement" })]
				})
			})]
		})]
	});
}
//#endregion
//#region src/lib/employee-ai-readiness.tsx
var fe = [
	{
		id: "trust",
		label: "Trust",
		value: "Two in three",
		description: "trust AI tools with their feedback",
		percentage: 67,
		detail: "Confidential · Fair · Accurate",
		color: "#c4e7ff",
		background: "#172025",
		border: "#42515c",
		track: "#394954"
	},
	{
		id: "openness",
		label: "Openness",
		value: "70%",
		description: "are open to expanding AI in employee listening",
		percentage: 70,
		detail: "Permission to test — safely",
		color: "#7fbce7",
		background: "#14222c",
		border: "#405f74",
		track: "#2d4e65"
	},
	{
		id: "shadow-ai",
		label: "Shadow AI",
		value: "59%",
		description: "already use outside AI tools to support feedback",
		percentage: 59,
		detail: "Practice is ahead of policy",
		color: "#38cce8",
		background: "#072126",
		border: "#186978",
		track: "#16434c"
	}
];
function pe(e) {
	if (e.length !== 3) throw Error("EmployeeAiReadiness requires exactly three metrics.");
	let t = e.map((e) => e.id);
	if (new Set(t).size !== t.length) throw Error("EmployeeAiReadiness metric ids must be unique.");
	let n = e.find((e) => !Number.isFinite(e.percentage) || e.percentage < 0 || e.percentage > 100);
	if (n) throw Error(`EmployeeAiReadiness percentage for "${n.id}" must be between 0 and 100.`);
}
function me() {
	return /* @__PURE__ */ t("svg", {
		"aria-hidden": "true",
		viewBox: "0 0 24 24",
		children: /* @__PURE__ */ t("path", {
			d: "M11.25 6.75a.75.75 0 0 1 1.5 0v1.5a.75.75 0 0 1-1.5 0v-1.5Zm5.03 1.47a.75.75 0 0 0-1.06 0l-1.06 1.06a.75.75 0 1 0 1.06 1.06l1.06-1.06a.75.75 0 0 0 0-1.06Zm-7.5 0a.75.75 0 0 0-1.06 1.06l1.06 1.06a.75.75 0 0 0 1.06-1.06L8.78 8.22ZM12 2a7.25 7.25 0 0 1 4.59 12.99.75.75 0 0 0-.18.27l-1.16 5a2.25 2.25 0 0 1-2.19 1.74h-2.12a2.25 2.25 0 0 1-2.19-1.74l-1.13-4.9a.75.75 0 0 0-.2-.37A7.25 7.25 0 0 1 12 2Zm2.12 16.5H9.88l.33 1.42a.75.75 0 0 0 .73.58h2.12a.75.75 0 0 0 .73-.58l.33-1.42ZM12 3.5a5.75 5.75 0 0 0-3.54 10.42c.3.3.52.68.62 1.1l.46 1.98h1.71v-6.25a.75.75 0 0 1 1.5 0V17h1.71l.46-1.98c.1-.42.31-.8.62-1.1A5.75 5.75 0 0 0 12 3.5Z",
			fill: "currentColor"
		})
	});
}
function he({ metrics: e = fe, title: r = "Employee behavior is already moving", description: i = "Trust and openness coexist with widespread self-directed AI use in feedback.", insight: a = "Moving slowly can push experimentation outside organizational safeguards." }) {
	return pe(e), /* @__PURE__ */ n("section", {
		className: "glint-employee-ai-readiness",
		children: [
			/* @__PURE__ */ n("header", {
				className: "glint-employee-ai-readiness__header",
				children: [/* @__PURE__ */ t("h2", { children: r }), /* @__PURE__ */ t("p", { children: i })]
			}),
			/* @__PURE__ */ t("div", {
				className: "glint-employee-ai-readiness__cards",
				children: e.map((e) => /* @__PURE__ */ n("article", {
					className: "glint-employee-ai-readiness__card",
					style: {
						"--readiness-accent": e.color,
						"--readiness-background": e.background,
						"--readiness-border": e.border,
						"--readiness-track": e.track
					},
					children: [/* @__PURE__ */ n("div", {
						className: "glint-employee-ai-readiness__card-copy",
						children: [/* @__PURE__ */ t("span", {
							className: "glint-employee-ai-readiness__badge",
							children: e.label
						}), /* @__PURE__ */ n("div", {
							className: "glint-employee-ai-readiness__metric",
							children: [/* @__PURE__ */ t("strong", { children: e.value }), /* @__PURE__ */ t("p", { children: e.description })]
						})]
					}), /* @__PURE__ */ n("div", {
						className: "glint-employee-ai-readiness__measure",
						children: [/* @__PURE__ */ t("div", {
							"aria-label": `${e.label}: ${e.percentage}%`,
							"aria-valuemax": 100,
							"aria-valuemin": 0,
							"aria-valuenow": e.percentage,
							className: "glint-employee-ai-readiness__track",
							role: "meter",
							children: /* @__PURE__ */ t("span", { style: { width: `${e.percentage}%` } })
						}), /* @__PURE__ */ t("p", { children: e.detail })]
					})]
				}, e.id))
			}),
			/* @__PURE__ */ n("div", {
				className: "glint-employee-ai-readiness__insight",
				children: [/* @__PURE__ */ t(me, {}), /* @__PURE__ */ t("p", { children: a })]
			}),
			/* @__PURE__ */ n("table", {
				"aria-label": "Employee AI readiness data",
				className: "glint-visually-hidden",
				children: [/* @__PURE__ */ t("thead", { children: /* @__PURE__ */ n("tr", { children: [
					/* @__PURE__ */ t("th", { children: "Measure" }),
					/* @__PURE__ */ t("th", { children: "Value" }),
					/* @__PURE__ */ t("th", { children: "Description" }),
					/* @__PURE__ */ t("th", { children: "Percentage" })
				] }) }), /* @__PURE__ */ t("tbody", { children: e.map((e) => /* @__PURE__ */ n("tr", { children: [
					/* @__PURE__ */ t("th", { children: e.label }),
					/* @__PURE__ */ t("td", { children: e.value }),
					/* @__PURE__ */ t("td", { children: e.description }),
					/* @__PURE__ */ n("td", { children: [e.percentage, "%"] })
				] }, e.id)) })]
			})
		]
	});
}
//#endregion
//#region src/lib/channel-portfolio.tsx
var ge = [
	{
		id: "core-surveys",
		title: "Core surveys",
		value: 91,
		color: "#c4e7ff",
		selectedBackground: "#20262a",
		selectedBorder: "#647e91",
		description: "Representative employee voice at scale",
		examples: [
			"Annual engagement survey",
			"Pulse survey",
			"Lifecycle survey",
			"Post-event survey"
		]
	},
	{
		id: "facilitated-dialogue",
		title: "Facilitated dialogue",
		value: 78,
		color: "#7fbce7",
		selectedBackground: "#0c1821",
		selectedBorder: "#47718e",
		description: "Qualitative depth",
		examples: [
			"Focus groups",
			"Listening sessions",
			"Employee roundtables",
			"Leader Q&A follow-ups"
		]
	},
	{
		id: "open-and-ongoing",
		title: "Open and ongoing",
		value: 74,
		color: "#38cce8",
		selectedBackground: "#06181b",
		selectedBorder: "#1d7c8e",
		description: "Outside scheduled cycles",
		examples: [
			"Always-on feedback",
			"Digital suggestion box",
			"Open-text intake",
			"Ask-me-anything themes"
		]
	},
	{
		id: "ambient-or-passive",
		title: "Ambient or passive",
		value: 71,
		color: "#9299f7",
		selectedBackground: "#06181b",
		selectedBorder: "#40436c",
		description: "Behavioral patterns",
		examples: [
			"Collaboration signals",
			"Support themes",
			"Work-pattern signals",
			"Service-desk trends"
		]
	},
	{
		id: "embedded-and-frontline",
		title: "Embedded and frontline",
		value: 48,
		color: "#626ad5",
		selectedBackground: "#111325",
		selectedBorder: "#373d8b",
		description: "Close to work",
		examples: [
			"Shift huddles",
			"QR-code check-ins",
			"Safety stand-ups",
			"Team retrospectives"
		]
	}
];
function _e(e) {
	return e.length < 2 ? e[0] ?? "" : e.length === 2 ? `${e[0]} and ${e[1]}` : `${e.slice(0, -1).join(", ")}, and ${e.at(-1)}`;
}
function M() {
	return /* @__PURE__ */ t("svg", {
		"aria-hidden": "true",
		className: "glint-channel-portfolio__chevron",
		focusable: "false",
		viewBox: "0 0 16 16",
		children: /* @__PURE__ */ t("path", {
			d: "M5.646 3.146a.5.5 0 0 0 0 .708L9.793 8l-4.147 4.146a.5.5 0 0 0 .708.708l4.5-4.5a.5.5 0 0 0 0-.708l-4.5-4.5a.5.5 0 0 0-.708 0Z",
			fill: "currentColor"
		})
	});
}
function N(e, t, n) {
	if (e.length === 0) throw Error("ChannelPortfolio requires at least one item.");
	let r = e.map((e) => e.id);
	if (new Set(r).size !== r.length) throw Error("ChannelPortfolio item ids must be unique.");
	let i = e.find((e) => !Number.isFinite(e.value) || e.value < 0 || e.value > 100);
	if (i) throw Error(`ChannelPortfolio value for "${i.id}" must be between 0 and 100.`);
	let a = n ?? e[0].id;
	if (!r.includes(a)) throw Error("ChannelPortfolio defaultSelectedId must match an item id.");
	if (t !== void 0 && !r.includes(t)) throw Error("ChannelPortfolio selectedId must match an item id.");
	return a;
}
function P({ items: e = ge, selectedId: r, defaultSelectedId: o, onSelectedIdChange: s, eyebrow: c = "Channel portfolio", title: l = "Adoption is broad—but uneven", description: u = "Share of listening leaders currently using each approach. Click each row to view details." }) {
	let d = N(e, r, o), [f, p] = a(d), m = i(), h = r ?? f, g = Math.max(...e.map((e) => e.value), 1);
	function _(e) {
		r === void 0 && p(e), s?.(e);
	}
	return /* @__PURE__ */ n("section", {
		className: "glint-channel-portfolio",
		children: [
			/* @__PURE__ */ n("header", {
				className: "glint-channel-portfolio__header",
				children: [
					/* @__PURE__ */ t("p", {
						className: "glint-channel-portfolio__eyebrow",
						children: c
					}),
					/* @__PURE__ */ t("h2", { children: l }),
					/* @__PURE__ */ t("p", { children: u })
				]
			}),
			/* @__PURE__ */ t("div", {
				className: "glint-channel-portfolio__rows",
				children: e.map((e, r) => {
					let i = h === e.id, a = `${m}-${r}`;
					return /* @__PURE__ */ n("div", {
						className: "glint-channel-portfolio__row",
						"data-active": i,
						style: {
							"--channel-color": e.color,
							"--channel-width": `${e.value / g * 100}%`,
							"--channel-selected-background": e.selectedBackground ?? "#111220",
							"--channel-selected-border": e.selectedBorder ?? "#2a2c50"
						},
						children: [/* @__PURE__ */ n("button", {
							"aria-label": `${e.title}, ${e.value}% adoption`,
							"aria-controls": i ? a : void 0,
							"aria-expanded": i,
							onClick: () => _(e.id),
							type: "button",
							children: [/* @__PURE__ */ n("strong", { children: [/* @__PURE__ */ t("span", { children: e.title }), /* @__PURE__ */ t(M, {})] }), /* @__PURE__ */ n("span", {
								className: "glint-channel-portfolio__measure",
								children: [/* @__PURE__ */ t("span", {
									"aria-hidden": "true",
									className: "glint-channel-portfolio__bar",
									children: /* @__PURE__ */ t("span", {})
								}), /* @__PURE__ */ n("span", {
									className: "glint-channel-portfolio__value",
									children: [e.value, "%"]
								})]
							})]
						}), i ? /* @__PURE__ */ n("div", {
							"aria-label": `${e.title} details`,
							className: "glint-channel-portfolio__details",
							id: a,
							role: "group",
							children: [/* @__PURE__ */ t("span", {
								className: "glint-channel-portfolio__description",
								children: e.description
							}), /* @__PURE__ */ n("p", {
								className: "glint-channel-portfolio__examples",
								children: [
									"Examples include ",
									_e(e.examples),
									"."
								]
							})]
						}) : null]
					}, e.id);
				})
			}),
			/* @__PURE__ */ n("table", {
				"aria-label": "Channel portfolio data",
				className: "glint-visually-hidden",
				children: [/* @__PURE__ */ t("thead", { children: /* @__PURE__ */ n("tr", { children: [
					/* @__PURE__ */ t("th", { children: "Channel" }),
					/* @__PURE__ */ t("th", { children: "Adoption" }),
					/* @__PURE__ */ t("th", { children: "Description" }),
					/* @__PURE__ */ t("th", { children: "Examples" })
				] }) }), /* @__PURE__ */ t("tbody", { children: e.map((e) => /* @__PURE__ */ n("tr", { children: [
					/* @__PURE__ */ t("th", { children: e.title }),
					/* @__PURE__ */ n("td", { children: [e.value, "%"] }),
					/* @__PURE__ */ t("td", { children: e.description }),
					/* @__PURE__ */ t("td", { children: e.examples.join(", ") })
				] }, e.id)) })]
			})
		]
	});
}
//#endregion
//#region src/lib/glint-labs-navigation.tsx
function F({ brand: e, items: r, variant: i = "core" }) {
	return /* @__PURE__ */ n("nav", {
		className: `glint-core-nav glint-core-nav--${i}`,
		"aria-label": "Glint Labs",
		children: [/* @__PURE__ */ n("a", {
			className: "glint-core-nav__tab glint-core-nav__brand",
			href: e.href,
			children: [/* @__PURE__ */ t("svg", {
				"aria-hidden": "true",
				height: "20",
				viewBox: "0 0 20 20",
				width: "20",
				children: /* @__PURE__ */ t("path", { d: "M11.4743 5.6111C12.1171 5.1421 12.8285 5.00148 13.4998 5.00148C14.5291 5.00148 15.0782 5.54237 15.5309 5.99696L16.9526 7.35707L16.9558 7.35634C17.0978 7.5121 17.2198 7.66493 17.3247 7.81569C17.7805 8.43466 18 9.23887 18 10C18 11.1271 17.4872 12.223 16.7002 12.9104L11.9847 17.0964C11.4008 17.657 10.6078 18.0015 9.7345 18.0015C8.81476 18.0015 8.02734 17.5977 7.39301 17.0054C7.10657 16.7379 6.22119 15.8707 5.35577 15.0396L3.26788 13.0506C2.4903 12.3634 2 11.3587 2 10.2395C2 9.18776 2.43286 8.23707 3.13025 7.55604C3.16857 7.52003 3.20664 7.48383 3.24548 7.44838L8.86267 2.20009C9.1582 1.92396 9.62024 1.93495 9.90228 2.22487C10.8318 3.18056 11.3547 4.38063 11.4743 5.6111ZM3.92096 8.1858C3.88741 8.2163 3.85457 8.24752 3.82166 8.2787C3.31335 8.77858 3 9.47157 3 10.2395C3 11.0601 3.35822 11.7958 3.93005 12.3012L6.03119 14.3018C6.02246 14.2189 6.01562 14.1349 6.01062 14.0497C6.00348 13.9293 6 13.8067 6 13.6815C6 12.4339 6.81812 11.6522 7.15833 11.3369L9.07184 9.51307L9.073 9.51198C10.0261 8.59682 10.5037 7.3755 10.5009 6.14992C10.4985 5.06349 10.1184 3.97926 9.35632 3.10744L3.92096 8.1858ZM8.13495 11.7876C8.47968 11.9257 8.85596 12.0016 9.25 12.0016C10.0487 12.0016 10.7726 11.6908 11.311 11.1817L14.0129 8.77931C14.5484 8.23219 15.3489 8.00001 16 8.00001C16.0621 8.00001 16.1241 8.00245 16.1858 8.00734L14.8223 6.70265C14.3865 6.26503 14.0925 6.00148 13.4998 6.00148C12.7483 6.00148 12.0125 6.20973 11.4192 7.12074C11.2222 8.26857 10.6696 9.36586 9.76422 10.2346L8.13495 11.7876ZM17 10C17 9.98573 17.0002 10.0143 17 10C16.9908 9.61317 16.8131 9.26674 16.5084 9.1122C16.3655 9.03969 16.1947 9.00001 16 9.00001C15.5297 9.00001 15.004 9.18068 14.7073 9.50001L11.9982 11.9081C11.2815 12.586 10.3143 13.0016 9.25 13.0016C8.58148 13.0016 7.95129 12.8377 7.39746 12.5477C7.18158 12.8379 7 13.2124 7 13.6815C7 14.1432 7.05511 14.5372 7.16534 14.8865C7.33699 15.4306 7.64232 15.8659 8.08136 16.2799C8.57886 16.7423 9.13159 17.0015 9.7345 17.0015C10.3395 17.0015 10.887 16.7641 11.2922 16.375L11.3063 16.3616L16.0424 12.1572C16.6103 11.6613 17 10.8407 17 10Z" })
			}), e.label]
		}), /* @__PURE__ */ t("div", {
			className: "glint-core-nav__links",
			children: r.map((e) => /* @__PURE__ */ t("a", {
				className: "glint-core-nav__tab",
				href: e.href,
				children: e.label
			}, e.href))
		})]
	});
}
//#endregion
//#region src/lib/homepage-components.tsx
function ve({ actionLabel: e = "Explore the study", description: r, href: i, tags: a, title: o, visualAlt: s = "", visualSrc: c }) {
	return /* @__PURE__ */ n("a", {
		className: "glint-research-card",
		href: i,
		children: [/* @__PURE__ */ n("span", {
			className: "glint-research-card__body",
			children: [
				/* @__PURE__ */ t("span", {
					className: "glint-research-card__visual",
					children: /* @__PURE__ */ t("img", {
						alt: s,
						height: "96",
						src: c,
						width: "96"
					})
				}),
				/* @__PURE__ */ n("span", {
					className: "glint-research-card__copy",
					children: [/* @__PURE__ */ t("strong", { children: o }), /* @__PURE__ */ t("span", { children: r })]
				}),
				/* @__PURE__ */ t("span", {
					className: "glint-research-card__tags",
					children: a.map((e) => /* @__PURE__ */ n("span", {
						className: "glint-research-card__tag",
						children: [/* @__PURE__ */ t("img", {
							alt: "",
							"aria-hidden": "true",
							src: e.iconSrc
						}), e.label]
					}, e.label))
				})
			]
		}), /* @__PURE__ */ t("span", {
			className: "glint-core-button",
			children: e
		})]
	});
}
function ye({ detail: e, detailIcon: r, href: i, rank: a, title: o }) {
	return /* @__PURE__ */ n("a", {
		className: "glint-trending-card",
		href: i,
		children: [
			/* @__PURE__ */ n("span", {
				className: "glint-trending-card__header",
				children: [/* @__PURE__ */ t("strong", { children: a }), /* @__PURE__ */ t("span", {
					"aria-hidden": "true",
					children: "›"
				})]
			}),
			/* @__PURE__ */ t("span", {
				className: "glint-trending-card__title",
				children: o
			}),
			/* @__PURE__ */ n("span", {
				className: "glint-trending-card__detail",
				children: [r, e]
			})
		]
	});
}
function be({ actionLabel: e, badge: r, badgeIcon: i, description: a, href: o, imageAlt: s = "", imageSrc: c, theme: l, title: u }) {
	return /* @__PURE__ */ n("article", {
		className: "glint-tool-card",
		children: [/* @__PURE__ */ t("div", {
			className: "glint-tool-card__image",
			children: /* @__PURE__ */ t("img", {
				alt: s,
				src: c
			})
		}), /* @__PURE__ */ n("div", {
			className: `glint-tool-card__content glint-tool-card__content--${l}`,
			children: [/* @__PURE__ */ n("div", {
				className: "glint-tool-card__copy",
				children: [/* @__PURE__ */ n("span", {
					className: "glint-core-badge",
					children: [i, r]
				}), /* @__PURE__ */ n("div", { children: [/* @__PURE__ */ t("h3", { children: u }), /* @__PURE__ */ t("p", { children: a })] })]
			}), /* @__PURE__ */ t("a", {
				className: "glint-core-button",
				href: o,
				children: e
			})]
		})]
	});
}
function xe({ actionLabel: e = "View all", description: r, href: i, icon: a, title: o }) {
	return /* @__PURE__ */ n("article", {
		className: "glint-resource-row",
		children: [
			/* @__PURE__ */ t("span", {
				className: "glint-resource-row__icon",
				"aria-hidden": "true",
				children: a
			}),
			/* @__PURE__ */ n("div", { children: [/* @__PURE__ */ t("h3", { children: o }), /* @__PURE__ */ t("p", { children: r })] }),
			/* @__PURE__ */ t("a", {
				className: "glint-core-button",
				href: i,
				children: e
			})
		]
	});
}
//#endregion
//#region src/lib/registry.ts
var Se = [{
	id: "glint-labs-core",
	name: "Glint Labs Core",
	description: "Site-wide interface components shared across Glint Labs experiences."
}, {
	id: "annual-report-2026",
	name: "2026 Annual Report",
	description: "Canonical editorial and data-storytelling components for the 2026 report."
}], I = {
	id: "glint-labs-navigation",
	name: "Glint Labs navigation",
	collection: "glint-labs-core",
	version: 2,
	status: "review",
	description: "Provides the primary site-wide navigation for Glint Labs experiences.",
	useWhen: ["A Glint Labs page needs the canonical brand and primary section navigation.", "The navigation appears over a light or image-backed surface."],
	avoidWhen: ["The page belongs to a publication with its own navigation system.", "The available width cannot support horizontal navigation without scrolling."],
	dataContract: {
		shape: "glint-labs-navigation",
		fields: [{
			name: "brand",
			type: "string",
			required: !0,
			description: "Brand link label and destination."
		}, {
			name: "items",
			type: "string",
			required: !0,
			description: "Ordered primary navigation links."
		}]
	},
	capabilities: [
		"interactive",
		"keyboard",
		"responsive",
		"static-export"
	],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "1470:16708",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1470-16708&m=dev"
	},
	publishingStudio: {
		adapterId: "glint-labs-navigation-v1",
		compatibility: "planned",
		sourceShape: "brand link and ordered navigation links"
	}
}, L = {
	id: "annual-report-navigation",
	name: "Annual Report navigation",
	collection: "annual-report-2026",
	version: 2,
	status: "review",
	description: "Applies the approved directional glass treatment to the Glint Labs navigation.",
	useWhen: ["The Glint Labs navigation appears over the 2026 Annual Report hero.", "The navigation needs opaque controls over a background-adaptive glass rail."],
	avoidWhen: ["The navigation appears on a light Glint Labs page outside the Annual Report.", "The available width cannot support horizontal navigation without scrolling."],
	dataContract: I.dataContract,
	capabilities: [
		"interactive",
		"keyboard",
		"responsive",
		"static-export"
	],
	figma: I.figma,
	publishingStudio: {
		adapterId: "annual-report-navigation-v1",
		compatibility: "available",
		sourceShape: "brand link and ordered navigation links"
	}
}, R = {
	id: "glint-research-card",
	name: "Research card",
	collection: "glint-labs-core",
	version: 1,
	status: "review",
	description: "Presents a featured study with evidence tags and a clear action.",
	useWhen: ["A study needs prominent placement in a research collection."],
	avoidWhen: ["The content is a tool, prompt, or short trending link."],
	dataContract: {
		shape: "glint-research-card",
		fields: [
			{
				name: "title",
				type: "string",
				required: !0,
				description: "Study title."
			},
			{
				name: "description",
				type: "string",
				required: !0,
				description: "Study summary."
			},
			{
				name: "visualSrc",
				type: "string",
				required: !0,
				description: "Card visual asset."
			},
			{
				name: "tags",
				type: "string",
				required: !0,
				description: "Evidence tags."
			},
			{
				name: "href",
				type: "string",
				required: !0,
				description: "Study destination."
			}
		]
	},
	capabilities: [
		"interactive",
		"keyboard",
		"responsive",
		"static-export"
	],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "395:31698",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=395-31698&m=dev"
	},
	publishingStudio: {
		adapterId: "glint-research-card-v1",
		compatibility: "planned",
		sourceShape: "title, description, image, evidence tags, and destination"
	}
}, z = {
	id: "glint-trending-card",
	name: "Trending card",
	collection: "glint-labs-core",
	version: 1,
	status: "review",
	description: "Ranks a frequently read or shared resource.",
	useWhen: ["A compact ranked link needs reading or sharing context."],
	avoidWhen: ["The resource requires a full description or evidence tags."],
	dataContract: {
		shape: "glint-trending-card",
		fields: [
			{
				name: "rank",
				type: "number",
				required: !0,
				description: "Display rank."
			},
			{
				name: "title",
				type: "string",
				required: !0,
				description: "Resource title."
			},
			{
				name: "detail",
				type: "string",
				required: !0,
				description: "Trend context."
			},
			{
				name: "href",
				type: "string",
				required: !0,
				description: "Resource destination."
			}
		]
	},
	capabilities: [
		"interactive",
		"keyboard",
		"responsive",
		"static-export"
	],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "395:32783",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=395-32783&m=dev"
	},
	publishingStudio: {
		adapterId: "glint-trending-card-v1",
		compatibility: "planned",
		sourceShape: "rank, title, trend detail, and destination"
	}
}, B = {
	id: "glint-tool-card",
	name: "Tool card",
	collection: "glint-labs-core",
	version: 1,
	status: "review",
	description: "Promotes a skill, prompt, or analysis resource.",
	useWhen: ["A practical resource needs an image, type badge, and action."],
	avoidWhen: ["The item is research content rather than a reusable resource."],
	dataContract: {
		shape: "glint-tool-card",
		fields: [
			{
				name: "title",
				type: "string",
				required: !0,
				description: "Tool title."
			},
			{
				name: "description",
				type: "string",
				required: !0,
				description: "Tool summary."
			},
			{
				name: "badge",
				type: "string",
				required: !0,
				description: "Resource type."
			},
			{
				name: "imageSrc",
				type: "string",
				required: !0,
				description: "Card image."
			},
			{
				name: "href",
				type: "string",
				required: !0,
				description: "Tool destination."
			}
		]
	},
	capabilities: [
		"interactive",
		"keyboard",
		"responsive",
		"static-export"
	],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "395:32154",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=395-32154&m=dev"
	},
	publishingStudio: {
		adapterId: "glint-tool-card-v1",
		compatibility: "planned",
		sourceShape: "type, title, description, image, theme, and destination"
	}
}, V = {
	id: "glint-resource-link-row",
	name: "Resource link row",
	collection: "glint-labs-core",
	version: 1,
	status: "review",
	description: "Links to a resource collection with supporting context.",
	useWhen: ["A resource category needs a concise description and destination."],
	avoidWhen: ["The destination needs a visual card or ranking treatment."],
	dataContract: {
		shape: "glint-resource-link-row",
		fields: [
			{
				name: "title",
				type: "string",
				required: !0,
				description: "Category title."
			},
			{
				name: "description",
				type: "string",
				required: !0,
				description: "Category summary."
			},
			{
				name: "href",
				type: "string",
				required: !0,
				description: "Category destination."
			}
		]
	},
	capabilities: [
		"interactive",
		"keyboard",
		"responsive",
		"static-export"
	],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "310:14828",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=310-14828&m=dev"
	},
	publishingStudio: {
		adapterId: "glint-resource-link-row-v1",
		compatibility: "planned",
		sourceShape: "icon, title, description, and destination"
	}
}, H = {
	id: "pull-quote",
	name: "Pull quote",
	collection: "annual-report-2026",
	version: 1,
	status: "review",
	description: "Emphasizes an approved quotation with optional speaker attribution.",
	useWhen: ["A concise quotation adds human voice or expert interpretation.", "The exact wording has been approved for publication."],
	avoidWhen: ["The text is a paraphrase rather than a direct quotation.", "The quote is too long to scan as an editorial interruption."],
	dataContract: {
		shape: "pull-quote",
		fields: [
			{
				name: "quote",
				type: "string",
				required: !0,
				description: "Approved quotation without decorative quote marks."
			},
			{
				name: "attribution",
				type: "string",
				required: !1,
				description: "Speaker or source name."
			},
			{
				name: "role",
				type: "string",
				required: !1,
				description: "Speaker role or source context."
			}
		]
	},
	capabilities: ["responsive", "static-export"],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "1070:3429",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1070-3429&m=dev"
	},
	publishingStudio: {
		adapterId: "pull-quote-v1",
		compatibility: "planned",
		sourceShape: "approved quotation with optional attribution",
		manifestBlockType: "pull-quote"
	}
}, U = {
	id: "lead-statement",
	name: "Lead statement",
	collection: "annual-report-2026",
	version: 1,
	status: "review",
	description: "Introduces a consequential section-level idea in a compact editorial treatment.",
	useWhen: ["One approved statement should frame the argument that follows.", "The message needs emphasis without quotation or numeric treatment."],
	avoidWhen: ["The copy is a direct quotation requiring attribution.", "The statement contains several independently scannable ideas."],
	dataContract: {
		shape: "lead-statement",
		fields: [{
			name: "children",
			type: "string",
			required: !0,
			description: "Approved editorial statement."
		}]
	},
	capabilities: ["responsive", "static-export"],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "798:64562",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=798-64562&m=dev"
	},
	publishingStudio: {
		adapterId: "lead-statement-v1",
		compatibility: "planned",
		sourceShape: "one approved section-level statement"
	}
}, W = {
	id: "outcome-metric-card",
	name: "Outcome metric card",
	collection: "annual-report-2026",
	version: 1,
	status: "review",
	description: "Connects an outcome principle to a verified numerator, denominator, and computed percentage.",
	useWhen: ["One metric needs a concise explanation and clear denominator.", "The percentage should remain visibly grounded in source counts."],
	avoidWhen: ["Several metrics need direct comparison.", "The denominator is unknown or inferred."],
	dataContract: {
		shape: "outcome-metric-card",
		fields: [
			{
				name: "title",
				type: "string",
				required: !0,
				description: "Short outcome principle."
			},
			{
				name: "description",
				type: "string",
				required: !0,
				description: "Concise explanation of the metric."
			},
			{
				name: "numerator",
				type: "number",
				required: !0,
				description: "Verified count meeting the condition.",
				constraints: "Nonnegative integer not greater than denominator"
			},
			{
				name: "denominator",
				type: "number",
				required: !0,
				description: "Verified total count.",
				constraints: "Positive integer"
			}
		]
	},
	capabilities: ["responsive", "static-export"],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "1138:19427",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1138-19427&m=dev"
	},
	publishingStudio: {
		adapterId: "outcome-metric-card-v1",
		compatibility: "planned",
		sourceShape: "one outcome label, explanation, verified numerator, and denominator"
	}
}, G = {
	id: "outcome-focus-card",
	name: "Outcome focus card",
	collection: "annual-report-2026",
	version: 1,
	status: "review",
	description: "Names one intended talent outcome with a fixed directional illustration.",
	useWhen: ["A workflow, framework, or model needs one concise outcome destination.", "The outcome can be expressed as a short, scannable phrase."],
	avoidWhen: ["A measured result or percentage should be shown.", "The content needs explanatory detail beyond a short outcome phrase."],
	dataContract: {
		shape: "outcome-focus-card",
		fields: [{
			name: "illustration",
			type: "string",
			required: !1,
			description: "Canonical illustration variant: growth, action, or trust."
		}, {
			name: "label",
			type: "string",
			required: !0,
			description: "Concise intended talent outcome."
		}]
	},
	capabilities: ["responsive", "static-export"],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "1136:6428",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1136-6428&m=dev"
	},
	publishingStudio: {
		adapterId: "outcome-focus-card-v1",
		compatibility: "planned",
		sourceShape: "one concise intended talent outcome"
	}
}, K = {
	id: "data-insight-card",
	name: "Data insight card",
	collection: "annual-report-2026",
	version: 1,
	status: "review",
	description: "Connects an observed signal pattern to a concise interpretation and response.",
	useWhen: ["A finding needs an explicit evidence-based interpretation.", "The interpretation leads to a concrete organizational response."],
	avoidWhen: ["The evidence does not support a specific interpretation.", "A direct quotation or numeric metric is the primary content."],
	dataContract: {
		shape: "data-insight-card",
		fields: [
			{
				name: "title",
				type: "string",
				required: !0,
				description: "Short topic or maturity label."
			},
			{
				name: "statement",
				type: "string",
				required: !0,
				description: "Primary observed signal pattern."
			},
			{
				name: "interpretation",
				type: "string",
				required: !0,
				description: "Evidence-based interpretation and response."
			}
		]
	},
	capabilities: ["responsive", "static-export"],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "1144:20688",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1144-20688&m=dev"
	},
	publishingStudio: {
		adapterId: "data-insight-card-v1",
		compatibility: "planned",
		sourceShape: "one observed signal pattern with an evidence-based interpretation"
	}
}, q = {
	id: "right-fit-guardrails",
	name: "Right-fit listening guardrails",
	collection: "annual-report-2026",
	version: 1,
	status: "review",
	description: "Frames five operating guardrails around one calibrated listening standard.",
	useWhen: ["Five complementary standards need to be understood as one system.", "A central decision principle connects the surrounding questions."],
	avoidWhen: ["The concepts have a ranked or sequential relationship.", "The content requires more than one concise question per guardrail."],
	dataContract: {
		shape: "right-fit-guardrails",
		fields: [
			{
				name: "title",
				type: "string",
				required: !0,
				description: "Diagram title."
			},
			{
				name: "description",
				type: "string",
				required: !0,
				description: "Concise instruction for reading the diagram."
			},
			{
				name: "guardrails",
				type: "string",
				required: !0,
				description: "Named trustworthy, intelligent, embedded, responsive, and outcome-driven questions.",
				constraints: "Exactly five named guardrail entries"
			},
			{
				name: "center",
				type: "string",
				required: !0,
				description: "Central right-fit listening standard and constraint."
			},
			{
				name: "footer",
				type: "string",
				required: !0,
				description: "Reassessment guidance."
			}
		]
	},
	capabilities: ["responsive", "static-export"],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "1146:4385",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1146-4385&m=dev"
	},
	publishingStudio: {
		adapterId: "right-fit-guardrails-v1",
		compatibility: "planned",
		sourceShape: "five named guardrail questions around one central listening standard"
	}
}, J = {
	id: "skill-priority-stack",
	name: "Skill priority stack",
	collection: "annual-report-2026",
	version: 1,
	status: "review",
	description: "Connects three closely ranked skill priorities to practical knowledge and behaviors.",
	useWhen: ["Exactly three complementary capability layers need explanation.", "Percentages should remain visible without implying a large ranking gap."],
	avoidWhen: ["The items form a sequential process rather than complementary layers.", "More than three priority areas need equal explanatory detail."],
	dataContract: {
		shape: "skill-priority-stack",
		minimumItems: 3,
		maximumItems: 3,
		fields: [
			{
				name: "eyebrow",
				type: "string",
				required: !0,
				description: "Short uppercase category label."
			},
			{
				name: "title",
				type: "string",
				required: !0,
				description: "Skill-stack title."
			},
			{
				name: "description",
				type: "string",
				required: !0,
				description: "Relationship between the three priorities."
			},
			{
				name: "layers",
				type: "string",
				required: !0,
				description: "Three ordered layers with badge, percentage, skill, summary, and details.",
				constraints: "Exactly three entries with integer percentages from 0 to 100"
			}
		]
	},
	capabilities: [
		"responsive",
		"static-export",
		"table-fallback"
	],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "1146:4897",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1146-4897&m=dev"
	},
	publishingStudio: {
		adapterId: "skill-priority-stack-v1",
		compatibility: "planned",
		sourceShape: "three ordered skill priorities with percentages and supporting behaviors"
	}
}, Y = {
	id: "listening-speed-gap",
	name: "Listening speed gap",
	collection: "annual-report-2026",
	version: 3,
	status: "review",
	description: "Explores whether listening density is insufficient, right-fit, or overwhelming synthesis capacity.",
	useWhen: ["A story needs to help readers reflect on listening density relative to the pace of work.", "The consequence of insufficient signal or synthesis overload should be made actionable."],
	avoidWhen: ["A precise maturity score or external benchmark is required.", "The available data supports only one fixed listening state."],
	dataContract: {
		shape: "listening-speed-gap",
		fields: [
			{
				name: "fit",
				type: "string",
				required: !1,
				description: "Controlled fit: minimum, low, balanced, high, or overload."
			},
			{
				name: "defaultFit",
				type: "string",
				required: !1,
				description: "Initial fit when the component is uncontrolled."
			},
			{
				name: "eyebrow",
				type: "string",
				required: !1,
				description: "Short category label above the visual."
			},
			{
				name: "title",
				type: "string",
				required: !1,
				description: "Primary statement explaining the listening-speed gap."
			},
			{
				name: "description",
				type: "string",
				required: !1,
				description: "Supporting explanation beneath the title."
			}
		]
	},
	capabilities: [
		"interactive",
		"keyboard",
		"responsive",
		"reduced-motion",
		"static-export"
	],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "1300:5116",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1300-5116&m=dev"
	},
	publishingStudio: {
		adapterId: "listening-speed-gap-v2",
		compatibility: "available",
		sourceShape: "five listening-fit states mapped to signal density, interpretation, and recommended action"
	}
}, X = {
	id: "channel-portfolio",
	name: "Channel portfolio",
	collection: "annual-report-2026",
	version: 3,
	status: "review",
	description: "Compares listening-channel adoption while revealing one channel’s purpose and examples in context.",
	useWhen: ["A report needs to compare adoption across a small portfolio of listening channels.", "Supporting examples should be available without making every row permanently tall."],
	avoidWhen: ["The channels cannot be expressed as comparable percentages.", "Every channel’s supporting detail must remain visible simultaneously."],
	dataContract: {
		shape: "channel-portfolio",
		minimumItems: 1,
		maximumItems: 6,
		fields: [
			{
				name: "items",
				type: "string",
				required: !0,
				description: "Ordered channels with stable ids, titles, percentages, colors, opaque selected-state colors, descriptions, and examples.",
				constraints: "Values must be between 0 and 100 and ids must be unique."
			},
			{
				name: "selectedId",
				type: "string",
				required: !1,
				description: "Controlled id of the expanded channel."
			},
			{
				name: "defaultSelectedId",
				type: "string",
				required: !1,
				description: "Initially expanded channel when uncontrolled."
			}
		]
	},
	capabilities: [
		"interactive",
		"keyboard",
		"responsive",
		"static-export",
		"table-fallback"
	],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "1327:19497",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1327-19497&m=dev"
	},
	publishingStudio: {
		adapterId: "channel-portfolio-v3",
		compatibility: "available",
		sourceShape: "ordered channel adoption values with opaque selected states, descriptions, and inline examples"
	}
}, Z = {
	id: "listening-maturity",
	name: "Listening maturity",
	collection: "annual-report-2026",
	version: 1,
	status: "review",
	description: "Helps readers reflect on four qualitative listening capabilities and receive immediate narrative guidance.",
	useWhen: ["A report needs a qualitative reflection rather than a maturity score.", "Readers should see how participation, accountability, impact, and adaptability work together."],
	avoidWhen: ["A benchmarked numeric maturity score is required.", "The assessment cannot provide one clear statement for each capability."],
	dataContract: {
		shape: "listening-maturity",
		minimumItems: 4,
		maximumItems: 4,
		fields: [
			{
				name: "capabilities",
				type: "string",
				required: !0,
				description: "Exactly four capabilities with stable ids, titles, questions, colors, three qualitative options, and next-step guidance.",
				constraints: "Each capability requires one constrained, uneven, and embedded option."
			},
			{
				name: "selections",
				type: "string",
				required: !1,
				description: "Controlled qualitative selection for each capability."
			},
			{
				name: "defaultSelections",
				type: "string",
				required: !1,
				description: "Initial qualitative selections when uncontrolled."
			},
			{
				name: "resultPanelTop",
				type: "string",
				required: !1,
				description: "Sticky result-panel offset supplied by the host layout, such as the navigation height plus 16 pixels."
			}
		]
	},
	capabilities: [
		"interactive",
		"keyboard",
		"responsive",
		"static-export",
		"table-fallback"
	],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "1345:24761",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1345-24761&m=dev"
	},
	publishingStudio: {
		adapterId: "listening-maturity-v1",
		compatibility: "available",
		sourceShape: "four qualitative capability prompts with constrained, uneven, and embedded statements",
		manifestBlockType: "listening-maturity-scorecard"
	}
}, Q = {
	id: "employee-ai-readiness",
	name: "Employee AI readiness",
	collection: "annual-report-2026",
	version: 1,
	status: "review",
	description: "Compares employee trust, organizational openness, and self-directed AI use in the feedback process.",
	useWhen: ["A report needs to show three related employee AI-readiness indicators.", "The relationship between formal openness and behavior outside safeguards is important."],
	avoidWhen: ["The measures do not share a common 0–100 percentage scale.", "More than three measures need equal visual prominence."],
	dataContract: {
		shape: "employee-ai-readiness",
		minimumItems: 3,
		maximumItems: 3,
		fields: [
			{
				name: "metrics",
				type: "string",
				required: !0,
				description: "Exactly three metrics with stable ids, labels, display values, descriptions, percentages, detail labels, and color tokens.",
				constraints: "Percentages must be between 0 and 100 and ids must be unique."
			},
			{
				name: "title",
				type: "string",
				required: !1,
				description: "Centered visual headline."
			},
			{
				name: "description",
				type: "string",
				required: !1,
				description: "One-line framing statement beneath the headline."
			},
			{
				name: "insight",
				type: "string",
				required: !1,
				description: "Closing implication shown with the lightbulb icon."
			}
		]
	},
	capabilities: [
		"responsive",
		"static-export",
		"table-fallback"
	],
	figma: {
		status: "linked",
		fileKey: "rkrC8mdVsXC1rAITLp04Sq",
		nodeId: "1352:6534",
		url: "https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1352-6534&m=dev"
	},
	publishingStudio: {
		adapterId: "employee-ai-readiness-v1",
		compatibility: "available",
		sourceShape: "three percentage-based employee AI indicators with supporting context and a closing implication"
	}
}, $ = [
	I,
	R,
	z,
	B,
	V,
	L,
	H,
	U,
	W,
	G,
	K,
	q,
	J,
	Y,
	X,
	Z,
	Q
];
function Ce(e) {
	return $.find((t) => t.id === e);
}
function we(e) {
	return $.filter((t) => t.collection === e);
}
//#endregion
export { P as ChannelPortfolio, f as DataInsightCard, he as EmployeeAiReadiness, F as GlintLabsNavigation, ve as GlintResearchCard, xe as GlintResourceLinkRow, be as GlintToolCard, ye as GlintTrendingCard, p as LeadStatement, de as ListeningMaturity, ae as ListeningSpeedGap, x as OutcomeFocusCard, g as OutcomeMetricCard, S as PullQuote, E as RightFitGuardrails, O as SkillPriorityStack, c as VisualAnnotation, o as VisualFrame, s as VisualHeader, l as VisualSource, L as annualReportNavigationDefinition, X as channelPortfolioDefinition, K as dataInsightCardDefinition, Q as employeeAiReadinessDefinition, Ce as getVisualDefinition, we as getVisualsByCollection, I as glintLabsNavigationDefinition, R as glintResearchCardDefinition, V as glintResourceLinkRowDefinition, B as glintToolCardDefinition, z as glintTrendingCardDefinition, U as leadStatementDefinition, Z as listeningMaturityDefinition, Y as listeningSpeedGapDefinition, G as outcomeFocusCardDefinition, W as outcomeMetricCardDefinition, H as pullQuoteDefinition, q as rightFitGuardrailsDefinition, J as skillPriorityStackDefinition, Se as visualCollections, $ as visualRegistry };
