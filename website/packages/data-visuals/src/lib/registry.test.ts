import { describe, expect, it } from 'vitest'
import {
  annualReportNavigationDefinition,
  channelPortfolioDefinition,
  employeeAiReadinessDefinition,
  glintResearchCardDefinition,
  getVisualDefinition,
  getVisualsByCollection,
  glintLabsNavigationDefinition,
  listeningMaturityDefinition,
  listeningSpeedGapDefinition,
  pullQuoteDefinition,
  visualCollections,
  visualRegistry,
} from './registry'

describe('visualRegistry', () => {
  it('uses unique component identifiers', () => {
    const ids = visualRegistry.map((definition) => definition.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('records the complete publishing handoff for each visual', () => {
    visualRegistry.forEach((definition) => {
      expect(definition.figma.fileKey).not.toBe('')
      expect(
        visualCollections.some(
          (collection) => collection.id === definition.collection,
        ),
      ).toBe(true)
      if (definition.figma.status === 'linked') {
        expect(definition.figma.nodeId).toMatch(/^\d+:\d+$/)
        expect(definition.figma.url).toMatch(/^https:\/\/www\.figma\.com\/design\//)
      }
      expect(definition.publishingStudio.adapterId).not.toBe('')
      expect(definition.dataContract.fields.length).toBeGreaterThan(0)
      expect(definition.capabilities).toContain('static-export')
      if (definition.dataContract.minimumItems !== undefined) {
        expect(definition.capabilities).toContain('table-fallback')
      }
      if (definition.capabilities.includes('interactive')) {
        expect(definition.capabilities).toContain('keyboard')
      }
    })
  })

  it('finds a visual by its stable identifier', () => {
    expect(getVisualDefinition('pull-quote')).toBe(pullQuoteDefinition)
    expect(getVisualDefinition('glint-labs-navigation')).toBe(
      glintLabsNavigationDefinition,
    )
    expect(getVisualDefinition('annual-report-navigation')).toBe(
      annualReportNavigationDefinition,
    )
    expect(getVisualDefinition('glint-research-card')).toBe(
      glintResearchCardDefinition,
    )
    expect(getVisualDefinition('listening-speed-gap')).toBe(
      listeningSpeedGapDefinition,
    )
    expect(getVisualDefinition('listening-maturity')).toBe(
      listeningMaturityDefinition,
    )
    expect(getVisualDefinition('employee-ai-readiness')).toBe(
      employeeAiReadinessDefinition,
    )
    expect(getVisualDefinition('channel-portfolio')).toBe(
      channelPortfolioDefinition,
    )
    expect(getVisualDefinition('missing')).toBeUndefined()
  })

  it('groups visuals into explicit product collections', () => {
    expect(getVisualsByCollection('annual-report-2026')).toHaveLength(12)
    expect(getVisualsByCollection('glint-labs-core')).toHaveLength(5)
  })
})
