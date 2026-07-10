import { buildCancellationRequestBody } from './cancellation-request';

describe('buildCancellationRequestBody', () => {
  it('trims a provided reason', () => {
    expect(buildCancellationRequestBody('  change of plans  ')).toEqual({
      reason: 'change of plans',
    });
  });
  it('omits reason when blank', () => {
    expect(buildCancellationRequestBody('   ')).toEqual({});
    expect(buildCancellationRequestBody('')).toEqual({});
  });
});
