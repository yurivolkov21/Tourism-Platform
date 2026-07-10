import { ENQUIRY_STATUSES, enquiryStatusMeta } from './status';

describe('enquiryStatusMeta', () => {
  test('maps each pipeline status to a label + badge variant', () => {
    expect(enquiryStatusMeta('NEW')).toEqual({
      label: 'New',
      variant: 'default',
    });
    expect(enquiryStatusMeta('CONTACTED')).toEqual({
      label: 'Contacted',
      variant: 'secondary',
    });
    expect(enquiryStatusMeta('QUOTED')).toEqual({
      label: 'Quoted',
      variant: 'secondary',
    });
    expect(enquiryStatusMeta('WON')).toEqual({
      label: 'Won',
      variant: 'default',
    });
    expect(enquiryStatusMeta('LOST')).toEqual({
      label: 'Lost',
      variant: 'destructive',
    });
  });
});

describe('ENQUIRY_STATUSES', () => {
  test('lists the pipeline in order', () => {
    expect(ENQUIRY_STATUSES).toEqual([
      'NEW',
      'CONTACTED',
      'QUOTED',
      'WON',
      'LOST',
    ]);
  });
});
