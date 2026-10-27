/* eslint-disable @next/next/no-img-element */
import { CapabilityRatings, CanonicalMomentumMap, ContinuousListeningTrigger, AiPhaseDisclosures, ReportAppendices } from "./canonical-report-interactions";
import { ListeningPriorityShift } from "./annual-report-interactive-visuals";
import { ContinuousListeningDefinitions } from "./annual-report-components";
import { ActionTakingParadox, AiOpportunity, RightFitPrinciples } from "./canonical-report-diagrams";
import { parseSitePalette } from "../app/site-palette";
import styles from "./canonical-figma.module.css";

function illustration(legacy: string, blue: string) {
  return parseSitePalette(process.env.GLINT_LABS_SITE_PALETTE) === "legacy"
    ? `/figma/annual-canonical/${legacy}.svg`
    : `/figma/annual-blue/${blue}.svg`;
}

export const canonicalSections = [
  {
    "href": "#annual-section-1",
    "label": "Listening at the speed of change"
  },
  {
    "href": "#annual-section-2",
    "label": "Where employee listening stands today"
  },
  {
    "href": "#annual-section-3",
    "label": "What employee listening needs to accomplish now"
  },
  {
    "href": "#annual-section-4",
    "label": "Building a listening agenda that can evolve"
  },
  {
    "href": "#annual-section-5",
    "label": "Three assumptions to reconsider"
  },
  {
    "href": "#annual-section-6",
    "label": "The right-fit listening system"
  },
  {
    "href": "#annual-section-7",
    "label": "AI raises the stakes for right-fit listening"
  },
  {
    "href": "#annual-human-judgment",
    "label": "Human judgment needs a job description"
  },
  {
    "href": "#annual-section-8",
    "label": "Lead the system, not the survey"
  }
];

// Figma fidelity snapshot (1655:41913); original Word provenance is retained separately.
export function CanonicalReportBody() {
  return <div className={styles.body}>
        <div className={styles.frame0} data-node-id="1451:11442">
          <div className={styles.frame1} data-node-id="1451:11443">
            <div className={styles.frame2} data-node-id="1451:11444">
              <h2 className={styles.frame3} data-node-id="1451:11445" id="annual-section-1" tabIndex={-1} style={{ fontVariationSettings: '"wdth" 100' }}>
                Listening at the speed of change
              </h2>
              <div className={styles.frame4} data-node-id="1451:11446" style={{ fontVariationSettings: '"opsz" 8' }}>
                <p className={styles.frame5}>
                  <span className={styles.frame6}>Organizations have more ways than ever to solicit feedback from employees. Seventy-four percent of the enterprise listening leaders we surveyed reported that their organization is expanding their listening channels</span>
                  <sup className={styles.frame7} style={{ fontVariationSettings: '"opsz" 8' }}>
                    1
                  </sup>
                  <span className={styles.frame6}>{`. In the current work environment, with workflows that were developed over years now being reconsidered in months, more signal may help listening teams keep up with the pace of change. But adding more channels does not inherently help listening teams turn more feedback into meaningful decisions or outcomes. Only 1 in 3 listening leaders rated their listening systems as "strong" or "best-in-class" at influencing senior leadership or business decisions and at connecting listening data to meaningful outcomes`}</span>
                  <sup className={styles.frame7} style={{ fontVariationSettings: '"opsz" 8' }}>
                    1
                  </sup>
                  <span className={styles.frame6}>.</span>
                </p>
                <p className={styles.frame8}></p>
                <p className={styles.frame6}>Foundational listening practices provide scale, consistency, and trust. But many were built around defined programs, established reporting cycles, and familiar routes to action. When the questions organizations need to answer change faster than those structures, simply listening more often is not enough. It can create more signals, more burden, and more noise without producing better understanding or response. The deeper challenge is ensuring the listening system adapts around the needs of employees and the organization, rather than asking those needs to fit the system.</p>
              </div>
            </div>
            <div className={styles.frame9} data-node-id="1451:11447">
              <div className={styles.frame10} data-node-id="I1451:11447;798:64560" />
              <p className={styles.frame11} data-node-id="I1451:11447;798:64561" style={{ fontVariationSettings: '"opsz" 36, "opsz" 36' }}>
                That is the shift at the heart of next generation employee listening: from managing listening activities to building a right-fit system around what the organization needs to understand and where employees can uniquely use their voice to feel empowered amidst rapid change.
              </p>
            </div>
          </div>
        </div>
        <div className={styles.frame12} data-node-id="1451:11449">
          <div className={styles.frame13} data-node-id="1451:11450" />
        </div>
        <div className={styles.frame14} data-node-id="1451:11451">
          <div className={styles.frame2} data-node-id="1451:11453">
            <h2 className={styles.frame15} data-node-id="1451:11454" id="annual-section-2" tabIndex={-1} style={{ fontVariationSettings: '"wdth" 100' }}>
              Where employee listening stands today
            </h2>
            <p className={styles.frame16} data-node-id="1451:11455" style={{ fontVariationSettings: '"opsz" 8' }}>
              <span className={styles.frame6}>The purpose of employee listening is to create an iterative feedback cycle between employees and leadership. Traditional employee listening is typically synonymous with outcomes such as employee engagement and reduced attrition, and listening leaders report that their work continues to deliver value across these traditional outcomes</span>
              <sup className={styles.frame17} style={{ fontVariationSettings: '"opsz" 8' }}>
                1
              </sup>
              <span className={styles.frame6}>.</span>
            </p>
          </div>
          <div className={styles.frame18} data-node-id="1509:34683">
            <div className={styles.frame19} data-node-id="1509:34684">
              <div className={styles.frame20}>
                <img className={styles.frame21} alt="" src={illustration("imgEllipse9", "card-glow")} />
              </div>
            </div>
            <h3 className={styles.frame22} data-node-id="1509:34681" style={{ fontVariationSettings: '"opsz" 36' }}>
              <span className={styles.frame23}>When asked to select the top three areas where their employee listening has delivered the most value to their organization, listening leaders surfaced the following</span>
            </h3>
            <div className={styles.frame25} data-node-id="1509:34737">
              <div className={styles.frame26} data-node-id="1509:34697">
                <div className={styles.frame27} data-node-id="1509:34661">
                  <img className={styles.frame28} alt="" src={illustration("imgIllustrations", "celebration")} />
                </div>
                <p className={styles.frame29} data-node-id="1535:38924" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 8' }}>
                  60% selected
                </p>
                <p className={styles.frame30} data-node-id="1509:34662" style={{ fontVariationSettings: '"opsz" 36' }}>
                  Improving engagement, retention, wellbeing, or other talent outcomes
                </p>
              </div>
              <div aria-hidden="true" className={styles.frame31} />
              <div className={styles.frame26} data-node-id="1509:34698">
                <div className={styles.frame27} data-node-id="1509:34718">
                  <img className={styles.frame28} alt="" src={illustration("imgIllustrations1", "data-flow")} />
                </div>
                <p className={styles.frame29} data-node-id="1535:38952" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 8' }}>
                  45% selected
                </p>
                <p className={styles.frame30} data-node-id="1509:34700" style={{ fontVariationSettings: '"opsz" 36' }}>
                  Enabling more focused action and follow-through on employee feedback
                </p>
              </div>
              <div aria-hidden="true" className={styles.frame31} />
              <div className={styles.frame26} data-node-id="1509:34705">
                <div className={styles.frame27} data-node-id="1509:34723">
                  <img className={styles.frame28} alt="" src={illustration("imgIllustrations2", "people")} />
                </div>
                <p className={styles.frame29} data-node-id="1535:38953" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 8' }}>
                  34% selected
                </p>
                <div className={styles.frame32} data-node-id="1509:34707" style={{ fontVariationSettings: '"opsz" 36' }}>
                  <p className={styles.frame33}>Strengthening trust between employees</p>
                  <p className={styles.frame34}>and leaders</p>
                </div>
              </div>
            </div>
            <p className={styles.frame35} data-node-id="1535:38954" style={{ fontVariationSettings: '"opsz" 8', fontStyle: "italic" }}>
              Percentages represent the share of listening leaders<sup>1</sup> who selected each outcome as one of their top three from a list of 12.
            </p>
          </div>
          <p className={styles.frame36} data-node-id="1451:11460" style={{ fontVariationSettings: '"opsz" 8' }}>
            <span className={styles.frame6}>But that value is fragile in the current landscape of work. Even though strengthening trust surfaced as a top outcome of their listening system, listening leaders also ranked losing that trust as the <strong>#1 challenge</strong> their organization faces when it comes to employee listening</span>
            <sup className={styles.frame17} style={{ fontVariationSettings: '"opsz" 8' }}>
              1
            </sup>
            <span className={styles.frame6}>.</span>
          </p>
          <div className={styles.frame37} data-node-id="1584:78706">
            <div className={styles.frame38} data-node-id="1584:78707">
              <div className={styles.frame20}>
                <img className={styles.frame21} alt="" src={illustration("imgEllipse9", "quote-glow")} />
              </div>
            </div>
            <div className={styles.frame39} data-node-id="1584:78719">
              <p className={styles.frame40} data-node-id="1584:78708" style={{ fontVariationSettings: '"opsz" 36, "opsz" 36' }}>
                The tenuous balance of trust
              </p>
              <p className={styles.frame41} data-node-id="1584:78718" style={{ fontVariationSettings: '"opsz" 36, "opsz" 36' }}>
                Listening leaders see trust as both an outcome of effective listening and something they risk losing when listening falls short.
              </p>
            </div>
            <blockquote className={styles.frame42} data-node-id="1584:78709">
              <div className={styles.frame43} data-node-id="I1584:78709;1070:3422">
                <div className={styles.frame44} data-node-id="I1584:78709;1070:3423" />
                <div className={styles.frame45} data-node-id="I1584:78709;1070:3424">
                  <div className={styles.frame46} data-node-id="I1584:78709;1070:3425">
                    <p className={styles.frame47} data-node-id="I1584:78709;1070:3426">
                      “
                    </p>
                    <p className={styles.frame48} data-node-id="I1584:78709;1070:3427" style={{ fontVariationSettings: '"wdth" 100' }}>
                      The worst thing is that you listen to your employees and do nothing. People will stop participating because they see that nothing happens.
                    </p>
                  </div>
                  <p className={styles.frame49} data-node-id="I1584:78709;1070:3428" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 8' }}>
                    Division Human Resources Director / Manufacturing<sup>3</sup>
                  </p>
                </div>
              </div>
            </blockquote>
          </div>
          <div className={styles.frame50} data-node-id="1505:33975">
            <div className={styles.frame51} data-node-id="1494:31096" style={{ fontVariationSettings: '"opsz" 8' }}>
              <p className={styles.frame6}>
                Listening teams are navigating new challenges that are changing what they need from their listening programs. The <strong>top three forces</strong> that listening leaders reported are most influencing changes to their employee listening strategy were<sup>1</sup>:
              </p>
              <ol className={styles.forcesList}>
                <li>Organizational transformation, restructuring, or workforce change • 63% selected</li>
                <li>Employee expectations for transparency and responsiveness • 63% selected</li>
                <li>AI adoption and workforce readiness for AI-driven change • 61% selected</li>
              </ol>
              <p className={styles.frame8}></p>
              <p >
                <span className={styles.frame6}>To meet the moment, modes of listening are expanding beyond a central survey program. Across the listening leaders surveyed, the following active feedback channel composition emerged</span>
                <sup className={styles.frame7} style={{ fontVariationSettings: '"opsz" 8' }}>
                  1
                </sup>
                <span className={styles.frame6}>:</span>
              </p>
            </div>
            <div className={styles.frame52} data-node-id="1582:75712">
              <div className={styles.frame53} data-node-id="1582:75718">
                <div className={styles.frame54} data-node-id="1582:75720">
                  <div className={styles.frame55} data-node-id="1582:75766">
                    <div className={styles.frame56} data-node-id="1582:75719">
                      <img className={styles.frame28} alt="" src="/figma/annual-canonical/imgForm.svg" />
                    </div>
                    <p className={styles.frame57} data-node-id="1582:75721" style={{ fontVariationSettings: '"opsz" 8' }}>{`Core surveys • 91% average channel adoption `}</p>
                  </div>
                  <div className={styles.frame58} data-node-id="1582:75767">
                    <ul className={styles.frame59} data-node-id="1582:75722" style={{ fontVariationSettings: '"opsz" 8' }}>
                      <li className={styles.frame60}>
                        <span className={styles.frame61}>{`Company-wide engagement survey `}</span>
                      </li>
                      <li className={styles.frame60}>
                        <span className={styles.frame61}>{`Short pulse or ad hoc survey `}</span>
                      </li>
                      <li className={styles.frame62}>
                        <span className={styles.frame61}>{`Lifecycle or moment survey `}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div aria-hidden="true" className={styles.frame63} />
              <div className={styles.frame53} data-node-id="1582:75768">
                <div className={styles.frame54} data-node-id="1582:75769">
                  <div className={styles.frame55} data-node-id="1582:75770">
                    <div className={styles.frame56} data-node-id="1582:75771">
                      <img className={styles.frame28} alt="" src="/figma/annual-canonical/imgPeopleSwap.svg" />
                    </div>
                    <p className={styles.frame57} data-node-id="1582:75772" style={{ fontVariationSettings: '"opsz" 8' }}>{`Facilitated dialogue • 78% average channel adoption `}</p>
                  </div>
                  <div className={styles.frame58} data-node-id="1582:75773">
                    <ul className={styles.frame59} data-node-id="1582:75774" style={{ fontVariationSettings: '"opsz" 8' }}>
                      <li className={styles.frame60}>
                        <span className={styles.frame61}>Focus group</span>
                      </li>
                      <li className={styles.frame60}>
                        <span className={styles.frame61}>Structured interview</span>
                      </li>
                      <li className={styles.frame60}>
                        <span className={styles.frame61}>{`Town hall or all-hands Q&A`}</span>
                      </li>
                      <li className={styles.frame62}>
                        <span className={styles.frame61}>{`Employee resource groups `}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div aria-hidden="true" className={styles.frame63} />
              <div className={styles.frame53} data-node-id="1582:75780">
                <div className={styles.frame54} data-node-id="1582:75781">
                  <div className={styles.frame55} data-node-id="1582:75782">
                    <div className={styles.frame56} data-node-id="1582:75783">
                      <img className={styles.frame28} alt="" src="/figma/annual-canonical/imgApprovalsApp.svg" />
                    </div>
                    <p className={styles.frame57} data-node-id="1582:75784" style={{ fontVariationSettings: '"opsz" 8' }}>{`Always-on • 74% average channel adoption `}</p>
                  </div>
                  <div className={styles.frame58} data-node-id="1582:75785">
                    <ul className={styles.frame59} data-node-id="1582:75786" style={{ fontVariationSettings: '"opsz" 8' }}>
                      <li className={styles.frame60}>
                        <span className={styles.frame61}>Internal social forums or discussion boards</span>
                      </li>
                      <li className={styles.frame62}>
                        <span className={styles.frame61}>Suggestion board or drop box</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div aria-hidden="true" className={styles.frame63} />
              <div className={styles.frame53} data-node-id="1582:75790">
                <div className={styles.frame54} data-node-id="1582:75791">
                  <div className={styles.frame55} data-node-id="1582:75792">
                    <div className={styles.frame56} data-node-id="1582:75793">
                      <img className={styles.frame28} alt="" src="/figma/annual-canonical/imgTimeAndWeather.svg" />
                    </div>
                    <p className={styles.frame57} data-node-id="1582:75794" style={{ fontVariationSettings: '"opsz" 8' }}>{`Ambient or passive data • 71% average channel adoption `}</p>
                  </div>
                  <div className={styles.frame58} data-node-id="1582:75795">
                    <ul className={styles.frame64} data-node-id="1582:75796" style={{ fontVariationSettings: '"opsz" 8' }}>
                      <li className={styles.frame65}>
                        <span className={styles.frame61}>Collaboration signals or productivity data</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div aria-hidden="true" className={styles.frame63} />
              <div className={styles.frame53} data-node-id="1582:75800">
                <div className={styles.frame54} data-node-id="1582:75801">
                  <div className={styles.frame55} data-node-id="1582:75802">
                    <div className={styles.frame56} data-node-id="1582:75803">
                      <img className={styles.frame28} alt="" src="/figma/annual-canonical/imgFlowDot.svg" />
                    </div>
                    <p className={styles.frame57} data-node-id="1582:75804" style={{ fontVariationSettings: '"opsz" 8' }}>{`In the flow of work • 48% average channel adoption `}</p>
                  </div>
                  <div className={styles.frame58} data-node-id="1582:75805">
                    <ul className={styles.frame59} data-node-id="1582:75806" style={{ fontVariationSettings: '"opsz" 8' }}>
                      <li className={styles.frame60}>
                        <span className={styles.frame61}>In-product feedback tool</span>
                      </li>
                      <li className={styles.frame60}>
                        <span className={styles.frame61}>Kiosk or tablet-based feedback station</span>
                      </li>
                      <li className={styles.frame62}>
                        <span className={styles.frame61}>{`SMS or text-based survey `}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className={styles.frame66} data-node-id="1451:11465" style={{ fontVariationSettings: '"opsz" 8' }}>
            These portfolios are continuing to grow, including introducing new AI-enabled channels. Expansion is increasingly selective, with listening leaders investing in new ways to strengthen foundational channels while exploring technology-enabled approaches that open new avenues for employee voice.
          </p>
          <CanonicalMomentumMap />
          <p className={styles.frame36} data-node-id="1451:11469" style={{ fontVariationSettings: '"opsz" 8' }}>
            <span className={styles.frame6}>{`The intent of a broader portfolio is to enable `}</span>
            <ContinuousListeningTrigger><ContinuousListeningDefinitions /></ContinuousListeningTrigger>
            <span className={styles.frame6}>, which represents a system that collects continuous signals on the employee experience. In theory, this should enable listening teams to be agile and act quickly to address emerging risks and friction points affecting the workplace. In practice, this can quickly create conditions for <strong>greater noise over deeper insight</strong>, especially if an expansion of channels is not aligned with an expansion of the listening team&apos;s capacity to act on the influx of signals.</span>
          </p>
          <div className={styles.frame37} data-node-id="1584:78694">
            <div className={styles.frame38} data-node-id="1584:78695">
              <div className={styles.frame20}>
                <img className={styles.frame21} alt="" src={illustration("imgEllipse9", "continuous-quote-glow")} />
              </div>
            </div>
            <div className={styles.frame67} data-node-id="1584:78696" style={{ fontVariationSettings: '"opsz" 36, "opsz" 36' }}>
              <p className={styles.frame68}>Taking an intentional approach to</p>
              <p className={styles.frame69}>continuous listening</p>
            </div>
            <blockquote className={styles.frame42} data-node-id="1584:78697">
              <div className={styles.frame43} data-node-id="I1584:78697;1070:3422">
                <div className={styles.frame44} data-node-id="I1584:78697;1070:3423" />
                <div className={styles.frame45} data-node-id="I1584:78697;1070:3424">
                  <div className={styles.frame46} data-node-id="I1584:78697;1070:3425">
                    <p className={styles.frame47} data-node-id="I1584:78697;1070:3426">
                      “
                    </p>
                    <p className={styles.frame48} data-node-id="I1584:78697;1070:3427" style={{ fontVariationSettings: '"wdth" 100' }}>{`Maybe we jumped from zero to 100 too quickly. Maybe it was just too much change and it was like, ‘Wow, why are all these surveys coming through?’ [...] The way we'd set it up, [...] it was really tricky to do. So we thought, if we’re not actioning the data, let’s not continue `}<span className={styles.quoteEnding}>with always-on.</span></p>
                  </div>
                  <p className={styles.frame70} data-node-id="I1584:78697;1070:3428" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 8' }}>
                    <span className={styles.frame6}>Senior Employee Engagement Lead / Technology</span>
                    <sup className={styles.frame71} style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 8' }}>
                      3
                    </sup>
                  </p>
                </div>
              </div>
            </blockquote>
          </div>
          <p className={styles.frame66} data-node-id="1535:39511" style={{ fontVariationSettings: '"opsz" 8' }}>
            Every additional channel draws on employee attention, analytical capacity, governance, and expectations of follow-through. As listening shifts away from being program-centered, each new input needs to have a clear purpose and contribute to a broader understanding, a consequential decision, or a credible response. Choosing the right way to gather new feedback starts with the need, followed by the voices, evidence, and methods that can provide the clearest view.
          </p>
        </div>
        <div className={styles.frame12} data-node-id="1451:11482">
          <div className={styles.frame13} data-node-id="1451:11483" />
        </div>
        <div className={styles.frame14} data-node-id="1451:11484">
          <div className={styles.frame2} data-node-id="1451:11485">
            <h2 className={styles.frame72} data-node-id="1451:11486" id="annual-section-3" tabIndex={-1} style={{ fontVariationSettings: '"wdth" 100' }}>
              <span className={styles.frame73}>What employee listening needs to</span>
              <span className={styles.frame74}>accomplish now</span>
            </h2>
            <p className={styles.frame75} data-node-id="1451:11487" style={{ fontVariationSettings: '"opsz" 8' }}>
              <strong>Listening teams need to answer a broader set of workforce and business questions</strong>, extending beyond engagement and retention to how people are experiencing work as it changes. There is an opportunity for employee listening to evolve into a comprehensive source of workforce intelligence.
            </p>
          </div>
          <div className={styles.frame37} data-node-id="1584:78682">
            <div className={styles.frame76} data-node-id="1584:78683">
              <div className={styles.frame20}>
                <img className={styles.frame21} alt="" src={illustration("imgEllipse9", "embedded-quote-glow")} />
              </div>
            </div>
            <p className={styles.frame77} data-node-id="1584:78684" style={{ fontVariationSettings: '"opsz" 36, "opsz" 36' }}>
              Listening becomes more valuable when it becomes part of how the business operates
            </p>
            <blockquote className={styles.frame42} data-node-id="1584:78685">
              <div className={styles.frame43} data-node-id="I1584:78685;1070:3422">
                <div className={styles.frame44} data-node-id="I1584:78685;1070:3423" />
                <div className={styles.frame45} data-node-id="I1584:78685;1070:3424">
                  <div className={styles.frame46} data-node-id="I1584:78685;1070:3425">
                    <p className={styles.frame47} data-node-id="I1584:78685;1070:3426">
                      “
                    </p>
                    <p className={styles.frame48} data-node-id="I1584:78685;1070:3427" style={{ fontVariationSettings: '"wdth" 100' }}>
                      The rate of change across our organisation and the markets we operate in means employee experience cannot be understood through periodic snapshots alone. We need a more continuous understanding of what employees are experiencing as change unfolds.
                    </p>
                  </div>
                  <p className={styles.frame49} data-node-id="I1584:78685;1070:3428" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 8' }}>
                    Jasdeep Kareer / Director, People Insights Strategy<br />
                    London Stock Exchange Group
                  </p>
                </div>
              </div>
            </blockquote>
          </div>
          <p className={styles.frame66} data-node-id="1451:11489" style={{ fontVariationSettings: '"opsz" 8' }}>
            Meeting a broader set of employee and organizational needs also asks more of listening teams. The following capabilities can help teams adapt how they listen as those needs continue to change. Our research examined 12 listening capabilities across four areas<sup>1</sup>: <strong>Accessibility, action and accountability, strategic impact, and adaptability</strong>. Together, they reflect whether employees can participate and relevant evidence can be accessed; whether organizations communicate and follow through on what they learn; whether employee voice informs senior and business decisions and connects to outcomes; and whether listening can identify and respond to emerging needs outside established cycles. Only 22% of listening leaders rated their organizations “strong” or “best-in-class” on seven or more of the 12 capabilities, meeting our analytical criteria for <strong>Advanced Listeners</strong>.
          </p>
          <CapabilityRatings />
          <div className={styles.frame78} data-node-id="1451:11491" style={{ fontVariationSettings: '"opsz" 8' }}>
            <p className={styles.frame79}><strong>The difference between Advanced and Typical Listeners is not only what they do, but how they define progress</strong>. Asked to describe their employee listening North Star, Advanced Listeners more often framed the future around the problems they want listening to solve and the capabilities required to solve them, such as detecting emerging issues earlier, making insight easier to access, and helping employees feel heard. Typical Listeners more often described their desired future through improvements to their programs and listening mechanics, such as moving beyond the annual survey, improving channels, and strengthening action-planning workflows.</p>
            <p className={styles.frame8}></p>
            <p className={styles.frame61}>{`More mature listening teams shift the question from “How do we improve the listening process?” toward “What does the organization need listening to make possible?" `}</p>
          </div>
          <div className={styles.frame37} data-node-id="1584:78669">
            <div className={styles.frame76} data-node-id="1584:78670">
              <div className={styles.frame20}>
                <img className={styles.frame21} alt="" src={illustration("imgEllipse9", "microsoft-quote-glow")} />
              </div>
            </div>
            <div className={styles.microsoftHeading}>
              <p>Microsoft in practice.</p>
              <p className={styles.frame80} data-node-id="1584:78671" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 36' }}>
                Moving beyond the survey calendar.
              </p>
            </div>
            <blockquote className={styles.frame42} data-node-id="1584:78672">
              <div className={styles.frame43} data-node-id="I1584:78672;1070:3422">
                <div className={styles.frame44} data-node-id="I1584:78672;1070:3423" />
                <div className={styles.frame81} data-node-id="I1584:78672;1070:3424">
                  <div className={styles.frame82} data-node-id="I1584:78672;1070:3425">
                    <p className={styles.frame47} data-node-id="I1584:78672;1070:3426">
                      “
                    </p>
                    <p className={styles.frame48} data-node-id="I1584:78672;1070:3427" style={{ fontVariationSettings: '"wdth" 100' }}>
                      Our ambition is to move from a calendar of surveys to a listening experience that connects over time. That means remembering what employees have shared, making room to understand the ‘why,’ and connecting feedback to the people who can act. Keeping employee voice central also means giving something back—and letting employees decide when to engage, skip, or pause.
                    </p>
                  </div>
                  <p className={styles.frame83} data-node-id="I1584:78672;1070:3428" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 8' }}>
                    Katie Kirkpatrick-Husk / Director of People Analytics<br />
                    Microsoft
                  </p>
                </div>
              </div>
            </blockquote>
          </div>
        </div>
        <div className={styles.frame12} data-node-id="1451:11493">
          <div className={styles.frame13} data-node-id="1451:11494" />
        </div>
        <div className={styles.frame14} data-node-id="1451:11495">
          <div className={styles.frame84} data-node-id="1451:11496">
            <h2 className={styles.frame85} data-node-id="1451:11497" id="annual-section-4" tabIndex={-1} style={{ fontVariationSettings: '"wdth" 100' }}>
              <span className={styles.frame73}>From program-centered to</span>
              <span className={styles.frame74}>need-centered listening</span>
            </h2>
            <div className={styles.frame86} data-node-id="1451:11498" style={{ fontVariationSettings: '"opsz" 8' }}>
              <p className={styles.frame8}>Moving toward a right-fit listening system requires a different organizing principle. Traditional listening has often been structured around programs: established survey cycles, recurring measures, reporting rhythms, and predetermined moments for asking employees what they think. But this structure can cause the listening agenda to organize around what the program is designed to collect rather than what employees are experiencing. <strong>Need-centered listening reverses that orientation</strong>. It starts with employees in the context of their work, the tools and conditions shaping their experience, and the business decisions that affect them.</p>
              <p className={styles.frame8}></p>
              <p >
                <span className={styles.frame6}>The rise of AI highlights a growing challenge for listening teams: recognizing when employee needs are changing quickly enough to adjust what they listen for. AI was the 14th-most-common topic listening leaders asked about in surveys over the past year. <strong>It is the number one topic they expect to prioritize in the next 12 to 18 months</strong></span>
                <sup className={styles.frame7} style={{ fontVariationSettings: '"opsz" 8' }}>
                  1
                </sup>
                <span className={styles.frame6}>. A topic can move from the edge of the listening agenda to its center within a single planning cycle.</span>
              </p>
            </div>
          </div>
          <ListeningPriorityShift canonical />
          <div className={styles.frame78} data-node-id="1451:11500" style={{ fontVariationSettings: '"opsz" 8' }}>
            <p className={styles.frame79}>Shifting to need-centered listening does not mean replacing enduring measures every time a new priority emerges. Experiences such as trust, growth, wellbeing, leadership, and workload continue to provide important context even as the conditions surrounding work change. <strong>Listening teams managing a right-fit system make room for what is changing without losing sight of what remains consequential.</strong></p>
            <p className={styles.frame8}></p>
            <p className={styles.frame61}>Learning to balance these needs will take time. Some key considerations to keep top of mind are at which level the needs exist, whose perspective is most critical to understanding the need, and how quickly that understanding could change.</p>
          </div>
          <div className={styles.frame87} data-node-id="1540:42948">
            <div className={styles.frame88} data-node-id="1540:42949">
              <div className={styles.frame20}>
                <img className={styles.frame21} alt="" src={illustration("imgEllipse9", "example-glow")} />
              </div>
            </div>
            <p className={styles.customerEyebrow}><img src="/figma/annual-blue/customer-story-person.svg" width={12} height={12} alt="" />Customer story</p>
            <div className={styles.frame89} data-node-id="1540:42963">
              <p className={styles.frame90} data-node-id="1540:42950" style={{ fontVariationSettings: '"opsz" 36, "opsz" 36' }}>
                Start with the need, then design the listening
              </p>
              <div className={styles.frame91} data-node-id="1540:42951" style={{ fontVariationSettings: '"opsz" 8' }}>
                <p className={styles.frame79}>A global technology company wanted to understand how employees were adopting AI and where different workforce needs could affect its transformation. Rather than relying on a single source of feedback, the organization combined employee sentiment with validated AI usage data, then used open-ended feedback to understand the distinct barriers and enablers affecting different employee personas.</p>
                <p className={styles.frame8}></p>
                <p className={styles.frame61}>The organization used that richer understanding to shape different responses for different needs, including targeted learning paths, nudges, onboarding experiences, and investment priorities. The approach also created an ongoing mechanism for monitoring workforce readiness and informing future transformation decisions.</p>
              </div>
            </div>
            <div aria-hidden="true" className={styles.frame63} />
            <div className={styles.frame92} data-node-id="1540:42953">
              <div className={styles.frame27} data-node-id="1584:95314">
                <img className={styles.frame28} alt="" src={illustration("imgIllustrations3", "email")} />
              </div>
              <div className={styles.frame93} data-node-id="1584:95328">
                <div className={styles.frame94}>
                  <p className={styles.frame95} data-node-id="1540:42989" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 36' }}>
                    The takeaway
                  </p>
                  <p className={styles.frame96} data-node-id="1540:42955" style={{ fontVariationSettings: '"opsz" 8' }}>
                    Right-fit listening started with what the organization needed to understand, then brought together the voices and evidence needed to shape a meaningful response.
                  </p>
                </div>
              </div>
            </div>
            <div aria-hidden="true" className={styles.frame63} />
            <div className={styles.frame12} data-node-id="1540:42990">
              <p className={styles.frame97} data-node-id="1540:42992" style={{ fontVariationSettings: '"opsz" 8' }}>
                <span className={styles.frame98} style={{ fontVariationSettings: '"opsz" 8' }}>{`Related research: `}</span>
                <a
                  className={styles.frame99}
                  href="https://techcommunity.microsoft.com/blog/microsoftvivablog/research-drop-diving-into-ai-transformation-profiles-to-understand-unique-needs-/4336280"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Microsoft People Science research (opens in a new tab)"
                  style={{ fontVariationSettings: '"opsz" 8' }}
                >
                  Microsoft People Science research
                </a>
                <span className={styles.frame100}>{` similarly shows that AI transformation is not one-size-fits-all and offers research-backed strategies for meeting different employee profiles where they are in their AI journey.`}</span>
              </p>
            </div>
          </div>
          <div className={styles.frame78} data-node-id="1535:42125" style={{ fontVariationSettings: '"opsz" 8' }}>
            <p className={styles.frame79}>{`Listening leaders also need to decide when not to ask. If capacity is too tight to review the feedback, make a decision, or explain the response, another request may weaken employee trust.  What an organization chooses to ask, and what it chooses not to ask, also signals which employee experiences and business conditions it considers important enough to understand.`}</p>
            <p className={styles.frame8}></p>
            <p className={styles.frame61}>When listening teams organize their work around employee needs rather than established programs, some familiar practices may no longer deliver the same value, which creates an opportunity to reconsider some of the long-standing assumptions central to employee listening.</p>
          </div>
        </div>
        <div className={styles.frame12} data-node-id="1451:11586">
          <div className={styles.frame13} data-node-id="1451:11587" />
        </div>
        <div className={styles.frame14} data-node-id="1451:11588">
          <div className={styles.frame2} data-node-id="1451:11589">
            <h2 className={styles.frame15} data-node-id="1451:11590" id="annual-section-5" tabIndex={-1} style={{ fontVariationSettings: '"wdth" 100' }}>
              Rethinking the rules of listening
            </h2>
            <div className={styles.frame101} data-node-id="1506:34461" style={{ fontVariationSettings: '"opsz" 8' }}>
              <p className={styles.frame79}>Listening practices did not become program-centered by accident. Over time, the field developed methods, processes, and safeguards that brought rigor, consistency, and trust. Many of these practices remain essential. However, it may be time to realize that some of these practices have become limiting. In some instances, following the process has begun to substitute for achieving the outcome it was designed to enable.</p>
              <p className={styles.frame8}></p>
              <p className={styles.frame61}>As organizations move from managing listening programs to building a <strong>right-fit system based on needs</strong>, three long-standing assumptions deserve reconsideration.</p>
            </div>
          </div>
          <div className={styles.frame102} data-node-id="1451:11591">
            <h3 className={styles.frame103} data-node-id="1451:11594" style={{ fontVariationSettings: '"opsz" 36' }}>
              Assumption 1: The survey is the gold standard
            </h3>
            <div className={styles.frame101} data-node-id="1451:11595" style={{ fontVariationSettings: '"opsz" 8' }}>
              <p className={styles.frame79}>Surveys earned their central role in employee listening and organizations have built specialized teams, governance processes, benchmarks, reporting cycles, and shared expectations around them. They provide representative measurement, comparability over time, anonymity, and a deliberate opportunity for employees to exercise voice at scale.</p>
              <p className={styles.frame8}></p>
              <p className={styles.frame79}><strong>But a method can become so established that it begins to define the problem it was designed to solve</strong>. The infrastructure surrounding surveys can make the survey methodology itself, rather than the listening objective, the organizing principle of the system.</p>
              <p className={styles.frame8}></p>
              <p className={styles.frame61}>{`The cost of this goes beyond survey fatigue. It represents a mismatch between the need and the method. Surveys require employee attention and the listening teams’ capacity to design, administer, interpret, and act on. That investment is worthwhile when the organization needs representative measurement or longitudinal comparison. It is less useful when the need is for depth, context, immediacy, or an insight close to a particular experience or decision. `}</p>
            </div>
          </div>
          <div className={styles.frame37} data-node-id="1584:78655">
            <div className={styles.frame38} data-node-id="1584:78656">
              <div className={styles.frame20}>
                <img className={styles.frame21} alt="" src={illustration("imgEllipse9", "burden-quote-glow")} />
              </div>
            </div>
            <p className={styles.frame80} data-node-id="1584:78657" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 36' }}>
              The hidden weight behind every survey
            </p>
            <blockquote className={styles.frame42} data-node-id="1584:78658">
              <div className={styles.frame43} data-node-id="I1584:78658;1070:3422">
                <div className={styles.frame44} data-node-id="I1584:78658;1070:3423" />
                <div className={styles.frame81} data-node-id="I1584:78658;1070:3424">
                  <div className={styles.frame82} data-node-id="I1584:78658;1070:3425">
                    <p className={styles.frame47} data-node-id="I1584:78658;1070:3426">
                      “
                    </p>
                    <p className={styles.frame48} data-node-id="I1584:78658;1070:3427" style={{ fontVariationSettings: '"wdth" 100' }}>
                      From the moment we receive the data, my HR team is heavily involved. It consumes more than 25% of our time during the first months – consolidating results, conducting focus groups, designing implementation plans, and supporting leadership. If you take it seriously, it’s a lot of work.
                    </p>
                  </div>
                  <p className={styles.frame104} data-node-id="I1584:78658;1070:3428" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 8' }}>
                    <span className={styles.frame6}>{`Chief Human Resources Officer  /  Manufacturing`}</span>
                    <sup className={styles.frame71} style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 8' }}>
                      3
                    </sup>
                  </p>
                </div>
              </div>
            </blockquote>
          </div>
          <div className={styles.frame78} data-node-id="1451:11597" style={{ fontVariationSettings: '"opsz" 8' }}>
            <p className={styles.frame79}>To be clear, surveys are not going away. Sixty-nine percent of listening leaders are maintaining their company-wide surveys and 25% are even expanding them<sup>1</sup>. The goal is not to dethrone the survey. It is to remove its automatic claim on the question. In a need-centered listening system, the information need comes first and the method follows.</p>
            <p className={styles.frame8}></p>
            <p className={styles.frame61}>Before commissioning another survey, teams can test the default with two questions: <strong>What are we trying to understand, and what would we lose if a survey were unavailable?</strong> The answer may call for a survey, a conversation, signals already generated through the flow of work, or some combination of these.</p>
          </div>
          <div className={styles.frame102} data-node-id="1506:34462">
            <h3 className={styles.frame103} data-node-id="1506:34463" style={{ fontVariationSettings: '"opsz" 36' }}>
              Assumption 2: Slow and steady wins the race
            </h3>
            <p className={styles.frame75} data-node-id="1506:34464" style={{ fontVariationSettings: '"opsz" 8' }}>
              Employee listening handles some of the most sensitive information an organization collects. New approaches can introduce real risks to confidentiality, representation, employee agency, and trust. Listening teams therefore have a legitimate responsibility to protect employees and the trust listening practices have built.
            </p>
          </div>
          <div className={styles.frame37} data-node-id="1584:78634">
            <div className={styles.frame76} data-node-id="1584:78635">
              <div className={styles.frame20}>
                <img className={styles.frame21} alt="" src={illustration("imgEllipse9", "guardrails-quote-glow")} />
              </div>
            </div>
            <p className={styles.frame80} data-node-id="1584:78636" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 36' }}>
              Listening teams need clear guardrails for using new sources of employee data
            </p>
            <blockquote className={styles.frame42} data-node-id="1584:78637">
              <div className={styles.frame43} data-node-id="I1584:78637;1070:3422">
                <div className={styles.frame44} data-node-id="I1584:78637;1070:3423" />
                <div className={styles.frame81} data-node-id="I1584:78637;1070:3424">
                  <div className={styles.frame82} data-node-id="I1584:78637;1070:3425">
                    <p className={styles.frame47} data-node-id="I1584:78637;1070:3426">
                      “
                    </p>
                    <p className={styles.frame48} data-node-id="I1584:78637;1070:3427" style={{ fontVariationSettings: '"wdth" 100' }}>
                      Companies are pretty risk averse when we’re talking about HR data. We’re still trying to determine the hard guardrails.
                    </p>
                  </div>
                  <p className={styles.frame83} data-node-id="I1584:78637;1070:3428" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 8' }}>{`Global Head of Culture and Associate Experience   /   Consumer Goods`}<sup>3</sup></p>
                </div>
              </div>
            </blockquote>
          </div>
          <div className={styles.frame105} data-node-id="1451:11645" style={{ fontVariationSettings: '"opsz" 8' }}>
            <p className={styles.frame8}><strong>But caution and responsibility are not the same thing</strong>. Familiar methods feel rigorous partly because their risks are understood and safeguards have been built around them over time. Emerging methods can feel inherently less responsible because their failure points are less familiar. The alternative is not speed at any cost. It is creating ways to evaluate emerging approaches and build the evidence and safeguards needed to determine when and how they are appropriate.</p>
            <p className={styles.frame8}></p>
            <p className={styles.frame8}>{`The rigor surrounding established employee listening practices was itself built through that process. Emerging practices require the same discipline: Experimenting thoughtfully, identifying failure modes, and establishing the conditions under which an approach should proceed, change, or stop. `}</p>
            <p className={styles.frame5}>
              <span className={styles.frame6}>AI will have a direct influence on listening teams’ ways of working. In an AI-enabled workplace, listening teams have begun experimenting, but most AI-enabled applications remain far from operationalized. Across 14 AI-enabled listening capabilities, 41% are being explored or piloted, while only 14% are deployed and operationalized</span>
              <sup className={styles.frame7} style={{ fontVariationSettings: '"opsz" 8' }}>
                1
              </sup>
              <span className={styles.frame6}>.</span>
            </p>
            <p className={styles.frame8}></p>
            <p >
              <span className={styles.frame6}><strong>As it stands, employee behavior may be moving faster than formal adoption</strong>. Fifty nine percent of the employees surveyed already use AI tools not provided by their organization to support some part of the feedback process; Two in three employees expressed trust in AI tools to accurately represent their feedback; and 70% are open to their organization expanding AI use in employee listening</span>
              <sup className={styles.frame7} style={{ fontVariationSettings: '"opsz" 8' }}>
                2
              </sup>
              <span className={styles.frame6}>.</span>
            </p>
          </div>
          <div className={styles.frame18} data-node-id="1584:78735">
            <div className={styles.frame19} data-node-id="1584:78736">
              <div className={styles.frame20}>
                <img className={styles.frame21} alt="" src={illustration("imgEllipse9", "employee-ai-glow")} />
              </div>
            </div>
            <h3 className={styles.frame106} data-node-id="1584:78737" style={{ fontVariationSettings: '"opsz" 36' }}>
              <span className={styles.frame23}>Employee behavior is already moving toward AI-enabled listening</span>
              <span className={styles.frame23}>{` `}</span>
            </h3>
            <div className={styles.frame25} data-node-id="1584:78738">
              <div className={styles.frame26} data-node-id="1584:78739">
                <div className={styles.frame27} data-node-id="1584:78740">
                  <img className={styles.frame28} alt="" src={illustration("imgIllustrations4", "arrange")} />
                </div>
                <p className={styles.frame107} data-node-id="1584:78741" style={{ fontVariationSettings: '"opsz" 36, "opsz" 36' }}>
                  67%
                </p>
                <p className={styles.frame30} data-node-id="1584:78742" style={{ fontVariationSettings: '"opsz" 36' }}>
                  said they trust AI tools to accurately represent their feedback
                </p>
              </div>
              <div aria-hidden="true" className={styles.frame31} />
              <div className={styles.frame26} data-node-id="1584:78744">
                <div className={styles.frame27} data-node-id="1584:78745">
                  <img className={styles.frame28} alt="" src={illustration("imgIllustrations5", "plan")} />
                </div>
                <p className={styles.frame107} data-node-id="1584:78746" style={{ fontVariationSettings: '"opsz" 36, "opsz" 36' }}>
                  70%
                </p>
                <p className={styles.frame30} data-node-id="1584:78747" style={{ fontVariationSettings: '"opsz" 36' }}>{`are open to their organization expanding AI use in employee listening `}</p>
              </div>
              <div aria-hidden="true" className={styles.frame31} />
              <div className={styles.frame26} data-node-id="1584:78749">
                <div className={styles.frame27} data-node-id="1584:78750">
                  <img className={styles.frame28} alt="" src={illustration("imgIllustrations6", "agents")} />
                </div>
                <p className={styles.frame107} data-node-id="1584:78751" style={{ fontVariationSettings: '"opsz" 36, "opsz" 36' }}>
                  59%
                </p>
                <p className={styles.frame30} data-node-id="1584:78752" style={{ fontVariationSettings: '"opsz" 36' }}>{`already use AI tools not provided by their organization in the feedback process `}</p>
              </div>
            </div>
            <p className={styles.employeeAiNote}>Percentages reflect employee favorability scores (agree + strongly agree) on the statements provided<sup>2</sup>.</p>
          </div>
          <div className={styles.frame78} data-node-id="1451:11647" style={{ fontVariationSettings: '"opsz" 8' }}>
            <p className={styles.frame79}><strong>Moving slowly therefore does not necessarily preserve a stable status quo</strong>. When employees establish new practices on their own, listening teams have less ability to influence the transparency, safeguards, and quality standards surrounding them. An effort to protect trust can unintentionally push experimentation into places where the organization has less influence and employees have fewer protections.</p>
            <p className={styles.frame8}></p>
            <p className={styles.frame79}>Building evidence before broader deployment creates another path. Organizations can use approaches such as synthetic or simulated data, structured human evaluation, scenario testing, approved de-identified data, controlled pilots, and staged or reversible releases to identify failure points before expanding employee exposure. Which approaches are appropriate will depend on the specific use, data, safeguards, and applicable requirements.</p>
            <p className={styles.frame8}></p>
            <p className={styles.frame61}>For each proposed experiment, teams can ask: What potential harm to employees are we protecting against? What evidence would give us confidence to proceed? What is the safest environment in which to gather it? What result would cause us to stop?</p>
          </div>
          <div className={styles.frame108} data-node-id="1561:59775">
            <div className={styles.frame109} data-node-id="1561:59776">
              <h3 className={styles.frame110} data-node-id="1561:59777" style={{ fontVariationSettings: '"opsz" 36' }}>
                Build evidence before broader deployment
              </h3>
              <p className={styles.frame111} data-node-id="1561:59778" style={{ fontVariationSettings: '"opsz" 8' }}>
                How many people are affected shapes the change management needed to move at speed. These are independent choices to fit your question, not a sequence to complete.
              </p>
            </div>
            <div className={styles.frame112} data-node-id="1561:59970">
              <div className={styles.frame113} data-node-id="1562:60039">
                <p className={styles.frame114} data-node-id="1562:60046" style={{ fontVariationSettings: '"opsz" 8' }}>
                  No exposure
                </p>
                <div className={styles.frame115} data-node-id="1581:66881">
                  <div className={styles.frame116} data-node-id="1581:67550">
                    <div className={styles.frame117} data-node-id="1581:67551">
                      <div className={styles.frame118} data-node-id="1581:67552" />
                      <div className={styles.frame118} data-node-id="1581:67553" />
                      <div className={styles.frame118} data-node-id="1581:67554" />
                      <div className={styles.frame118} data-node-id="1581:67555" />
                      <div className={styles.frame118} data-node-id="1581:67556" />
                      <div className={styles.frame118} data-node-id="1581:67557" />
                      <div className={styles.frame118} data-node-id="1581:67558" />
                      <div className={styles.frame118} data-node-id="1581:67559" />
                      <div className={styles.frame118} data-node-id="1581:67560" />
                      <div className={styles.frame118} data-node-id="1581:67561" />
                      <div className={styles.frame118} data-node-id="1581:67562" />
                      <div className={styles.frame118} data-node-id="1581:67563" />
                      <div className={styles.frame118} data-node-id="1581:67564" />
                      <div className={styles.frame118} data-node-id="1581:67565" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67566">
                      <div className={styles.frame118} data-node-id="1581:67567" />
                      <div className={styles.frame118} data-node-id="1581:67568" />
                      <div className={styles.frame118} data-node-id="1581:67569" />
                      <div className={styles.frame118} data-node-id="1581:67570" />
                      <div className={styles.frame118} data-node-id="1581:67571" />
                      <div className={styles.frame118} data-node-id="1581:67572" />
                      <div className={styles.frame118} data-node-id="1581:67573" />
                      <div className={styles.frame118} data-node-id="1581:67574" />
                      <div className={styles.frame118} data-node-id="1581:67575" />
                      <div className={styles.frame118} data-node-id="1581:67576" />
                      <div className={styles.frame118} data-node-id="1581:67577" />
                      <div className={styles.frame118} data-node-id="1581:67578" />
                      <div className={styles.frame118} data-node-id="1581:67579" />
                      <div className={styles.frame118} data-node-id="1581:67580" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67581">
                      <div className={styles.frame118} data-node-id="1581:67582" />
                      <div className={styles.frame118} data-node-id="1581:67583" />
                      <div className={styles.frame118} data-node-id="1581:67584" />
                      <div className={styles.frame118} data-node-id="1581:67585" />
                      <div className={styles.frame118} data-node-id="1581:67586" />
                      <div className={styles.frame118} data-node-id="1581:67587" />
                      <div className={styles.frame118} data-node-id="1581:67588" />
                      <div className={styles.frame118} data-node-id="1581:67589" />
                      <div className={styles.frame118} data-node-id="1581:67590" />
                      <div className={styles.frame118} data-node-id="1581:67591" />
                      <div className={styles.frame118} data-node-id="1581:67592" />
                      <div className={styles.frame118} data-node-id="1581:67593" />
                      <div className={styles.frame118} data-node-id="1581:67594" />
                      <div className={styles.frame118} data-node-id="1581:67595" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67596">
                      <div className={styles.frame118} data-node-id="1581:67597" />
                      <div className={styles.frame118} data-node-id="1581:67598" />
                      <div className={styles.frame118} data-node-id="1581:67599" />
                      <div className={styles.frame118} data-node-id="1581:67600" />
                      <div className={styles.frame118} data-node-id="1581:67601" />
                      <div className={styles.frame118} data-node-id="1581:67602" />
                      <div className={styles.frame118} data-node-id="1581:67603" />
                      <div className={styles.frame118} data-node-id="1581:67604" />
                      <div className={styles.frame118} data-node-id="1581:67605" />
                      <div className={styles.frame118} data-node-id="1581:67606" />
                      <div className={styles.frame118} data-node-id="1581:67607" />
                      <div className={styles.frame118} data-node-id="1581:67608" />
                      <div className={styles.frame118} data-node-id="1581:67609" />
                      <div className={styles.frame118} data-node-id="1581:67610" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67611">
                      <div className={styles.frame118} data-node-id="1581:67612" />
                      <div className={styles.frame118} data-node-id="1581:67613" />
                      <div className={styles.frame118} data-node-id="1581:67614" />
                      <div className={styles.frame118} data-node-id="1581:67615" />
                      <div className={styles.frame118} data-node-id="1581:67616" />
                      <div className={styles.frame118} data-node-id="1581:67617" />
                      <div className={styles.frame118} data-node-id="1581:67618" />
                      <div className={styles.frame118} data-node-id="1581:67619" />
                      <div className={styles.frame118} data-node-id="1581:67620" />
                      <div className={styles.frame118} data-node-id="1581:67621" />
                      <div className={styles.frame118} data-node-id="1581:67622" />
                      <div className={styles.frame118} data-node-id="1581:67623" />
                      <div className={styles.frame118} data-node-id="1581:67624" />
                      <div className={styles.frame118} data-node-id="1581:67625" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67626">
                      <div className={styles.frame118} data-node-id="1581:67627" />
                      <div className={styles.frame118} data-node-id="1581:67628" />
                      <div className={styles.frame118} data-node-id="1581:67629" />
                      <div className={styles.frame118} data-node-id="1581:67630" />
                      <div className={styles.frame118} data-node-id="1581:67631" />
                      <div className={styles.frame118} data-node-id="1581:67632" />
                      <div className={styles.frame118} data-node-id="1581:67633" />
                      <div className={styles.frame118} data-node-id="1581:67634" />
                      <div className={styles.frame118} data-node-id="1581:67635" />
                      <div className={styles.frame118} data-node-id="1581:67636" />
                      <div className={styles.frame118} data-node-id="1581:67637" />
                      <div className={styles.frame118} data-node-id="1581:67638" />
                      <div className={styles.frame118} data-node-id="1581:67639" />
                      <div className={styles.frame118} data-node-id="1581:67640" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67641">
                      <div className={styles.frame118} data-node-id="1581:67642" />
                      <div className={styles.frame118} data-node-id="1581:67643" />
                      <div className={styles.frame118} data-node-id="1581:67644" />
                      <div className={styles.frame118} data-node-id="1581:67645" />
                      <div className={styles.frame118} data-node-id="1581:67646" />
                      <div className={styles.frame118} data-node-id="1581:67647" />
                      <div className={styles.frame118} data-node-id="1581:67648" />
                      <div className={styles.frame118} data-node-id="1581:67649" />
                      <div className={styles.frame118} data-node-id="1581:67650" />
                      <div className={styles.frame118} data-node-id="1581:67651" />
                      <div className={styles.frame118} data-node-id="1581:67652" />
                      <div className={styles.frame118} data-node-id="1581:67653" />
                      <div className={styles.frame118} data-node-id="1581:67654" />
                      <div className={styles.frame118} data-node-id="1581:67655" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67656">
                      <div className={styles.frame118} data-node-id="1581:67657" />
                      <div className={styles.frame118} data-node-id="1581:67658" />
                      <div className={styles.frame118} data-node-id="1581:67659" />
                      <div className={styles.frame118} data-node-id="1581:67660" />
                      <div className={styles.frame118} data-node-id="1581:67661" />
                      <div className={styles.frame118} data-node-id="1581:67662" />
                      <div className={styles.frame118} data-node-id="1581:67663" />
                      <div className={styles.frame118} data-node-id="1581:67664" />
                      <div className={styles.frame118} data-node-id="1581:67665" />
                      <div className={styles.frame118} data-node-id="1581:67666" />
                      <div className={styles.frame118} data-node-id="1581:67667" />
                      <div className={styles.frame118} data-node-id="1581:67668" />
                      <div className={styles.frame118} data-node-id="1581:67669" />
                      <div className={styles.frame118} data-node-id="1581:67670" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67671">
                      <div className={styles.frame118} data-node-id="1581:67672" />
                      <div className={styles.frame118} data-node-id="1581:67673" />
                      <div className={styles.frame118} data-node-id="1581:67674" />
                      <div className={styles.frame118} data-node-id="1581:67675" />
                      <div className={styles.frame118} data-node-id="1581:67676" />
                      <div className={styles.frame118} data-node-id="1581:67677" />
                      <div className={styles.frame118} data-node-id="1581:67678" />
                      <div className={styles.frame118} data-node-id="1581:67679" />
                      <div className={styles.frame118} data-node-id="1581:67680" />
                      <div className={styles.frame118} data-node-id="1581:67681" />
                      <div className={styles.frame118} data-node-id="1581:67682" />
                      <div className={styles.frame118} data-node-id="1581:67683" />
                      <div className={styles.frame118} data-node-id="1581:67684" />
                      <div className={styles.frame118} data-node-id="1581:67685" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67686">
                      <div className={styles.frame118} data-node-id="1581:67687" />
                      <div className={styles.frame118} data-node-id="1581:67688" />
                      <div className={styles.frame118} data-node-id="1581:67689" />
                      <div className={styles.frame118} data-node-id="1581:67690" />
                      <div className={styles.frame118} data-node-id="1581:67691" />
                      <div className={styles.frame118} data-node-id="1581:67692" />
                      <div className={styles.frame118} data-node-id="1581:67693" />
                      <div className={styles.frame118} data-node-id="1581:67694" />
                      <div className={styles.frame118} data-node-id="1581:67695" />
                      <div className={styles.frame118} data-node-id="1581:67696" />
                      <div className={styles.frame118} data-node-id="1581:67697" />
                      <div className={styles.frame118} data-node-id="1581:67698" />
                      <div className={styles.frame118} data-node-id="1581:67699" />
                      <div className={styles.frame118} data-node-id="1581:67700" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67701">
                      <div className={styles.frame118} data-node-id="1581:67702" />
                      <div className={styles.frame118} data-node-id="1581:67703" />
                      <div className={styles.frame118} data-node-id="1581:67704" />
                      <div className={styles.frame118} data-node-id="1581:67705" />
                      <div className={styles.frame118} data-node-id="1581:67706" />
                      <div className={styles.frame118} data-node-id="1581:67707" />
                      <div className={styles.frame118} data-node-id="1581:67708" />
                      <div className={styles.frame118} data-node-id="1581:67709" />
                      <div className={styles.frame118} data-node-id="1581:67710" />
                      <div className={styles.frame118} data-node-id="1581:67711" />
                      <div className={styles.frame118} data-node-id="1581:67712" />
                      <div className={styles.frame118} data-node-id="1581:67713" />
                      <div className={styles.frame118} data-node-id="1581:67714" />
                      <div className={styles.frame118} data-node-id="1581:67715" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67716">
                      <div className={styles.frame118} data-node-id="1581:67717" />
                      <div className={styles.frame118} data-node-id="1581:67718" />
                      <div className={styles.frame118} data-node-id="1581:67719" />
                      <div className={styles.frame118} data-node-id="1581:67720" />
                      <div className={styles.frame118} data-node-id="1581:67721" />
                      <div className={styles.frame118} data-node-id="1581:67722" />
                      <div className={styles.frame118} data-node-id="1581:67723" />
                      <div className={styles.frame118} data-node-id="1581:67724" />
                      <div className={styles.frame118} data-node-id="1581:67725" />
                      <div className={styles.frame118} data-node-id="1581:67726" />
                      <div className={styles.frame118} data-node-id="1581:67727" />
                      <div className={styles.frame118} data-node-id="1581:67728" />
                      <div className={styles.frame118} data-node-id="1581:67729" />
                      <div className={styles.frame118} data-node-id="1581:67730" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67731">
                      <div className={styles.frame118} data-node-id="1581:67732" />
                      <div className={styles.frame118} data-node-id="1581:67733" />
                      <div className={styles.frame118} data-node-id="1581:67734" />
                      <div className={styles.frame118} data-node-id="1581:67735" />
                      <div className={styles.frame118} data-node-id="1581:67736" />
                      <div className={styles.frame118} data-node-id="1581:67737" />
                      <div className={styles.frame118} data-node-id="1581:67738" />
                      <div className={styles.frame118} data-node-id="1581:67739" />
                      <div className={styles.frame118} data-node-id="1581:67740" />
                      <div className={styles.frame118} data-node-id="1581:67741" />
                      <div className={styles.frame118} data-node-id="1581:67742" />
                      <div className={styles.frame118} data-node-id="1581:67743" />
                      <div className={styles.frame118} data-node-id="1581:67744" />
                      <div className={styles.frame118} data-node-id="1581:67745" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67746">
                      <div className={styles.frame118} data-node-id="1581:67747" />
                      <div className={styles.frame118} data-node-id="1581:67748" />
                      <div className={styles.frame118} data-node-id="1581:67749" />
                      <div className={styles.frame118} data-node-id="1581:67750" />
                      <div className={styles.frame118} data-node-id="1581:67751" />
                      <div className={styles.frame118} data-node-id="1581:67752" />
                      <div className={styles.frame118} data-node-id="1581:67753" />
                      <div className={styles.frame118} data-node-id="1581:67754" />
                      <div className={styles.frame118} data-node-id="1581:67755" />
                      <div className={styles.frame118} data-node-id="1581:67756" />
                      <div className={styles.frame118} data-node-id="1581:67757" />
                      <div className={styles.frame118} data-node-id="1581:67758" />
                      <div className={styles.frame118} data-node-id="1581:67759" />
                      <div className={styles.frame118} data-node-id="1581:67760" />
                    </div>
                  </div>
                </div>
                <div className={styles.frame119} data-node-id="1563:61283">
                  <div className={styles.frame120} data-node-id="1562:60043">
                    <div className={styles.frame121} data-node-id="1562:60044" style={{ fontVariationSettings: '"opsz" 8' }}>
                      <p className={styles.frame122}>No direct employee involved</p>
                    </div>
                  </div>
                  <p className={styles.frame123} data-node-id="1562:60047" style={{ fontVariationSettings: '"opsz" 8' }}>
                    Learn with synthetic data or simulation, without changing employees’ experiences or decisions that affect them.
                  </p>
                </div>
              </div>
              <div aria-hidden="true" className={styles.frame31} />
              <div className={styles.frame113} data-node-id="1562:60030">
                <p className={styles.frame114} data-node-id="1562:60037" style={{ fontVariationSettings: '"opsz" 8' }}>
                  Some exposure
                </p>
                <div className={styles.frame115} data-node-id="1581:67762">
                  <div className={styles.frame124} data-node-id="1581:67763">
                    <div className={styles.frame117} data-node-id="1581:67764">
                      <div className={styles.frame118} data-node-id="1581:67765" />
                      <div className={styles.frame118} data-node-id="1581:67766" />
                      <div className={styles.frame118} data-node-id="1581:67767" />
                      <div className={styles.frame118} data-node-id="1581:67768" />
                      <div className={styles.frame118} data-node-id="1581:67769" />
                      <div className={styles.frame118} data-node-id="1581:67770" />
                      <div className={styles.frame118} data-node-id="1581:67771" />
                      <div className={styles.frame118} data-node-id="1581:67772" />
                      <div className={styles.frame118} data-node-id="1581:67773" />
                      <div className={styles.frame118} data-node-id="1581:67774" />
                      <div className={styles.frame118} data-node-id="1581:67775" />
                      <div className={styles.frame118} data-node-id="1581:67776" />
                      <div className={styles.frame118} data-node-id="1581:67777" />
                      <div className={styles.frame118} data-node-id="1581:67778" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67779">
                      <div className={styles.frame118} data-node-id="1581:67780" />
                      <div className={styles.frame118} data-node-id="1581:67781" />
                      <div className={styles.frame118} data-node-id="1581:67782" />
                      <div className={styles.frame118} data-node-id="1581:67783" />
                      <div className={styles.frame118} data-node-id="1581:67784" />
                      <div className={styles.frame118} data-node-id="1581:67785" />
                      <div className={styles.frame118} data-node-id="1581:67786" />
                      <div className={styles.frame118} data-node-id="1581:67787" />
                      <div className={styles.frame118} data-node-id="1581:67788" />
                      <div className={styles.frame118} data-node-id="1581:67789" />
                      <div className={styles.frame118} data-node-id="1581:67790" />
                      <div className={styles.frame118} data-node-id="1581:67791" />
                      <div className={styles.frame118} data-node-id="1581:67792" />
                      <div className={styles.frame118} data-node-id="1581:67793" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67794">
                      <div className={styles.frame118} data-node-id="1581:67795" />
                      <div className={styles.frame118} data-node-id="1581:67796" />
                      <div className={styles.frame118} data-node-id="1581:67797" />
                      <div className={styles.frame118} data-node-id="1581:67798" />
                      <div className={styles.frame118} data-node-id="1581:67799" />
                      <div className={styles.frame118} data-node-id="1581:67800" />
                      <div className={styles.frame118} data-node-id="1581:67801" />
                      <div className={styles.frame118} data-node-id="1581:67802" />
                      <div className={styles.frame118} data-node-id="1581:67803" />
                      <div className={styles.frame118} data-node-id="1581:67804" />
                      <div className={styles.frame118} data-node-id="1581:67805" />
                      <div className={styles.frame118} data-node-id="1581:67806" />
                      <div className={styles.frame118} data-node-id="1581:67807" />
                      <div className={styles.frame118} data-node-id="1581:67808" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67809">
                      <div className={styles.frame118} data-node-id="1581:67810" />
                      <div className={styles.frame118} data-node-id="1581:67811" />
                      <div className={styles.frame118} data-node-id="1581:67812" />
                      <div className={styles.frame118} data-node-id="1581:67813" />
                      <div className={styles.frame118} data-node-id="1581:67814" />
                      <div className={styles.frame118} data-node-id="1581:67815" />
                      <div className={styles.frame118} data-node-id="1581:67816" />
                      <div className={styles.frame118} data-node-id="1581:67817" />
                      <div className={styles.frame118} data-node-id="1581:67818" />
                      <div className={styles.frame118} data-node-id="1581:67819" />
                      <div className={styles.frame118} data-node-id="1581:67820" />
                      <div className={styles.frame118} data-node-id="1581:67821" />
                      <div className={styles.frame118} data-node-id="1581:67822" />
                      <div className={styles.frame118} data-node-id="1581:67823" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67824">
                      <div className={styles.frame118} data-node-id="1581:67825" />
                      <div className={styles.frame118} data-node-id="1581:67826" />
                      <div className={styles.frame118} data-node-id="1581:67827" />
                      <div className={styles.frame118} data-node-id="1581:67828" />
                      <div className={styles.frame125} data-node-id="1581:67829" />
                      <div className={styles.frame125} data-node-id="1581:67830" />
                      <div className={styles.frame125} data-node-id="1581:67831" />
                      <div className={styles.frame125} data-node-id="1581:67832" />
                      <div className={styles.frame125} data-node-id="1581:67833" />
                      <div className={styles.frame125} data-node-id="1581:67834" />
                      <div className={styles.frame118} data-node-id="1581:67835" />
                      <div className={styles.frame118} data-node-id="1581:67836" />
                      <div className={styles.frame118} data-node-id="1581:67837" />
                      <div className={styles.frame118} data-node-id="1581:67838" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67839">
                      <div className={styles.frame118} data-node-id="1581:67840" />
                      <div className={styles.frame118} data-node-id="1581:67841" />
                      <div className={styles.frame118} data-node-id="1581:67842" />
                      <div className={styles.frame118} data-node-id="1581:67843" />
                      <div className={styles.frame125} data-node-id="1581:67844" />
                      <div className={styles.frame125} data-node-id="1581:67845" />
                      <div className={styles.frame125} data-node-id="1581:67846" />
                      <div className={styles.frame125} data-node-id="1581:67847" />
                      <div className={styles.frame125} data-node-id="1581:67848" />
                      <div className={styles.frame125} data-node-id="1581:67849" />
                      <div className={styles.frame118} data-node-id="1581:67850" />
                      <div className={styles.frame118} data-node-id="1581:67851" />
                      <div className={styles.frame118} data-node-id="1581:67852" />
                      <div className={styles.frame118} data-node-id="1581:67853" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67854">
                      <div className={styles.frame118} data-node-id="1581:67855" />
                      <div className={styles.frame118} data-node-id="1581:67856" />
                      <div className={styles.frame118} data-node-id="1581:67857" />
                      <div className={styles.frame118} data-node-id="1581:67858" />
                      <div className={styles.frame125} data-node-id="1581:67859" />
                      <div className={styles.frame125} data-node-id="1581:67860" />
                      <div className={styles.frame125} data-node-id="1581:67861" />
                      <div className={styles.frame125} data-node-id="1581:67862" />
                      <div className={styles.frame125} data-node-id="1581:67863" />
                      <div className={styles.frame125} data-node-id="1581:67864" />
                      <div className={styles.frame118} data-node-id="1581:67865" />
                      <div className={styles.frame118} data-node-id="1581:67866" />
                      <div className={styles.frame118} data-node-id="1581:67867" />
                      <div className={styles.frame118} data-node-id="1581:67868" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67869">
                      <div className={styles.frame118} data-node-id="1581:67870" />
                      <div className={styles.frame118} data-node-id="1581:67871" />
                      <div className={styles.frame118} data-node-id="1581:67872" />
                      <div className={styles.frame118} data-node-id="1581:67873" />
                      <div className={styles.frame125} data-node-id="1581:67874" />
                      <div className={styles.frame125} data-node-id="1581:67875" />
                      <div className={styles.frame125} data-node-id="1581:67876" />
                      <div className={styles.frame125} data-node-id="1581:67877" />
                      <div className={styles.frame125} data-node-id="1581:67878" />
                      <div className={styles.frame125} data-node-id="1581:67879" />
                      <div className={styles.frame118} data-node-id="1581:67880" />
                      <div className={styles.frame118} data-node-id="1581:67881" />
                      <div className={styles.frame118} data-node-id="1581:67882" />
                      <div className={styles.frame118} data-node-id="1581:67883" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67884">
                      <div className={styles.frame118} data-node-id="1581:67885" />
                      <div className={styles.frame118} data-node-id="1581:67886" />
                      <div className={styles.frame118} data-node-id="1581:67887" />
                      <div className={styles.frame118} data-node-id="1581:67888" />
                      <div className={styles.frame125} data-node-id="1581:67889" />
                      <div className={styles.frame125} data-node-id="1581:67890" />
                      <div className={styles.frame125} data-node-id="1581:67891" />
                      <div className={styles.frame125} data-node-id="1581:67892" />
                      <div className={styles.frame125} data-node-id="1581:67893" />
                      <div className={styles.frame125} data-node-id="1581:67894" />
                      <div className={styles.frame118} data-node-id="1581:67895" />
                      <div className={styles.frame118} data-node-id="1581:67896" />
                      <div className={styles.frame118} data-node-id="1581:67897" />
                      <div className={styles.frame118} data-node-id="1581:67898" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67899">
                      <div className={styles.frame118} data-node-id="1581:67900" />
                      <div className={styles.frame118} data-node-id="1581:67901" />
                      <div className={styles.frame118} data-node-id="1581:67902" />
                      <div className={styles.frame118} data-node-id="1581:67903" />
                      <div className={styles.frame125} data-node-id="1581:67904" />
                      <div className={styles.frame125} data-node-id="1581:67905" />
                      <div className={styles.frame125} data-node-id="1581:67906" />
                      <div className={styles.frame125} data-node-id="1581:67907" />
                      <div className={styles.frame125} data-node-id="1581:67908" />
                      <div className={styles.frame125} data-node-id="1581:67909" />
                      <div className={styles.frame118} data-node-id="1581:67910" />
                      <div className={styles.frame118} data-node-id="1581:67911" />
                      <div className={styles.frame118} data-node-id="1581:67912" />
                      <div className={styles.frame118} data-node-id="1581:67913" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67914">
                      <div className={styles.frame118} data-node-id="1581:67915" />
                      <div className={styles.frame118} data-node-id="1581:67916" />
                      <div className={styles.frame118} data-node-id="1581:67917" />
                      <div className={styles.frame118} data-node-id="1581:67918" />
                      <div className={styles.frame118} data-node-id="1581:67919" />
                      <div className={styles.frame118} data-node-id="1581:67920" />
                      <div className={styles.frame118} data-node-id="1581:67921" />
                      <div className={styles.frame118} data-node-id="1581:67922" />
                      <div className={styles.frame118} data-node-id="1581:67923" />
                      <div className={styles.frame118} data-node-id="1581:67924" />
                      <div className={styles.frame118} data-node-id="1581:67925" />
                      <div className={styles.frame118} data-node-id="1581:67926" />
                      <div className={styles.frame118} data-node-id="1581:67927" />
                      <div className={styles.frame118} data-node-id="1581:67928" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67929">
                      <div className={styles.frame118} data-node-id="1581:67930" />
                      <div className={styles.frame118} data-node-id="1581:67931" />
                      <div className={styles.frame118} data-node-id="1581:67932" />
                      <div className={styles.frame118} data-node-id="1581:67933" />
                      <div className={styles.frame118} data-node-id="1581:67934" />
                      <div className={styles.frame118} data-node-id="1581:67935" />
                      <div className={styles.frame118} data-node-id="1581:67936" />
                      <div className={styles.frame118} data-node-id="1581:67937" />
                      <div className={styles.frame118} data-node-id="1581:67938" />
                      <div className={styles.frame118} data-node-id="1581:67939" />
                      <div className={styles.frame118} data-node-id="1581:67940" />
                      <div className={styles.frame118} data-node-id="1581:67941" />
                      <div className={styles.frame118} data-node-id="1581:67942" />
                      <div className={styles.frame118} data-node-id="1581:67943" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67944">
                      <div className={styles.frame118} data-node-id="1581:67945" />
                      <div className={styles.frame118} data-node-id="1581:67946" />
                      <div className={styles.frame118} data-node-id="1581:67947" />
                      <div className={styles.frame118} data-node-id="1581:67948" />
                      <div className={styles.frame118} data-node-id="1581:67949" />
                      <div className={styles.frame118} data-node-id="1581:67950" />
                      <div className={styles.frame118} data-node-id="1581:67951" />
                      <div className={styles.frame118} data-node-id="1581:67952" />
                      <div className={styles.frame118} data-node-id="1581:67953" />
                      <div className={styles.frame118} data-node-id="1581:67954" />
                      <div className={styles.frame118} data-node-id="1581:67955" />
                      <div className={styles.frame118} data-node-id="1581:67956" />
                      <div className={styles.frame118} data-node-id="1581:67957" />
                      <div className={styles.frame118} data-node-id="1581:67958" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:67959">
                      <div className={styles.frame118} data-node-id="1581:67960" />
                      <div className={styles.frame118} data-node-id="1581:67961" />
                      <div className={styles.frame118} data-node-id="1581:67962" />
                      <div className={styles.frame118} data-node-id="1581:67963" />
                      <div className={styles.frame118} data-node-id="1581:67964" />
                      <div className={styles.frame118} data-node-id="1581:67965" />
                      <div className={styles.frame118} data-node-id="1581:67966" />
                      <div className={styles.frame118} data-node-id="1581:67967" />
                      <div className={styles.frame118} data-node-id="1581:67968" />
                      <div className={styles.frame118} data-node-id="1581:67969" />
                      <div className={styles.frame118} data-node-id="1581:67970" />
                      <div className={styles.frame118} data-node-id="1581:67971" />
                      <div className={styles.frame118} data-node-id="1581:67972" />
                      <div className={styles.frame118} data-node-id="1581:67973" />
                    </div>
                  </div>
                </div>
                <div className={styles.frame119} data-node-id="1563:61284">
                  <div className={styles.frame120} data-node-id="1563:61277">
                    <div className={styles.frame121} data-node-id="1563:61278" style={{ fontVariationSettings: '"opsz" 8' }}>
                      <p className={styles.frame122}>Involves a defined group</p>
                    </div>
                  </div>
                  <p className={styles.frame123} data-node-id="1562:60038" style={{ fontVariationSettings: '"opsz" 8' }}>A defined group may be involved, including people involved indirectly. The scope can expand, change, or stop as evidence develops.</p>
                </div>
              </div>
              <div aria-hidden="true" className={styles.frame31} />
              <div className={styles.frame113} data-node-id="1562:60060">
                <p className={styles.frame114} data-node-id="1562:60065" style={{ fontVariationSettings: '"opsz" 8' }}>
                  Broad exposure
                </p>
                <div className={styles.frame115} data-node-id="1581:68193">
                  <div className={`${styles.frame116} ${styles.broadExposure}`} data-node-id="1581:68194">
                    <div className={styles.frame117} data-node-id="1581:68195">
                      <div className={styles.frame125} data-node-id="1581:68196" />
                      <div className={styles.frame125} data-node-id="1581:68197" />
                      <div className={styles.frame125} data-node-id="1581:68198" />
                      <div className={styles.frame125} data-node-id="1581:68199" />
                      <div className={styles.frame125} data-node-id="1581:68200" />
                      <div className={styles.frame125} data-node-id="1581:68201" />
                      <div className={styles.frame125} data-node-id="1581:68202" />
                      <div className={styles.frame125} data-node-id="1581:68203" />
                      <div className={styles.frame125} data-node-id="1581:68204" />
                      <div className={styles.frame125} data-node-id="1581:68205" />
                      <div className={styles.frame125} data-node-id="1581:68206" />
                      <div className={styles.frame125} data-node-id="1581:68207" />
                      <div className={styles.frame125} data-node-id="1581:68208" />
                      <div className={styles.frame125} data-node-id="1581:68209" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:68210">
                      <div className={styles.frame125} data-node-id="1581:68211" />
                      <div className={styles.frame125} data-node-id="1581:68212" />
                      <div className={styles.frame125} data-node-id="1581:68213" />
                      <div className={styles.frame125} data-node-id="1581:68214" />
                      <div className={styles.frame125} data-node-id="1581:68215" />
                      <div className={styles.frame125} data-node-id="1581:68216" />
                      <div className={styles.frame125} data-node-id="1581:68217" />
                      <div className={styles.frame125} data-node-id="1581:68218" />
                      <div className={styles.frame125} data-node-id="1581:68219" />
                      <div className={styles.frame125} data-node-id="1581:68220" />
                      <div className={styles.frame125} data-node-id="1581:68221" />
                      <div className={styles.frame125} data-node-id="1581:68222" />
                      <div className={styles.frame125} data-node-id="1581:68223" />
                      <div className={styles.frame125} data-node-id="1581:68224" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:68225">
                      <div className={styles.frame125} data-node-id="1581:68226" />
                      <div className={styles.frame125} data-node-id="1581:68227" />
                      <div className={styles.frame125} data-node-id="1581:68228" />
                      <div className={styles.frame125} data-node-id="1581:68229" />
                      <div className={styles.frame125} data-node-id="1581:68230" />
                      <div className={styles.frame125} data-node-id="1581:68231" />
                      <div className={styles.frame125} data-node-id="1581:68232" />
                      <div className={styles.frame125} data-node-id="1581:68233" />
                      <div className={styles.frame125} data-node-id="1581:68234" />
                      <div className={styles.frame125} data-node-id="1581:68235" />
                      <div className={styles.frame125} data-node-id="1581:68236" />
                      <div className={styles.frame125} data-node-id="1581:68237" />
                      <div className={styles.frame125} data-node-id="1581:68238" />
                      <div className={styles.frame125} data-node-id="1581:68239" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:68240">
                      <div className={styles.frame125} data-node-id="1581:68241" />
                      <div className={styles.frame125} data-node-id="1581:68242" />
                      <div className={styles.frame125} data-node-id="1581:68243" />
                      <div className={styles.frame125} data-node-id="1581:68244" />
                      <div className={styles.frame125} data-node-id="1581:68245" />
                      <div className={styles.frame125} data-node-id="1581:68246" />
                      <div className={styles.frame125} data-node-id="1581:68247" />
                      <div className={styles.frame125} data-node-id="1581:68248" />
                      <div className={styles.frame125} data-node-id="1581:68249" />
                      <div className={styles.frame125} data-node-id="1581:68250" />
                      <div className={styles.frame125} data-node-id="1581:68251" />
                      <div className={styles.frame125} data-node-id="1581:68252" />
                      <div className={styles.frame125} data-node-id="1581:68253" />
                      <div className={styles.frame125} data-node-id="1581:68254" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:68255">
                      <div className={styles.frame125} data-node-id="1581:68256" />
                      <div className={styles.frame125} data-node-id="1581:68257" />
                      <div className={styles.frame125} data-node-id="1581:68258" />
                      <div className={styles.frame125} data-node-id="1581:68259" />
                      <div className={styles.frame125} data-node-id="1581:68260" />
                      <div className={styles.frame125} data-node-id="1581:68261" />
                      <div className={styles.frame125} data-node-id="1581:68262" />
                      <div className={styles.frame125} data-node-id="1581:68263" />
                      <div className={styles.frame125} data-node-id="1581:68264" />
                      <div className={styles.frame125} data-node-id="1581:68265" />
                      <div className={styles.frame125} data-node-id="1581:68266" />
                      <div className={styles.frame125} data-node-id="1581:68267" />
                      <div className={styles.frame125} data-node-id="1581:68268" />
                      <div className={styles.frame125} data-node-id="1581:68269" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:68270">
                      <div className={styles.frame125} data-node-id="1581:68271" />
                      <div className={styles.frame125} data-node-id="1581:68272" />
                      <div className={styles.frame125} data-node-id="1581:68273" />
                      <div className={styles.frame125} data-node-id="1581:68274" />
                      <div className={styles.frame125} data-node-id="1581:68275" />
                      <div className={styles.frame125} data-node-id="1581:68276" />
                      <div className={styles.frame125} data-node-id="1581:68277" />
                      <div className={styles.frame125} data-node-id="1581:68278" />
                      <div className={styles.frame125} data-node-id="1581:68279" />
                      <div className={styles.frame125} data-node-id="1581:68280" />
                      <div className={styles.frame125} data-node-id="1581:68281" />
                      <div className={styles.frame125} data-node-id="1581:68282" />
                      <div className={styles.frame125} data-node-id="1581:68283" />
                      <div className={styles.frame125} data-node-id="1581:68284" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:68285">
                      <div className={styles.frame125} data-node-id="1581:68286" />
                      <div className={styles.frame125} data-node-id="1581:68287" />
                      <div className={styles.frame125} data-node-id="1581:68288" />
                      <div className={styles.frame125} data-node-id="1581:68289" />
                      <div className={styles.frame125} data-node-id="1581:68290" />
                      <div className={styles.frame125} data-node-id="1581:68291" />
                      <div className={styles.frame125} data-node-id="1581:68292" />
                      <div className={styles.frame125} data-node-id="1581:68293" />
                      <div className={styles.frame125} data-node-id="1581:68294" />
                      <div className={styles.frame125} data-node-id="1581:68295" />
                      <div className={styles.frame125} data-node-id="1581:68296" />
                      <div className={styles.frame125} data-node-id="1581:68297" />
                      <div className={styles.frame125} data-node-id="1581:68298" />
                      <div className={styles.frame125} data-node-id="1581:68299" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:68300">
                      <div className={styles.frame125} data-node-id="1581:68301" />
                      <div className={styles.frame125} data-node-id="1581:68302" />
                      <div className={styles.frame125} data-node-id="1581:68303" />
                      <div className={styles.frame125} data-node-id="1581:68304" />
                      <div className={styles.frame125} data-node-id="1581:68305" />
                      <div className={styles.frame125} data-node-id="1581:68306" />
                      <div className={styles.frame125} data-node-id="1581:68307" />
                      <div className={styles.frame125} data-node-id="1581:68308" />
                      <div className={styles.frame125} data-node-id="1581:68309" />
                      <div className={styles.frame125} data-node-id="1581:68310" />
                      <div className={styles.frame125} data-node-id="1581:68311" />
                      <div className={styles.frame125} data-node-id="1581:68312" />
                      <div className={styles.frame125} data-node-id="1581:68313" />
                      <div className={styles.frame125} data-node-id="1581:68314" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:68315">
                      <div className={styles.frame125} data-node-id="1581:68316" />
                      <div className={styles.frame125} data-node-id="1581:68317" />
                      <div className={styles.frame125} data-node-id="1581:68318" />
                      <div className={styles.frame125} data-node-id="1581:68319" />
                      <div className={styles.frame125} data-node-id="1581:68320" />
                      <div className={styles.frame125} data-node-id="1581:68321" />
                      <div className={styles.frame125} data-node-id="1581:68322" />
                      <div className={styles.frame125} data-node-id="1581:68323" />
                      <div className={styles.frame125} data-node-id="1581:68324" />
                      <div className={styles.frame125} data-node-id="1581:68325" />
                      <div className={styles.frame125} data-node-id="1581:68326" />
                      <div className={styles.frame125} data-node-id="1581:68327" />
                      <div className={styles.frame125} data-node-id="1581:68328" />
                      <div className={styles.frame125} data-node-id="1581:68329" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:68330">
                      <div className={styles.frame125} data-node-id="1581:68331" />
                      <div className={styles.frame125} data-node-id="1581:68332" />
                      <div className={styles.frame125} data-node-id="1581:68333" />
                      <div className={styles.frame125} data-node-id="1581:68334" />
                      <div className={styles.frame125} data-node-id="1581:68335" />
                      <div className={styles.frame125} data-node-id="1581:68336" />
                      <div className={styles.frame125} data-node-id="1581:68337" />
                      <div className={styles.frame125} data-node-id="1581:68338" />
                      <div className={styles.frame125} data-node-id="1581:68339" />
                      <div className={styles.frame125} data-node-id="1581:68340" />
                      <div className={styles.frame125} data-node-id="1581:68341" />
                      <div className={styles.frame125} data-node-id="1581:68342" />
                      <div className={styles.frame125} data-node-id="1581:68343" />
                      <div className={styles.frame125} data-node-id="1581:68344" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:68345">
                      <div className={styles.frame125} data-node-id="1581:68346" />
                      <div className={styles.frame125} data-node-id="1581:68347" />
                      <div className={styles.frame125} data-node-id="1581:68348" />
                      <div className={styles.frame125} data-node-id="1581:68349" />
                      <div className={styles.frame125} data-node-id="1581:68350" />
                      <div className={styles.frame125} data-node-id="1581:68351" />
                      <div className={styles.frame125} data-node-id="1581:68352" />
                      <div className={styles.frame125} data-node-id="1581:68353" />
                      <div className={styles.frame125} data-node-id="1581:68354" />
                      <div className={styles.frame125} data-node-id="1581:68355" />
                      <div className={styles.frame125} data-node-id="1581:68356" />
                      <div className={styles.frame125} data-node-id="1581:68357" />
                      <div className={styles.frame125} data-node-id="1581:68358" />
                      <div className={styles.frame125} data-node-id="1581:68359" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:68360">
                      <div className={styles.frame125} data-node-id="1581:68361" />
                      <div className={styles.frame125} data-node-id="1581:68362" />
                      <div className={styles.frame125} data-node-id="1581:68363" />
                      <div className={styles.frame125} data-node-id="1581:68364" />
                      <div className={styles.frame125} data-node-id="1581:68365" />
                      <div className={styles.frame125} data-node-id="1581:68366" />
                      <div className={styles.frame125} data-node-id="1581:68367" />
                      <div className={styles.frame125} data-node-id="1581:68368" />
                      <div className={styles.frame125} data-node-id="1581:68369" />
                      <div className={styles.frame125} data-node-id="1581:68370" />
                      <div className={styles.frame125} data-node-id="1581:68371" />
                      <div className={styles.frame125} data-node-id="1581:68372" />
                      <div className={styles.frame125} data-node-id="1581:68373" />
                      <div className={styles.frame125} data-node-id="1581:68374" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:68375">
                      <div className={styles.frame125} data-node-id="1581:68376" />
                      <div className={styles.frame125} data-node-id="1581:68377" />
                      <div className={styles.frame125} data-node-id="1581:68378" />
                      <div className={styles.frame125} data-node-id="1581:68379" />
                      <div className={styles.frame125} data-node-id="1581:68380" />
                      <div className={styles.frame125} data-node-id="1581:68381" />
                      <div className={styles.frame125} data-node-id="1581:68382" />
                      <div className={styles.frame125} data-node-id="1581:68383" />
                      <div className={styles.frame125} data-node-id="1581:68384" />
                      <div className={styles.frame125} data-node-id="1581:68385" />
                      <div className={styles.frame125} data-node-id="1581:68386" />
                      <div className={styles.frame125} data-node-id="1581:68387" />
                      <div className={styles.frame125} data-node-id="1581:68388" />
                      <div className={styles.frame125} data-node-id="1581:68389" />
                    </div>
                    <div className={styles.frame117} data-node-id="1581:68390">
                      <div className={styles.frame125} data-node-id="1581:68391" />
                      <div className={styles.frame125} data-node-id="1581:68392" />
                      <div className={styles.frame125} data-node-id="1581:68393" />
                      <div className={styles.frame125} data-node-id="1581:68394" />
                      <div className={styles.frame125} data-node-id="1581:68395" />
                      <div className={styles.frame125} data-node-id="1581:68396" />
                      <div className={styles.frame125} data-node-id="1581:68397" />
                      <div className={styles.frame125} data-node-id="1581:68398" />
                      <div className={styles.frame125} data-node-id="1581:68399" />
                      <div className={styles.frame125} data-node-id="1581:68400" />
                      <div className={styles.frame125} data-node-id="1581:68401" />
                      <div className={styles.frame125} data-node-id="1581:68402" />
                      <div className={styles.frame125} data-node-id="1581:68403" />
                      <div className={styles.frame125} data-node-id="1581:68404" />
                    </div>
                  </div>
                </div>
                <div className={styles.frame119} data-node-id="1563:61285">
                  <div className={styles.frame120} data-node-id="1563:61280">
                    <div className={styles.frame121} data-node-id="1563:61281" style={{ fontVariationSettings: '"opsz" 8' }}>
                      <p className={styles.frame122}>Wide population involved</p>
                    </div>
                  </div>
                  <p className={styles.frame123} data-node-id="1562:60066" style={{ fontVariationSettings: '"opsz" 8' }}>
                    A broader employee population may be included when safeguards and context support it. The goal is meaningful learning, not simply broader reach.
                  </p>
                </div>
              </div>
            </div>
            <div aria-hidden="true" className={styles.frame63} />
            <div className={styles.frame25} data-node-id="1563:61339">
              <div className={styles.frame126} data-node-id="1563:61340">
                <p className={styles.frame127} data-node-id="1563:61342" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 36' }}>
                  An answer can be the outcome. Not a rollout.
                </p>
              </div>
              <div className={styles.frame128} data-node-id="1563:61343" style={{ fontVariationSettings: '"opsz" 8' }}>
                <p className={styles.frame129}>More exposure is not a measure of success. Build enough evidence to learn safely and move quickly, without involving more employees than the question requires.</p>
              </div>
            </div>
          </div>
          <div className={styles.frame132} data-node-id="1451:11649">
            <h3 className={styles.frame133} data-node-id="1451:11650">
              <span className={styles.frame134} data-node-id="1451:11652" style={{ fontVariationSettings: '"opsz" 36' }}>
                Assumption 3: Action plans drive action
              </span>
            </h3>
            <div className={styles.frame78} data-node-id="1451:11653" style={{ fontVariationSettings: '"opsz" 8' }}>
              <p className={styles.frame79}>In the last six months, only 38% of managers in our research reported holding a meeting to discuss their team’s feedback, and 29% reported creating an action plan<sup>2</sup>. <strong>If those activities define action, the system appears to be failing</strong>.</p>
              <p className={styles.frame8}></p>
              <p className={styles.frame61}>Yet other indicators tell a different story. Seventy-nine percent of managers say their organization provides adequate resources to act on feedback, and 80% say they are held accountable for following through. Seventy-five percent of employees say they have seen meaningful organizational changes resulting from employee feedback<sup>2</sup>. Low participation in traditional manager action processes and relatively high perceptions of organizational response can coexist. The apparent contradiction raises a different question: Are we measuring action too narrowly?</p>
            </div>
          </div>
          <ActionTakingParadox />
          <div className={styles.frame78} data-node-id="1451:11684" style={{ fontVariationSettings: '"opsz" 8' }}>
            <p className={styles.frame79}>The conventional model assumes a linear path: Collect feedback, provide results to managers, discuss the results with the team, create an action plan, and follow through. However, the linear path may not account for the true impact of employee voice. An action plan is evidence that planning occurred, not necessarily that influence did.</p>
            <p className={styles.frame8}></p>
            <p className={styles.frame61}>The limitation becomes clearer when the issue sits partly or entirely outside a manager&apos;s authority. Compensation and benefits, career growth and development, and workload and burnout are the <strong>top three topics</strong> employees most reported they want organizations to ask about<sup>2</sup>. Each is shaped by decisions and behaviors at multiple levels. Enterprise leaders and HR may shape policies, investments, mobility systems, or staffing models; managers influence coaching, access to opportunities, prioritization, and work allocation; employees also make choices about how they pursue development, navigate available resources, and raise emerging needs. A manager can influence these experiences without controlling all of the conditions that produce them. <strong>Routing the result to the manager does not necessarily route it to the decision maker.</strong></p>
          </div>
          <div className={styles.frame148} data-node-id="1535:38804">
            <div className={styles.frame12} data-node-id="1535:38805">
              <h3 className={styles.frame149} data-node-id="1535:38806" style={{ fontVariationSettings: '"opsz" 36' }}>{`The issues employees raise do not always sit with the same decision-makers `}</h3>
            </div>
            <div className={styles.tableScroller} role="region" aria-label="Illustrative decision authority by employee request topic">
              <span className={styles.matrixCaption} id="decision-authority-caption">Illustrative allocation of decision authority, not a survey finding</span>
              <table className={styles.responsibility} aria-labelledby="decision-authority-caption">
                <thead>
                  <tr>
                    <th scope="col">Employee top request topics</th>
                    <th scope="col"><span className={styles.matrixHeader}><img src="/figma/annual-canonical/matrix-person.svg" alt="" width={16} height={16} />Individual</span></th>
                    <th scope="col"><span className={styles.matrixHeader}><img src="/figma/annual-canonical/matrix-manager.svg" alt="" width={16} height={16} />Manager</span></th>
                    <th scope="col"><span className={styles.matrixHeader}><img src="/figma/annual-canonical/matrix-leadership.svg" alt="" width={16} height={16} />Leadership</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr><th scope="row">Compensation &amp; benefits</th><td data-level="low">Low impact</td><td data-level="low">Low impact</td><td data-level="high">High impact</td></tr>
                  <tr><th scope="row">Career growth &amp; development</th><td data-level="high">High impact</td><td data-level="medium">Medium impact</td><td data-level="medium">Medium impact</td></tr>
                  <tr><th scope="row">Workload &amp; burnout</th><td data-level="medium">Medium impact</td><td data-level="high">High impact</td><td data-level="low">Low impact</td></tr>
                </tbody>
              </table>
            </div>
            <p className={styles.frame150} data-node-id="1535:38867" style={{ fontVariationSettings: '"opsz" 8' }}>Topics reflect the three most common responses when employees were asked which topics they would most like their organization to ask about. Employees could select up to five topics from a list of 16<sup>2</sup>. The examples of how responsibility may be shared across organizational levels are illustrative and were not measured in the survey.</p>
          </div>
          <p className={styles.frame66} data-node-id="1451:11738" style={{ fontVariationSettings: '"opsz" 8' }}>
            Managers need visibility into the concerns affecting their teams, but they should not carry sole accountability for all feedback. HR, business leaders, or senior leaders may need to own a decision and influence enterprise, system, program, and policy level change. The important questions are not simply “Who received the results?” and “Was an action plan created?” but “Who needs to understand this signal, who is positioned and accountable to respond, and who needs to know what happened?”
          </p>
          <div className={styles.frame37} data-node-id="1584:78891">
            <div className={styles.frame76} data-node-id="1584:78892">
              <div className={styles.frame20}>
                <img className={styles.frame21} alt="" src={illustration("imgEllipse9", "accountability-quote-glow")} />
              </div>
            </div>
            <p className={styles.frame80} data-node-id="1584:78893" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 36' }}>
              When accountability and the ability to act are misaligned
            </p>
            <blockquote className={styles.frame42} data-node-id="1584:78894">
              <div className={styles.frame43} data-node-id="I1584:78894;1070:3422">
                <div className={styles.frame44} data-node-id="I1584:78894;1070:3423" />
                <div className={styles.frame81} data-node-id="I1584:78894;1070:3424">
                  <div className={styles.frame82} data-node-id="I1584:78894;1070:3425">
                    <p className={styles.frame47} data-node-id="I1584:78894;1070:3426">
                      “
                    </p>
                    <p className={styles.frame48} data-node-id="I1584:78894;1070:3427" style={{ fontVariationSettings: '"wdth" 100' }}>{`We put the accountability on the managers, and then we don't give them the tools to actually do something with it. The action taking process needs to be a waterfall from the top to bottom. And that just never happens.`}</p>
                  </div>
                  <p className={styles.frame104} data-node-id="I1584:78894;1070:3428" style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 8' }}>
                    <span className={styles.frame6}>{`Senior Manager, People Technologies, Analytics, & PMO  /  Manufacturing`}</span>
                    <sup className={styles.frame71} style={{ fontVariationSettings: '"opsz" 10.5, "opsz" 8' }}>
                      3
                    </sup>
                  </p>
                </div>
              </div>
            </blockquote>
          </div>
          <p className={styles.frame36} data-node-id="1451:11740" style={{ fontVariationSettings: '"opsz" 8' }}>
            <span className={styles.frame6}>Responding to feedback still remains a gap for many listening programs. While 54% of listening leaders rate their programs “strong” or “best-in-class” at making it easy to provide feedback, only 33% say the same about communicating what changed<sup>1</sup>. Yet 87% of employees say they are more likely to share feedback when action follows</span>
            <sup className={styles.frame17} style={{ fontVariationSettings: '"opsz" 8' }}>
              2
            </sup>
            <span className={styles.frame6}>. Redefining what action truly entails may help listening teams feel better equipped to communicate back to employees. Responding to feedback may take many forms, including making a change, investigating further, escalating an issue, integrating employee evidence into a broader business decision, or explaining why change will not occur. Employee voice may influence the organization without producing a traditional action plan, and it may go nowhere despite a completed one.</span>
          </p>
        </div>
        <div className={styles.frame12} data-node-id="1451:11743">
          <div className={styles.frame13} data-node-id="1451:11744" />
        </div>
        <div className={styles.frame14} data-node-id="1451:11745">
          <div className={styles.frame151} data-node-id="1451:11747">
            <h2 className={styles.frame15} data-node-id="1451:11748" id="annual-section-6" tabIndex={-1} style={{ fontVariationSettings: '"wdth" 100' }}>
              The right-fit listening system
            </h2>
            <div className={styles.frame152} data-node-id="1451:11749" style={{ fontVariationSettings: '"opsz" 8' }}>
              <p className={styles.frame79}>The three assumptions reveal different versions of the same problem. A survey chosen before the information need is clear, caution that prevents evidence-building, and an action plan disconnected from decision authority all allow a familiar process to become a proxy for the outcome it is meant to enable. <strong>Listening teams working toward a right-fit listening system are continually calibrating its methods, evidence, safeguards, and response around the need they are trying to serve</strong>.</p>
              <p className={styles.frame8}></p>
              <p className={styles.frame79}>As listening teams expand their portfolio, they may struggle with insufficiency or excess. An organization may ask employees about the same topics repeatedly while still lacking the perspective of the people closest to a consequential experience. It may deeply understand the needs of a certain population yet lack representation across the enterprise. The correction is therefore not automatically more or less listening. It may require a different voice, source, method, cadence, level of interpretation, or route to response.</p>
              <p className={styles.frame8}></p>
              <p className={styles.frame79}>The goal is to find the point at which the system produces enough <strong>credible understanding</strong> to support a consequential choice without exceeding employee trust, organizational capacity, or the legitimate purpose for collecting the information. Once that threshold has been reached, additional collection does not inherently create additional value. Keeping listening fit for purpose is therefore a <strong>shared leadership responsibility</strong>. Listening, HR, and organizational leaders need to continually examine whether the system still matches the questions, needs, decisions, and outcomes it is intended to serve, and change it when it does not.</p>
              <p className={styles.frame8}></p>
              <p className={styles.frame61}>For listening teams making these choices, we offer five principles to consider as they shape their approach over time. A right-fit system is: Trustworthy, Intelligent, Responsive, Embedded, and Outcome-driven.</p>
            </div>
          </div>
          <RightFitPrinciples />
        </div>
        <div className={styles.frame12} data-node-id="1451:11862">
          <div className={styles.frame13} data-node-id="1451:11863" />
        </div>
        <div className={styles.frame14} data-node-id="1451:11864">
          <div className={styles.frame151} data-node-id="1451:11866">
            <h2 className={styles.frame15} data-node-id="1451:11867" id="annual-section-7" tabIndex={-1} style={{ fontVariationSettings: '"wdth" 100' }}>
              AI raises the stakes for right-fit listening
            </h2>
            <p className={styles.frame185} data-node-id="1451:11868" style={{ fontVariationSettings: '"opsz" 8' }}>
              <span className={styles.frame6}>Eighty-three percent of listening leaders believe AI will fundamentally change how organizations act on insights. <strong>Only 43% say their organization has a clear point of view on which AI-enabled listening use cases to prioritize and why</strong></span>
              <sup className={styles.frame17} style={{ fontVariationSettings: '"opsz" 8' }}>
                1
              </sup>
              <span className={styles.frame6}>. The field is far more certain that change is coming than it is about where AI will have meaningful value.</span>
            </p>
          </div>
          <AiOpportunity />
          <p className={styles.frame193} data-node-id="1451:11889" style={{ fontVariationSettings: '"opsz" 8' }}>
            As of now, AI is entering the listening system unevenly. Experimentation has moved furthest in analysis, where 43% of capabilities are already being piloted or deployed, compared with 30% in listening methods, 27% in strategy and design, and 25% in action taking<sup>1</sup>. Adoption is strongest where AI can accelerate familiar, largely internal work – not where it requires changes to the employee experience, governance, decision rights, or organizational response. <strong>If AI remains concentrated in analysis, the risk is that organizations may produce faster reports without building a more capable listening system</strong>.
          </p>
          <AiPhaseDisclosures />
          <div className={styles.frame194} data-node-id="1584:78958" style={{ fontVariationSettings: '"opsz" 8' }}>
            <p className={styles.frame195}>
              <span className={styles.frame6}>The most adopted AI-enabled capabilities were concentrated in work that helps organizations process, package, and interpret employee feedback that has already been collected</span>
              <sup className={styles.frame7} style={{ fontVariationSettings: '"opsz" 8' }}>
                1
              </sup>
              <span className={styles.frame6}>:</span>
            </p>
            <ol className={styles.frame196}>
              <li className={styles.frame197}>
                <span className={styles.frame6}>Summarize themes from employee feedback • 55% piloting or deployed</span>
              </li>
              <li className={styles.frame197}>
                <span className={styles.frame6}>Prepare summaries or briefings for leaders • 45% piloting or deployed</span>
              </li>
              <li className={styles.frame198}>
                <span className={styles.frame6}>Interpret feedback results for managers/leaders • 42% piloting or deployed</span>
              </li>
            </ol>
            <p className={styles.frame199}></p>
            <p className={styles.frame195}>
              <span className={styles.frame6}>But the opportunity ahead extends beyond accelerating those existing tasks to shaping <strong>how</strong> the listening system itself operates. The AI-enabled capabilities that listening leaders were most considering or planning are</span>
              <sup className={styles.frame7} style={{ fontVariationSettings: '"opsz" 8' }}>
                1
              </sup>
              <span className={styles.frame6}>:</span>
            </p>
            <ol className={styles.frame196}>
              <li className={styles.frame197}>
                <span className={styles.frame6}>Recommend listening topics based on business priorities/workforce risks • 55% considering or planning</span>
              </li>
              <li className={styles.frame197}>
                <span className={styles.frame6}>Support sampling, targeting, or audience selection • 54% considering or planning</span>
              </li>
              <li className={styles.frame197}>
                <span className={styles.frame6}>Simulate how employees might respond to proposed changes with synthetic data • 54% considering or planning</span>
              </li>
              <li className={styles.frame197}>
                <span className={styles.frame6}>Coach managers through conversations or action plans • 53% considering or planning</span>
              </li>
              <li className={styles.frame198}>
                <span className={styles.frame6}>Take actions on behalf of managers or leaders • 53% considering or planning</span>
              </li>
            </ol>
            <p className={styles.frame199}></p>
            <p className={styles.frame199}><strong>Once adopted, these capabilities will begin to change the listening system itself</strong>. They can influence what the organization listens for, whose perspective it seeks, how it anticipates the implications of a decision, and how evidence moves into response. Listening teams have the opportunity to improve how their teams use AI to focus their attention and more deeply connect employee voice to consequential decisions.</p>
            <p className={styles.frame199}></p>
            <p className={styles.frame199}>As AI takes on more of the mechanics of listening, the listening leader&apos;s role shifts from performing every task to defining what &quot;good&quot; means when deciding what AI should own and evaluating whether the system continues to meet that standard. The five principles of right-fit listening offer a useful lens for these choices: Is each shift toward AI-enabled listening still trustworthy, intelligent, responsive, embedded, and outcome-driven?</p>
            <p className={styles.frame199}></p>
            <p className={styles.frame195} id="annual-human-judgment" tabIndex={-1}>
              <span className={styles.frame6}>As it stands, nearly one in three listening leaders say their organization <strong>does not have a clear point of view</strong> on where human judgment must remain central in AI-enabled listening</span>
              <sup className={styles.frame7} style={{ fontVariationSettings: '"opsz" 8' }}>
                1
              </sup>
              <span className={styles.frame6}>{`. As the mechanics of listening become AI-enhanced, the quality of the organization's judgment becomes more consequential.`}</span>
            </p>
            <p className={styles.frame199}></p>
            <p className={styles.frame199}><strong>“Keep a human in the loop” is not a governance model unless that human has a defined responsibility, decision authority, and standard of evidence.</strong></p>
            <p className={styles.frame199}></p>
            <p className={styles.frame200}>{`For listening teams, the question to tackle is where AI can help them understand employee needs more clearly, respond more effectively, or reduce the burden of listening. And how they retain strong human judgment and cognition along the way. `}</p>
          </div>
          <div className={styles.frame87} data-node-id="1535:38911">
            <div className={styles.frame88} aria-hidden="true">
              <div className={styles.frame20}>
                <img className={styles.frame21} alt="" src={illustration("imgEllipse9", "example-glow")} />
              </div>
            </div>
            <h3 className={styles.frame80}>Putting human judgment at the forefront</h3>
            <blockquote className={styles.frame43}>
              <div className={styles.frame44} aria-hidden="true" />
              <div className={styles.frame81}>
                <div className={styles.frame82}>
                  <p className={styles.frame47} aria-hidden="true">“</p>
                  <p className={styles.frame48}>{`As AI takes on more of the mechanics of listening, human judgment becomes critical in asking harder questions: Why do we listen this way? Which practices are grounded in good science, and which are simply habits? What problems can we now solve that we couldn't before?`}</p>
                </div>
                <p className={styles.frame83}>
                  Caribay Garcia / Head of People Science<br />
                  Microsoft
                </p>
              </div>
            </blockquote>
          </div>
        </div>
        <div className={styles.frame12} data-node-id="1451:11988">
          <div className={styles.frame13} data-node-id="1451:11989" />
        </div>
        <div className={styles.frame14} data-node-id="1451:12034">
          <div className={styles.frame151} data-node-id="1451:12037">
            <h2 className={styles.frame15} data-node-id="1451:12038" id="annual-section-8" tabIndex={-1} style={{ fontVariationSettings: '"wdth" 100' }}>
              Lead the system, not the survey
            </h2>
            <div className={styles.frame152} data-node-id="1451:12039" style={{ fontVariationSettings: '"opsz" 8' }}>
              <p className={styles.frame79}>The next generation of employee listening is not a choice between surveys and new channels, established practices and experimentation, or human judgment and AI. <strong>It is a shift in what listening teams optimize for - from the activity of listening to the quality of understanding, decisions, and response that listening makes possible.</strong></p>
              <p className={styles.frame8}></p>
              <p className={styles.frame61}>That shift expands the listening leader’s role beyond designing surveys, reporting results, and encouraging action. The work is to steward a connected system of voice, evidence, interpretation, decisions, response, and trust. Right-fit listening is the discipline of making those choices intentionally as work, employee needs, and organizational priorities change. <strong>The question for listening leaders is:</strong></p>
            </div>
          </div>
          <div className={styles.frame9} data-node-id="1560:56546">
            <div className={styles.frame10} data-node-id="I1560:56546;798:64560" />
            <p className={styles.frame11} data-node-id="I1560:56546;798:64561" style={{ fontVariationSettings: '"opsz" 36, "opsz" 36' }}>
              What will you change about how you listen to better meet today’s needs and prepare your team for what comes next?
            </p>
          </div>
        </div>
        <div className={styles.frame12} data-node-id="1560:58894">
          <div className={styles.frame13} data-node-id="1560:58895" />
        </div>
        <section className={styles.team} aria-labelledby="annual-team-title" data-node-id="1781:46535">
          <h3 id="annual-team-title"><img src="/figma/annual-canonical/team-people.svg" width={20} height={20} alt="" />The team</h3>
          <div className={styles.teamContent}>
            <div className={styles.teamRow}>
              <div className={styles.teamGroup}>
                <h4>Principal Author</h4>
                <div className={styles.teamCard}>
                  <h5>Megan Benzing, PhD</h5><p>Senior People Scientist, Microsoft</p>
                  <a href="https://www.linkedin.com/in/megan-benzing" target="_blank" rel="noopener noreferrer" aria-label="View on LinkedIn: Megan Benzing, PhD (opens in a new tab)">View on LinkedIn</a>
                </div>
              </div>
              <div className={styles.teamGroup}>
                <h4>Author</h4>
                <div className={styles.teamCard} data-contribution="author">
                  <h5>Caribay Garcia, PhD</h5><p>Head of People Science, Microsoft</p>
                  <a href="https://www.linkedin.com/in/caribaygarcia" target="_blank" rel="noopener noreferrer" aria-label="View on LinkedIn: Caribay Garcia, PhD (opens in a new tab)">View on LinkedIn</a>
                </div>
              </div>
            </div>
            <div className={styles.teamRow}>
              <div className={`${styles.teamGroup} ${styles.teamContributions}`}>
                <h4>Contributors</h4>
                <div className={styles.teamCards}>
                  <div className={styles.teamCard} data-contribution="contributor">
                    <h5>Stephanie Cruz, PhD</h5><p>Senior UX Researcher, Microsoft</p>
                    <a href="https://www.linkedin.com/in/crustephanie" target="_blank" rel="noopener noreferrer" aria-label="View on LinkedIn: Stephanie Cruz, PhD (opens in a new tab)">View on LinkedIn</a>
                  </div>
                  <div className={styles.teamCard} data-contribution="contributor">
                    <h5>Chad Bennett</h5><p>Global Glint Services Leader, Microsoft</p>
                    <a href="https://www.linkedin.com/in/chadlbennett" target="_blank" rel="noopener noreferrer" aria-label="View on LinkedIn: Chad Bennett (opens in a new tab)">View on LinkedIn</a>
                  </div>
                </div>
              </div>
              <div className={styles.teamGroup}>
                <h4>Designer and Builder</h4>
                <div className={styles.teamCard} data-contribution="designer">
                  <h5>Eric Schroen</h5><p>Senior Product Designer, Microsoft</p>
                  <a href="https://www.linkedin.com/in/ericschroen" target="_blank" rel="noopener noreferrer" aria-label="View on LinkedIn: Eric Schroen (opens in a new tab)">View on LinkedIn</a>
                </div>
              </div>
            </div>
          </div>
        </section>
        <hr className={styles.divider} />
        <ReportAppendices />
      </div>;
}
