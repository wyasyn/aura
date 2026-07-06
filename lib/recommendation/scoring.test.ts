import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { scoreSeverity, scoreSkinAnalysis, summarizeSeverity } from './scoring';

describe('recommendation scoring', () => {
  it('maps low values to mild or moderate severity', () => {
    assert.equal(scoreSeverity(0), 'none');
    assert.equal(scoreSeverity(12), 'mild');
    assert.equal(scoreSeverity(30), 'moderate');
  });

  it('maps high values to high or severe severity', () => {
    assert.equal(scoreSeverity(60), 'high');
    assert.equal(scoreSeverity(81), 'severe');
  });

  it('transforms a full skin-analysis object into severity labels', () => {
    const mapped = scoreSkinAnalysis({
      acne: 81,
      dryness: 30,
      oiliness: 72,
      pigmentation: 54,
    });

    assert.equal(mapped.acne, 'severe');
    assert.equal(mapped.dryness, 'moderate');
    assert.equal(mapped.oiliness, 'high');
    assert.equal(mapped.pigmentation, 'high');
  });

  it('creates a summary array with values and severity labels', () => {
    const summary = summarizeSeverity({ acne: 81, dryness: 30 });

    assert.equal(summary[0]?.key, 'acne');
    assert.equal(summary[0]?.severity, 'severe');
    assert.equal(summary[1]?.key, 'dryness');
    assert.equal(summary[1]?.severity, 'moderate');
  });
});
